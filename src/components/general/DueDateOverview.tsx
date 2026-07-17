import React, { useState, useMemo } from 'react';
import type { DueDateItem } from './dateUtils';
import { formatDistanceToNow, formatFullDate } from './dateUtils';
import { BellIcon } from './Icons';
import PolicyProgressBar from '../insurance-detail/PolicyProgressBar';
import { addMonths, daysUntil as daysUntilShared, parseLocalDate, toLocalISO, todayLocal } from '../../lib/dates';

const CURRENCY_SYMBOLS: Record<string, string> = { GBP: '\u00a3', USD: '$', AUD: 'A$', NZD: 'NZ$', EUR: '\u20ac', PLN: 'z\u0142' };

type RangeFilter = 3 | 6 | 12;
type SortField = 'date' | 'amount' | 'name';
type SortDir = 'asc' | 'desc';

interface DueDateOverviewProps {
    dueDates: DueDateItem[];
    onNavigate?: (item: DueDateItem) => void;
    /** Dismiss a paid bill. Only offered for rows backed by a real record (`recordId`). */
    onDismiss?: (item: DueDateItem) => void;
}

/** 0 when the date is today or unparseable \u2014 never treat those as overdue. */
function daysUntil(dateStr: string): number {
    return daysUntilShared(dateStr) ?? 0;
}

function compareItems(a: DueDateItem, b: DueDateItem, field: SortField, dir: SortDir): number {
    let cmp: number;
    if (field === 'amount') {
        // Rows without an amount sort last regardless of direction.
        const av = a.amount ?? -Infinity, bv = b.amount ?? -Infinity;
        cmp = av - bv;
    } else if (field === 'name') {
        cmp = a.sourceName.localeCompare(b.sourceName);
    } else {
        cmp = a.date.localeCompare(b.date); // ISO 'YYYY-MM-DD' sorts lexically
    }
    return dir === 'asc' ? cmp : -cmp;
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

const DueDateOverview: React.FC<DueDateOverviewProps> = ({ dueDates, onNavigate, onDismiss }) => {
    const [range, setRange] = useState<RangeFilter>(6);
    const [sortField, setSortField] = useState<SortField>('date');
    const [sortDir, setSortDir] = useState<SortDir>('asc');

    const toggleSort = (field: SortField) => {
        if (field === sortField) {
            setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(field);
            // Date defaults to soonest-first; amount/name default to a sensible direction too.
            setSortDir(field === 'amount' ? 'desc' : 'asc');
        }
    };

    const filtered = useMemo(() => {
        // addMonths clamps month-end; cutoff.setMonth() would overflow (31 Aug + 3 → 1 Dec)
        // and silently widen the range by a day.
        const cutoff = addMonths(toLocalISO(todayLocal()), range);
        return dueDates.filter(item => {
            const d = parseLocalDate(item.date);
            return d !== null && item.date <= cutoff;
        });
    }, [dueDates, range]);

    // Sort within each group so overdue always stays above upcoming, whatever the sort.
    const sortGroup = (items: DueDateItem[]) => [...items].sort((a, b) => compareItems(a, b, sortField, sortDir));
    const overdue = sortGroup(filtered.filter(i => daysUntil(i.date) < 0));
    const upcoming = sortGroup(filtered.filter(i => daysUntil(i.date) >= 0));

    const RangeButton: React.FC<{ value: RangeFilter }> = ({ value }) => (
        <button
            onClick={() => setRange(value)}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${range === value ? 'bg-brand-primary text-white shadow' : 'text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
        >
            {value}m
        </button>
    );

    const SortHeader: React.FC<{ field: SortField; label: string; align?: 'left' | 'right' }> = ({ field, label, align = 'left' }) => {
        const active = sortField === field;
        return (
            <button
                onClick={() => toggleSort(field)}
                className={`inline-flex items-center gap-1 uppercase tracking-wider hover:text-slate-700 dark:hover:text-gray-200 transition-colors ${align === 'right' ? 'flex-row-reverse' : ''} ${active ? 'text-slate-700 dark:text-gray-200' : ''}`}
            >
                {label}
                <span className="text-[10px]">{active ? (sortDir === 'asc' ? '▲' : '▼') : ''}</span>
            </button>
        );
    };

    const renderRow = (item: DueDateItem) => {
        const days = daysUntil(item.date);
        // A projected date isn't a real debt yet, so it must never read as overdue —
        // the notice simply hasn't arrived.
        const isOverdue = days < 0 && !item.isPredicted;
        const sym = CURRENCY_SYMBOLS[item.currency || ''] || '';
        const canDismiss = Boolean(onDismiss && item.recordId);

        // Derive display status
        let displayStatus = item.status;
        if (item.isPredicted) displayStatus = 'Pending';
        else if (isOverdue) displayStatus = 'Expired';
        else if (!displayStatus && days <= 30) displayStatus = 'Due Soon';
        else if (!displayStatus) displayStatus = 'Active';

        return (
            <div
                // recordId included: a property can carry several outstanding notices,
                // which would otherwise collide on id+subType and drop rows.
                key={`${item.id}:${item.subType}:${item.recordId ?? item.date}`}
                className={`flex items-center gap-4 px-5 py-4 border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer ${isOverdue ? 'bg-red-50/50 dark:bg-red-900/10' : ''} ${item.isPredicted ? 'opacity-60' : ''}`}
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
                    {item.isPredicted && (
                        <p className="text-xs text-slate-400 dark:text-gray-500 italic">expected — no notice yet</p>
                    )}
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

                {/* Due date — the actual date, previously only implied by the bar */}
                <div className="w-24 flex-shrink-0 text-right hidden sm:block">
                    <p className={`text-sm font-medium ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>
                        {(() => { const d = parseLocalDate(item.date); return d ? formatFullDate(d) : '—'; })()}
                    </p>
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

                {/* Dismiss action */}
                <div className="w-16 flex-shrink-0 text-right">
                    {canDismiss && (
                        <button
                            // The row itself navigates; without stopPropagation, dismissing
                            // would also jump to the property detail page.
                            onClick={e => { e.stopPropagation(); onDismiss!(item); }}
                            className="px-2 py-0.5 text-xs rounded-full font-medium bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300 dark:hover:bg-green-900/80 transition-colors"
                            title="Mark paid and archive to the property"
                        >
                            Paid
                        </button>
                    )}
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

            {/* Column headers — Name / Cost / Due are clickable to sort */}
            <div className="flex items-center gap-4 px-5 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                <div className="w-2 flex-shrink-0" />
                <div className="w-48 flex-shrink-0"><SortHeader field="name" label="Name" /></div>
                <div className="w-32 flex-shrink-0 hidden sm:block">Type</div>
                <div className="w-24 flex-shrink-0 text-right hidden md:block"><SortHeader field="amount" label="Cost" align="right" /></div>
                <div className="w-24 flex-shrink-0 text-right hidden sm:block"><SortHeader field="date" label="Due" align="right" /></div>
                <div className="flex-grow hidden lg:block">Progress</div>
                <div className="flex-grow lg:hidden">In</div>
                <div className="w-20 flex-shrink-0 text-right">Status</div>
                <div className="w-16 flex-shrink-0" />
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
