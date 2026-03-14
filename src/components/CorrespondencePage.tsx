import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { CorrespondenceStore, CorrespondenceItem, ConversationThread, GmailSyncConfig, SyncRuleCategory } from '../types';
import { generateThread, updateThread, generateDraftReply, type DraftReply, type ThreadContext } from '../lib/summarizeThread';
import { syncGmail, clearGmailCorrespondence } from '../lib/gmailSync';
import { sendEmail, getMessage, isGmailAuthenticated, signInWithGmail } from '../lib/gmail';
import { getCategoryPillColor, CATEGORY_UNSELECTED } from '../lib/categoryColors';
import GmailSyncConfigPanel from './property-detail/GmailSyncConfigPanel';
import { v4 as uuidv4 } from 'uuid';

// ─── Icons ───────────────────────────────────────────────────────────

const ThreadIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
    <svg className={`w-5 h-5 ${className}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
    </svg>
);
const EnvelopeIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
    <svg className={`w-5 h-5 ${className}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
    </svg>
);
const RefreshIcon: React.FC<{ className?: string; spinning?: boolean }> = ({ className = '', spinning }) => (
    <svg className={`w-4 h-4 ${spinning ? 'animate-spin' : ''} ${className}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
    </svg>
);
const PlusIcon: React.FC = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
);
const TrashIcon: React.FC = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
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
const SearchIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
    <svg className={`w-4 h-4 ${className}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
);
const StarIcon: React.FC<{ filled?: boolean; className?: string }> = ({ filled, className = '' }) => (
    <svg className={`w-4 h-4 ${className}`} fill={filled ? 'currentColor' : 'none'} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
    </svg>
);

// ─── Markdown Renderers (shared with ThreadsSection pattern) ─────────

const InlineMarkdown: React.FC<{ text: string }> = ({ text }) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return <>{parts.map((part, i) => part.startsWith('**') && part.endsWith('**') ? <strong key={i} className="font-semibold text-slate-800 dark:text-slate-200">{part.slice(2, -2)}</strong> : <span key={i}>{part}</span>)}</>;
};

const MarkdownBlock: React.FC<{ text: string }> = ({ text }) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let listItems: string[] = [];
    let listKey = 0;
    const flushList = () => { if (listItems.length === 0) return; elements.push(<ul key={`list-${listKey++}`} className="list-disc list-inside space-y-1 my-2">{listItems.map((item, i) => <li key={i} className="text-sm text-slate-600 dark:text-slate-300"><InlineMarkdown text={item} /></li>)}</ul>); listItems = []; };
    lines.forEach((line, i) => {
        const trimmed = line.trim();
        if (/^[-*•]\s+/.test(trimmed)) { listItems.push(trimmed.replace(/^[-*•]\s+/, '')); return; }
        flushList();
        if (!trimmed) { elements.push(<div key={`br-${i}`} className="h-2" />); return; }
        if (/^\*\*[^*]+\*\*:?$/.test(trimmed)) { elements.push(<p key={i} className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-3 mb-1">{trimmed.replace(/\*\*/g, '').replace(/:$/, '')}</p>); return; }
        elements.push(<p key={i} className="text-sm text-slate-600 dark:text-slate-300"><InlineMarkdown text={trimmed} /></p>);
    });
    flushList();
    return <>{elements}</>;
};

const TimelineBlock: React.FC<{ text: string }> = ({ text }) => {
    let entries = text.split('\n').filter(l => l.trim());
    if (entries.length <= 1 && text.length > 200) entries = text.split(/(?=\*{0,2}\d{4}-\d{2}-\d{2}\*{0,2}\s*[—–-])/).filter(l => l.trim());
    const parsed = entries.map(line => { const m = line.trim().match(/^\*{0,2}(\d{4}-\d{2}-\d{2})\*{0,2}\s*[—–-]\s*(.+)$/s); return m ? { date: m[1], desc: m[2].trim() } : null; }).filter(Boolean) as { date: string; desc: string }[];
    if (parsed.length === 0) return <MarkdownBlock text={text} />;
    return (
        <div className="relative pl-4 border-l-2 border-slate-200 dark:border-slate-600 space-y-3">
            {parsed.map((entry, i) => (
                <div key={i} className="relative">
                    <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-500 border-2 border-white dark:border-slate-800" />
                    <div className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mb-0.5">{new Date(entry.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                    <p className="text-sm text-slate-600 dark:text-slate-300"><InlineMarkdown text={entry.desc} /></p>
                </div>
            ))}
        </div>
    );
};

// ─── Constants ────────────────────────────────────────────────────────

const DEFAULT_SYNC_CONFIG: GmailSyncConfig = { rules: [], autoSync: false };
const THREAD_CONTEXT: ThreadContext = { name: 'General Correspondence', type: 'general' };

type ViewMode = 'emails' | 'threads';
type EmailFilter = 'all' | 'starred' | 'unread' | 'sent' | 'received';

// ─── Props ────────────────────────────────────────────────────────────

interface CorrespondencePageProps {
    store: CorrespondenceStore;
    onSave: (store: CorrespondenceStore) => void;
}

// ─── Component ────────────────────────────────────────────────────────

const CorrespondencePage: React.FC<CorrespondencePageProps> = ({ store, onSave }) => {
    const [viewMode, setViewMode] = useState<ViewMode>('threads');
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncMessage, setSyncMessage] = useState('');

    // ─── Email list state ─────────────────────────────────────────────
    const [emailFilter, setEmailFilter] = useState<EmailFilter>('all');
    const [emailSearch, setEmailSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
    const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);

    // ─── Thread state ─────────────────────────────────────────────────
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
    const [draftRecipient, setDraftRecipient] = useState('');

    const correspondence = store.correspondence;
    const threads = store.threads;
    const syncConfig = store.gmailSync || DEFAULT_SYNC_CONFIG;

    const prevCorrespondenceCountRef = useRef(correspondence.length);

    // ─── Gmail Sync ───────────────────────────────────────────────────

    const handleSyncNow = useCallback(async (fullSync = false, selectedRuleIds?: string[]) => {
        setIsSyncing(true);
        setSyncMessage('');
        try {
            if (!isGmailAuthenticated()) await signInWithGmail();
            const result = await syncGmail(correspondence, syncConfig, fullSync, selectedRuleIds);
            onSave({ ...store, correspondence: result.correspondence, gmailSync: result.syncConfig });
            setSyncMessage(result.newCount > 0 ? `Synced ${result.newCount} new email${result.newCount !== 1 ? 's' : ''}` : 'No new emails');
        } catch (err) {
            setSyncMessage(err instanceof Error ? err.message : 'Sync failed');
        } finally {
            setIsSyncing(false);
        }
    }, [correspondence, syncConfig, store, onSave]);

    const handleClearGmail = useCallback(() => {
        if (!window.confirm('Remove all Gmail-synced emails? Manual entries will be kept.')) return;
        onSave({ ...store, correspondence: clearGmailCorrespondence(correspondence) });
    }, [correspondence, store, onSave]);

    const handleSyncConfigSave = useCallback((config: GmailSyncConfig) => {
        onSave({ ...store, gmailSync: config });
    }, [store, onSave]);

    // ─── Email helpers ────────────────────────────────────────────────

    const emailMatchesRule = useCallback((email: CorrespondenceItem, rule: { query: string }): boolean => {
        const from = email.from.toLowerCase();
        const to = (email.to || '').toLowerCase();
        const q = rule.query.toLowerCase();
        const fromEmail = from.split('<').pop()?.replace('>', '').trim() || '';
        return from.includes(q) || q.includes(fromEmail) || to.includes(q);
    }, []);

    const getEmailsForCategory = useCallback((category: string) => {
        const rulesForCat = syncConfig.rules.filter(r => r.category === category);
        if (rulesForCat.length === 0) return [];
        return correspondence.filter(c => rulesForCat.some(rule => emailMatchesRule(c, rule)));
    }, [correspondence, syncConfig.rules, emailMatchesRule]);

    const getEmailsForThread = useCallback((thread: { category?: SyncRuleCategory; filterSenders?: string[] }) => {
        if (thread.category) return getEmailsForCategory(thread.category);
        if (thread.filterSenders?.length) {
            return correspondence.filter(c => {
                const from = c.from.toLowerCase();
                const to = (c.to || '').toLowerCase();
                return thread.filterSenders!.some(s => { const sl = s.toLowerCase(); return from.includes(sl) || to.includes(sl); });
            });
        }
        return [];
    }, [correspondence, getEmailsForCategory]);

    const getNewEmailCount = useCallback((thread: ConversationThread) => {
        const allEmails = getEmailsForThread(thread);
        const processedIds = new Set(thread.lastProcessedEmailIds || []);
        return allEmails.filter(e => !processedIds.has(e.id)).length;
    }, [getEmailsForThread]);

    const getThreadSenders = useCallback((thread: ConversationThread): { email: string; display: string }[] => {
        const emails = getEmailsForThread(thread);
        const senderMap = new Map<string, string>();
        for (const e of emails) {
            if (e.labelIds?.includes('SENT')) continue;
            const match = e.from.match(/<([^>]+)>/);
            const email = match ? match[1] : e.from.trim();
            if (!senderMap.has(email.toLowerCase())) senderMap.set(email.toLowerCase(), e.from);
        }
        return Array.from(senderMap.entries()).map(([email, display]) => ({ email, display }));
    }, [getEmailsForThread]);

    const isAwaitingReply = useCallback((emails: CorrespondenceItem[]): boolean => {
        if (emails.length === 0) return false;
        const sorted = [...emails].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return !(sorted[0].labelIds?.includes('SENT') ?? false);
    }, []);

    const availableTags = syncConfig.tags || [];
    const totalNewEmails = threads.reduce((sum, t) => sum + getNewEmailCount(t), 0);
    const selectedThread = threads.find(t => t.id === selectedThreadId) || null;
    const gmailCount = correspondence.filter(c => c.source === 'gmail').length;

    // ─── Filtered emails ──────────────────────────────────────────────

    const filteredEmails = useMemo(() => {
        let items = [...correspondence];

        // Category filter
        if (categoryFilter) {
            const rulesForCat = syncConfig.rules.filter(r => r.category === categoryFilter);
            if (rulesForCat.length > 0) {
                items = items.filter(c => rulesForCat.some(rule => emailMatchesRule(c, rule)));
            }
        }

        // Type filter
        if (emailFilter === 'starred') items = items.filter(c => c.starred);
        else if (emailFilter === 'unread') items = items.filter(c => !c.read);
        else if (emailFilter === 'sent') items = items.filter(c => c.labelIds?.includes('SENT'));
        else if (emailFilter === 'received') items = items.filter(c => !c.labelIds?.includes('SENT'));

        // Search
        if (emailSearch.trim()) {
            const q = emailSearch.toLowerCase();
            items = items.filter(c =>
                c.subject.toLowerCase().includes(q) ||
                c.from.toLowerCase().includes(q) ||
                c.body.toLowerCase().includes(q)
            );
        }

        return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [correspondence, emailFilter, emailSearch, categoryFilter, syncConfig.rules, emailMatchesRule]);

    // ─── Email actions ────────────────────────────────────────────────

    const handleToggleStar = useCallback((id: string) => {
        const updated = correspondence.map(c => c.id === id ? { ...c, starred: !c.starred } : c);
        onSave({ ...store, correspondence: updated });
    }, [correspondence, store, onSave]);

    const handleMarkRead = useCallback((id: string) => {
        const updated = correspondence.map(c => c.id === id ? { ...c, read: true } : c);
        onSave({ ...store, correspondence: updated });
    }, [correspondence, store, onSave]);

    // ─── Auto-update threads on new emails ────────────────────────────

    const autoUpdateThreads = useCallback(async (currentStore: CorrespondenceStore) => {
        const currentThreads = currentStore.threads;
        const currentCorrespondence = currentStore.correspondence;
        if (currentThreads.length === 0) return;

        const threadsToUpdate = currentThreads.filter(thread => {
            const allEmails = (() => {
                if (thread.category) {
                    const rulesForCat = (currentStore.gmailSync || DEFAULT_SYNC_CONFIG).rules.filter(r => r.category === thread.category);
                    if (rulesForCat.length === 0) return [];
                    return currentCorrespondence.filter(c =>
                        rulesForCat.some(rule => { const from = c.from.toLowerCase(); const q = rule.query.toLowerCase(); return from.includes(q) || q.includes(from.split('<').pop()?.replace('>', '').trim() || ''); })
                    );
                }
                if (thread.filterSenders?.length) {
                    return currentCorrespondence.filter(c => { const from = c.from.toLowerCase(); const to = (c.to || '').toLowerCase(); return thread.filterSenders!.some(s => { const sl = s.toLowerCase(); return from.includes(sl) || to.includes(sl); }); });
                }
                return [];
            })();
            const processedIds = new Set(thread.lastProcessedEmailIds || []);
            return allEmails.some(e => !processedIds.has(e.id));
        });

        if (threadsToUpdate.length === 0) return;

        setUpdatingThreadIds(new Set(threadsToUpdate.map(t => t.id)));
        let updatedThreads = [...currentThreads];

        for (const thread of threadsToUpdate) {
            try {
                const allEmails = (() => {
                    if (thread.category) {
                        const rulesForCat = (currentStore.gmailSync || DEFAULT_SYNC_CONFIG).rules.filter(r => r.category === thread.category);
                        return currentCorrespondence.filter(c =>
                            rulesForCat.some(rule => { const from = c.from.toLowerCase(); const q = rule.query.toLowerCase(); return from.includes(q) || q.includes(from.split('<').pop()?.replace('>', '').trim() || ''); })
                        );
                    }
                    if (thread.filterSenders?.length) {
                        return currentCorrespondence.filter(c => { const from = c.from.toLowerCase(); return thread.filterSenders!.some(s => from.includes(s.toLowerCase())); });
                    }
                    return [];
                })();
                const processedIds = new Set(thread.lastProcessedEmailIds || []);
                const newEmails = allEmails.filter(e => !processedIds.has(e.id));
                if (newEmails.length > 0) {
                    const updated = await updateThread(thread, newEmails, THREAD_CONTEXT);
                    updatedThreads = updatedThreads.map(t => t.id === thread.id ? updated : t);
                }
            } catch (err) {
                console.error(`Failed to auto-update thread "${thread.title}":`, err);
            }
            setUpdatingThreadIds(prev => { const next = new Set(prev); next.delete(thread.id); return next; });
        }

        onSave({ ...currentStore, threads: updatedThreads });
    }, [onSave]);

    useEffect(() => {
        const prevCount = prevCorrespondenceCountRef.current;
        prevCorrespondenceCountRef.current = correspondence.length;
        if (correspondence.length > prevCount && threads.length > 0) autoUpdateThreads(store);
    }, [correspondence.length]); // eslint-disable-line react-hooks/exhaustive-deps

    // ─── Thread handlers ──────────────────────────────────────────────

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
                emails = correspondence.filter(c => { const from = c.from.toLowerCase(); return senders.some(s => from.includes(s.toLowerCase())); });
            } else {
                category = selectedTag;
                emails = getEmailsForCategory(selectedTag);
            }

            if (emails.length === 0) throw new Error('No correspondence found for this filter');
            const thread = await generateThread(emails, THREAD_CONTEXT, category, filterSenders);
            onSave({ ...store, threads: [...threads, thread] });
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
            if (newEmails.length === 0) { setError('No new emails to process'); return; }
            const updated = await updateThread(thread, newEmails, THREAD_CONTEXT);
            onSave({ ...store, threads: threads.map(t => t.id === thread.id ? updated : t) });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update thread');
        } finally {
            setUpdatingThreadIds(prev => { const next = new Set(prev); next.delete(thread.id); return next; });
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
                if (newEmails.length > 0) { const updated = await updateThread(thread, newEmails, THREAD_CONTEXT); updatedThreads = updatedThreads.map(t => t.id === thread.id ? updated : t); }
            } catch (err) { console.error(`Failed to update thread "${thread.title}":`, err); }
            setUpdatingThreadIds(prev => { const next = new Set(prev); next.delete(thread.id); return next; });
        }
        onSave({ ...store, threads: updatedThreads });
    };

    const handleDeleteThread = (threadId: string) => {
        if (!window.confirm('Delete this thread? The summary will be lost.')) return;
        onSave({ ...store, threads: threads.filter(t => t.id !== threadId) });
        if (selectedThreadId === threadId) setSelectedThreadId(null);
    };

    const handleToggleAction = (threadId: string, actionId: string) => {
        const updatedThreads = threads.map(t => {
            if (t.id !== threadId) return t;
            return { ...t, actions: t.actions.map(a => { if (a.id !== actionId) return a; const newStatus = a.status === 'done' ? 'pending' as const : 'done' as const; return { ...a, status: newStatus, resolvedAt: newStatus === 'done' ? new Date().toISOString() : undefined }; }), updatedAt: new Date().toISOString() };
        });
        onSave({ ...store, threads: updatedThreads });
    };

    // ─── Draft reply ──────────────────────────────────────────────────

    const handleDraftReply = async (thread: ConversationThread) => {
        setIsDrafting(true); setError(''); setDraftReply(null); setSendSuccess(false);
        try {
            const emails = getEmailsForThread(thread);
            let recipient = draftRecipient;
            if (!recipient) { const senders = getThreadSenders(thread); if (senders.length === 1) { recipient = senders[0].email; setDraftRecipient(recipient); } }
            const focusAction = selectedActionId ? thread.actions.find(a => a.id === selectedActionId)?.description : undefined;
            const draft = await generateDraftReply(thread, emails, THREAD_CONTEXT, { focusAction, recipient: recipient || undefined });
            setDraftReply(draft); setDraftBody(draft.body); setDraftSubject(draft.subject);
        } catch (err) { setError(err instanceof Error ? err.message : 'Failed to generate draft'); }
        finally { setIsDrafting(false); }
    };

    const handleSendReply = async (thread: ConversationThread) => {
        if (!draftBody.trim()) return;
        setIsSending(true); setError('');
        try {
            const emails = getEmailsForThread(thread);
            const sorted = [...emails].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            let to = draftRecipient;
            let replyToEmail: CorrespondenceItem | undefined;
            if (to) replyToEmail = sorted.find(e => { const m = e.from.match(/<([^>]+)>/); const fe = m ? m[1] : e.from.trim(); return fe.toLowerCase() === to!.toLowerCase(); });
            if (!replyToEmail) replyToEmail = sorted.find(e => !(e.labelIds?.includes('SENT') ?? false));
            if (!replyToEmail) throw new Error('No received email to reply to');
            if (!to) { const m = replyToEmail.from.match(/<([^>]+)>/); to = m ? m[1] : replyToEmail.from; }

            let inReplyTo: string | undefined;
            if (replyToEmail.gmailMessageId) {
                try { const fullMsg = await getMessage(replyToEmail.gmailMessageId); const h = fullMsg.payload.headers.find(h => h.name.toLowerCase() === 'message-id'); inReplyTo = h?.value; } catch { /* proceed */ }
            }
            await sendEmail({ to, subject: draftSubject, body: draftBody, threadId: replyToEmail.gmailThreadId, inReplyTo, references: inReplyTo });
            setDraftReply(null); setDraftBody(''); setDraftSubject(''); setSelectedActionId(null); setDraftRecipient(''); setSendSuccess(true);
            setTimeout(() => setSendSuccess(false), 4000);
        } catch (err) { setError(err instanceof Error ? err.message : 'Failed to send reply'); }
        finally { setIsSending(false); }
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
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <button onClick={() => setSelectedThreadId(null)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <BackArrowIcon />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Correspondence</h1>
                        <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">Thread detail</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 flex flex-col" style={{ height: 'calc(100vh - 220px)', minHeight: '500px' }}>
                    {/* Thread Header */}
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{selectedThread.title}</h2>
                                <div className="flex items-center gap-2 mt-0.5">
                                    {selectedThread.category && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold capitalize ${getCategoryPillColor(selectedThread.category)}`}>{selectedThread.category}</span>}
                                    <span className="text-xs text-slate-500 dark:text-slate-400">{processedCount} emails processed</span>
                                    <span className="text-xs text-slate-400">·</span>
                                    <span className="text-xs text-slate-500 dark:text-slate-400">Updated {new Date(selectedThread.updatedAt).toLocaleDateString('en-GB')}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {sendSuccess && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-semibold">Sent!</span>}
                                {awaiting && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">Awaiting reply</span>}
                                {newEmailCount > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold">{newEmailCount} new</span>}
                                <button onClick={() => handleDraftReply(selectedThread)} disabled={isDrafting} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                    {isDrafting ? <><RefreshIcon spinning /> Drafting...</> : <><PenIcon /> Draft Reply</>}
                                </button>
                                <button onClick={() => handleUpdateThread(selectedThread)} disabled={isUpdating || newEmailCount === 0} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                    <RefreshIcon spinning={isUpdating} /> {isUpdating ? 'Updating...' : 'Update'}
                                </button>
                            </div>
                        </div>
                        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
                    </div>

                    {/* Thread Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* Pending Actions */}
                        {pendingActions.length > 0 && (
                            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-lg p-4">
                                <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-2">
                                    <CircleIcon className="text-amber-500" /> Pending Actions ({pendingActions.length})
                                    {selectedActionId && <button onClick={() => setSelectedActionId(null)} className="text-[10px] font-normal text-amber-600 dark:text-amber-400 hover:text-amber-800 ml-1">clear selection</button>}
                                </h3>
                                <div className="space-y-1">
                                    {pendingActions.map(action => {
                                        const isSelected = selectedActionId === action.id;
                                        return (
                                            <div key={action.id} onClick={() => setSelectedActionId(isSelected ? null : action.id)}
                                                className={`flex items-center gap-2 rounded-lg px-3 py-2 -mx-1 cursor-pointer transition-all ${isSelected ? 'bg-purple-100 dark:bg-purple-900/30 ring-1 ring-purple-300 dark:ring-purple-700' : 'hover:bg-amber-100/50 dark:hover:bg-amber-900/20'}`}>
                                                <span className={`text-sm flex-1 ${isSelected ? 'text-purple-800 dark:text-purple-200 font-medium' : 'text-slate-700 dark:text-slate-300'}`}>{action.description}</span>
                                                <button onClick={(e) => { e.stopPropagation(); handleToggleAction(selectedThread.id, action.id); }} className="text-[10px] px-1.5 py-0.5 rounded text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 dark:hover:text-green-400 transition-colors flex-shrink-0" title="Mark as resolved">
                                                    <CheckCircleIcon className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                                {selectedActionId && !draftReply && !isDrafting && (
                                    <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-800/30">
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] uppercase tracking-wider font-bold text-purple-600 dark:text-purple-400 flex-shrink-0">Reply to</span>
                                            <div className="flex gap-1.5 flex-wrap flex-1">
                                                {getThreadSenders(selectedThread).map(s => {
                                                    const active = draftRecipient === s.email;
                                                    const displayName = s.display.match(/^([^<]+)/)?.[1]?.trim() || s.email;
                                                    return <button key={s.email} onClick={() => setDraftRecipient(active ? '' : s.email)} className={`text-xs px-2 py-0.5 rounded-full transition-colors ${active ? 'bg-purple-600 text-white' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800/40'}`}>{displayName}</button>;
                                                })}
                                            </div>
                                            <button onClick={() => handleDraftReply(selectedThread)} disabled={isDrafting} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40 transition-colors font-medium flex-shrink-0">
                                                <PenIcon /> Draft Reply
                                            </button>
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
                                        <PenIcon /> Draft Reply
                                        {draftReply?.confidence && draftReply.confidence !== 'high' && (
                                            <span className={`text-[10px] font-normal px-1.5 py-0.5 rounded-full ${draftReply.confidence === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}>{draftReply.confidence} confidence</span>
                                        )}
                                    </h3>
                                    {!isDrafting && <button onClick={() => { setDraftReply(null); setDraftBody(''); setDraftSubject(''); setSelectedActionId(null); setDraftRecipient(''); }} className="text-xs text-purple-500 hover:text-purple-700 dark:hover:text-purple-300 transition-colors">Discard</button>}
                                </div>
                                {isDrafting ? (
                                    <div className="flex items-center gap-2 py-6 justify-center text-purple-600 dark:text-purple-400"><RefreshIcon spinning /> Generating draft reply...</div>
                                ) : (
                                    <>
                                        {draftReply?.notes && <p className="text-xs text-purple-600 dark:text-purple-400 mb-3 italic bg-purple-100/50 dark:bg-purple-900/20 rounded p-2">{draftReply.notes}</p>}
                                        {(() => { const senders = getThreadSenders(selectedThread); if (senders.length <= 1) return null; return (
                                            <div className="mb-2">
                                                <label className="text-[10px] uppercase tracking-wider font-bold text-purple-600 dark:text-purple-400 mb-1 block">To</label>
                                                <div className="flex gap-1.5 flex-wrap">
                                                    {senders.map(s => { const active = draftRecipient === s.email; const dn = s.display.match(/^([^<]+)/)?.[1]?.trim() || s.email; return <button key={s.email} onClick={() => setDraftRecipient(active ? '' : s.email)} className={`text-xs px-2.5 py-1 rounded-full transition-colors ${active ? 'bg-purple-600 text-white' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800/40'}`}>{dn}</button>; })}
                                                </div>
                                            </div>
                                        ); })()}
                                        <input value={draftSubject} onChange={e => setDraftSubject(e.target.value)} className="w-full mb-2 px-3 py-1.5 text-sm rounded-lg border border-purple-200 dark:border-purple-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none" placeholder="Subject" />
                                        <textarea value={draftBody} onChange={e => setDraftBody(e.target.value)} rows={8} className="w-full px-3 py-2 text-sm rounded-lg border border-purple-200 dark:border-purple-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none resize-y font-mono" placeholder="Reply body..." />
                                        <div className="flex items-center justify-between mt-3">
                                            <button onClick={() => handleDraftReply(selectedThread)} disabled={isDrafting} className="text-xs text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-200 transition-colors">Regenerate</button>
                                            <button onClick={() => handleSendReply(selectedThread)} disabled={isSending || !draftBody.trim()} className="flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-semibold"><SendIcon /> {isSending ? 'Sending...' : 'Send Reply'}</button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Summary */}
                        <div className="bg-slate-50 dark:bg-slate-900/30 rounded-lg p-4">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Summary</h3>
                            <MarkdownBlock text={selectedThread.summary} />
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
                                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-2"><CheckCircleIcon className="text-green-500" /> Resolved ({doneActions.length})</h3>
                                <div className="space-y-1.5">
                                    {doneActions.map(action => (
                                        <label key={action.id} className="flex items-start gap-2 cursor-pointer group">
                                            <input type="checkbox" checked onChange={() => handleToggleAction(selectedThread.id, action.id)} className="mt-0.5 rounded border-green-300 text-green-600 focus:ring-green-500" />
                                            <span className="text-sm text-slate-500 dark:text-slate-400 line-through">{action.description}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ─── Main Page ────────────────────────────────────────────────────

    const isAnyUpdating = updatingThreadIds.size > 0;

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Correspondence</h1>
                    <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
                        Gmail sync, AI threads, and draft replies — independent of properties.
                    </p>
                </div>
                <div className="flex items-center gap-2 self-start">
                    <div className="p-1 bg-slate-100 dark:bg-slate-700/50 rounded-lg flex items-center gap-1">
                        <button onClick={() => setViewMode('threads')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${viewMode === 'threads' ? 'bg-brand-primary text-white shadow' : 'text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>
                            <ThreadIcon className="w-4 h-4" /> Threads
                        </button>
                        <button onClick={() => setViewMode('emails')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${viewMode === 'emails' ? 'bg-brand-primary text-white shadow' : 'text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>
                            <EnvelopeIcon className="w-4 h-4" /> Emails
                        </button>
                    </div>
                </div>
            </div>

            {/* Sync config panel */}
            <GmailSyncConfigPanel
                syncConfig={syncConfig}
                onSave={handleSyncConfigSave}
                onSyncNow={(selectedRuleIds?: string[]) => handleSyncNow(false, selectedRuleIds)}
                onFullResync={() => handleSyncNow(true)}
                onClearGmail={handleClearGmail}
                gmailCount={gmailCount}
                isSyncing={isSyncing}
                propertyName="Correspondence"
            />
            {syncMessage && <p className="text-sm text-slate-600 dark:text-slate-400">{syncMessage}</p>}

            {/* ─── Threads View ─────────────────────────────────────────── */}
            {viewMode === 'threads' && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 flex flex-col" style={{ height: 'calc(100vh - 420px)', minHeight: '400px' }}>
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white"><ThreadIcon /> Threads</h2>
                            <div className="flex items-center gap-2">
                                {totalNewEmails > 0 && (
                                    <button onClick={handleUpdateAllThreads} disabled={isAnyUpdating} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium">
                                        <RefreshIcon spinning={isAnyUpdating} /> {isAnyUpdating ? `Updating ${updatingThreadIds.size}...` : `Update all (${totalNewEmails} new)`}
                                    </button>
                                )}
                                <button onClick={() => { setShowNewThreadForm(!showNewThreadForm); setSelectedTag(availableTags[0] || 'custom'); }} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                                    <PlusIcon /> New Thread
                                </button>
                            </div>
                        </div>

                        {showNewThreadForm && (
                            <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg space-y-3">
                                <p className="text-xs text-slate-500 dark:text-slate-400">Create an AI-generated briefing from your correspondence.</p>
                                <div className="flex gap-2 flex-wrap">
                                    {availableTags.map(tag => {
                                        const emailCount = getEmailsForCategory(tag).length;
                                        return (
                                            <button key={tag} onClick={() => setSelectedTag(tag)} className={`text-xs px-2.5 py-1 rounded-full transition-colors flex items-center gap-1.5 capitalize ${selectedTag === tag ? `${getCategoryPillColor(tag)} ring-2 ring-offset-1 ring-current dark:ring-offset-slate-900` : CATEGORY_UNSELECTED}`}>
                                                {tag} <span className="opacity-60">({emailCount})</span>
                                            </button>
                                        );
                                    })}
                                    <button onClick={() => setSelectedTag('custom')} className={`text-xs px-2.5 py-1 rounded-full transition-colors ${selectedTag === 'custom' ? 'bg-slate-600 text-white' : CATEGORY_UNSELECTED}`}>Custom senders</button>
                                </div>
                                {selectedTag === 'custom' && (
                                    <input type="text" value={customSenders} onChange={e => setCustomSenders(e.target.value)} placeholder="Comma-separated email addresses..." className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                                )}
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                        {selectedTag !== 'custom' ? `${getEmailsForCategory(selectedTag).length} emails` : customSenders.trim() ? `${correspondence.filter(c => customSenders.split(',').some(s => c.from.toLowerCase().includes(s.trim().toLowerCase()))).length} emails` : ''}
                                    </span>
                                    <div className="flex gap-2">
                                        <button onClick={() => { setShowNewThreadForm(false); setError(''); }} className="px-3 py-1.5 text-sm rounded-lg bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">Cancel</button>
                                        <button onClick={handleCreateThread} disabled={isGenerating} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition-colors">
                                            {isGenerating ? <><RefreshIcon spinning /> Generating...</> : 'Generate'}
                                        </button>
                                    </div>
                                </div>
                                {error && <p className="text-xs text-red-500">{error}</p>}
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {threads.length > 0 ? threads.map(thread => {
                            const pending = thread.actions.filter(a => a.status === 'pending').length;
                            const newCount = getNewEmailCount(thread);
                            const isUpdating = updatingThreadIds.has(thread.id);
                            const threadAwaiting = isAwaitingReply(getEmailsForThread(thread));
                            return (
                                <div key={thread.id} className={`p-4 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer flex items-start gap-3 ${threadAwaiting ? 'border-l-3 border-l-purple-400 dark:border-l-purple-500' : ''}`} onClick={() => setSelectedThreadId(thread.id)}>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">{thread.title}</h3>
                                            {thread.category && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold capitalize flex-shrink-0 ${getCategoryPillColor(thread.category)}`}>{thread.category}</span>}
                                            {threadAwaiting && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 flex-shrink-0">Awaiting reply</span>}
                                            {isUpdating && <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 flex-shrink-0"><RefreshIcon spinning className="w-3 h-3" /> Updating</span>}
                                            {!isUpdating && newCount > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 flex-shrink-0">{newCount} new</span>}
                                        </div>
                                        {(() => { const senders = getThreadSenders(thread); if (senders.length === 0) return null; const names = senders.map(s => { const m = s.display.match(/^([^<]+)/); return m ? m[1].trim().replace(/["']/g, '') : s.email; }); return <p className="text-[13px] font-medium text-slate-600 dark:text-slate-300 truncate mb-0.5"><span className="font-normal text-slate-400 dark:text-slate-500">with </span>{names.join(', ')}</p>; })()}
                                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{thread.summary.slice(0, 150)}...</p>
                                        <div className="flex items-center gap-3 mt-1.5">
                                            {pending > 0 && <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">{pending} pending action{pending !== 1 ? 's' : ''}</span>}
                                            <span className="text-[10px] text-slate-400">Updated {new Date(thread.updatedAt).toLocaleDateString('en-GB')}</span>
                                        </div>
                                    </div>
                                    <button onClick={e => { e.stopPropagation(); handleDeleteThread(thread.id); }} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"><TrashIcon /></button>
                                </div>
                            );
                        }) : (
                            <div className="flex flex-col items-center justify-center h-full text-center px-8">
                                <ThreadIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
                                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">No threads yet</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                                    Sync your Gmail, then create a thread to get an AI-generated briefing. Threads track action items and update as new emails arrive.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ─── Emails View ──────────────────────────────────────────── */}
            {viewMode === 'emails' && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                    {/* Filter bar */}
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700 space-y-3">
                        <div className="flex items-center gap-2 flex-wrap">
                            {(['all', 'received', 'sent', 'starred', 'unread'] as EmailFilter[]).map(f => (
                                <button key={f} onClick={() => setEmailFilter(f)} className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors capitalize ${emailFilter === f ? 'bg-brand-primary text-white shadow' : 'text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>{f}</button>
                            ))}
                            {availableTags.length > 0 && <span className="text-slate-300 dark:text-slate-600">|</span>}
                            {availableTags.map(tag => (
                                <button key={tag} onClick={() => setCategoryFilter(categoryFilter === tag ? null : tag)} className={`text-xs px-2.5 py-1 rounded-full transition-colors capitalize ${categoryFilter === tag ? getCategoryPillColor(tag) : CATEGORY_UNSELECTED}`}>{tag}</button>
                            ))}
                        </div>
                        <div className="relative">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input type="text" value={emailSearch} onChange={e => setEmailSearch(e.target.value)} placeholder="Search emails..." className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                    </div>

                    {/* Email list */}
                    <div className="max-h-[60vh] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                        {filteredEmails.length > 0 ? filteredEmails.map(email => {
                            const isSent = email.labelIds?.includes('SENT');
                            const isExpanded = expandedEmailId === email.id;
                            return (
                                <div key={email.id} className={`${!email.read ? 'bg-blue-50/30 dark:bg-blue-900/5' : ''}`}>
                                    <div className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors" onClick={() => { setExpandedEmailId(isExpanded ? null : email.id); if (!email.read) handleMarkRead(email.id); }}>
                                        <button onClick={e => { e.stopPropagation(); handleToggleStar(email.id); }} className={`mt-0.5 flex-shrink-0 ${email.starred ? 'text-yellow-500' : 'text-slate-300 dark:text-slate-600 hover:text-yellow-400'}`}>
                                            <StarIcon filled={email.starred} />
                                        </button>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-sm truncate ${!email.read ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-300'}`}>
                                                    {isSent ? `To: ${email.to || 'unknown'}` : email.from}
                                                </span>
                                                {isSent && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 flex-shrink-0">Sent</span>}
                                                {email.attachments && email.attachments.length > 0 && <span className="text-[10px] text-slate-400 flex-shrink-0">{email.attachments.length} file{email.attachments.length > 1 ? 's' : ''}</span>}
                                            </div>
                                            <p className={`text-sm truncate ${!email.read ? 'text-slate-800 dark:text-slate-200' : 'text-slate-600 dark:text-slate-400'}`}>{email.subject}</p>
                                        </div>
                                        <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0 whitespace-nowrap">
                                            {new Date(email.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                        </span>
                                    </div>
                                    {isExpanded && (
                                        <div className="px-4 pb-4 pl-11">
                                            <div className="text-xs text-slate-500 dark:text-slate-400 mb-2 space-y-0.5">
                                                <p><strong>From:</strong> {email.from}</p>
                                                {email.to && <p><strong>To:</strong> {email.to}</p>}
                                                <p><strong>Date:</strong> {new Date(email.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                            </div>
                                            <div className="bg-slate-50 dark:bg-slate-900/30 rounded-lg p-3 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap max-h-96 overflow-y-auto font-mono text-xs">
                                                {email.body}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        }) : (
                            <div className="py-12 text-center text-slate-500 dark:text-slate-400">
                                <EnvelopeIcon className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                                <p>No emails match your filters.</p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
                        {filteredEmails.length} email{filteredEmails.length !== 1 ? 's' : ''} · {gmailCount} from Gmail
                    </div>
                </div>
            )}
        </div>
    );
};

export default CorrespondencePage;
