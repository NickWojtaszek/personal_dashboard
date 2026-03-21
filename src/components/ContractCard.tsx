import React, { forwardRef } from 'react';
import type { ContractInfo } from '../types';
import { getColorForGroup } from '../constants';
import { getCountryBorder, getCountryFlag } from '../lib/countryColors';

interface ContractCardProps {
    contract: ContractInfo;
    isAdminMode: boolean;
    onEdit: (contract: ContractInfo) => void;
    onSelect: (id: string) => void;
    listeners?: any;
    style?: React.CSSProperties;
    isDragging?: boolean;
    [key: string]: any;
}

const EditIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>);
const GripVerticalIcon = (props: React.SVGProps<SVGSVGElement>) => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="9" cy="12" r="1" /><circle cx="9" cy="5" r="1" /><circle cx="9" cy="19" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="15" cy="5" r="1" /><circle cx="15" cy="19" r="1" /></svg>);

const getStatusColor = (status?: string) => {
    switch (status) {
        case 'Active': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
        case 'Expired': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
        case 'Pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
        case 'Archived': return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
        default: return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
    }
};

function daysUntil(dateStr?: string): number | null {
    if (!dateStr) return null;
    const diff = new Date(dateStr).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function contractProgress(start?: string, end?: string): number | null {
    if (!start || !end) return null;
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    const now = Date.now();
    if (e <= s) return 100;
    return Math.max(0, Math.min(100, ((now - s) / (e - s)) * 100));
}

const CardContent: React.FC<{ contract: ContractInfo }> = ({ contract }) => {
    const days = daysUntil(contract.expirationDate);
    const progress = contractProgress(contract.effectiveDate, contract.expirationDate);

    return (
        <div className="flex flex-col p-6 h-full">
            <div className="flex items-start justify-between mb-2">
                <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-800 dark:text-gray-200 group-hover:text-brand-primary dark:group-hover:text-brand-secondary transition-colors">
                        {contract.country && <span className="mr-1.5" title={contract.country}>{getCountryFlag(contract.country)}</span>}
                        {contract.name}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-gray-400">{contract.contractType || 'Contract'}</p>
                </div>
                {contract.status && (
                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${getStatusColor(contract.status)} flex-shrink-0`}>
                        {contract.status}
                    </span>
                )}
            </div>

            <div className="flex-grow mb-4 space-y-2">
                {contract.employer && (
                    <p className="text-sm text-slate-600 dark:text-slate-300">{contract.employer}</p>
                )}
                {days !== null && (
                    <p className={`text-xs font-medium ${days <= 30 ? 'text-red-500' : days <= 90 ? 'text-amber-500' : 'text-slate-500 dark:text-gray-400'}`}>
                        {days > 0 ? `${days} days remaining` : days === 0 ? 'Expires today' : `Expired ${Math.abs(days)} days ago`}
                    </p>
                )}
                {progress !== null && (
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all ${progress >= 90 ? 'bg-red-500' : progress >= 75 ? 'bg-amber-500' : 'bg-blue-500'}`}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}
            </div>

            {contract.groups && contract.groups.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-auto pt-4 border-t border-slate-100 dark:border-slate-700">
                    {contract.groups.map(group => (
                        <span key={group} className={`px-2 py-1 text-xs rounded-full font-medium ${getColorForGroup(group)}`}>{group}</span>
                    ))}
                </div>
            )}
        </div>
    );
};

const ContractCard = forwardRef<HTMLDivElement, ContractCardProps>(({ contract, isAdminMode, onEdit, onSelect, listeners, style, isDragging, ...rest }, ref) => {
    const countryBorder = getCountryBorder(contract.country);
    const baseClasses = `relative group flex flex-col h-full bg-slate-50 dark:bg-slate-800 rounded-xl overflow-hidden transition-all duration-300 ease-in-out border border-slate-200 dark:border-slate-700 text-left w-full ${countryBorder}`;
    const draggingClasses = isDragging ? "opacity-70 shadow-2xl scale-105" : "";

    const cardContent = <CardContent contract={contract} />;

    if (isAdminMode) {
        return (
            <div ref={ref} style={style} className={`${baseClasses} ${draggingClasses}`} {...rest}>
                <div className="absolute top-2 right-2 p-2 cursor-grab touch-none text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors z-20" aria-label="Drag to reorder" {...listeners}>
                    <GripVerticalIcon className="w-5 h-5" />
                </div>
                <div onClick={() => onSelect(contract.id)} className="cursor-pointer h-full">{cardContent}</div>
                <button onClick={(e) => { e.stopPropagation(); onEdit(contract); }} className="absolute bottom-4 right-4 p-2 rounded-full bg-brand-primary/20 text-brand-primary opacity-0 group-hover:opacity-100 transition-opacity hover:bg-brand-primary/40" aria-label={`Edit ${contract.name}`}>
                    <EditIcon />
                </button>
            </div>
        );
    }

    const hoverClasses = "hover:border-brand-primary dark:hover:border-brand-secondary hover:scale-[1.02] hover:shadow-xl hover:shadow-brand-primary/10 dark:hover:shadow-brand-secondary/10";
    return (
        <button onClick={() => onSelect(contract.id)} className={`${baseClasses} ${hoverClasses}`}>
            {cardContent}
        </button>
    );
});

ContractCard.displayName = 'ContractCard';
export default ContractCard;
