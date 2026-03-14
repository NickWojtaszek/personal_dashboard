


import React, { useMemo, useState } from 'react';
import type { FinancialTransaction } from '../../types';

interface FinancialsStatementProps {
    transactions?: FinancialTransaction[];
    currency?: string;
    onSourceClick?: (correspondenceId: string) => void;
    onDelete?: (id: string) => void;
}

const CURRENCY_SYMBOLS: Record<string, string> = { AUD: '$', USD: '$', GBP: '£', EUR: '€' };

const FinancialsStatement: React.FC<FinancialsStatementProps> = ({ transactions = [], currency, onSourceClick, onDelete }) => {
    const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);

    const sortedTransactions = useMemo(() => [...transactions].sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
    }), [transactions]);

    // Extract available years from transactions
    const availableYears = useMemo(() => {
        const years = new Set<number>();
        for (const t of sortedTransactions) {
            if (t.date) years.add(new Date(t.date).getFullYear());
        }
        return Array.from(years).sort((a, b) => b - a);
    }, [sortedTransactions]);

    const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');

    // Filter transactions by selected year
    const filteredTransactions = useMemo(() => {
        if (selectedYear === 'all') return sortedTransactions;
        return sortedTransactions.filter(t => t.date && new Date(t.date).getFullYear() === selectedYear);
    }, [sortedTransactions, selectedYear]);

    const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    const symbol = currency ? (CURRENCY_SYMBOLS[currency] || currency + ' ') : '$';

    const formatCurrency = (amount: number) => {
        if (amount === 0) return '';
        return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'No Date';
        try {
            return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch(e) {
            return 'Invalid Date';
        }
    }

    // Assign alternating month shading — toggle shade each time the month changes
    const monthShadeMap = useMemo(() => {
        const map = new Map<string, boolean>();
        let shade = false;
        let prevKey = '';
        for (const t of filteredTransactions) {
            const d = t.date ? new Date(t.date) : null;
            const key = d ? `${d.getFullYear()}-${d.getMonth()}` : 'none';
            if (key !== prevKey) {
                shade = !shade;
                prevKey = key;
            }
            map.set(t.id, shade);
        }
        return map;
    }, [filteredTransactions]);

    return (
        <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
            {/* Year filter tabs */}
            {availableYears.length > 1 && (
                <div className="flex items-center gap-1 px-4 py-2 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                    <button
                        onClick={() => setSelectedYear('all')}
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${selectedYear === 'all' ? 'bg-brand-primary text-white shadow' : 'text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                    >
                        All
                    </button>
                    {availableYears.map(year => (
                        <button
                            key={year}
                            onClick={() => setSelectedYear(year)}
                            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${selectedYear === year ? 'bg-brand-primary text-white shadow' : 'text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                        >
                            {year}
                        </button>
                    ))}
                </div>
            )}
            <div className={`grid ${onDelete ? 'grid-cols-[3fr_5fr_2fr_2fr_auto]' : 'grid-cols-12'} px-4 py-2 bg-slate-50 dark:bg-slate-700/50 font-semibold text-sm text-slate-600 dark:text-gray-300`}>
                <div className={onDelete ? '' : 'col-span-3'}>Date</div>
                <div className={onDelete ? '' : 'col-span-5'}>Details</div>
                <div className={`text-right ${onDelete ? '' : 'col-span-2'}`}>Money Out</div>
                <div className={`text-right ${onDelete ? '' : 'col-span-2'}`}>Money In</div>
                {onDelete && <div className="w-8"></div>}
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-700 min-h-[6rem]">
                {filteredTransactions.length > 0 ? filteredTransactions.map(t => (
                    <div key={t.id} className={`grid ${onDelete ? 'grid-cols-[3fr_5fr_2fr_2fr_auto]' : 'grid-cols-12'} px-4 py-3 text-sm group relative ${monthShadeMap.get(t.id) ? 'bg-slate-50/70 dark:bg-slate-700/20' : ''}`}>
                        <div className={`text-slate-500 dark:text-gray-400 ${onDelete ? '' : 'col-span-3'}`}>{formatDate(t.date)}</div>
                        <div className={`text-slate-700 dark:text-slate-200 ${onDelete ? '' : 'col-span-5'}`}>
                            <span>{t.description}</span>
                            {t.category && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">{t.category}</span>}
                            {t.sourceDocumentName && (
                                t.sourceCorrespondenceId && onSourceClick ? (
                                    <button
                                        type="button"
                                        onClick={() => onSourceClick(t.sourceCorrespondenceId!)}
                                        className="text-[10px] text-brand-primary dark:text-brand-secondary mt-0.5 truncate hover:underline cursor-pointer block max-w-full text-left"
                                        title={`View source: ${t.sourceDocumentName}${t.sourceEmailSubject ? ` — ${t.sourceEmailSubject}` : ''}`}
                                    >
                                        from: {t.sourceDocumentName}
                                    </button>
                                ) : (
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate" title={`Source: ${t.sourceDocumentName}${t.sourceEmailSubject ? ` — ${t.sourceEmailSubject}` : ''}`}>
                                        from: {t.sourceDocumentName}
                                    </p>
                                )
                            )}
                        </div>
                        <div className={`text-right font-mono text-slate-500 dark:text-gray-400 ${onDelete ? '' : 'col-span-2'}`}>
                            {t.type === 'expense' && formatCurrency(t.amount)}
                        </div>
                        <div className={`text-right font-mono text-slate-500 dark:text-gray-400 ${onDelete ? '' : 'col-span-2'}`}>
                            {t.type === 'income' && formatCurrency(t.amount)}
                        </div>
                        {onDelete && (
                            <div className="w-8 flex items-center justify-center">
                                {confirmDeleteId === t.id ? (
                                    <button
                                        type="button"
                                        onClick={() => { onDelete(t.id); setConfirmDeleteId(null); }}
                                        className="text-[10px] font-bold text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                                        title="Confirm delete"
                                    >
                                        Yes?
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setConfirmDeleteId(t.id)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400"
                                        title="Delete transaction"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )) : (
                     <div className="px-4 py-8 text-center text-slate-500 dark:text-gray-400 col-span-12">
                        {selectedYear === 'all' ? 'No transactions recorded.' : `No transactions in ${selectedYear}.`}
                    </div>
                )}
            </div>
             {filteredTransactions.length > 0 && (
                 <div className={`grid ${onDelete ? 'grid-cols-[3fr_5fr_2fr_2fr_auto]' : 'grid-cols-12'} px-4 py-3 bg-slate-50 dark:bg-slate-700/50 font-semibold text-sm border-t border-slate-200 dark:border-slate-700`}>
                    <div className={onDelete ? 'col-span-2' : 'col-span-8'}>
                        Total{selectedYear !== 'all' ? ` (${selectedYear})` : ''}
                    </div>
                    <div className={`text-right font-mono text-red-600 dark:text-red-400 ${onDelete ? '' : 'col-span-2'}`}>
                        {formatCurrency(totalExpenses)}
                    </div>
                    <div className={`text-right font-mono text-green-600 dark:text-green-400 ${onDelete ? '' : 'col-span-2'}`}>
                        {formatCurrency(totalIncome)}
                    </div>
                    {onDelete && <div className="w-8"></div>}
                </div>
            )}
        </div>
    );
};

export default FinancialsStatement;
