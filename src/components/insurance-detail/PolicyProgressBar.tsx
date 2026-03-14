import React from 'react';
import { getPolicyProgress, getPolicyMonthSegments, type ProgressStatus } from './policyUtils';

interface PolicyProgressBarProps {
    startDate?: string;
    endDate?: string;
    variant?: 'full' | 'compact';
}

const statusColors: Record<ProgressStatus, string> = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
    expired: 'bg-red-700',
};

const statusBgColors: Record<ProgressStatus, string> = {
    green: 'bg-green-500/20',
    yellow: 'bg-yellow-500/20',
    orange: 'bg-orange-500/20',
    red: 'bg-red-500/20',
    expired: 'bg-red-700/20',
};

const PolicyProgressBar: React.FC<PolicyProgressBarProps> = ({ startDate, endDate, variant = 'full' }) => {
    const progress = getPolicyProgress(startDate, endDate);
    if (!progress) return null;

    const { percentage, daysRemaining, status } = progress;

    // Compact: thin continuous bar for cards/list rows
    if (variant === 'compact') {
        return (
            <div className={`w-full rounded-full h-1.5 ${statusBgColors[status]}`}>
                <div
                    className={`h-1.5 rounded-full transition-all duration-500 ${statusColors[status]}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        );
    }

    // Full: segmented month blocks
    const segments = getPolicyMonthSegments(startDate, endDate);

    const label = status === 'expired'
        ? 'Policy expired'
        : `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`;

    // Fallback to continuous bar if segments can't be calculated
    if (!segments || segments.length === 0) {
        return (
            <div className="space-y-1.5">
                <div className={`w-full rounded-full h-2.5 ${statusBgColors[status]}`}>
                    <div
                        className={`h-2.5 rounded-full transition-all duration-500 ${statusColors[status]}`}
                        style={{ width: `${percentage}%` }}
                    />
                </div>
                <div className="flex justify-between text-xs text-slate-500 dark:text-gray-400">
                    <span>{label}</span>
                    <span>{Math.round(percentage)}% elapsed</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {/* Segmented bar */}
            <div className="flex gap-0.5">
                {segments.map((seg, i) => (
                    <div
                        key={i}
                        className="group relative flex-1"
                    >
                        <div
                            className={`h-5 rounded-sm transition-all duration-300 ${
                                seg.elapsed
                                    ? `${seg.color} ${seg.current ? 'ring-2 ring-white dark:ring-slate-900 ring-offset-1 ring-offset-transparent' : ''}`
                                    : 'bg-slate-200 dark:bg-slate-700'
                            }`}
                        />
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded text-xs font-medium bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-800 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                            {seg.label}
                            {seg.current && ' (now)'}
                        </div>
                    </div>
                ))}
            </div>
            {/* Labels */}
            <div className="flex justify-between text-xs text-slate-500 dark:text-gray-400">
                <span>{label}</span>
                <span>{segments.filter(s => !s.elapsed).length} of {segments.length} months remaining</span>
            </div>
        </div>
    );
};

export default PolicyProgressBar;
