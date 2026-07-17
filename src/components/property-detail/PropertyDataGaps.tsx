import React, { useMemo } from 'react';
import type { PropertyInfo, InsuranceInfo } from '../../types';
import { detectPropertyGaps } from '../../lib/gapDetection';

interface PropertyDataGapsProps {
    property: PropertyInfo;
    insurancePolicies?: InsuranceInfo[];
}

/**
 * Surfaces expected-but-missing recurring records (council rates, strata, rent,
 * insurance) as a compact warning panel on the property detail page. Each row
 * scrolls to the section that owns the data so it can be filled in.
 */
const PropertyDataGaps: React.FC<PropertyDataGapsProps> = ({ property, insurancePolicies }) => {
    const gaps = useMemo(() => detectPropertyGaps(property, insurancePolicies), [property, insurancePolicies]);

    if (gaps.length === 0) return null;

    const scrollTo = (section: string) => {
        const el = document.querySelector(`[data-section="${section}"]`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <div className="rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-900/20 p-4">
            <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
                <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300">
                    Possible missing records ({gaps.length})
                </h3>
            </div>
            <ul className="space-y-1.5">
                {gaps.map(gap => (
                    <li key={gap.source} className="flex items-start justify-between gap-3 text-sm">
                        <div className="min-w-0">
                            <span className="font-semibold text-amber-900 dark:text-amber-200">{gap.title}:</span>{' '}
                            <span className="text-amber-800 dark:text-amber-300/90">{gap.message}</span>
                        </div>
                        <button
                            onClick={() => scrollTo(gap.section)}
                            className="flex-shrink-0 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline"
                        >
                            Review →
                        </button>
                    </li>
                ))}
            </ul>
            <p className="mt-2 text-[11px] text-amber-600/80 dark:text-amber-500/70">
                Estimated from recorded cadence — check before acting; some may be paid but not yet entered.
            </p>
        </div>
    );
};

export default PropertyDataGaps;
