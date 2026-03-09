// Note: Filename is InvoiceGrid.tsx, but it now contains the InvoiceTable component.
import React from 'react';
import type { InvoiceInfo } from '../types';
import { DndContext, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableInvoiceRow } from './SortableInvoiceCardItem';
import InvoiceRow from './InvoiceCard';

interface InvoiceTableProps {
    invoices: InvoiceInfo[];
    isAdminMode: boolean;
    onEdit: (invoice: InvoiceInfo) => void;
    onSelect: (id: string) => void; // For viewing PDF
    onOrderChange: (activeId: string, overId: string) => void;
}

const InvoiceTable: React.FC<InvoiceTableProps> = ({ invoices, isAdminMode, onEdit, onSelect, onOrderChange }) => {
    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            onOrderChange(String(active.id), String(over.id));
        }
    };

    if (invoices.length === 0) {
        return (
            <div className="text-center py-16 text-slate-500 dark:text-gray-400">
                <p className="text-lg">No invoices found.</p>
                <p>Try adjusting your search or filters.</p>
            </div>
        )
    }

    const invoiceIds = invoices.map(p => p.id);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-700/50">
                    <tr>
                        {isAdminMode && <th scope="col" className="w-12"></th>}
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-gray-300 uppercase tracking-wider">Description</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-gray-300 uppercase tracking-wider">Category</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-gray-300 uppercase tracking-wider">Location</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-gray-300 uppercase tracking-wider">Purchase Date</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-gray-300 uppercase tracking-wider">Amount</th>
                        <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                    </tr>
                </thead>
                 {isAdminMode ? (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={invoiceIds} strategy={verticalListSortingStrategy}>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {invoices.map(invoice => (
                                    <SortableInvoiceRow key={invoice.id} invoice={invoice} onEdit={onEdit} onSelect={onSelect} />
                                ))}
                            </tbody>
                        </SortableContext>
                    </DndContext>
                ) : (
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {invoices.map(invoice => (
                           <InvoiceRow key={invoice.id} invoice={invoice} onEdit={onEdit} onSelect={onSelect} />
                        ))}
                    </tbody>
                )}
            </table>
        </div>
    );
};

export default InvoiceTable;