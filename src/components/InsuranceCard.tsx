import React, { forwardRef } from 'react';
import type { InsuranceInfo } from '../types';
import { getColorForGroup } from '../constants';
import PolicyProgressBar from './insurance-detail/PolicyProgressBar';
import { getCountryBorder, getCountryFlag } from '../lib/countryColors';

interface InsuranceCardProps {
    policy: InsuranceInfo;
    isAdminMode: boolean;
    onEdit: (policy: InsuranceInfo) => void;
    onSelect: (id: string) => void;
    listeners?: any;
    style?: React.CSSProperties;
    isDragging?: boolean;
    [key: string]: any;
}

const EditIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>);
const GripVerticalIcon = (props: React.SVGProps<SVGSVGElement>) => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="9" cy="12" r="1" /><circle cx="9" cy="5" r="1" /><circle cx="9" cy="19" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="15"cy="5" r="1" /><circle cx="15" cy="19" r="1" /></svg>);

const getStatusColor = (status?: string) => {
    switch (status) {
        case 'Active': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
        case 'Expired': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
        case 'Pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
        default: return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
    }
};

const CardContent: React.FC<{ policy: InsuranceInfo }> = ({ policy }) => (
    <div className="flex flex-col p-6 h-full">
        <div className="flex items-start justify-between mb-2">
            <div>
                <h3 className="font-semibold text-slate-800 dark:text-gray-200 group-hover:text-brand-primary dark:group-hover:text-brand-secondary transition-colors">
                    {policy.country && <span className="mr-1.5" title={policy.country}>{getCountryFlag(policy.country)}</span>}
                    {policy.name}
                </h3>
                <p className="text-sm text-slate-500 dark:text-gray-400">{policy.provider}</p>
            </div>
            {policy.status && (
                <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${getStatusColor(policy.status)} flex-shrink-0`}>
                    {policy.status}
                </span>
            )}
        </div>
        
        <div className="flex-grow mb-4 space-y-3">
             <p className="text-slate-600 dark:text-slate-300 text-sm">
                {policy.policyType && `${policy.policyType}. `}Renews {policy.renewalDate}.
            </p>
            <PolicyProgressBar startDate={policy.startDate} endDate={policy.endDate} variant="compact" />
        </div>
        
        {policy.groups && policy.groups.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-auto pt-4 border-t border-slate-100 dark:border-slate-700">
                {policy.groups.map(group => (
                    <span key={group} className={`px-2 py-1 text-xs rounded-full font-medium ${getColorForGroup(group)}`}>{group}</span>
                ))}
            </div>
        )}
    </div>
);

const InsuranceCard = forwardRef<HTMLDivElement, InsuranceCardProps>(({ policy, isAdminMode, onEdit, onSelect, listeners, style, isDragging, ...rest }, ref) => {
    const countryBorder = getCountryBorder(policy.country);
    const baseClasses = `relative group flex flex-col h-full bg-slate-50 dark:bg-slate-800 rounded-xl overflow-hidden transition-all duration-300 ease-in-out border border-slate-200 dark:border-slate-700 text-left w-full ${countryBorder}`;
    const draggingClasses = isDragging ? "opacity-70 shadow-2xl scale-105" : "";
    
    const cardContent = <CardContent policy={policy} />;

    if (isAdminMode) {
        return (
            <div ref={ref} style={style} className={`${baseClasses} ${draggingClasses}`} {...rest}>
                <div
                    className="absolute top-2 right-2 p-2 cursor-grab touch-none text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors z-20"
                    aria-label="Drag to reorder"
                    {...listeners}
                >
                    <GripVerticalIcon className="w-5 h-5" />
                </div>
                <div onClick={() => onSelect(policy.id)} className="cursor-pointer h-full">
                    {cardContent}
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); onEdit(policy); }}
                    className="absolute bottom-4 right-4 p-2 rounded-full bg-brand-primary/20 text-brand-primary opacity-0 group-hover:opacity-100 transition-opacity hover:bg-brand-primary/40"
                    aria-label={`Edit ${policy.name}`}
                >
                    <EditIcon/>
                </button>
            </div>
        );
    }

    const hoverClasses = "hover:border-brand-primary dark:hover:border-brand-secondary hover:scale-[1.02] hover:shadow-xl hover:shadow-brand-primary/10 dark:hover:shadow-brand-secondary/10";
    return (
        <button onClick={() => onSelect(policy.id)} className={`${baseClasses} ${hoverClasses}`}>
            {cardContent}
        </button>
    );
});

InsuranceCard.displayName = 'InsuranceCard';
export default InsuranceCard;