import type { PropertyInfo, InsuranceInfo } from '../types';
import { parseLocalDate, toLocalISO, todayLocal, addMonths } from './dates';

/**
 * Detects EXPECTED-BUT-MISSING records for a property's recurring costs:
 * council rates, strata/service charges, rent, and insurance coverage.
 *
 * The idea is the inverse of the "predict next" logic — instead of the next due
 * date, we generate every occurrence expected across a window and subtract what's
 * actually recorded. What's left are the gaps (e.g. a quarterly council that only
 * has 3 of 4 bills for the year).
 */

export type GapSource = 'council' | 'strata' | 'rent' | 'insurance';

export interface DataGap {
    source: GapSource;
    title: string;
    /** data-section anchor on the property detail page, for navigation. */
    section: string;
    /** One-line, human-readable. */
    message: string;
    /** Approximate dates of the missing occurrences (YYYY-MM-DD), most recent first. */
    around: string[];
    severity: 'warning' | 'info';
}

// ─── date helpers ────────────────────────────────────────────────
function daysBetween(a: string, b: string): number {
    const da = parseLocalDate(a), db = parseLocalDate(b);
    if (!da || !db) return Infinity;
    return Math.abs(da.getTime() - db.getTime()) / 86_400_000;
}

/** Whole-month distance between two dates (approximate, day-fraction included). */
function monthsBetween(a: string, b: string): number {
    const da = parseLocalDate(a), db = parseLocalDate(b);
    if (!da || !db) return 0;
    return (db.getFullYear() - da.getFullYear()) * 12 + (db.getMonth() - da.getMonth()) + (db.getDate() - da.getDate()) / 30;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Snap an inferred interval to the nearest sensible billing cadence. */
function snapFrequency(months: number): number {
    const options = [1, 3, 6, 12];
    return options.reduce((best, o) => (Math.abs(o - months) < Math.abs(best - months) ? o : best), 12);
}

/** Infer a cadence in months from the spacing of sorted dates, or null if too few. */
export function inferFrequencyMonths(sortedDates: string[]): number | null {
    const ds = sortedDates.filter(Boolean);
    if (ds.length < 2) return null;
    const gaps: number[] = [];
    for (let i = 1; i < ds.length; i++) gaps.push(monthsBetween(ds[i - 1], ds[i]));
    gaps.sort((a, b) => a - b);
    const median = gaps[Math.floor(gaps.length / 2)];
    if (median <= 0) return null;
    return snapFrequency(median);
}

/**
 * Walk expected occurrences across [windowStart, windowEnd] anchored on the phase
 * of the actual records, and return the expected dates with no record nearby.
 */
function findMissing(actualDates: string[], freqMonths: number, windowStart: string, windowEnd: string): string[] {
    const actual = actualDates.filter(Boolean).sort();
    if (actual.length === 0 || freqMonths <= 0) return [];
    const tolDays = clamp(freqMonths * 30 * 0.4, 18, 45);

    // Anchor on the first record, then step back into the window so pre-first gaps
    // (e.g. the quarter just before the earliest recorded bill) are caught too.
    let anchor = actual[0];
    while (addMonths(anchor, -freqMonths) >= windowStart) anchor = addMonths(anchor, -freqMonths);

    const missing: string[] = [];
    for (let expected = anchor; expected <= windowEnd; expected = addMonths(expected, freqMonths)) {
        if (expected < windowStart) continue;
        const covered = actual.some(d => daysBetween(d, expected) <= tolDays);
        if (!covered) missing.push(expected);
    }
    return missing.reverse(); // most recent first
}

function summarise(found: number, expected: number, missing: string[]): string {
    const list = missing.slice(0, 4).map(d => `~${fmtMonth(d)}`).join(', ');
    const more = missing.length > 4 ? ` +${missing.length - 4} more` : '';
    return `${found} of ${expected} expected found — missing ${list}${more}`;
}

function fmtMonth(dateStr: string): string {
    const d = parseLocalDate(dateStr);
    if (!d) return dateStr;
    return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

// ─── per-source detectors ────────────────────────────────────────

/**
 * Lower bound for gap scanning: never earlier than ownership (purchaseDate) and
 * never more than 2 years back, so old properties don't flag ancient history —
 * but it can still sit BEFORE the earliest record, to catch a missing period just
 * prior to the first one entered (the common "started tracking mid-stream" case).
 */
function scanFloor(property: PropertyInfo, windowEnd: string): string {
    const twoYearsBack = addMonths(windowEnd, -24);
    const purchase = property.financials?.purchaseDate;
    return purchase && purchase > twoYearsBack ? purchase : twoYearsBack;
}

function detectCouncil(property: PropertyInfo, windowEnd: string): DataGap | null {
    const bills = (property.operations?.leaseholdCharges?.councilTax || [])
        .filter(ct => !ct.paidByTenant && ct.dueDate)
        .map(ct => ct.dueDate)
        .sort();
    if (bills.length < 1) return null;
    const freq = property.billingFrequencyMonths || inferFrequencyMonths(bills);
    if (!freq) return null;
    const missing = findMissing(bills, freq, scanFloor(property, windowEnd), windowEnd);
    if (missing.length === 0) return null;
    return {
        source: 'council', title: 'Council rates', section: 'councilTax', severity: 'warning',
        around: missing,
        message: summarise(bills.length, bills.length + missing.length, missing),
    };
}

function detectStrata(property: PropertyInfo, windowEnd: string): DataGap | null {
    const charges = (property.operations?.leaseholdCharges?.serviceCharges || [])
        .filter(sc => sc.dueDate)
        .map(sc => sc.dueDate)
        .sort();
    if (charges.length < 2) return null; // need ≥2 to infer a cadence
    const freq = inferFrequencyMonths(charges);
    if (!freq) return null;
    const missing = findMissing(charges, freq, scanFloor(property, windowEnd), windowEnd);
    if (missing.length === 0) return null;
    return {
        source: 'strata', title: 'Strata / service charges', section: 'leaseholdCharges', severity: 'warning',
        around: missing,
        message: summarise(charges.length, charges.length + missing.length, missing),
    };
}

function detectRent(property: PropertyInfo): DataGap | null {
    const txns = property.financials?.transactions || [];
    const rent = txns
        .filter(t => t.type === 'income' && (t.category === 'Rent' || !t.category) && t.date)
        .map(t => t.date!)
        .sort();
    // Conservative: need a clear run to establish monthly cadence, and only look
    // WITHIN the recorded span (never flag the current unfilled month as missing).
    if (rent.length < 3) return null;
    const freq = inferFrequencyMonths(rent);
    if (freq !== 1) return null; // only monthly rent patterns
    const missing = findMissing(rent, 1, rent[0], rent[rent.length - 1]);
    if (missing.length === 0) return null;
    return {
        source: 'rent', title: 'Rent / statements', section: 'financials', severity: 'info',
        around: missing,
        message: `${missing.length} month${missing.length > 1 ? 's' : ''} with no rent recorded — ${missing.slice(0, 4).map(fmtMonth).join(', ')}`,
    };
}

function detectInsurance(property: PropertyInfo, policies: InsuranceInfo[] | undefined, windowEnd: string): DataGap | null {
    const periods: Array<{ start: string; end: string }> = [];
    for (const p of policies || []) {
        if (p.status === 'Archived') continue;
        if (p.startDate && (p.endDate || p.renewalDate)) periods.push({ start: p.startDate, end: (p.endDate || p.renewalDate)! });
        for (const h of p.history || []) {
            if (h.periodStart && h.periodEnd) periods.push({ start: h.periodStart, end: h.periodEnd });
        }
    }
    if (periods.length === 0) return null;
    periods.sort((a, b) => a.start.localeCompare(b.start));

    const tolDays = 15;
    const gaps: string[] = [];
    // Gaps between consecutive coverage periods.
    for (let i = 1; i < periods.length; i++) {
        if (daysBetween(periods[i - 1].end, periods[i].start) > tolDays && periods[i - 1].end < periods[i].start) {
            gaps.push(periods[i - 1].end);
        }
    }
    // Currently uninsured: last coverage ended more than a tolerance ago.
    const lastEnd = periods[periods.length - 1].end;
    const uninsuredNow = lastEnd < windowEnd && daysBetween(lastEnd, windowEnd) > tolDays;
    if (uninsuredNow) gaps.push(lastEnd);
    if (gaps.length === 0) return null;

    return {
        source: 'insurance', title: 'Insurance', section: 'compliance', severity: 'warning',
        around: gaps.reverse(),
        message: uninsuredNow
            ? `Coverage lapsed after ${fmtMonth(lastEnd)}${gaps.length > 1 ? ` (+${gaps.length - 1} earlier gap${gaps.length - 1 > 1 ? 's' : ''})` : ''}`
            : `${gaps.length} coverage gap${gaps.length > 1 ? 's' : ''} — after ${gaps.map(fmtMonth).join(', ')}`,
    };
}

/**
 * All detected data gaps for a property. `today` is injectable for deterministic
 * tests. Disposed properties are skipped — no ongoing obligations.
 */
export function detectPropertyGaps(
    property: PropertyInfo,
    insurancePolicies?: InsuranceInfo[],
    today: string = toLocalISO(todayLocal()),
): DataGap[] {
    if (property.disposal) return [];
    // Ownership ends at the sale date if sold; otherwise today.
    const windowEnd = property.disposal ? today : today;
    return [
        detectCouncil(property, windowEnd),
        detectStrata(property, windowEnd),
        detectRent(property),
        detectInsurance(property, insurancePolicies, windowEnd),
    ].filter((g): g is DataGap => g !== null);
}
