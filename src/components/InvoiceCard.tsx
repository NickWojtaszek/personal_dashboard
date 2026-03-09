// Note: Filename is InvoiceCard.tsx, but it now contains the InvoiceRow component.
import React from 'react';
import type { InvoiceInfo } from '../types';
import { getColorForGroup } from '../constants';

interface InvoiceRowProps {
    invoice: InvoiceInfo;
    onEdit: (invoice: InvoiceInfo) => void;
    onSelect: (id: string) => void; // For viewing PDF
    isDragging?: boolean;
    listeners?: any;
}

const GripVerticalIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="12" r="1" /><circle cx="9" cy="5" r="1" /><circle cx="9" cy="19" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="15" cy="5" r="1" /><circle cx="15" cy="19" r="1" /></svg>);

const InvoiceRow = React.forwardRef<HTMLTableRowElement, InvoiceRowProps>(({ invoice, onEdit, onSelect, isDragging, listeners }, ref) => {
    const opacity = isDragging ? 'opacity-50' : '';
    const isAdminMode = !!listeners;

    return (
        <tr ref={ref} className={`${opacity}`}>
            {isAdminMode && (
                <td className="px-2 text-center">
                    <button {...listeners} className="cursor-grab p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><GripVerticalIcon/></button>
                </td>
            )}
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-slate-900 dark:text-white">{invoice.description}</div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex flex-wrap gap-1">
                    {invoice.groups?.map(group => (
                        <span key={group} className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getColorForGroup(group)}`}>
                            {group}
                        </span>
                    ))}
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-slate-500 dark:text-gray-400">{invoice.location}</div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-slate-500 dark:text-gray-400">{new Date(invoice.purchaseDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-800 dark:text-gray-200">
                £{invoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                <button onClick={() => onSelect(invoice.id)} className="text-brand-primary hover:text-brand-secondary disabled:text-slate-400 disabled:cursor-not-allowed" disabled={!invoice.document}>View PDF</button>
                {isAdminMode && <button onClick={() => onEdit(invoice)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300">Edit</button>}
            </td>
        </tr>
    );
});

export default InvoiceRow;