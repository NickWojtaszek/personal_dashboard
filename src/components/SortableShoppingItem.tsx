
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ShoppingItem } from '../types';
import ShoppingItemRow from './ShoppingItem';

interface SortableShoppingItemProps {
    item: ShoppingItem;
    onToggle: (id: string) => void;
    onDelete: (id: string) => void;
    onEdit: (item: ShoppingItem) => void;
    isAdminMode: boolean;
}

export const SortableShoppingItem: React.FC<SortableShoppingItemProps> = ({ item, onToggle, onDelete, onEdit, isAdminMode }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <ShoppingItemRow
            ref={setNodeRef}
            style={style}
            item={item}
            onToggle={onToggle}
            onDelete={onDelete}
            onEdit={onEdit}
            isAdminMode={isAdminMode}
            isDragging={isDragging}
            listeners={listeners}
            {...attributes}
        />
    );
};
