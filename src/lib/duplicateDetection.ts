/**
 * Duplicate transaction detection.
 * Finds likely duplicate financial transactions using amount matching,
 * date proximity, and description similarity — no AI required.
 */

import type { FinancialTransaction } from '../types';

export interface DuplicateGroup {
    /** The transactions that appear to be duplicates of each other */
    transactions: FinancialTransaction[];
    /** Confidence: 'high' = exact amount + close date + similar description, 'medium' = exact amount + close date */
    confidence: 'high' | 'medium';
    /** Human-readable reason */
    reason: string;
}

/** Max days apart for two transactions to be considered potential duplicates */
const DATE_PROXIMITY_DAYS = 45;

/** Narrower window for recurring transaction patterns (rent, fees) */
const RECURRING_DATE_PROXIMITY_DAYS = 5;

/** Minimum similarity score (0–1) for descriptions to be considered matching */
const DESCRIPTION_SIMILARITY_THRESHOLD = 0.3;

/**
 * Patterns that identify recurring/periodic transactions.
 * These get a much tighter date window to avoid flagging monthly recurrences.
 */
const RECURRING_PATTERNS = [
    /\brent\b/i,
    /\bmanagement\s*fee/i,
    /\bagency\s*fee/i,
    /\bletting\s*fee/i,
    /\bwithdrawal\b/i,
    /\btransfer\b/i,
    /\bpayment\s*(to|sent|eft)\b/i,
    /\beft\b/i,
    /\brepayment\b/i,
    /\bsalary\b/i,
    /\bwages\b/i,
    /\bdirect\s*debit\b/i,
    /\bstanding\s*order\b/i,
];

function isRecurring(description: string): boolean {
    return RECURRING_PATTERNS.some(p => p.test(description));
}

/**
 * Tokenize a description into meaningful words (lowercase, no noise).
 */
function tokenize(text: string): Set<string> {
    const noise = new Set([
        'the', 'a', 'an', 'to', 'for', 'of', 'and', 'in', 'on', 'at', 'by',
        'from', 'is', 'was', 'with', 'that', 'this', '-', '–', '—',
        'pty', 'ltd', 'p/l', 'inc', 'llc', 'co',
    ]);
    return new Set(
        text.toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 1 && !noise.has(w))
    );
}

/**
 * Jaccard similarity between two sets of tokens (0–1).
 */
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
    if (a.size === 0 && b.size === 0) return 0;
    let intersection = 0;
    for (const token of a) {
        if (b.has(token)) intersection++;
    }
    const union = a.size + b.size - intersection;
    return union === 0 ? 0 : intersection / union;
}

/**
 * Containment similarity: what fraction of the *smaller* set appears in the larger set.
 * Catches cases where a short description ("exhaust fan repair") is a subset of a longer one.
 */
function containmentSimilarity(a: Set<string>, b: Set<string>): number {
    const smaller = a.size <= b.size ? a : b;
    const larger = a.size <= b.size ? b : a;
    if (smaller.size === 0) return 0;
    let hits = 0;
    for (const token of smaller) {
        if (larger.has(token)) hits++;
    }
    return hits / smaller.size;
}

/**
 * Days between two date strings (YYYY-MM-DD). Returns Infinity if either is missing.
 */
function daysBetween(dateA?: string, dateB?: string): number {
    if (!dateA || !dateB) return Infinity;
    const a = new Date(dateA + 'T00:00:00').getTime();
    const b = new Date(dateB + 'T00:00:00').getTime();
    if (isNaN(a) || isNaN(b)) return Infinity;
    return Math.abs(a - b) / (1000 * 60 * 60 * 24);
}

/**
 * Scan a list of transactions and return groups of likely duplicates.
 */
export function findDuplicates(transactions: FinancialTransaction[]): DuplicateGroup[] {
    if (transactions.length < 2) return [];

    // Group by exact amount first (most discriminating, cheapest check)
    const byAmount = new Map<number, FinancialTransaction[]>();
    for (const t of transactions) {
        const key = Math.round(t.amount * 100); // cents to avoid float issues
        const group = byAmount.get(key) || [];
        group.push(t);
        byAmount.set(key, group);
    }

    const duplicateGroups: DuplicateGroup[] = [];
    const alreadyGrouped = new Set<string>();

    for (const [, candidates] of byAmount) {
        if (candidates.length < 2) continue;

        // Compare all pairs within same-amount group
        for (let i = 0; i < candidates.length; i++) {
            for (let j = i + 1; j < candidates.length; j++) {
                const a = candidates[i];
                const b = candidates[j];

                // Skip if same source document (not a duplicate, just same extraction)
                if (a.sourceDocumentName && a.sourceDocumentName === b.sourceDocumentName) continue;

                // Must be same type (both income or both expense)
                if (a.type !== b.type) continue;

                const days = daysBetween(a.date, b.date);

                // Check description similarity
                const tokensA = tokenize(a.description);
                const tokensB = tokenize(b.description);
                const jaccard = jaccardSimilarity(tokensA, tokensB);
                const containment = containmentSimilarity(tokensA, tokensB);
                // Use the better of Jaccard or containment — catches verbose vs terse descriptions
                const similarity = Math.max(jaccard, containment);

                // Use tighter date window for recurring transactions (rent, fees, etc.)
                // Monthly recurrences have similar descriptions + same amount but ~30 days apart — not duplicates.
                const bothRecurring = isRecurring(a.description) && isRecurring(b.description);
                const maxDays = (bothRecurring && similarity >= DESCRIPTION_SIMILARITY_THRESHOLD)
                    ? RECURRING_DATE_PROXIMITY_DAYS
                    : DATE_PROXIMITY_DAYS;

                if (days > maxDays) continue;

                const pairKey = [a.id, b.id].sort().join('|');
                if (alreadyGrouped.has(pairKey)) continue;

                if (similarity >= DESCRIPTION_SIMILARITY_THRESHOLD) {
                    alreadyGrouped.add(pairKey);
                    const sources = [
                        a.sourceDocumentName || 'unknown source',
                        b.sourceDocumentName || 'unknown source',
                    ];
                    duplicateGroups.push({
                        transactions: [a, b],
                        confidence: 'high',
                        reason: `$${a.amount.toFixed(2)} ${a.type} appears in both "${sources[0]}" and "${sources[1]}" (${days} days apart)`,
                    });
                } else if (days <= 5) {
                    // Very close dates with same amount — still suspicious even with different descriptions
                    alreadyGrouped.add(pairKey);
                    duplicateGroups.push({
                        transactions: [a, b],
                        confidence: 'medium',
                        reason: `$${a.amount.toFixed(2)} ${a.type} on similar dates: "${a.description}" vs "${b.description}"`,
                    });
                }
            }
        }
    }

    // --- Pass 2: Estimate → Actual supersession ---
    // Catches cases where an estimate/retained amount from one statement is superseded
    // by the actual cost in a later statement (different amounts, same underlying work).
    const estimatePattern = /\(estimate\)|\(retained\)|retained\s+(for|re)\b|funds\s+retained/i;
    const estimates = transactions.filter(t => t.type === 'expense' && estimatePattern.test(t.description));

    for (const est of estimates) {
        // Strip estimate/retained suffixes to get the base description
        const baseDesc = est.description
            .replace(/\s*\(estimate\)/i, '')
            .replace(/\s*\(retained\)/i, '')
            .replace(/funds\s+retained\s+(for|re)\s+(outstanding\s+invoices\s+and\/or\s+work\s+in\s+progress:\s*)?/i, '')
            .replace(/retained\s+(for|re)\s+/i, '')
            .trim();
        const baseTokens = tokenize(baseDesc);
        if (baseTokens.size === 0) continue;

        for (const tx of transactions) {
            if (tx.id === est.id) continue;
            if (tx.type !== 'expense') continue;
            if (estimatePattern.test(tx.description)) continue; // skip other estimates

            const txTokens = tokenize(tx.description);
            const sim = Math.max(
                jaccardSimilarity(baseTokens, txTokens),
                containmentSimilarity(baseTokens, txTokens)
            );
            if (sim < 0.5) continue;

            const days = daysBetween(est.date, tx.date);
            if (days > 90) continue; // estimates are usually resolved within ~3 months

            const pairKey = [est.id, tx.id].sort().join('|');
            if (alreadyGrouped.has(pairKey)) continue;
            alreadyGrouped.add(pairKey);

            duplicateGroups.push({
                transactions: [est, tx],
                confidence: 'high',
                reason: `Estimate "${est.description}" superseded by actual "${tx.description}" (${days} days apart)`,
            });
        }
    }

    // Sort by confidence (high first), then by amount descending
    duplicateGroups.sort((a, b) => {
        if (a.confidence !== b.confidence) return a.confidence === 'high' ? -1 : 1;
        return b.transactions[0].amount - a.transactions[0].amount;
    });

    return duplicateGroups;
}

/**
 * Check incoming transactions against existing ones for duplicates.
 * Returns only groups that involve at least one new transaction.
 */
export function findDuplicatesWithNew(
    existing: FinancialTransaction[],
    incoming: FinancialTransaction[],
): DuplicateGroup[] {
    const all = [...existing, ...incoming];
    const incomingIds = new Set(incoming.map(t => t.id));
    const groups = findDuplicates(all);
    // Only return groups where at least one transaction is from the incoming set
    return groups.filter(g => g.transactions.some(t => incomingIds.has(t.id)));
}
