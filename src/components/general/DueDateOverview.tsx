

import React from 'react';
import type { DueDateItem } from './dateUtils';
import { formatDistanceToNow, formatFullDate } from './dateUtils';
import { PropertyIcon, InsuranceIcon, BellIcon, InvoiceIcon, VehicleIcon } from './Icons';

interface DueDateOverviewProps {
    dueDates: DueDateItem[];
}

const DueDateOverview: React.FC<DueDateOverviewProps> = ({ dueDates }) => {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 h-full">
            <div className="p-5 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-xl font-bold flex items-center gap-3"><BellIcon /> Due Date Overview</h2>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                {dueDates.length > 0 ? (
                    dueDates.map(item => (
                        <div key={item.id + item.subType} className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                            <div className="flex justify-between items-start gap-3">
                                <div className="flex items-start gap-3">
                                    <div className={`mt-1 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                                        item.type === 'Property' ? 'bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-300' :
                                        item.type === 'Insurance' ? 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-300' :
                                        item.type === 'Vehicle' ? 'bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-300' :
                                        'bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300'
                                    }`}>
                                        {item.type === 'Property' ? <PropertyIcon /> :
                                         item.type === 'Insurance' ? <InsuranceIcon /> :
                                         item.type === 'Vehicle' ? <VehicleIcon /> :
                                         <InvoiceIcon />}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-800 dark:text-gray-200">{item.subType}</p>
                                        <p className="text-sm text-slate-500 dark:text-gray-400">{item.sourceName}</p>
                                    </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className="font-semibold text-brand-primary dark:text-brand-secondary text-sm">{formatDistanceToNow(new Date(item.date))}</p>
                                    <p className="text-xs text-slate-400 dark:text-gray-500">{formatFullDate(new Date(item.date))}</p>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-10 text-slate-500 dark:text-gray-400">
                        <p>No upcoming due dates found.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DueDateOverview;