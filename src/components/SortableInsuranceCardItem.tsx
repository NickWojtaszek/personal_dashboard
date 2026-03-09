
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { InsuranceInfo } from '../types';
import InsuranceCard from './InsuranceCard';

interface SortableInsuranceCardItemProps {
    policy: InsuranceInfo;
    isAdminMode: boolean;
    onEdit: (policy: InsuranceInfo) => void;
    onSelect: (id: string) => void;
}

export const SortableInsuranceCardItem: React.FC<SortableInsuranceCardItemProps> = ({ policy, isAdminMode, onEdit, onSelect }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: policy.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 'auto',
    };

    return (
        <InsuranceCard
            ref={setNodeRef}
            style={style}
            policy={policy}
            isAdminMode={isAdminMode}
            onEdit={onEdit}
            onSelect={onSelect}
            isDragging={isDragging}
            listeners={listeners}
            {...attributes}
        />
    );
};
