import React, { useMemo, useState } from 'react';
import type { InsuranceInfo, VehicleInfo, PropertyInfo } from '../../types';
import { buildCostLineItems, type CostLineItem } from './dateUtils';

const CURRENCY_SYMBOLS: Record<string, string> = { GBP: '\u00a3', USD: '$', AUD: 'A$', EUR: '\u20ac', PLN: 'z\u0142' };

const BanknotesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" /></svg>;

const CATEGORY_COLORS: Record<string, string> = {
    Insurance: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    Vehicle: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    Property: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
    Mortgage: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

// Pure CSS bar chart colors per category
const BAR_COLORS: Record<string, string> = {
    Insurance: 'bg-green-500',
    Vehicle: 'bg-orange-500',
    Property: 'bg-sky-500',
    Mortgage: 'bg-purple-500',
};

interface CostForecastViewProps {
    insurancePolicies: InsuranceInfo[];
    vehicles: VehicleInfo[];
    properties: PropertyInfo[];
}

type CurrencyGroup = {
    currency: string;
    symbol: string;
    items: CostLineItem[];
    monthly: number;
    quarterly: number;
    yearly: number;
};

const CostForecastView: React.FC<CostForecastViewProps> = ({ insurancePolicies, vehicles, properties }) => {
    const [expandedCurrency, setExpandedCurrency] = useState<string | null>(null);

    const lineItems = useMemo(
        () => buildCostLineItems(insurancePolicies, vehicles, properties),
        [insurancePolicies, vehicles, properties],
    );

    // Group by currency
    const groups = useMemo<CurrencyGroup[]>(() => {
        const map = new Map<string, CostLineItem[]>();
        lineItems.forEach(item => {
            const cur = item.currency;
            if (!map.has(cur)) map.set(cur, []);
            map.get(cur)!.push(item);
        });

        return Array.from(map.entries())
            .map(([currency, items]) => {
                const monthly = items.reduce((sum, i) => sum + i.monthlyAmount, 0);
                return {
                    currency,
                    symbol: CURRENCY_SYMBOLS[currency] || currency + ' ',
                    items: items.sort((a, b) => b.monthlyAmount - a.monthlyAmount),
                    monthly,
                    quarterly: monthly * 3,
                    yearly: monthly * 12,
                };
            })
            .sort((a, b) => b.yearly - a.yearly); // largest first
    }, [lineItems]);

    if (groups.length === 0) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                <div className="p-5 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold flex items-center gap-3"><BanknotesIcon /> Cost Forecast</h2>
                </div>
                <div className="p-10 text-center text-slate-500 dark:text-gray-400">
                    No recurring cost data available.
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="p-5 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-xl font-bold flex items-center gap-3"><BanknotesIcon /> Cost Forecast</h2>
                <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">How much to set aside to cover all recurring costs</p>
            </div>

            <div className="p-5 space-y-6">
                {groups.map(group => {
                    const isExpanded = expandedCurrency === group.currency || groups.length === 1;
                    const maxMonthly = Math.max(...group.items.map(i => i.monthlyAmount));

                    return (
                        <div key={group.currency}>
                            {/* Summary cards */}
                            <button
                                onClick={() => groups.length > 1 && setExpandedCurrency(isExpanded ? null : group.currency)}
                                className={`w-full text-left ${groups.length > 1 ? 'cursor-pointer' : ''}`}
                            >
                                {groups.length > 1 && (
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-2">
                                        {group.currency}
                                        <span className="ml-2 text-slate-400">{isExpanded ? '\u25B2' : '\u25BC'}</span>
                                    </p>
                                )}
                                <div className="grid grid-cols-3 gap-3">
                                    <SummaryCard label="Monthly" amount={group.monthly} symbol={group.symbol} accent="brand-primary" />
                                    <SummaryCard label="Quarterly" amount={group.quarterly} symbol={group.symbol} accent="brand-primary" />
                                    <SummaryCard label="Yearly" amount={group.yearly} symbol={group.symbol} accent="brand-primary" />
                                </div>
                            </button>

                            {/* Breakdown table + bar chart */}
                            {isExpanded && (
                                <div className="mt-4 space-y-2">
                                    {group.items.map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-3">
                                            <div className="w-1/3 min-w-0">
                                                <p className="text-sm font-medium text-slate-700 dark:text-gray-200 truncate" title={item.name}>{item.name}</p>
                                                <p className="text-xs text-slate-400 dark:text-gray-500">{item.rawFrequency}</p>
                                            </div>
                                            <div className="flex-grow">
                                                <div className="h-6 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${BAR_COLORS[item.category] || 'bg-slate-500'} flex items-center justify-end pr-2 transition-all`}
                                                        style={{ width: `${Math.max((item.monthlyAmount / maxMonthly) * 100, 8)}%` }}
                                                    >
                                                        <span className="text-[10px] font-bold text-white whitespace-nowrap">
                                                            {group.symbol}{item.monthlyAmount.toFixed(0)}/mo
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <span className={`flex-shrink-0 px-2 py-0.5 text-[10px] font-semibold rounded-full ${CATEGORY_COLORS[item.category] || ''}`}>
                                                {item.category}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const SummaryCard: React.FC<{ label: string; amount: number; symbol: string; accent: string }> = ({ label, amount, symbol }) => (
    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-1">{label}</p>
        <p className="text-xl font-bold text-slate-900 dark:text-white">
            {symbol}{amount.toFixed(2)}
        </p>
    </div>
);

export default CostForecastView;
