/**
 * AI-powered conversation thread summarization.
 * Takes a set of correspondence items and produces a structured briefing
 * with summary, action items, and timeline.
 */

import { GoogleGenAI, Type } from '@google/genai';
import type { CorrespondenceItem, ThreadAction, ConversationThread } from '../types';
import { v4 as uuidv4 } from 'uuid';

// ─── Schema ─────────────────────────────────────────────────────────

const threadSummarySchema = {
    type: Type.OBJECT,
    properties: {
        title: {
            type: Type.STRING,
            description: 'A short descriptive title for this conversation thread (max 60 chars).',
        },
        summary: {
            type: Type.STRING,
            description: 'A concise markdown summary of the entire correspondence. Include key facts, decisions, and context. Use bullet points for clarity. Written from the property owner\'s perspective.',
        },
        actions: {
            type: Type.ARRAY,
            description: 'Action items extracted from the correspondence. Include things the owner needs to do, respond to, or follow up on.',
            items: {
                type: Type.OBJECT,
                properties: {
                    description: { type: Type.STRING, description: 'What needs to be done.' },
                    status: { type: Type.STRING, enum: ['pending', 'done'], description: 'Whether this action appears to be resolved based on the correspondence.' },
                },
                required: ['description', 'status'],
            },
        },
        timeline: {
            type: Type.STRING,
            description: 'A markdown timeline of key events/decisions in chronological order. Use format: "**YYYY-MM-DD** — Description". Only include significant events, not every email.',
            nullable: true,
        },
    },
    required: ['title', 'summary', 'actions'],
};

// ─── Context helpers ────────────────────────────────────────────────

export interface ThreadContext {
    name: string;          // e.g. "123 Main Street" or "Tax Correspondence"
    type?: 'property' | 'general'; // controls prompt tone; defaults to 'general'
}

function contextBlock(ctx: ThreadContext): string {
    if (ctx.type === 'property') {
        return `You are a property management assistant working for a **property owner/landlord**. The owner's name is Nick. He owns this property and hires agents to manage it.\n\n**Property:** ${ctx.name}`;
    }
    return `You are a personal assistant working for **Nick**. Your job is to read his email correspondence and produce structured briefings.\n\n**Context:** ${ctx.name}`;
}

function perspectiveGuidelines(ctx: ThreadContext): string {
    if (ctx.type === 'property') {
        return `- Write from the owner's perspective — "you" means the owner
- Identify action items: things the owner needs to respond to, approve, pay, or follow up on`;
    }
    return `- Write from Nick's perspective — "you" means Nick
- Identify action items: things Nick needs to respond to, approve, pay, or follow up on`;
}

// ─── Prompt builders ────────────────────────────────────────────────

function buildInitialPrompt(emails: CorrespondenceItem[], ctx: ThreadContext): string {
    const emailsText = emails.map(e =>
        `---\nDate: ${e.date}\nFrom: ${e.from}\nTo: ${e.to || 'N/A'}\nSubject: ${e.subject}\n\n${e.body}\n---`
    ).join('\n\n');

    return `${contextBlock(ctx)}

Your task is to read through the following email correspondence and produce a structured briefing.

**Guidelines:**
${perspectiveGuidelines(ctx)}
- Mark actions as "done" if a subsequent email shows they were resolved
- Keep the summary concise but comprehensive — the reader should not need to read individual emails
- Note any deadlines, amounts, or important dates
- If there are ongoing disputes or issues, summarise the current status clearly

**EMAIL CORRESPONDENCE:**

${emailsText}`;
}

function buildUpdatePrompt(
    emails: CorrespondenceItem[],
    existingSummary: string,
    existingActions: ThreadAction[],
    ctx: ThreadContext,
): string {
    const emailsText = emails.map(e =>
        `---\nDate: ${e.date}\nFrom: ${e.from}\nTo: ${e.to || 'N/A'}\nSubject: ${e.subject}\n\n${e.body}\n---`
    ).join('\n\n');

    const actionsText = existingActions.map(a =>
        `- [${a.status === 'done' ? 'x' : ' '}] ${a.description}`
    ).join('\n');

    return `${contextBlock(ctx)}

You previously created this briefing:

**EXISTING SUMMARY:**
${existingSummary}

**EXISTING ACTION ITEMS:**
${actionsText}

**NEW EMAILS** have arrived. Read them and update the briefing:

${emailsText}

**Instructions:**
- Update the summary to incorporate the new information
- If any existing action items are now resolved by the new emails, mark them as "done"
- Add any new action items from the new emails
- Update the timeline with any significant new events
- Keep the summary concise — merge/condense older details if the thread is getting long
- Write from Nick's perspective`;
}

// ─── Draft Reply Schema ──────────────────────────────────────────────

const draftReplySchema = {
    type: Type.OBJECT,
    properties: {
        subject: {
            type: Type.STRING,
            description: 'The reply subject line (usually "Re: <original subject>").',
        },
        body: {
            type: Type.STRING,
            description: 'The full reply email body. Professional but warm tone. Do NOT include signature placeholders like [Your Name] — the sender will add their own.',
        },
        confidence: {
            type: Type.STRING,
            enum: ['high', 'medium', 'low'],
            description: 'How confident the AI is that this reply adequately addresses what is needed.',
        },
        notes: {
            type: Type.STRING,
            description: 'Brief note to the user about what this reply addresses and anything they should verify before sending.',
            nullable: true,
        },
    },
    required: ['subject', 'body', 'confidence'],
};

// ─── Draft Reply Prompt ──────────────────────────────────────────────

function buildDraftReplyPrompt(
    thread: ConversationThread,
    recentEmails: CorrespondenceItem[],
    ctx: ThreadContext,
    options?: { focusAction?: string; recipient?: string },
): string {
    const emailsText = recentEmails.map(e =>
        `---\nDate: ${e.date}\nFrom: ${e.from}\nTo: ${e.to || 'N/A'}\nSubject: ${e.subject}\n\n${e.body}\n---`
    ).join('\n\n');

    const pendingActions = thread.actions
        .filter(a => a.status === 'pending')
        .map(a => `- ${a.description}`)
        .join('\n');

    const focusBlock = options?.focusAction
        ? `\n**PRIMARY FOCUS — draft the reply to address THIS action item specifically:**\n> ${options.focusAction}\n`
        : '';

    const recipientBlock = options?.recipient
        ? `\n**REPLY TO:** ${options.recipient} — address the reply to this person.\n`
        : '';

    const toneGuide = ctx.type === 'property'
        ? '- Be professional but warm — Nick is a hands-on landlord, not a faceless corporation'
        : '- Be professional but warm and personable';

    return `You are drafting an email reply for **Nick**.

**Context:** ${ctx.name}
${recipientBlock}
**THREAD SUMMARY (AI-generated from full conversation):**
${thread.summary}

**PENDING ACTION ITEMS:**
${pendingActions || '(none)'}
${focusBlock}
**RECENT EMAILS (most recent last):**
${emailsText}

**Instructions:**${options?.focusAction ? '\n- Focus the reply on the specified action item above' : '\n- Draft a reply to the most recent email from the other party'}${options?.recipient ? '\n- Address the reply to ' + options.recipient : ''}
${toneGuide}
- Keep the reply concise and to the point
- If there are questions in the latest email, answer them directly
- If there are requests, acknowledge and respond appropriately
- Do NOT add a signature — just the body text
- Sign off with just "Nick" or "Regards,\\nNick" at the end
- If you're unsure about specific details (amounts, dates, decisions), mention it in the notes field`;
}

// ─── API calls ──────────────────────────────────────────────────────

interface SummaryResult {
    title: string;
    summary: string;
    actions: { description: string; status: 'pending' | 'done' }[];
    timeline?: string;
}

export interface DraftReply {
    subject: string;
    body: string;
    confidence: 'high' | 'medium' | 'low';
    notes?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function callGemini<T>(prompt: string, schema: any = threadSummarySchema): Promise<T> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: schema,
        },
    });

    return JSON.parse(response.text.trim());
}

// ─── Public API ─────────────────────────────────────────────────────

/** Normalize a string or ThreadContext into a ThreadContext. */
function toContext(nameOrCtx: string | ThreadContext): ThreadContext {
    if (typeof nameOrCtx === 'string') return { name: nameOrCtx, type: 'property' };
    return nameOrCtx;
}

/**
 * Generate a new thread summary from scratch.
 * `contextName` can be a string (backward compat, treated as property) or a ThreadContext.
 */
export async function generateThread(
    emails: CorrespondenceItem[],
    contextName: string | ThreadContext,
    category?: ConversationThread['category'],
    filterSenders?: string[],
): Promise<ConversationThread> {
    if (emails.length === 0) throw new Error('No emails to summarize');

    const ctx = toContext(contextName);
    const sorted = [...emails].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const prompt = buildInitialPrompt(sorted, ctx);
    const result = await callGemini<SummaryResult>(prompt, threadSummarySchema);
    const now = new Date().toISOString();

    return {
        id: uuidv4(),
        title: result.title,
        category,
        filterSenders,
        summary: result.summary,
        actions: result.actions.map(a => ({
            id: uuidv4(),
            description: a.description,
            status: a.status,
            addedAt: now,
            resolvedAt: a.status === 'done' ? now : undefined,
        })),
        timeline: result.timeline || undefined,
        lastProcessedDate: sorted[sorted.length - 1].date,
        lastProcessedEmailIds: sorted.map(e => e.id),
        createdAt: now,
        updatedAt: now,
    };
}

/**
 * Update an existing thread with new emails.
 */
export async function updateThread(
    thread: ConversationThread,
    newEmails: CorrespondenceItem[],
    contextName: string | ThreadContext,
): Promise<ConversationThread> {
    if (newEmails.length === 0) return thread;

    const ctx = toContext(contextName);
    const sorted = [...newEmails].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const prompt = buildUpdatePrompt(sorted, thread.summary, thread.actions, ctx);
    const result = await callGemini<SummaryResult>(prompt, threadSummarySchema);
    const now = new Date().toISOString();

    // Merge actions: preserve IDs of existing actions where descriptions match, add new ones
    const existingActionMap = new Map(thread.actions.map(a => [a.description.toLowerCase(), a]));
    const mergedActions: ThreadAction[] = result.actions.map(a => {
        const existing = existingActionMap.get(a.description.toLowerCase());
        if (existing) {
            return {
                ...existing,
                status: a.status,
                resolvedAt: a.status === 'done' && !existing.resolvedAt ? now : existing.resolvedAt,
            };
        }
        return {
            id: uuidv4(),
            description: a.description,
            status: a.status,
            addedAt: now,
            resolvedAt: a.status === 'done' ? now : undefined,
        };
    });

    return {
        ...thread,
        title: result.title,
        summary: result.summary,
        actions: mergedActions,
        timeline: result.timeline || thread.timeline,
        lastProcessedDate: sorted[sorted.length - 1].date,
        lastProcessedEmailIds: [
            ...(thread.lastProcessedEmailIds || []),
            ...sorted.map(e => e.id),
        ],
        updatedAt: now,
    };
}

/**
 * Generate an AI draft reply for a thread.
 * Uses the thread summary + pending actions + recent emails for context.
 */
export async function generateDraftReply(
    thread: ConversationThread,
    emails: CorrespondenceItem[],
    contextName: string | ThreadContext,
    options?: { focusAction?: string; recipient?: string },
): Promise<DraftReply> {
    if (emails.length === 0) throw new Error('No emails in thread');

    const ctx = toContext(contextName);
    const sorted = [...emails].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    // Use last 5 emails for context (AI already has the full summary)
    const recent = sorted.slice(-5);
    const prompt = buildDraftReplyPrompt(thread, recent, ctx, options);
    return callGemini<DraftReply>(prompt, draftReplySchema);
}
