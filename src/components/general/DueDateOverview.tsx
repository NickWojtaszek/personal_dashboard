import React, { useState, useMemo } from 'react';
import type { DueDateItem } from './dateUtils';
import { formatDistanceToNow } from './dateUtils';
import { BellIcon } from './Icons';
import PolicyProgressBar from '../insurance-detail/PolicyProgressBar';

const CURRENCY_SYMBOLS: Record<string, string> = { GBP: '\u00a3', USD: '$', AUD: 'A$', EUR: '\u20ac', PLN: 'z\u0142' };

type RangeFilter = 3 | 6 | 12;

interface DueDateOverviewProps {
    dueDates: DueDateItem[];
    onNavigate?: (item: DueDateItem) => void;
}

function daysUntil(dateStr: string): number {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.ceil((new Date(dateStr).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

const STATUS_COLORS: Record<string, string> = {
    Active: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    Current: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    Expired: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
    'Due Soon': 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
    Pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
};

const TYPE_COLORS: Record<string, string> = {
    Property: 'bg-sky-500',
    Insurance: 'bg-green-500',
    Contract: 'bg-amber-500',
    Vehicle: 'bg-orange-500',
    Invoice: 'bg-purple-500',
};

const DueDateOverview: React.FC<DueDateOverviewProps> = ({ dueDates, onNavigate }) => {
    const [range, setRange] = useState<RangeFilter>(6);

    const filtered = useMemo(() => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const cutoff = new Date(now);
        cutoff.setMonth(cutoff.getMonth() + range);
        return dueDates.filter(item => new Date(item.date) <= cutoff);
    }, [dueDates, range]);

    const overdue = filtered.filter(i => daysUntil(i.date) < 0);
    const upcoming = filtered.filter(i => daysUntil(i.date) >= 0);

    const RangeButton: React.FC<{ value: RangeFilter }> = ({ value }) => (
        <button
            onClick={() => setRange(value)}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${range === value ? 'bg-brand-primary text-white shadow' : 'text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
        >
            {value}m
        </button>
    );

    const renderRow = (item: DueDateItem) => {
        const days = daysUntil(item.date);
        const isOverdue = days < 0;
        const sym = CURRENCY_SYMBOLS[item.currency || ''] || '';

        // Derive display status
        let displayStatus = item.status;
        if (isOverdue) displayStatus = 'Expired';
        else if (!displayStatus && days <= 30) displayStatus = 'Due Soon';
        else if (!displayStatus) displayStatus = 'Active';

        return (
            <div
                key={item.id + item.subType}
                className={`flex items-center gap-4 px-5 py-4 border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer ${isOverdue ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}
                onClick={() => onNavigate?.(item)}
            >
                {/* Type indicator dot */}
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${TYPE_COLORS[item.type] || 'bg-slate-400'}`} />

                {/* Name + detail */}
                <div className="min-w-0 w-48 flex-shrink-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-gray-200 truncate">{item.sourceName}</p>
                    {item.detail && <p className="text-xs text-slate-500 dark:text-gray-400 truncate">{item.detail}</p>}
                </div>

                {/* Sub-type */}
                <div className="w-32 flex-shrink-0 hidden sm:block">
                    <p className="text-sm text-slate-600 dark:text-slate-300">{item.subType}</p>
                </div>

                {/* Amount + frequency */}
                <div className="w-24 flex-shrink-0 text-right hidden md:block">
                    {typeof item.amount === 'number' ? (
                        <>
                            <p className="text-sm font-bold text-slate-800 dark:text-gray-200">{sym}{item.amount.toFixed(2)}</p>
                            {item.amountFrequency && <p className="text-xs text-slate-400 dark:text-gray-500">{item.amountFrequency}</p>}
                        </>
                    ) : (
                        <p className="text-xs text-slate-400">&mdash;</p>
                    )}
                </div>

                {/* Progress bar */}
                <div className="flex-grow min-w-0 hidden lg:block">
                    {item.startDate && item.endDate ? (
                        <PolicyProgressBar startDate={item.startDate} endDate={item.endDate} variant="full" />
                    ) : (
                        <div className="flex items-center justify-center h-5">
                            <p className={`text-xs font-medium ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-brand-primary dark:text-brand-secondary'}`}>
                                {formatDistanceToNow(new Date(item.date))}
                            </p>
                        </div>
                    )}
                </div>
                {/* Mobile: show distance text instead of bar */}
                <div className="flex-grow min-w-0 lg:hidden">
                    <p className={`text-xs font-medium text-right ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-brand-primary dark:text-brand-secondary'}`}>
                        {formatDistanceToNow(new Date(item.date))}
                    </p>
                </div>

                {/* Status badge */}
                <div className="w-20 flex-shrink-0 text-right">
                    <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${STATUS_COLORS[displayStatus || ''] || STATUS_COLORS.Active}`}>
                        {displayStatus}
                    </span>
                </div>
            </div>
        );
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center flex-wrap gap-3">
                <h2 className="text-xl font-bold flex items-center gap-3"><BellIcon /> Upcoming Deadlines</h2>
                <div className="p-1 bg-slate-100 dark:bg-slate-700/50 rounded-lg flex items-center gap-1">
                    <RangeButton value={3} />
                    <RangeButton value={6} />
                    <RangeButton value={12} />
                </div>
            </div>

            {/* Column headers */}
            <div className="flex items-center gap-4 px-5 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                <div className="w-2 flex-shrink-0" />
                <div className="w-48 flex-shrink-0">Name</div>
                <div className="w-32 flex-shrink-0 hidden sm:block">Type</div>
                <div className="w-24 flex-shrink-0 text-right hidden md:block">Cost</div>
                <div className="flex-grow hidden lg:block">Progress</div>
                <div className="flex-grow lg:hidden">Due</div>
                <div className="w-20 flex-shrink-0 text-right">Status</div>
            </div>

            <div className="max-h-[65vh] overflow-y-auto">
                {overdue.length > 0 && (
                    <>
                        <div className="px-5 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
                            <p className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400">Overdue ({overdue.length})</p>
                        </div>
                        {overdue.map(renderRow)}
                    </>
                )}
                {upcoming.length > 0 ? (
                    <>
                        {overdue.length > 0 && (
                            <div className="px-5 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">Upcoming ({upcoming.length})</p>
                            </div>
                        )}
                        {upcoming.map(renderRow)}
                    </>
                ) : overdue.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 dark:text-gray-400">
                        <p>No upcoming due dates in the next {range} months.</p>
                    </div>
                ) : null}
            </div>
        </div>
    );
};

export default DueDateOverview;
