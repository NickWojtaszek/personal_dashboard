import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { PropertyInfo, ConversationThread, CorrespondenceItem, SyncRuleCategory, GmailSyncConfig } from '../../types';
import { PlusIcon, TrashIcon } from './Icons';
import { generateThread, updateThread, generateDraftReply, type DraftReply } from '../../lib/summarizeThread';
import { sendEmail, getMessage } from '../../lib/gmail';
import { getCategoryPillColor, CATEGORY_UNSELECTED } from '../../lib/categoryColors';

// ─── Inline Icons ────────────────────────────────────────────────────

const ThreadIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
    <svg className={`w-5 h-5 ${className}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
    </svg>
);

const RefreshIcon: React.FC<{ className?: string; spinning?: boolean }> = ({ className = '', spinning }) => (
    <svg className={`w-4 h-4 ${spinning ? 'animate-spin' : ''} ${className}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
    </svg>
);

const CheckCircleIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
    <svg className={`w-4 h-4 ${className}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
);

const CircleIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
    <svg className={`w-4 h-4 ${className}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <circle cx="12" cy="12" r="9" />
    </svg>
);

const PenIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
    <svg className={`w-4 h-4 ${className}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
    </svg>
);

const SendIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
    <svg className={`w-4 h-4 ${className}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
    </svg>
);

const BackArrowIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
    <svg className={`w-4 h-4 ${className}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
    </svg>
);

// ─── Simple Markdown Renderer ────────────────────────────────────────

const MarkdownBlock: React.FC<{ text: string }> = ({ text }) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let listItems: string[] = [];
    let listKey = 0;

    const flushList = () => {
        if (listItems.length === 0) return;
        elements.push(
            <ul key={`list-${listKey++}`} className="list-disc list-inside space-y-1 my-2">
                {listItems.map((item, i) => (
                    <li key={i} className="text-sm text-slate-600 dark:text-slate-300">
                        <InlineMarkdown text={item} />
                    </li>
                ))}
            </ul>
        );
        listItems = [];
    };

    lines.forEach((line, i) => {
        const trimmed = line.trim();

        // Bullet list item
        if (/^[-*•]\s+/.test(trimmed)) {
            listItems.push(trimmed.replace(/^[-*•]\s+/, ''));
            return;
        }

        flushList();

        // Empty line
        if (!trimmed) {
            elements.push(<div key={`br-${i}`} className="h-2" />);
            return;
        }

        // Heading-like bold line (entire line is bold)
        if (/^\*\*[^*]+\*\*:?$/.test(trimmed)) {
            elements.push(
                <p key={i} className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-3 mb-1">
                    {trimmed.replace(/\*\*/g, '').replace(/:$/, '')}
                </p>
            );
            return;
        }

        // Regular paragraph
        elements.push(
            <p key={i} className="text-sm text-slate-600 dark:text-slate-300">
                <InlineMarkdown text={trimmed} />
            </p>
        );
    });

    flushList();
    return <>{elements}</>;
};

const InlineMarkdown: React.FC<{ text: string }> = ({ text }) => {
    // Split on **bold** markers
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return (
        <>
            {parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={i} className="font-semibold text-slate-800 dark:text-slate-200">{part.slice(2, -2)}</strong>;
                }
                return <span key={i}>{part}</span>;
            })}
        </>
    );
};

// ─── Timeline Renderer ──────────────────────────────────────────────

const TimelineBlock: React.FC<{ text: string }> = ({ text }) => {
    // First try splitting on newlines
    let entries = text.split('\n').filter(l => l.trim());

    // If we got a single long line (AI sometimes omits newlines), split on date patterns
    if (entries.length <= 1 && text.length > 200) {
        // Split before date patterns like "2025-09-11 —" or "**2025-09-11** —"
        entries = text.split(/(?=\*{0,2}\d{4}-\d{2}-\d{2}\*{0,2}\s*[—–-])/).filter(l => l.trim());
    }

    const parsed = entries.map(line => {
        const trimmed = line.trim();
        // Match: 2025-09-11 — description  or  **2025-09-11** — description
        const match = trimmed.match(/^\*{0,2}(\d{4}-\d{2}-\d{2})\*{0,2}\s*[—–-]\s*(.+)$/s);
        if (match) return { date: match[1], desc: match[2].trim() };
        return null;
    }).filter(Boolean) as { date: string; desc: string }[];

    if (parsed.length === 0) {
        return <MarkdownBlock text={text} />;
    }

    return (
        <div className="relative pl-4 border-l-2 border-slate-200 dark:border-slate-600 space-y-3">
            {parsed.map((entry, i) => (
                <div key={i} className="relative">
                    <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-500 border-2 border-white dark:border-slate-800" />
                    <div className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mb-0.5">
                        {new Date(entry.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        <InlineMarkdown text={entry.desc} />
                    </p>
                </div>
            ))}
        </div>
    );
};

// ─── Constants ───────────────────────────────────────────────────────

const DEFAULT_SYNC_CONFIG: GmailSyncConfig = { rules: [], autoSync: false };

// ─── Props ───────────────────────────────────────────────────────────

interface ThreadsSectionProps {
    property: PropertyInfo;
    onSave: (property: PropertyInfo) => void;
}

// ─── Component ───────────────────────────────────────────────────────

const ThreadsSection: React.FC<ThreadsSectionProps> = ({ property, onSave }) => {
    const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [updatingThreadIds, setUpdatingThreadIds] = useState<Set<string>>(new Set());
    const [showNewThreadForm, setShowNewThreadForm] = useState(false);
    const [selectedTag, setSelectedTag] = useState<string | 'custom'>('custom');
    const [customSenders, setCustomSenders] = useState('');
    const [error, setError] = useState('');
    const [isDrafting, setIsDrafting] = useState(false);
    const [draftReply, setDraftReply] = useState<DraftReply | null>(null);
    const [draftBody, setDraftBody] = useState('');
    const [draftSubject, setDraftSubject] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [sendSuccess, setSendSuccess] = useState(false);
    const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
    const [draftRecipient, setDraftRecipient] = useState<string>('');

    const threads = property.threads || [];
    const allCorrespondence = property.correspondence || [];
    const syncConfig = property.gmailSync || DEFAULT_SYNC_CONFIG;

    // Track correspondence count to detect sync completions
    const prevCorrespondenceCountRef = useRef(allCorrespondence.length);

    // Check if an email matches a sync rule query (checks both from and to for sent replies)
    const emailMatchesRule = useCallback((email: CorrespondenceItem, rule: { query: string }): boolean => {
        const from = email.from.toLowerCase();
        const to = (email.to || '').toLowerCase();
        const q = rule.query.toLowerCase();
        const fromEmail = from.split('<').pop()?.replace('>', '').trim() || '';
        // Match if the rule query appears in from OR to (captures sent replies)
        return from.includes(q) || q.includes(fromEmail) || to.includes(q);
    }, []);

    // Map email to its category tag (via matching sync rules)
    const getEmailCategory = useCallback((email: CorrespondenceItem): SyncRuleCategory | null => {
        for (const rule of syncConfig.rules) {
            if (!rule.category) continue;
            if (emailMatchesRule(email, rule)) return rule.category;
        }
        return null;
    }, [syncConfig.rules, emailMatchesRule]);

    // Get all emails matching a category tag (matches ALL rules with that tag)
    const getEmailsForCategory = useCallback((category: string) => {
        const rulesForCat = syncConfig.rules.filter(r => r.category === category);
        if (rulesForCat.length === 0) return [];
        return allCorrespondence.filter(c =>
            rulesForCat.some(rule => emailMatchesRule(c, rule))
        );
    }, [allCorrespondence, syncConfig.rules, emailMatchesRule]);

    // Tags defined on the sync config
    const availableTags = syncConfig.tags || [];

    // Get emails for a given thread (category-based or sender-based, includes sent replies)
    const getEmailsForThread = useCallback((thread: { category?: SyncRuleCategory; filterSenders?: string[] }) => {
        if (thread.category) return getEmailsForCategory(thread.category);
        if (thread.filterSenders?.length) {
            return allCorrespondence.filter(c => {
                const from = c.from.toLowerCase();
                const to = (c.to || '').toLowerCase();
                // Match if sender appears in from OR to (captures sent replies)
                return thread.filterSenders!.some(s => {
                    const sl = s.toLowerCase();
                    return from.includes(sl) || to.includes(sl);
                });
            });
        }
        return [];
    }, [allCorrespondence, getEmailsForCategory]);

    // Count new (unprocessed) emails for a thread
    const getNewEmailCount = useCallback((thread: ConversationThread) => {
        const allEmails = getEmailsForThread(thread);
        const processedIds = new Set(thread.lastProcessedEmailIds || []);
        return allEmails.filter(e => !processedIds.has(e.id)).length;
    }, [getEmailsForThread]);

    // Total new emails across all threads
    const totalNewEmails = threads.reduce((sum, t) => sum + getNewEmailCount(t), 0);

    const selectedThread = threads.find(t => t.id === selectedThreadId) || null;

    // ─── Auto-update threads when new emails arrive ───────────────────

    const autoUpdateThreads = useCallback(async (currentProperty: PropertyInfo) => {
        const currentThreads = currentProperty.threads || [];
        const currentCorrespondence = currentProperty.correspondence || [];
        if (currentThreads.length === 0) return;

        // Find threads with new unprocessed emails
        const threadsToUpdate = currentThreads.filter(thread => {
            const allEmails = (() => {
                if (thread.category) {
                    const rulesForCat = (currentProperty.gmailSync || DEFAULT_SYNC_CONFIG).rules.filter(r => r.category === thread.category);
                    if (rulesForCat.length === 0) return [];
                    return currentCorrespondence.filter(c =>
                        rulesForCat.some(rule => {
                            const from = c.from.toLowerCase();
                            const to = (c.to || '').toLowerCase();
                            const q = rule.query.toLowerCase();
                            const fromEmail = from.split('<').pop()?.replace('>', '').trim() || '';
                            return from.includes(q) || q.includes(fromEmail) || to.includes(q);
                        })
                    );
                }
                if (thread.filterSenders?.length) {
                    return currentCorrespondence.filter(c => {
                        const from = c.from.toLowerCase();
                        const to = (c.to || '').toLowerCase();
                        return thread.filterSenders!.some(s => {
                            const sl = s.toLowerCase();
                            return from.includes(sl) || to.includes(sl);
                        });
                    });
                }
                return [];
            })();
            const processedIds = new Set(thread.lastProcessedEmailIds || []);
            return allEmails.some(e => !processedIds.has(e.id));
        });

        if (threadsToUpdate.length === 0) return;

        // Update threads sequentially to avoid hammering the API
        setUpdatingThreadIds(new Set(threadsToUpdate.map(t => t.id)));
        let updatedThreads = [...currentThreads];

        for (const thread of threadsToUpdate) {
            try {
                const allEmails = (() => {
                    if (thread.category) {
                        const rulesForCat = (currentProperty.gmailSync || DEFAULT_SYNC_CONFIG).rules.filter(r => r.category === thread.category);
                        return currentCorrespondence.filter(c =>
                            rulesForCat.some(rule => {
                                const from = c.from.toLowerCase();
                                const q = rule.query.toLowerCase();
                                return from.includes(q) || q.includes(from.split('<').pop()?.replace('>', '').trim() || '');
                            })
                        );
                    }
                    if (thread.filterSenders?.length) {
                        return currentCorrespondence.filter(c => {
                            const from = c.from.toLowerCase();
                            return thread.filterSenders!.some(s => from.includes(s.toLowerCase()));
                        });
                    }
                    return [];
                })();
                const processedIds = new Set(thread.lastProcessedEmailIds || []);
                const newEmails = allEmails.filter(e => !processedIds.has(e.id));

                if (newEmails.length > 0) {
                    const updated = await updateThread(thread, newEmails, currentProperty.name);
                    updatedThreads = updatedThreads.map(t => t.id === thread.id ? updated : t);
                }
            } catch (err) {
                console.error(`Failed to auto-update thread "${thread.title}":`, err);
            }
            setUpdatingThreadIds(prev => {
                const next = new Set(prev);
                next.delete(thread.id);
                return next;
            });
        }

        onSave({ ...currentProperty, threads: updatedThreads });
    }, [onSave]);

    // Detect when correspondence count increases (new emails synced) → auto-update threads
    useEffect(() => {
        const prevCount = prevCorrespondenceCountRef.current;
        prevCorrespondenceCountRef.current = allCorrespondence.length;

        if (allCorrespondence.length > prevCount && threads.length > 0) {
            // New emails arrived — auto-update threads
            autoUpdateThreads(property);
        }
    }, [allCorrespondence.length]); // eslint-disable-line react-hooks/exhaustive-deps

    // ─── Handlers ────────────────────────────────────────────────────

    const handleCreateThread = async () => {
        setIsGenerating(true);
        setError('');
        try {
            let emails: CorrespondenceItem[];
            let category: SyncRuleCategory | undefined;
            let filterSenders: string[] | undefined;

            if (selectedTag === 'custom') {
                const senders = customSenders.split(',').map(s => s.trim()).filter(Boolean);
                if (senders.length === 0) throw new Error('Enter at least one sender address');
                filterSenders = senders;
                emails = allCorrespondence.filter(c => {
                    const from = c.from.toLowerCase();
                    return senders.some(s => from.includes(s.toLowerCase()));
                });
            } else {
                category = selectedTag;
                emails = getEmailsForCategory(selectedTag);
            }

            if (emails.length === 0) throw new Error('No correspondence found for this filter');

            const thread = await generateThread(emails, property.name, category, filterSenders);
            const updatedThreads = [...threads, thread];
            onSave({ ...property, threads: updatedThreads });
            setSelectedThreadId(thread.id);
            setShowNewThreadForm(false);
            setCustomSenders('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate thread');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleUpdateThread = async (thread: ConversationThread) => {
        setUpdatingThreadIds(prev => new Set(prev).add(thread.id));
        setError('');
        try {
            const allEmails = getEmailsForThread(thread);
            const processedIds = new Set(thread.lastProcessedEmailIds || []);
            const newEmails = allEmails.filter(e => !processedIds.has(e.id));

            if (newEmails.length === 0) {
                setError('No new emails to process');
                return;
            }

            const updated = await updateThread(thread, newEmails, property.name);
            const updatedThreads = threads.map(t => t.id === thread.id ? updated : t);
            onSave({ ...property, threads: updatedThreads });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update thread');
        } finally {
            setUpdatingThreadIds(prev => {
                const next = new Set(prev);
                next.delete(thread.id);
                return next;
            });
        }
    };

    const handleUpdateAllThreads = async () => {
        const threadsWithNew = threads.filter(t => getNewEmailCount(t) > 0);
        if (threadsWithNew.length === 0) return;

        setUpdatingThreadIds(new Set(threadsWithNew.map(t => t.id)));
        let updatedThreads = [...threads];

        for (const thread of threadsWithNew) {
            try {
                const allEmails = getEmailsForThread(thread);
                const processedIds = new Set(thread.lastProcessedEmailIds || []);
                const newEmails = allEmails.filter(e => !processedIds.has(e.id));

                if (newEmails.length > 0) {
                    const updated = await updateThread(thread, newEmails, property.name);
                    updatedThreads = updatedThreads.map(t => t.id === thread.id ? updated : t);
                }
            } catch (err) {
                console.error(`Failed to update thread "${thread.title}":`, err);
            }
            setUpdatingThreadIds(prev => {
                const next = new Set(prev);
                next.delete(thread.id);
                return next;
            });
        }

        onSave({ ...property, threads: updatedThreads });
    };

    const handleDeleteThread = (threadId: string) => {
        if (!window.confirm('Delete this thread? The summary will be lost.')) return;
        const updatedThreads = threads.filter(t => t.id !== threadId);
        onSave({ ...property, threads: updatedThreads });
        if (selectedThreadId === threadId) setSelectedThreadId(null);
    };

    const handleToggleAction = (threadId: string, actionId: string) => {
        const updatedThreads = threads.map(t => {
            if (t.id !== threadId) return t;
            return {
                ...t,
                actions: t.actions.map(a => {
                    if (a.id !== actionId) return a;
                    const newStatus = a.status === 'done' ? 'pending' as const : 'done' as const;
                    return { ...a, status: newStatus, resolvedAt: newStatus === 'done' ? new Date().toISOString() : undefined };
                }),
                updatedAt: new Date().toISOString(),
            };
        });
        onSave({ ...property, threads: updatedThreads });
    };

    // ─── Awaiting Reply Detection ────────────────────────────────────

    const isAwaitingReply = useCallback((emails: CorrespondenceItem[]): boolean => {
        if (emails.length === 0) return false;
        const sorted = [...emails].sort((a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        return !(sorted[0].labelIds?.includes('SENT') ?? false);
    }, []);

    // ─── Draft Reply Handlers ─────────────────────────────────────────

    // Get distinct senders (non-SENT) from thread emails for recipient picker
    const getThreadSenders = useCallback((thread: ConversationThread): { email: string; display: string }[] => {
        const emails = getEmailsForThread(thread);
        const senderMap = new Map<string, string>();
        for (const e of emails) {
            if (e.labelIds?.includes('SENT')) continue;
            const match = e.from.match(/<([^>]+)>/);
            const email = match ? match[1] : e.from.trim();
            if (!senderMap.has(email.toLowerCase())) {
                senderMap.set(email.toLowerCase(), e.from);
            }
        }
        return Array.from(senderMap.entries()).map(([email, display]) => ({ email, display }));
    }, [getEmailsForThread]);

    const handleDraftReply = async (thread: ConversationThread) => {
        setIsDrafting(true);
        setError('');
        setDraftReply(null);
        setSendSuccess(false);
        try {
            const emails = getEmailsForThread(thread);

            // Auto-select recipient if not already chosen
            let recipient = draftRecipient;
            if (!recipient) {
                const senders = getThreadSenders(thread);
                if (senders.length === 1) {
                    recipient = senders[0].email;
                    setDraftRecipient(recipient);
                }
            }

            const focusAction = selectedActionId
                ? thread.actions.find(a => a.id === selectedActionId)?.description
                : undefined;
            const draft = await generateDraftReply(thread, emails, property.name, {
                focusAction,
                recipient: recipient || undefined,
            });
            setDraftReply(draft);
            setDraftBody(draft.body);
            setDraftSubject(draft.subject);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate draft');
        } finally {
            setIsDrafting(false);
        }
    };

    const handleSendReply = async (thread: ConversationThread) => {
        if (!draftBody.trim()) return;
        setIsSending(true);
        setError('');
        try {
            const emails = getEmailsForThread(thread);
            const sorted = [...emails].sort((a, b) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
            );

            // Use selected recipient, or fall back to last received email sender
            let to = draftRecipient;
            let replyToEmail: CorrespondenceItem | undefined;

            if (to) {
                // Find the most recent email from this recipient for threading
                replyToEmail = sorted.find(e => {
                    const match = e.from.match(/<([^>]+)>/);
                    const fromEmail = match ? match[1] : e.from.trim();
                    return fromEmail.toLowerCase() === to!.toLowerCase();
                });
            }

            if (!replyToEmail) {
                replyToEmail = sorted.find(e => !(e.labelIds?.includes('SENT') ?? false));
            }
            if (!replyToEmail) throw new Error('No received email to reply to');

            if (!to) {
                const toMatch = replyToEmail.from.match(/<([^>]+)>/);
                to = toMatch ? toMatch[1] : replyToEmail.from;
            }

            // Get Message-ID header for threading
            let inReplyTo: string | undefined;
            if (replyToEmail.gmailMessageId) {
                try {
                    const fullMsg = await getMessage(replyToEmail.gmailMessageId);
                    const msgIdHeader = fullMsg.payload.headers.find(
                        h => h.name.toLowerCase() === 'message-id'
                    );
                    inReplyTo = msgIdHeader?.value;
                } catch { /* proceed without threading headers */ }
            }

            await sendEmail({
                to,
                subject: draftSubject,
                body: draftBody,
                threadId: replyToEmail.gmailThreadId,
                inReplyTo,
                references: inReplyTo,
            });

            setDraftReply(null);
            setDraftBody('');
            setDraftSubject('');
            setSelectedActionId(null);
            setDraftRecipient('');
            setSendSuccess(true);
            setTimeout(() => setSendSuccess(false), 4000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to send reply');
        } finally {
            setIsSending(false);
        }
    };

    // ─── Thread Detail View ──────────────────────────────────────────

    if (selectedThread) {
        const pendingActions = selectedThread.actions.filter(a => a.status === 'pending');
        const doneActions = selectedThread.actions.filter(a => a.status === 'done');
        const emailCount = getEmailsForThread(selectedThread).length;
        const processedCount = selectedThread.lastProcessedEmailIds?.length || 0;
        const newEmailCount = emailCount - processedCount;
        const isUpdating = updatingThreadIds.has(selectedThread.id);
        const threadEmails = getEmailsForThread(selectedThread);
        const awaiting = isAwaitingReply(threadEmails);

        return (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 flex flex-col" style={{ height: 'calc(100vh - 220px)', minHeight: '500px' }}>
                {/* Header */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button onClick={() => setSelectedThreadId(null)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                <BackArrowIcon />
                            </button>
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{selectedThread.title}</h2>
                                <div className="flex items-center gap-2 mt-0.5">
                                    {selectedThread.category && (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold capitalize ${getCategoryPillColor(selectedThread.category)}`}>
                                            {selectedThread.category}
                                        </span>
                                    )}
                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                        {processedCount} emails processed
                                    </span>
                                    <span className="text-xs text-slate-400">·</span>
                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                        Updated {new Date(selectedThread.updatedAt).toLocaleDateString('en-GB')}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {sendSuccess && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-semibold">
                                    Sent!
                                </span>
                            )}
                            {awaiting && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                                    Awaiting reply
                                </span>
                            )}
                            {newEmailCount > 0 && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold">
                                    {newEmailCount} new
                                </span>
                            )}
                            <button
                                onClick={() => handleDraftReply(selectedThread)}
                                disabled={isDrafting}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                {isDrafting ? <><RefreshIcon spinning /> Drafting...</> : <><PenIcon /> Draft Reply</>}
                            </button>
                            <button
                                onClick={() => handleUpdateThread(selectedThread)}
                                disabled={isUpdating || newEmailCount === 0}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <RefreshIcon spinning={isUpdating} />
                                {isUpdating ? 'Updating...' : 'Update'}
                            </button>
                        </div>
                    </div>
                    {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Pending Actions — click to select as draft reply focus */}
                    {pendingActions.length > 0 && (
                        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-lg p-4">
                            <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-2">
                                <CircleIcon className="text-amber-500" />
                                Pending Actions ({pendingActions.length})
                                {selectedActionId && (
                                    <button
                                        onClick={() => setSelectedActionId(null)}
                                        className="text-[10px] font-normal text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 ml-1"
                                    >
                                        clear selection
                                    </button>
                                )}
                            </h3>
                            <div className="space-y-1">
                                {pendingActions.map(action => {
                                    const isSelected = selectedActionId === action.id;
                                    return (
                                        <div
                                            key={action.id}
                                            onClick={() => setSelectedActionId(isSelected ? null : action.id)}
                                            className={`flex items-center gap-2 rounded-lg px-3 py-2 -mx-1 cursor-pointer transition-all ${
                                                isSelected
                                                    ? 'bg-purple-100 dark:bg-purple-900/30 ring-1 ring-purple-300 dark:ring-purple-700'
                                                    : 'hover:bg-amber-100/50 dark:hover:bg-amber-900/20'
                                            }`}
                                        >
                                            <span className={`text-sm flex-1 ${
                                                isSelected
                                                    ? 'text-purple-800 dark:text-purple-200 font-medium'
                                                    : 'text-slate-700 dark:text-slate-300'
                                            }`}>
                                                {action.description}
                                            </span>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleToggleAction(selectedThread.id, action.id); }}
                                                className="text-[10px] px-1.5 py-0.5 rounded text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 dark:hover:text-green-400 transition-colors flex-shrink-0"
                                                title="Mark as resolved"
                                            >
                                                <CheckCircleIcon className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                            {/* Inline draft action bar — appears when action selected */}
                            {selectedActionId && !draftReply && !isDrafting && (
                                <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-800/30">
                                    <div className="flex items-center gap-3">
                                        {(() => {
                                            const senders = getThreadSenders(selectedThread);
                                            return (
                                                <>
                                                    <span className="text-[10px] uppercase tracking-wider font-bold text-purple-600 dark:text-purple-400 flex-shrink-0">Reply to</span>
                                                    <div className="flex gap-1.5 flex-wrap flex-1">
                                                        {senders.map(s => {
                                                            const active = draftRecipient === s.email;
                                                            const displayName = s.display.match(/^([^<]+)/)?.[1]?.trim() || s.email;
                                                            return (
                                                                <button
                                                                    key={s.email}
                                                                    onClick={() => setDraftRecipient(active ? '' : s.email)}
                                                                    className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                                                                        active
                                                                            ? 'bg-purple-600 text-white'
                                                                            : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800/40'
                                                                    }`}
                                                                >
                                                                    {displayName}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                    <button
                                                        onClick={() => handleDraftReply(selectedThread)}
                                                        disabled={isDrafting}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40 transition-colors font-medium flex-shrink-0"
                                                    >
                                                        <PenIcon /> Draft Reply
                                                    </button>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Draft Reply Editor */}
                    {(draftReply || isDrafting) && (
                        <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800/30 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-bold text-purple-800 dark:text-purple-300 flex items-center gap-2">
                                    <PenIcon />
                                    Draft Reply
                                    {draftReply?.confidence && draftReply.confidence !== 'high' && (
                                        <span className={`text-[10px] font-normal px-1.5 py-0.5 rounded-full ${
                                            draftReply.confidence === 'medium'
                                                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                                                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                                        }`}>
                                            {draftReply.confidence} confidence
                                        </span>
                                    )}
                                </h3>
                                {!isDrafting && (
                                    <button
                                        onClick={() => { setDraftReply(null); setDraftBody(''); setDraftSubject(''); setSelectedActionId(null); setDraftRecipient(''); }}
                                        className="text-xs text-purple-500 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
                                    >
                                        Discard
                                    </button>
                                )}
                            </div>
                            {isDrafting ? (
                                <div className="flex items-center gap-2 py-6 justify-center text-purple-600 dark:text-purple-400">
                                    <RefreshIcon spinning /> Generating draft reply...
                                </div>
                            ) : (
                                <>
                                    {draftReply?.notes && (
                                        <p className="text-xs text-purple-600 dark:text-purple-400 mb-3 italic bg-purple-100/50 dark:bg-purple-900/20 rounded p-2">
                                            {draftReply.notes}
                                        </p>
                                    )}
                                    {/* Recipient picker */}
                                    {(() => {
                                        const senders = getThreadSenders(selectedThread);
                                        if (senders.length <= 1) return null;
                                        return (
                                            <div className="mb-2">
                                                <label className="text-[10px] uppercase tracking-wider font-bold text-purple-600 dark:text-purple-400 mb-1 block">To</label>
                                                <div className="flex gap-1.5 flex-wrap">
                                                    {senders.map(s => {
                                                        const active = draftRecipient === s.email;
                                                        const displayName = s.display.match(/^([^<]+)/)?.[1]?.trim() || s.email;
                                                        return (
                                                            <button
                                                                key={s.email}
                                                                onClick={() => setDraftRecipient(active ? '' : s.email)}
                                                                className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                                                                    active
                                                                        ? 'bg-purple-600 text-white'
                                                                        : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800/40'
                                                                }`}
                                                            >
                                                                {displayName}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                    <input
                                        value={draftSubject}
                                        onChange={e => setDraftSubject(e.target.value)}
                                        className="w-full mb-2 px-3 py-1.5 text-sm rounded-lg border border-purple-200 dark:border-purple-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                                        placeholder="Subject"
                                    />
                                    <textarea
                                        value={draftBody}
                                        onChange={e => setDraftBody(e.target.value)}
                                        rows={8}
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-purple-200 dark:border-purple-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none resize-y font-mono"
                                        placeholder="Reply body..."
                                    />
                                    <div className="flex items-center justify-between mt-3">
                                        <button
                                            onClick={() => handleDraftReply(selectedThread)}
                                            disabled={isDrafting}
                                            className="text-xs text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-200 transition-colors"
                                        >
                                            Regenerate
                                        </button>
                                        <button
                                            onClick={() => handleSendReply(selectedThread)}
                                            disabled={isSending || !draftBody.trim()}
                                            className="flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-semibold"
                                        >
                                            <SendIcon />
                                            {isSending ? 'Sending...' : 'Send Reply'}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Summary */}
                    <div className="bg-slate-50 dark:bg-slate-900/30 rounded-lg p-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Summary</h3>
                        <div className="max-w-none">
                            <MarkdownBlock text={selectedThread.summary} />
                        </div>
                    </div>

                    {/* Timeline */}
                    {selectedThread.timeline && (
                        <div className="bg-slate-50 dark:bg-slate-900/30 rounded-lg p-4">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Timeline</h3>
                            <TimelineBlock text={selectedThread.timeline} />
                        </div>
                    )}

                    {/* Resolved Actions */}
                    {doneActions.length > 0 && (
                        <div className="opacity-60">
                            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-2">
                                <CheckCircleIcon className="text-green-500" />
                                Resolved ({doneActions.length})
                            </h3>
                            <div className="space-y-1.5">
                                {doneActions.map(action => (
                                    <label key={action.id} className="flex items-start gap-2 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={true}
                                            onChange={() => handleToggleAction(selectedThread.id, action.id)}
                                            className="mt-0.5 rounded border-green-300 text-green-600 focus:ring-green-500"
                                        />
                                        <span className="text-sm text-slate-500 dark:text-slate-400 line-through">
                                            {action.description}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ─── Thread List View ────────────────────────────────────────────

    const isAnyUpdating = updatingThreadIds.size > 0;

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 flex flex-col" style={{ height: 'calc(100vh - 220px)', minHeight: '500px' }}>
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                        <ThreadIcon /> Threads
                    </h2>
                    <div className="flex items-center gap-2">
                        {totalNewEmails > 0 && (
                            <button
                                onClick={handleUpdateAllThreads}
                                disabled={isAnyUpdating}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
                                title="Update all threads with new emails"
                            >
                                <RefreshIcon spinning={isAnyUpdating} />
                                {isAnyUpdating
                                    ? `Updating ${updatingThreadIds.size}...`
                                    : `Update all (${totalNewEmails} new)`
                                }
                            </button>
                        )}
                        <button
                            onClick={() => { setShowNewThreadForm(!showNewThreadForm); setSelectedTag(availableTags[0] || 'custom'); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                        >
                            <PlusIcon /> New Thread
                        </button>
                    </div>
                </div>

                {/* New thread form */}
                {showNewThreadForm && (
                    <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg space-y-3">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Create an AI-generated briefing from your correspondence. Choose a tag or specify custom senders.
                        </p>
                        <div className="flex gap-2 flex-wrap">
                            {availableTags.map(tag => {
                                const emailCount = getEmailsForCategory(tag).length;
                                const isSelected = selectedTag === tag;
                                return (
                                    <button
                                        key={tag}
                                        onClick={() => setSelectedTag(tag)}
                                        className={`text-xs px-2.5 py-1 rounded-full transition-colors flex items-center gap-1.5 capitalize ${
                                            isSelected
                                                ? `${getCategoryPillColor(tag)} ring-2 ring-offset-1 ring-current dark:ring-offset-slate-900`
                                                : CATEGORY_UNSELECTED
                                        }`}
                                    >
                                        {tag}
                                        <span className="opacity-60">({emailCount})</span>
                                    </button>
                                );
                            })}
                            <button
                                onClick={() => setSelectedTag('custom')}
                                className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                                    selectedTag === 'custom'
                                        ? 'bg-slate-600 text-white'
                                        : CATEGORY_UNSELECTED
                                }`}
                            >
                                Custom senders
                            </button>
                        </div>
                        {selectedTag === 'custom' && (
                            <input
                                type="text"
                                value={customSenders}
                                onChange={e => setCustomSenders(e.target.value)}
                                placeholder="Comma-separated email addresses..."
                                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        )}
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                {selectedTag !== 'custom'
                                    ? `${getEmailsForCategory(selectedTag).length} emails`
                                    : customSenders.trim() ? `${allCorrespondence.filter(c => customSenders.split(',').some(s => c.from.toLowerCase().includes(s.trim().toLowerCase()))).length} emails` : ''
                                }
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => { setShowNewThreadForm(false); setError(''); }}
                                    className="px-3 py-1.5 text-sm rounded-lg bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateThread}
                                    disabled={isGenerating}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
                                >
                                    {isGenerating ? <><RefreshIcon spinning /> Generating...</> : 'Generate'}
                                </button>
                            </div>
                        </div>
                        {error && <p className="text-xs text-red-500">{error}</p>}
                    </div>
                )}
            </div>

            {/* Thread list */}
            <div className="flex-1 overflow-y-auto">
                {threads.length > 0 ? threads.map(thread => {
                    const pending = thread.actions.filter(a => a.status === 'pending').length;
                    const newCount = getNewEmailCount(thread);
                    const isUpdating = updatingThreadIds.has(thread.id);
                    const threadAwaiting = isAwaitingReply(getEmailsForThread(thread));

                    return (
                        <div
                            key={thread.id}
                            className={`p-4 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer flex items-start gap-3 ${
                                threadAwaiting ? 'border-l-3 border-l-purple-400 dark:border-l-purple-500' : ''
                            }`}
                            onClick={() => setSelectedThreadId(thread.id)}
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">{thread.title}</h3>
                                    {thread.category && (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold capitalize flex-shrink-0 ${getCategoryPillColor(thread.category)}`}>
                                            {thread.category}
                                        </span>
                                    )}
                                    {threadAwaiting && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 flex-shrink-0">
                                            Awaiting reply
                                        </span>
                                    )}
                                    {isUpdating && (
                                        <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 flex-shrink-0">
                                            <RefreshIcon spinning className="w-3 h-3" /> Updating
                                        </span>
                                    )}
                                    {!isUpdating && newCount > 0 && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 flex-shrink-0">
                                            {newCount} new
                                        </span>
                                    )}
                                </div>
                                {(() => {
                                    const senders = getThreadSenders(thread);
                                    if (senders.length === 0) return null;
                                    const names = senders.map(s => {
                                        const nameMatch = s.display.match(/^([^<]+)</);
                                        return nameMatch ? nameMatch[1].trim().replace(/["']/g, '') : s.email;
                                    });
                                    return (
                                        <p className="text-[13px] font-medium text-slate-600 dark:text-slate-300 truncate mb-0.5">
                                            <span className="font-normal text-slate-400 dark:text-slate-500">with </span>
                                            {names.join(', ')}
                                        </p>
                                    );
                                })()}
                                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                                    {thread.summary.slice(0, 150)}...
                                </p>
                                <div className="flex items-center gap-3 mt-1.5">
                                    {pending > 0 && (
                                        <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                                            {pending} pending action{pending !== 1 ? 's' : ''}
                                        </span>
                                    )}
                                    <span className="text-[10px] text-slate-400">
                                        Updated {new Date(thread.updatedAt).toLocaleDateString('en-GB')}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={e => { e.stopPropagation(); handleDeleteThread(thread.id); }}
                                className="p-1.5 text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
                            >
                                <TrashIcon />
                            </button>
                        </div>
                    );
                }) : (
                    <div className="flex flex-col items-center justify-center h-full text-center px-8">
                        <ThreadIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
                        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">No threads yet</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                            Create a thread to get an AI-generated briefing of your correspondence. Threads track action items and update as new emails arrive.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ThreadsSection;
