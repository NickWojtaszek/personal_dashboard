// Note: Filename is SortableInvoiceCardItem.tsx, but it now contains the SortableInvoiceRow component.
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { InvoiceInfo } from '../types';
import InvoiceRow from './InvoiceCard';

interface SortableInvoiceRowProps {
    invoice: InvoiceInfo;
    onEdit: (invoice: InvoiceInfo) => void;
    onSelect: (id: string) => void;
}

export const SortableInvoiceRow: React.FC<SortableInvoiceRowProps> = ({ invoice, onEdit, onSelect }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: invoice.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <InvoiceRow
            ref={setNodeRef}
            style={style}
            invoice={invoice}
            onEdit={onEdit}
            onSelect={onSelect}
            isDragging={isDragging}
            listeners={listeners}
            {...attributes}
        />
    );
};