
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { PropertyInfo } from '../types';
import PropertyCard from './PropertyCard';

interface SortablePropertyCardItemProps {
    property: PropertyInfo;
    isAdminMode: boolean;
    onEdit: (property: PropertyInfo) => void;
    onSelect: (id: string) => void;
}

export const SortablePropertyCardItem: React.FC<SortablePropertyCardItemProps> = ({ property, isAdminMode, onEdit, onSelect }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: property.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 'auto',
    };

    return (
        <PropertyCard
            ref={setNodeRef}
            style={style}
            property={property}
            isAdminMode={isAdminMode}
            onEdit={onEdit}
            onSelect={onSelect}
            isDragging={isDragging}
            listeners={listeners}
            {...attributes}
        />
    );
};
