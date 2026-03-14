import React from 'react';
import type { RegistrationHistoryEntry } from '../../types';

const CURRENCY_SYMBOLS: Record<string, string> = { GBP: '\u00a3', USD: '$', AUD: 'A$', EUR: '\u20ac', PLN: 'z\u0142' };

const HistoryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>;
const DocIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>;

interface RegoHistorySectionProps {
    history: RegistrationHistoryEntry[];
    currentAmount?: number;
    currentCurrency?: string;
}

const RegoHistorySection: React.FC<RegoHistorySectionProps> = ({ history, currentAmount, currentCurrency }) => {
    if (!history || history.length === 0) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold flex items-center gap-3"><HistoryIcon /> Renewal History</h2>
                </div>
                <div className="p-6">
                    <p className="text-sm text-slate-400 dark:text-gray-500 italic">No previous registration periods recorded.</p>
                </div>
            </div>
        );
    }

    const sorted = [...history].sort((a, b) => new Date(b.periodEnd).getTime() - new Date(a.periodEnd).getTime());

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-xl font-bold flex items-center gap-3"><HistoryIcon /> Renewal History</h2>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {sorted.map((entry, idx) => {
                    const sym = CURRENCY_SYMBOLS[entry.currency || currentCurrency || 'AUD'] || '$';
                    const startFormatted = new Date(entry.periodStart).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                    const endFormatted = new Date(entry.periodEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

                    // Cost comparison with the next newer entry (or current)
                    let costBadge: React.ReactNode = null;
                    const compareAmount = idx === 0 ? currentAmount : sorted[idx - 1]?.totalAmount;
                    if (typeof entry.totalAmount === 'number' && typeof compareAmount === 'number' && compareAmount > 0) {
                        const pctChange = ((compareAmount - entry.totalAmount) / entry.totalAmount) * 100;
                        if (Math.abs(pctChange) >= 0.5) {
                            const isIncrease = pctChange > 0;
                            costBadge = (
                                <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold ${isIncrease ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                                    {isIncrease ? '\u2191' : '\u2193'} {Math.abs(pctChange).toFixed(1)}%
                                </span>
                            );
                        }
                    }

                    return (
                        <div key={entry.id} className="p-5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-slate-700 dark:text-gray-200">
                                        {startFormatted} &mdash; {endFormatted}
                                    </p>
                                    <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 dark:text-gray-400">
                                        {entry.term && <span>{entry.term}</span>}
                                        {entry.ctpInsurer && <span>CTP: {entry.ctpInsurer}</span>}
                                    </div>
                                </div>
                                <div className="text-right flex items-center gap-2">
                                    {typeof entry.totalAmount === 'number' && (
                                        <span className="text-lg font-bold text-slate-800 dark:text-gray-200">
                                            {sym}{entry.totalAmount.toFixed(2)}
                                        </span>
                                    )}
                                    {costBadge}
                                </div>
                            </div>
                            <div className="flex items-center gap-3 mt-2">
                                {entry.document?.data && (
                                    <button
                                        onClick={() => {
                                            const dataUrl = `data:${entry.document!.mimeType || 'application/pdf'};base64,${entry.document!.data}`;
                                            window.open(dataUrl, '_blank');
                                        }}
                                        className="inline-flex items-center gap-1 text-xs font-medium text-brand-primary hover:underline"
                                    >
                                        <DocIcon /> View Renewal PDF
                                    </button>
                                )}
                                {entry.notes && (
                                    <p className="text-xs text-slate-400">{entry.notes}</p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default RegoHistorySection;
