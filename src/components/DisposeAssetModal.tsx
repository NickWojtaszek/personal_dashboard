import React, { useState } from 'react';
import type { Disposal } from '../types';

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

const DisposeAssetModal: React.FC<DisposeAssetModalProps> = ({ assetLabel, assetKind, currency, linkedPolicies = [], onConfirm, onClose }) => {
    const today = new Date().toISOString().split('T')[0];
    const [type, setType] = useState<Disposal['type']>('Sold');
    const [date, setDate] = useState(today);
    const [amount, setAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [archiveIds, setArchiveIds] = useState<Set<string>>(new Set(linkedPolicies.map(p => p.id)));

    const togglePolicy = (id: string) =>
        setArchiveIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });

    const handleConfirm = () => {
        const disposal: Disposal = {
            type,
            date,
            archivedAt: new Date().toISOString(),
            ...(amount.trim() ? { amount: parseFloat(amount), currency } : {}),
            ...(notes.trim() ? { notes: notes.trim() } : {}),
        };
        onConfirm(disposal, Array.from(archiveIds));
    };

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

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-gray-400 mb-1">Type</label>
                            <select value={type} onChange={e => setType(e.target.value as Disposal['type'])} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-secondary">
                                {TYPE_OPTIONS[assetKind].map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-gray-400 mb-1">Date</label>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-secondary" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-500 dark:text-gray-400 mb-1">Sale price / proceeds {currency ? `(${currency})` : ''}</label>
                        <input type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="optional" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-secondary" />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-500 dark:text-gray-400 mb-1">Notes</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="optional — buyer, reference…" className="w-full resize-none bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-secondary" />
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
                    <button onClick={handleConfirm} className="px-4 py-1.5 rounded bg-brand-primary text-white text-sm font-semibold hover:bg-opacity-90">Confirm</button>
                </div>
            </div>
        </div>
    );
};

export default DisposeAssetModal;
