import React, { useMemo } from 'react';
import type { InsuranceInfo } from '../../types';
import { parseRenewalDate, formatDistanceToNow } from '../general/dateUtils';
import { BellIcon } from '../general/Icons';
import PolicyProgressBar from './PolicyProgressBar';

interface UpcomingRenewalsProps {
    policies: InsuranceInfo[];
}

const UpcomingRenewals: React.FC<UpcomingRenewalsProps> = ({ policies }) => {
    const upcomingRenewals = useMemo(() => {
        const now = new Date();
        now.setDate(1);
        now.setHours(0, 0, 0, 0);

        return policies
            .filter(p => p.status === 'Active' || p.status === 'Pending')
            .map(p => {
                const renewalDateObj = parseRenewalDate(p.renewalDate);
                return { ...p, renewalDateObj };
            })
            .filter(p => p.renewalDateObj && p.renewalDateObj >= now)
            .sort((a, b) => a.renewalDateObj!.getTime() - b.renewalDateObj!.getTime());
    }, [policies]);
    
    const getUrgencyClasses = (date: Date): string => {
        const diffTime = date.getTime() - new Date().getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 30) return 'border-l-red-500';
        if (diffDays <= 90) return 'border-l-yellow-500';
        return 'border-l-green-500';
    };


    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 h-full">
            <div className="p-5 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-xl font-bold flex items-center gap-3"><BellIcon /> Upcoming Renewals</h2>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                {upcomingRenewals.length > 0 ? (
                    upcomingRenewals.map(policy => (
                        <div key={policy.id} className={`p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-l-4 border-slate-200 dark:border-slate-700 ${getUrgencyClasses(policy.renewalDateObj!)}`}>
                            <div className="space-y-2">
                                <div className="flex justify-between items-start gap-3">
                                    <div>
                                        <p className="font-semibold text-slate-800 dark:text-gray-200">{policy.name}</p>
                                        <p className="text-sm text-slate-500 dark:text-gray-400">{policy.provider}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="font-semibold text-brand-primary dark:text-brand-secondary text-sm">{formatDistanceToNow(policy.renewalDateObj!)}</p>
                                        <p className="text-xs text-slate-400 dark:text-gray-500">{policy.renewalDate}</p>
                                    </div>
                                </div>
                                <PolicyProgressBar startDate={policy.startDate} endDate={policy.endDate} variant="compact" />
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-10 text-slate-500 dark:text-gray-400">
                        <p>No upcoming renewals found.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UpcomingRenewals;
