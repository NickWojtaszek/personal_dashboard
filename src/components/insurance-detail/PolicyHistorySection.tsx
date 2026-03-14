import React from 'react';
import type { InsuranceInfo, PolicyHistoryEntry } from '../../types';
import { annualizePremium } from './policyUtils';

const CURRENCY_SYMBOLS: Record<string, string> = {
    GBP: '\u00a3', USD: '$', AUD: 'A$', EUR: '\u20ac', PLN: 'z\u0142',
};

const formatCurrency = (amount?: number, currency?: string) => {
    if (typeof amount !== 'number') return 'N/A';
    const symbol = CURRENCY_SYMBOLS[currency || 'GBP'] || (currency ? `${currency} ` : '\u00a3');
    return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        try {
            return new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        } catch { return dateString; }
    }
    return dateString;
};

const HistoryIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
);

const ArrowUpIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
    </svg>
);

const ArrowDownIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 4.5l15 15m0 0V8.25m0 11.25H8.25" />
    </svg>
);

interface CostBadgeProps {
    currentAmount?: number;
    currentFreq?: string;
    previousAmount?: number;
    previousFreq?: string;
}

const CostChangeBadge: React.FC<CostBadgeProps> = ({ currentAmount, currentFreq, previousAmount, previousFreq }) => {
    const currentAnnual = annualizePremium(currentAmount, currentFreq);
    const previousAnnual = annualizePremium(previousAmount, previousFreq);

    if (currentAnnual === null || previousAnnual === null || previousAnnual === 0) return null;

    const change = ((currentAnnual - previousAnnual) / previousAnnual) * 100;
    const rounded = Math.round(change * 10) / 10;

    if (rounded === 0) {
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">No change</span>;
    }

    const isIncrease = rounded > 0;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${isIncrease ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'}`}>
            {isIncrease ? <ArrowUpIcon /> : <ArrowDownIcon />}
            {isIncrease ? '+' : ''}{rounded}%
        </span>
    );
};

interface PolicyHistorySectionProps {
    policy: InsuranceInfo;
}

const PolicyHistorySection: React.FC<PolicyHistorySectionProps> = ({ policy }) => {
    const history = policy.history || [];

    // Build comparison chain: current policy -> history[0] -> history[1] -> ...
    // Each entry compares against the one after it (older period)
    const currentEntry = {
        premiumAmount: policy.premiumAmount,
        paymentFrequency: policy.paymentFrequency,
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="p-5 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-bold flex items-center gap-3"><HistoryIcon /> Policy History</h2>
            </div>
            <div className="p-5">
                {history.length === 0 ? (
                    <p className="text-sm text-slate-400 dark:text-gray-500 text-center py-4">No previous policy periods recorded. History is created automatically when policy dates are updated during renewal.</p>
                ) : (
                    <div className="space-y-3">
                        {/* Current period summary for context */}
                        <div className="p-3 rounded-lg bg-brand-primary/5 dark:bg-brand-secondary/5 border border-brand-primary/20 dark:border-brand-secondary/20">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-xs font-medium text-brand-primary dark:text-brand-secondary uppercase tracking-wide">Current Period</p>
                                    <p className="text-sm font-medium text-slate-700 dark:text-gray-200 mt-0.5">
                                        {formatDate(policy.startDate)} &mdash; {formatDate(policy.endDate)}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-semibold text-slate-800 dark:text-gray-200">{formatCurrency(policy.premiumAmount, policy.currency)} {policy.paymentFrequency}</p>
                                    {history.length > 0 && (
                                        <CostChangeBadge
                                            currentAmount={currentEntry.premiumAmount}
                                            currentFreq={currentEntry.paymentFrequency}
                                            previousAmount={history[0].premiumAmount}
                                            previousFreq={history[0].paymentFrequency}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Historical periods */}
                        {history.map((entry: PolicyHistoryEntry, index: number) => {
                            const olderEntry = history[index + 1];
                            return (
                                <div key={entry.id} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                                    <div className="flex justify-between items-start gap-3">
                                        <div>
                                            <p className="text-sm font-medium text-slate-700 dark:text-gray-200">
                                                {formatDate(entry.periodStart)} &mdash; {formatDate(entry.periodEnd)}
                                            </p>
                                            <p className="text-xs text-slate-400 dark:text-gray-500 mt-0.5">
                                                {entry.provider}{entry.policyNumber ? ` \u2022 ${entry.policyNumber}` : ''}
                                            </p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-sm font-semibold text-slate-700 dark:text-gray-300">
                                                {formatCurrency(entry.premiumAmount, entry.currency)} {entry.paymentFrequency}
                                            </p>
                                            {olderEntry && (
                                                <CostChangeBadge
                                                    currentAmount={entry.premiumAmount}
                                                    currentFreq={entry.paymentFrequency}
                                                    previousAmount={olderEntry.premiumAmount}
                                                    previousFreq={olderEntry.paymentFrequency}
                                                />
                                            )}
                                        </div>
                                    </div>
                                    {entry.document && (
                                        <div className="mt-2">
                                            <a
                                                href={entry.document.data ? `data:${entry.document.mimeType};base64,${entry.document.data}` : entry.document.url}
                                                download={entry.document.name}
                                                className="text-xs text-brand-primary dark:text-brand-secondary hover:underline"
                                            >
                                                {entry.document.name}
                                            </a>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PolicyHistorySection;
