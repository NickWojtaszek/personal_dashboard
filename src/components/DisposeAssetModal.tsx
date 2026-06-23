import React, { useState } from 'react';
import type { Disposal } from '../types';
import { fileToDocument } from '../lib/documents';
import DocumentDropzone from './DocumentDropzone';

interface LinkedPolicy { id: string; name: string; }

interface DisposeAssetModalProps {
    assetLabel: string;
    assetKind: 'vehicle' | 'property';
    currency?: string;
    /** Insurance policies linked to this asset (properties only) — offered for cascade archive. */
    linkedPolicies?: LinkedPolicy[];
    onConfirm: (disposal: Disposal, archivePolicyIds: string[]) => void;
    onClose: () => void;
}

const TYPE_OPTIONS: Record<'vehicle' | 'property', { value: Disposal['type']; label: string }[]> = {
    vehicle: [
        { value: 'Sold', label: 'Sold' },
        { value: 'WrittenOff', label: 'Written off' },
        { value: 'Transferred', label: 'Transferred' },
    ],
    property: [
        { value: 'Sold', label: 'Sold' },
        { value: 'Transferred', label: 'Transferred' },
    ],
};

interface SaleExtract {
    dateOfSale?: string;
    amount?: number;
    counterparty?: string;
    reference?: string;
}

const DisposeAssetModal: React.FC<DisposeAssetModalProps> = ({ assetLabel, assetKind, currency, linkedPolicies = [], onConfirm, onClose }) => {
    const today = new Date().toISOString().split('T')[0];
    const [type, setType] = useState<Disposal['type']>('Sold');
    const [date, setDate] = useState(today);
    const [amount, setAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [archiveIds, setArchiveIds] = useState<Set<string>>(new Set(linkedPolicies.map(p => p.id)));
    const [file, setFile] = useState<File | null>(null);
    const [extracting, setExtracting] = useState(false);
    const [extractError, setExtractError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const togglePolicy = (id: string) =>
        setArchiveIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });

    const handleExtract = async () => {
        if (!file || extracting) return;
        setExtracting(true);
        setExtractError(null);
        try {
            // Dynamic import keeps pdfjs out of the main bundle (this modal loads eagerly).
            const { extractFromPdf, Type } = await import('../lib/pdfExtraction');
            const schema = {
                type: Type.OBJECT,
                properties: {
                    dateOfSale: { type: Type.STRING, description: 'Date of sale/transfer in YYYY-MM-DD format' },
                    amount: { type: Type.NUMBER, description: 'Sale price / vehicle value as a plain number' },
                    counterparty: { type: Type.STRING, description: "Buyer's or purchaser's name" },
                    reference: { type: Type.STRING, description: 'Any reference such as odometer reading or registration number' },
                },
            };
            const { data } = await extractFromPdf<SaleExtract>(
                file,
                (text) => `Extract the sale/transfer details from this ${assetKind} sale or transfer confirmation. Return dateOfSale (YYYY-MM-DD), amount (number, no currency symbols), counterparty (buyer/purchaser name) and reference. Document text:\n${text}`,
                schema,
            );
            setType('Sold');
            if (data.dateOfSale && /^\d{4}-\d{2}-\d{2}$/.test(data.dateOfSale)) setDate(data.dateOfSale);
            if (typeof data.amount === 'number' && !Number.isNaN(data.amount)) setAmount(String(data.amount));
            const noteParts = [data.counterparty ? `Sold to ${data.counterparty}` : '', data.reference || ''].filter(Boolean);
            if (noteParts.length) setNotes(noteParts.join(' · '));
        } catch (e) {
            setExtractError(e instanceof Error ? e.message : 'Could not read the document.');
        } finally {
            setExtracting(false);
        }
    };

    const handleConfirm = async () => {
        if (busy) return;
        setBusy(true);
        try {
            const document = file ? await fileToDocument(file, { category: 'Other' }) : undefined;
            const disposal: Disposal = {
                type,
                date,
                archivedAt: new Date().toISOString(),
                ...(amount.trim() ? { amount: parseFloat(amount), currency } : {}),
                ...(notes.trim() ? { notes: notes.trim() } : {}),
                ...(document ? { document } : {}),
            };
            onConfirm(disposal, Array.from(archiveIds));
        } finally {
            setBusy(false);
        }
    };

    const inputCls = "w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-secondary";

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-white dark:bg-slate-800 text-slate-800 dark:text-gray-100 rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="font-bold text-lg">Sell / dispose {assetKind === 'vehicle' ? 'vehicle' : 'property'}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-xl px-2" aria-label="Close">✕</button>
                </div>

                <div className="p-5 space-y-4 overflow-y-auto">
                    <p className="text-sm text-slate-500 dark:text-gray-400">
                        <span className="font-semibold text-slate-700 dark:text-gray-200">{assetLabel}</span> will be archived — its record, history and documents are kept, but it stops generating reminders and cost forecasts. You can restore it later.
                    </p>

                    {/* Sale / transfer confirmation */}
                    <div>
                        <label className="block text-xs font-medium text-slate-500 dark:text-gray-400 mb-1">Sale / transfer confirmation (PDF)</label>
                        {!file ? (
                            <DocumentDropzone
                                onFiles={(files) => { if (files && files[0]) { setFile(files[0]); setExtractError(null); } }}
                                accept="application/pdf"
                                className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer transition-colors text-xs text-slate-500 dark:text-gray-400"
                                activeClassName="border-brand-primary bg-brand-primary/10"
                                inactiveClassName="border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                            >
                                <span><span className="font-semibold">Click to upload</span> or drag &amp; drop</span>
                            </DocumentDropzone>
                        ) : (
                            <div className="flex items-center justify-between gap-2 p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                                <span className="text-sm truncate">{file.name}</span>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <button onClick={handleExtract} disabled={extracting} className="px-2 py-1 text-xs rounded bg-brand-primary/10 text-brand-primary dark:text-brand-secondary font-medium hover:bg-brand-primary/20 disabled:opacity-50">
                                        {extracting ? 'Reading…' : '✨ Extract'}
                                    </button>
                                    <button onClick={() => { setFile(null); setExtractError(null); }} className="text-slate-400 hover:text-red-600 text-sm px-1">✕</button>
                                </div>
                            </div>
                        )}
                        {extractError && <p className="text-xs text-red-500 mt-1">{extractError}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-gray-400 mb-1">Type</label>
                            <select value={type} onChange={e => setType(e.target.value as Disposal['type'])} className={inputCls}>
                                {TYPE_OPTIONS[assetKind].map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-gray-400 mb-1">Date</label>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-500 dark:text-gray-400 mb-1">Sale price / proceeds {currency ? `(${currency})` : ''}</label>
                        <input type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="optional" className={inputCls} />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-500 dark:text-gray-400 mb-1">Notes</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="optional — buyer, reference…" className={`${inputCls} resize-none`} />
                    </div>

                    {linkedPolicies.length > 0 && (
                        <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                            <p className="text-xs font-medium text-slate-500 dark:text-gray-400 mb-2">Linked insurance — archive too?</p>
                            <div className="space-y-1.5">
                                {linkedPolicies.map(p => (
                                    <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer">
                                        <input type="checkbox" checked={archiveIds.has(p.id)} onChange={() => togglePolicy(p.id)} className="accent-brand-primary w-4 h-4" />
                                        <span>{p.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-200 dark:border-slate-700">
                    <button onClick={onClose} className="px-4 py-1.5 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-sm">Cancel</button>
                    <button onClick={handleConfirm} disabled={busy} className="px-4 py-1.5 rounded bg-brand-primary text-white text-sm font-semibold hover:bg-opacity-90 disabled:opacity-50">{busy ? 'Saving…' : 'Confirm'}</button>
                </div>
            </div>
        </div>
    );
};

export default DisposeAssetModal;
