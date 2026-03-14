import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { PropertyInfo, CorrespondenceItem, GmailSyncConfig, EmailAttachment, SyncRuleCategory } from '../../types';
import { EnvelopeIcon, EditIcon, SaveIcon, TrashIcon, PlusIcon, PaperClipIcon } from './Icons';
import { v4 as uuidv4 } from 'uuid';
import GmailSyncConfigPanel from './GmailSyncConfigPanel';
import { getCategoryActiveColor, CATEGORY_UNSELECTED } from '../../lib/categoryColors';
import { syncGmailForProperty, clearGmailCorrespondence } from '../../lib/gmailSync';
import { getAttachment, isGmailAuthenticated, signInWithGmail } from '../../lib/gmail';
import { extractFromBase64, type ExtractedPropertyData } from '../../lib/extractPropertyData';

// ─── Inline Icons ────────────────────────────────────────────────────

const StarIcon: React.FC<{ filled?: boolean; className?: string }> = ({ filled, className = '' }) => (
  <svg className={`w-4 h-4 ${className}`} fill={filled ? 'currentColor' : 'none'} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
  </svg>
);

const SearchIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg className={`w-4 h-4 ${className}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
  </svg>
);

const ReplyIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg className={`w-4 h-4 ${className}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
  </svg>
);

const SettingsIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg className={`w-4 h-4 ${className}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
  </svg>
);

// ─── Types ───────────────────────────────────────────────────────────

interface CorrespondenceSectionProps {
    property: PropertyInfo;
    isEditing: boolean;
    onSetEditing: () => void;
    onSave: (property: PropertyInfo) => void;
    onCancel: () => void;
    onDataExtracted?: (data: ExtractedPropertyData) => void;
    focusCorrespondenceId?: string | null;
    onFocusHandled?: () => void;
}

type SortField = 'date' | 'from' | 'subject';
type SortDir = 'asc' | 'desc';
type SourceFilter = 'all' | 'manual' | 'gmail' | 'starred' | 'unread' | 'extracted' | 'sent' | 'received';

/** Check if an email was sent by us (has SENT label from Gmail) */
function isSentEmail(item: CorrespondenceItem): boolean {
    return item.labelIds?.includes('SENT') ?? false;
}

const DEFAULT_SYNC_CONFIG: GmailSyncConfig = { rules: [], autoSync: false };

// ─── Helpers ─────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateString: string): string {
    if (!dateString) return 'No Date';
    return new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateLong(dateString: string): string {
    if (!dateString) return 'No Date';
    return new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ─── Component ───────────────────────────────────────────────────────

const CorrespondenceSection: React.FC<CorrespondenceSectionProps> = ({ property, isEditing, onSetEditing, onSave, onCancel, onDataExtracted, focusCorrespondenceId, onFocusHandled }) => {
    const [editedCorrespondence, setEditedCorrespondence] = useState<CorrespondenceItem[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [showSyncConfig, setShowSyncConfig] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncMessage, setSyncMessage] = useState('');
    const [sortField, setSortField] = useState<SortField>('date');
    const [sortDir, setSortDir] = useState<SortDir>('desc');
    const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [senderFilter, setSenderFilter] = useState<string | null>(null);
    const [showSenderDropdown, setShowSenderDropdown] = useState(false);
    const senderDropdownRef = useRef<HTMLDivElement>(null);
    const [categoryFilter, setCategoryFilter] = useState<SyncRuleCategory | null>(null);
    const [downloadingAttachment, setDownloadingAttachment] = useState<string | null>(null);
    const [extractingAttachment, setExtractingAttachment] = useState<string | null>(null);
    const [extractMessage, setExtractMessage] = useState('');
    const [viewingPdf, setViewingPdf] = useState<{ url: string; name: string } | null>(null);
    const [loadingPdfView, setLoadingPdfView] = useState<string | null>(null);

    const syncConfig = property.gmailSync || DEFAULT_SYNC_CONFIG;

    useEffect(() => {
        if (isEditing) {
            setEditedCorrespondence(JSON.parse(JSON.stringify(
                (property.correspondence || []).filter(c => c.source !== 'gmail')
            )));
        }
    }, [property, isEditing]);

    // Navigate to a specific email when linked from financials
    useEffect(() => {
        if (focusCorrespondenceId) {
            setSourceFilter('all');
            setSenderFilter(null);
            setCategoryFilter(null);
            setSearchQuery('');
            setSelectedId(focusCorrespondenceId);
            onFocusHandled?.();
        }
    }, [focusCorrespondenceId, onFocusHandled]);

    // Auto-sync on mount
    useEffect(() => {
        if (syncConfig.autoSync && syncConfig.rules.length > 0 && isGmailAuthenticated()) {
            handleSync();
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Close sender dropdown on outside click
    useEffect(() => {
        if (!showSenderDropdown) return;
        const handleClick = (e: MouseEvent) => {
            if (senderDropdownRef.current && !senderDropdownRef.current.contains(e.target as Node)) {
                setShowSenderDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [showSenderDropdown]);

    // ─── Sync handlers ──────────────────────────────────────────

    const handleSync = useCallback(async (fullSync = false, selectedRuleIds?: string[]) => {
        setIsSyncing(true);
        setSyncMessage('');
        try {
            const result = await syncGmailForProperty(property.correspondence || [], syncConfig, fullSync, selectedRuleIds);
            onSave({ ...property, correspondence: result.correspondence, gmailSync: result.syncConfig });
            setSyncMessage(result.newCount > 0 ? `Synced ${result.newCount} new email${result.newCount !== 1 ? 's' : ''}` : 'Up to date');
        } catch (err) {
            setSyncMessage(err instanceof Error ? err.message : 'Sync failed');
        } finally {
            setIsSyncing(false);
            setTimeout(() => setSyncMessage(''), 5000);
        }
    }, [property, syncConfig, onSave]);

    const handleSyncConfigSave = (config: GmailSyncConfig) => {
        onSave({ ...property, gmailSync: config });
    };

    // ─── Item actions ───────────────────────────────────────────

    const toggleStarred = (itemId: string) => {
        const updated = (property.correspondence || []).map(c =>
            c.id === itemId ? { ...c, starred: !c.starred } : c
        );
        onSave({ ...property, correspondence: updated });
    };

    const markAsRead = (itemId: string) => {
        const item = (property.correspondence || []).find(c => c.id === itemId);
        if (item && !item.read) {
            const updated = (property.correspondence || []).map(c =>
                c.id === itemId ? { ...c, read: true } : c
            );
            onSave({ ...property, correspondence: updated });
        }
    };

    const handleSelectItem = (item: CorrespondenceItem) => {
        setSelectedId(item.id);
        markAsRead(item.id);
    };

    const handleClearGmailEmails = () => {
        const cleared = clearGmailCorrespondence(property.correspondence || []);
        onSave({ ...property, correspondence: cleared, gmailSync: { ...syncConfig, lastSyncedAt: undefined } });
        setSyncMessage('Gmail emails cleared');
        setSelectedId(null);
        setTimeout(() => setSyncMessage(''), 3000);
    };

    const handleDownloadAttachment = async (attachment: EmailAttachment, messageId: string) => {
        setDownloadingAttachment(attachment.id);
        try {
            const base64Data = await fetchAttachmentData(attachment, messageId);
            const byteChars = atob(base64Data);
            const byteArrays: Uint8Array[] = [];
            for (let i = 0; i < byteChars.length; i += 512) {
                const slice = byteChars.slice(i, i + 512);
                const byteNumbers = new Array(slice.length);
                for (let j = 0; j < slice.length; j++) byteNumbers[j] = slice.charCodeAt(j);
                byteArrays.push(new Uint8Array(byteNumbers));
            }
            const blob = new Blob(byteArrays, { type: attachment.mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = attachment.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Failed to download attachment:', err);
        } finally {
            setDownloadingAttachment(null);
        }
    };

    const isAttachmentExtracted = (correspondenceItem: CorrespondenceItem, attachmentId: string): boolean => {
        return correspondenceItem.extractedAttachmentIds?.includes(attachmentId) ?? false;
    };

    /** Fetch attachment data, using cached copy if available. Re-authenticates if token expired. */
    const fetchAttachmentData = async (attachment: EmailAttachment, messageId: string): Promise<string> => {
        if (attachment.cached) return attachment.cached;
        // Re-authenticate if token has expired
        if (!isGmailAuthenticated()) {
            await signInWithGmail();
        }
        const data = await getAttachment(messageId, attachment.id);
        return data.data;
    };

    const handleExtractFromAttachment = async (attachment: EmailAttachment, messageId: string) => {
        if (!onDataExtracted || !selectedItem) return;

        // Duplication prevention: check if this attachment was already extracted
        if (isAttachmentExtracted(selectedItem, attachment.id)) {
            const proceed = window.confirm(
                `"${attachment.name}" has already been extracted from this email.\n\nExtracting again will create duplicate transactions.\n\nProceed anyway?`
            );
            if (!proceed) return;
        }

        setExtractingAttachment(attachment.id);
        setExtractMessage('');
        try {
            const base64Data = await fetchAttachmentData(attachment, messageId);
            const emailSubject = selectedItem.subject || '';
            const result = await extractFromBase64(base64Data, attachment.name, emailSubject, property.country);

            // Pass source tracking metadata alongside extracted data
            // PropertyDetailPage handles both data insertion AND marking correspondence as extracted in one save
            onDataExtracted({
                ...result,
                sourceDocumentName: attachment.name,
                sourceEmailSubject: emailSubject,
                sourceCorrespondenceId: selectedItem.id,
                sourceAttachmentId: attachment.id,
            });

            setExtractMessage(`Extracted data from "${attachment.name}"`);
            setTimeout(() => setExtractMessage(''), 5000);
        } catch (err) {
            console.error('Failed to extract from attachment:', err);
            setExtractMessage(err instanceof Error ? err.message : 'Extraction failed');
            setTimeout(() => setExtractMessage(''), 5000);
        } finally {
            setExtractingAttachment(null);
        }
    };

    const handleViewPdf = async (attachment: EmailAttachment, messageId: string) => {
        setLoadingPdfView(attachment.id);
        try {
            const base64Data = await fetchAttachmentData(attachment, messageId);
            const blobData = atob(base64Data);
            const bytes = new Uint8Array(blobData.length);
            for (let i = 0; i < blobData.length; i++) bytes[i] = blobData.charCodeAt(i);
            const blob = new Blob([bytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            setViewingPdf({ url, name: attachment.name });
        } catch (err) {
            console.error('Failed to load PDF:', err);
        } finally {
            setLoadingPdfView(null);
        }
    };

    const closePdfViewer = () => {
        if (viewingPdf) {
            URL.revokeObjectURL(viewingPdf.url);
            setViewingPdf(null);
        }
    };

    // ─── Edit mode handlers ─────────────────────────────────────

    const handleSave = () => {
        const gmailItems = (property.correspondence || []).filter(c => c.source === 'gmail');
        onSave({ ...property, correspondence: [...editedCorrespondence, ...gmailItems] });
    };

    const handleItemChange = (id: string, field: keyof Omit<CorrespondenceItem, 'id'>, value: string) => {
        setEditedCorrespondence(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const addItem = () => {
        const newItem: CorrespondenceItem = {
            id: uuidv4(), date: new Date().toISOString().split('T')[0],
            from: '', to: '', subject: '', body: '', source: 'manual',
        };
        setEditedCorrespondence(prev => [newItem, ...prev]);
    };

    const removeItem = (id: string) => {
        setEditedCorrespondence(prev => prev.filter(item => item.id !== id));
    };

    // Delete a single correspondence item (works in browse mode, saves immediately)
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const deleteCorrespondence = useCallback((id: string) => {
        const updated = (property.correspondence || []).filter(c => c.id !== id);
        onSave({ ...property, correspondence: updated });
        if (selectedId === id) setSelectedId(null);
        setConfirmDeleteId(null);
    }, [property, onSave, selectedId]);

    // ─── Filtering & sorting ────────────────────────────────────

    const allCorrespondence = property.correspondence || [];

    const counts = useMemo(() => ({
        all: allCorrespondence.length,
        gmail: allCorrespondence.filter(c => c.source === 'gmail').length,
        manual: allCorrespondence.filter(c => c.source !== 'gmail').length,
        starred: allCorrespondence.filter(c => c.starred).length,
        unread: allCorrespondence.filter(c => !c.read).length,
        extracted: allCorrespondence.filter(c => c.extracted).length,
        sent: allCorrespondence.filter(c => isSentEmail(c)).length,
        received: allCorrespondence.filter(c => c.source === 'gmail' && !isSentEmail(c)).length,
    }), [allCorrespondence]);

    // Unique senders sorted alphabetically, with email count
    const uniqueSenders = useMemo(() => {
        const senderMap = new Map<string, number>();
        allCorrespondence.forEach(c => {
            const from = c.from || 'Unknown';
            senderMap.set(from, (senderMap.get(from) || 0) + 1);
        });
        return Array.from(senderMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0]));
    }, [allCorrespondence]);

    // Map email 'from' to sync rule category by checking if the rule query appears in the from address
    const getEmailCategory = useCallback((email: CorrespondenceItem): SyncRuleCategory | null => {
        const from = email.from.toLowerCase();
        for (const rule of syncConfig.rules) {
            if (!rule.category) continue;
            const q = rule.query.toLowerCase();
            if (from.includes(q) || q.includes(from.split('<').pop()?.replace('>', '').trim() || '')) {
                return rule.category;
            }
        }
        return null;
    }, [syncConfig.rules]);

    // Available categories with counts
    const categoryOptions = useMemo(() => {
        const catMap = new Map<SyncRuleCategory, number>();
        allCorrespondence.forEach(c => {
            const cat = getEmailCategory(c);
            if (cat) catMap.set(cat, (catMap.get(cat) || 0) + 1);
        });
        return Array.from(catMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    }, [allCorrespondence, getEmailCategory]);

    const sorted = useMemo(() => {
        let items = [...allCorrespondence];

        // Source filter
        if (sourceFilter === 'gmail') items = items.filter(c => c.source === 'gmail');
        else if (sourceFilter === 'manual') items = items.filter(c => c.source !== 'gmail');
        else if (sourceFilter === 'starred') items = items.filter(c => c.starred);
        else if (sourceFilter === 'unread') items = items.filter(c => !c.read);
        else if (sourceFilter === 'extracted') items = items.filter(c => c.extracted);
        else if (sourceFilter === 'sent') items = items.filter(c => isSentEmail(c));
        else if (sourceFilter === 'received') items = items.filter(c => c.source === 'gmail' && !isSentEmail(c));

        // Category filter
        if (categoryFilter) items = items.filter(c => getEmailCategory(c) === categoryFilter);

        // Sender filter
        if (senderFilter) items = items.filter(c => c.from === senderFilter);

        // Search
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            items = items.filter(c =>
                c.from.toLowerCase().includes(q) ||
                (c.to || '').toLowerCase().includes(q) ||
                c.subject.toLowerCase().includes(q) ||
                c.body.toLowerCase().includes(q)
            );
        }

        // Sort — starred items always float to top
        items.sort((a, b) => {
            if (a.starred && !b.starred) return -1;
            if (!a.starred && b.starred) return 1;

            let cmp = 0;
            if (sortField === 'date') cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
            else if (sortField === 'from') cmp = (a.from || '').localeCompare(b.from || '');
            else if (sortField === 'subject') cmp = (a.subject || '').localeCompare(b.subject || '');
            return sortDir === 'desc' ? -cmp : cmp;
        });

        return items;
    }, [allCorrespondence, sourceFilter, categoryFilter, getEmailCategory, senderFilter, searchQuery, sortField, sortDir]);

    const selectedItem = useMemo(() =>
        allCorrespondence.find(c => c.id === selectedId) || null
    , [allCorrespondence, selectedId]);

    // ─── Styles ─────────────────────────────────────────────────

    const inputClasses = "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition";
    const textareaClasses = `${inputClasses} font-mono`;

    // ─── Edit mode ──────────────────────────────────────────────

    if (isEditing) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-brand-primary/50 dark:border-brand-secondary/50">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold flex items-center gap-3"><EnvelopeIcon /> Editing Manual Correspondence</h2>
                    <button onClick={addItem} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-sm font-semibold text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-colors">
                        <PlusIcon /> New Item
                    </button>
                </div>
                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                    {editedCorrespondence.length > 0 ? editedCorrespondence.map(item => (
                        <div key={item.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg space-y-3 relative">
                            <button type="button" onClick={() => removeItem(item.id)} className="absolute top-2 right-2 p-2 text-red-500 hover:text-red-700"><TrashIcon /></button>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <input type="date" value={item.date} onChange={e => handleItemChange(item.id, 'date', e.target.value)} className={inputClasses} />
                                <input type="text" placeholder="From" value={item.from} onChange={e => handleItemChange(item.id, 'from', e.target.value)} className={inputClasses} />
                                <input type="text" placeholder="To" value={item.to || ''} onChange={e => handleItemChange(item.id, 'to', e.target.value)} className={inputClasses} />
                            </div>
                            <input type="text" placeholder="Subject" value={item.subject} onChange={e => handleItemChange(item.id, 'subject', e.target.value)} className={inputClasses} />
                            <textarea placeholder="Body" value={item.body} onChange={e => handleItemChange(item.id, 'body', e.target.value)} rows={5} className={textareaClasses} />
                        </div>
                    )) : (
                        <p className="text-sm text-slate-500 dark:text-gray-400 text-center py-8">No manual correspondence. Click 'New Item' to add one.</p>
                    )}
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                    <button onClick={onCancel} className="px-4 py-2 rounded-lg bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">Cancel</button>
                    <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-primary text-white font-semibold hover:bg-opacity-90 transition-colors"><SaveIcon /> Save</button>
                </div>
            </div>
        );
    }

    // ─── Email browser view ─────────────────────────────────────

    const FilterPill: React.FC<{ filter: SourceFilter; label: string; count: number }> = ({ filter, label, count }) => (
        <button
            onClick={() => { setSourceFilter(filter); setSelectedId(null); }}
            className={`text-xs px-2.5 py-1 rounded-full transition-colors whitespace-nowrap ${sourceFilter === filter ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
        >
            {label}{count > 0 ? ` (${count})` : ''}
        </button>
    );

    const SortBtn: React.FC<{ field: SortField; label: string }> = ({ field, label }) => (
        <button
            onClick={() => {
                if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
                else { setSortField(field); setSortDir('desc'); }
            }}
            className={`text-xs px-2 py-1 rounded transition-colors ${sortField === field ? 'bg-blue-600/20 text-blue-500 font-semibold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
        >
            {label} {sortField === field && (sortDir === 'desc' ? '↓' : '↑')}
        </button>
    );

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 flex flex-col" style={{ height: 'calc(100vh - 220px)', minHeight: '500px' }}>
            {/* ── Toolbar ── */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                        <EnvelopeIcon /> Correspondence
                    </h2>
                    <div className="flex items-center gap-2">
                        {syncMessage && (
                            <span className={`text-xs px-2 py-1 rounded ${syncMessage.includes('fail') || syncMessage.includes('error') || syncMessage.includes('expired') ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300' : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-300'}`}>
                                {syncMessage}
                            </span>
                        )}
                        {!showSyncConfig && (
                            <button
                                onClick={() => handleSync(false)}
                                disabled={!isGmailAuthenticated() || syncConfig.rules.length === 0 || isSyncing}
                                className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-30"
                                title="Sync Gmail"
                            >
                                <svg className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182"/></svg>
                            </button>
                        )}
                        <button
                            onClick={() => setShowSyncConfig(!showSyncConfig)}
                            className={`p-2 rounded-lg transition-colors ${showSyncConfig ? 'bg-blue-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                            title="Gmail Settings"
                        >
                            <SettingsIcon />
                        </button>
                        <button onClick={onSetEditing} className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" title="Edit Manual Items">
                            <EditIcon />
                        </button>
                    </div>
                </div>

                {/* Search bar */}
                <div className="relative mb-3">
                    <SearchIcon className="absolute left-3 top-2.5 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search correspondence..."
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    />
                </div>

                {/* Filters & sort */}
                <div className="flex items-center gap-1.5 flex-wrap">
                    <FilterPill filter="all" label="All" count={counts.all} />
                    {counts.unread > 0 && <FilterPill filter="unread" label="Unread" count={counts.unread} />}
                    {counts.starred > 0 && <FilterPill filter="starred" label="Starred" count={counts.starred} />}
                    {counts.sent > 0 && <FilterPill filter="sent" label="Sent" count={counts.sent} />}
                    {counts.received > 0 && <FilterPill filter="received" label="Received" count={counts.received} />}
                    {counts.gmail > 0 && <FilterPill filter="gmail" label="Gmail" count={counts.gmail} />}
                    {counts.manual > 0 && <FilterPill filter="manual" label="Manual" count={counts.manual} />}
                    {counts.extracted > 0 && <FilterPill filter="extracted" label="Extracted" count={counts.extracted} />}

                    {/* Sender filter dropdown */}
                    <div className="relative" ref={senderDropdownRef}>
                        <button
                            onClick={() => setShowSenderDropdown(!showSenderDropdown)}
                            className={`text-xs px-2.5 py-1 rounded-full transition-colors whitespace-nowrap flex items-center gap-1 ${senderFilter ? 'bg-purple-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                        >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
                            {senderFilter ? senderFilter.split('<')[0].split('@')[0].trim().slice(0, 20) : 'From'}
                            <svg className={`w-3 h-3 transition-transform ${showSenderDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                        </button>
                        {showSenderDropdown && (
                            <div className="absolute top-full left-0 mt-1 w-72 max-h-64 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50">
                                {senderFilter && (
                                    <button
                                        onClick={() => { setSenderFilter(null); setShowSenderDropdown(false); }}
                                        className="w-full text-left px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border-b border-slate-200 dark:border-slate-700 font-medium"
                                    >
                                        Clear sender filter
                                    </button>
                                )}
                                {uniqueSenders.map(([sender, count]) => (
                                    <button
                                        key={sender}
                                        onClick={() => { setSenderFilter(sender); setShowSenderDropdown(false); setSelectedId(null); }}
                                        className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex items-center justify-between gap-2 ${senderFilter === sender ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 font-semibold' : 'text-slate-700 dark:text-slate-300'}`}
                                    >
                                        <span className="truncate">{sender}</span>
                                        <span className="text-[10px] text-slate-400 dark:text-slate-500 flex-shrink-0">{count}</span>
                                    </button>
                                ))}
                                {uniqueSenders.length === 0 && (
                                    <p className="px-3 py-4 text-xs text-slate-400 text-center">No senders</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Category filters */}
                    {categoryOptions.map(([cat, count]) => (
                        <button
                            key={cat}
                            onClick={() => { setCategoryFilter(categoryFilter === cat ? null : cat); setSelectedId(null); }}
                            className={`text-xs px-2.5 py-1 rounded-full transition-colors whitespace-nowrap capitalize ${
                                categoryFilter === cat ? getCategoryActiveColor(cat) : CATEGORY_UNSELECTED
                            }`}
                        >
                            {cat} ({count})
                        </button>
                    ))}

                    {/* Sort — pushed to the right */}
                    <div className="flex items-center gap-1 ml-auto">
                        <SortBtn field="date" label="Date" />
                        <SortBtn field="from" label="From" />
                        <SortBtn field="subject" label="Subject" />
                    </div>
                </div>
            </div>

            {/* ── Gmail config (collapsible) ── */}
            {showSyncConfig && (
                <div className="p-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex-shrink-0">
                    <GmailSyncConfigPanel
                        syncConfig={syncConfig}
                        onSave={handleSyncConfigSave}
                        onSyncNow={(selectedRuleIds?: string[]) => handleSync(false, selectedRuleIds)}
                        onFullResync={() => handleSync(true)}
                        onClearGmail={handleClearGmailEmails}
                        gmailCount={counts.gmail}
                        isSyncing={isSyncing}
                        propertyName={property.name}
                    />
                </div>
            )}

            {/* ── Master-detail split ── */}
            <div className="flex flex-1 min-h-0">
                {/* ── Email list (left) ── */}
                <div className={`${selectedItem ? 'w-2/5 border-r border-slate-200 dark:border-slate-700' : 'w-full'} flex flex-col min-h-0 transition-all`}>
                    <div className="overflow-y-auto flex-1">
                        {sorted.length > 0 ? sorted.map(item => {
                            const isSelected = selectedId === item.id;
                            const isUnread = !item.read;
                            const hasAttachments = item.attachments && item.attachments.length > 0;
                            const isSent = isSentEmail(item);

                            return (
                                <div
                                    key={item.id}
                                    onClick={() => handleSelectItem(item)}
                                    className={`px-4 py-3 cursor-pointer border-b border-slate-100 dark:border-slate-700/50 transition-colors ${
                                        isSelected
                                            ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-l-blue-500'
                                            : isSent
                                                ? 'hover:bg-slate-50 dark:hover:bg-slate-700/30 border-l-2 border-l-emerald-400 dark:border-l-emerald-500'
                                                : 'hover:bg-slate-50 dark:hover:bg-slate-700/30 border-l-2 border-l-transparent'
                                    }`}
                                >
                                    <div className="flex items-start gap-2">
                                        {/* Star */}
                                        <button
                                            onClick={e => { e.stopPropagation(); toggleStarred(item.id); }}
                                            className={`mt-0.5 flex-shrink-0 ${item.starred ? 'text-amber-400' : 'text-slate-300 dark:text-slate-600 hover:text-amber-300'}`}
                                        >
                                            <StarIcon filled={item.starred} />
                                        </button>

                                        <div className="flex-1 min-w-0">
                                            {/* From + date row */}
                                            <div className="flex items-center justify-between gap-2">
                                                <p className={`text-sm truncate ${isUnread ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-300'}`}>
                                                    {isSent ? <span className="text-emerald-600 dark:text-emerald-400">To: </span> : ''}{isSent ? (item.to || 'Unknown') : item.from}
                                                </p>
                                                <span className="text-[11px] text-slate-500 dark:text-slate-400 flex-shrink-0 whitespace-nowrap">
                                                    {formatDate(item.date)}
                                                </span>
                                            </div>

                                            {/* Subject */}
                                            <p className={`text-xs truncate mt-0.5 ${isUnread ? 'font-semibold text-slate-800 dark:text-slate-200' : 'text-slate-600 dark:text-slate-400'}`}>
                                                {item.subject}
                                            </p>

                                            {/* Preview + badges */}
                                            <div className="flex items-center gap-1.5 mt-1">
                                                <p className="text-xs text-slate-500 dark:text-slate-500 truncate flex-1">
                                                    {item.body.slice(0, 80)}
                                                </p>
                                                {hasAttachments && <PaperClipIcon />}
                                                {item.extracted && (
                                                    <span className="flex-shrink-0 text-[9px] px-1 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 font-medium" title="Data extracted">AI</span>
                                                )}
                                                {isSent && (
                                                    <span className="flex-shrink-0 text-[9px] px-1 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-medium">Sent</span>
                                                )}
                                                {item.source === 'gmail' && !isSent && (
                                                    <span className="flex-shrink-0 text-[9px] px-1 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400 font-medium">G</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="flex flex-col items-center justify-center h-full text-center p-8">
                                <EnvelopeIcon />
                                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                                    {searchQuery ? 'No results found' : 'No correspondence yet'}
                                </p>
                                {!searchQuery && (
                                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                                        Click Edit to add manual items, or configure Gmail sync
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Preview panel (right) ── */}
                {selectedItem && (
                    <div className="w-3/5 flex flex-col min-h-0">
                        {/* Preview header */}
                        <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white break-words">
                                        {selectedItem.subject || '(No Subject)'}
                                    </h3>
                                    <div className="mt-2 space-y-1">
                                        <p className="text-sm text-slate-700 dark:text-slate-300">
                                            <span className="text-slate-500 dark:text-slate-400">From: </span>
                                            <span className="font-medium">{selectedItem.from}</span>
                                        </p>
                                        {selectedItem.to && (
                                            <p className="text-sm text-slate-700 dark:text-slate-300">
                                                <span className="text-slate-500 dark:text-slate-400">To: </span>
                                                {selectedItem.to}
                                            </p>
                                        )}
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            {formatDateLong(selectedItem.date)}
                                            {selectedItem.source === 'gmail' && (
                                                <span className="ml-2 px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400 text-[10px] font-medium">Gmail</span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    <button
                                        onClick={() => toggleStarred(selectedItem.id)}
                                        className={`p-1.5 rounded-lg transition-colors ${selectedItem.starred ? 'text-amber-400' : 'text-slate-400 hover:text-amber-300'}`}
                                        title={selectedItem.starred ? 'Unstar' : 'Star'}
                                    >
                                        <StarIcon filled={selectedItem.starred} />
                                    </button>
                                    {confirmDeleteId === selectedItem.id ? (
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => deleteCorrespondence(selectedItem.id)}
                                                className="px-2 py-1 rounded text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                                            >
                                                Delete
                                            </button>
                                            <button
                                                onClick={() => setConfirmDeleteId(null)}
                                                className="px-2 py-1 rounded text-[10px] font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setConfirmDeleteId(selectedItem.id)}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                            title="Delete email"
                                        >
                                            <TrashIcon />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setSelectedId(null)}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                        title="Close preview"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Preview body */}
                        <div className="flex-1 overflow-y-auto p-5">
                            <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-mono leading-relaxed bg-slate-50 dark:bg-slate-900/30 p-4 rounded-lg">
                                {selectedItem.body || '(Empty body)'}
                            </div>

                            {/* Attachments */}
                            {selectedItem.attachments && selectedItem.attachments.length > 0 && selectedItem.gmailMessageId && (
                                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                            Attachments ({selectedItem.attachments.length})
                                        </p>
                                        {extractMessage && (
                                            <span className={`text-xs px-2 py-0.5 rounded ${extractMessage.includes('fail') || extractMessage.includes('Failed') ? 'bg-red-100 dark:bg-red-900/30 text-red-600' : 'bg-green-100 dark:bg-green-900/30 text-green-600'}`}>
                                                {extractMessage}
                                            </span>
                                        )}
                                    </div>
                                    <div className="space-y-1.5">
                                        {selectedItem.attachments.map(att => {
                                            const isPdf = att.mimeType === 'application/pdf' || att.name.toLowerCase().endsWith('.pdf');
                                            const isExtracting = extractingAttachment === att.id;
                                            const isDownloading = downloadingAttachment === att.id;

                                            return (
                                                <div key={att.id} className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
                                                    <svg className="w-5 h-5 text-slate-500 dark:text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"/></svg>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{att.name}</p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">{formatFileSize(att.size)}</p>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                                        {/* View button (PDF only) */}
                                                        {isPdf && (
                                                            <button
                                                                onClick={() => handleViewPdf(att, selectedItem.gmailMessageId!)}
                                                                disabled={loadingPdfView === att.id}
                                                                className="px-2.5 py-1.5 text-xs rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-40 flex items-center gap-1"
                                                                title="View PDF"
                                                            >
                                                                {loadingPdfView === att.id ? (
                                                                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                                                                ) : (
                                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/></svg>
                                                                )}
                                                                View
                                                            </button>
                                                        )}
                                                        {/* Download button */}
                                                        <button
                                                            onClick={() => handleDownloadAttachment(att, selectedItem.gmailMessageId!)}
                                                            disabled={isDownloading}
                                                            className="px-2.5 py-1.5 text-xs rounded-md bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors disabled:opacity-40 flex items-center gap-1"
                                                            title="Download"
                                                        >
                                                            {isDownloading ? (
                                                                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                                                            ) : (
                                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg>
                                                            )}
                                                            Save
                                                        </button>
                                                        {/* Extract Data button (PDF only) */}
                                                        {isPdf && onDataExtracted && (() => {
                                                            const alreadyExtracted = isAttachmentExtracted(selectedItem, att.id);
                                                            return (
                                                            <button
                                                                onClick={() => handleExtractFromAttachment(att, selectedItem.gmailMessageId!)}
                                                                disabled={isExtracting}
                                                                className={`px-2.5 py-1.5 text-xs rounded-md transition-colors disabled:opacity-40 flex items-center gap-1 ${alreadyExtracted ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50'}`}
                                                                title={alreadyExtracted ? "Already extracted — click to re-extract (will warn about duplicates)" : "Extract financial data using AI"}
                                                            >
                                                                {isExtracting ? (
                                                                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                                                                ) : (
                                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"/></svg>
                                                                )}
                                                                {alreadyExtracted ? 'Extracted' : 'Extract'}
                                                            </button>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Inline PDF Viewer */}
                            {viewingPdf && (
                                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                            {viewingPdf.name}
                                        </p>
                                        <button
                                            onClick={closePdfViewer}
                                            className="text-xs px-2 py-1 rounded text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                        >
                                            Close
                                        </button>
                                    </div>
                                    <iframe
                                        src={viewingPdf.url}
                                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700"
                                        style={{ height: '500px' }}
                                        title={viewingPdf.name}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CorrespondenceSection;
