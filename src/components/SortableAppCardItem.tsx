import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { AppInfo } from '../types';
import AppCard from './AppCard';

interface SortableAppCardItemProps {
    app: AppInfo;
    isAdminMode: boolean;
    onEdit: (app: AppInfo) => void;
}

export const SortableAppCardItem: React.FC<SortableAppCardItemProps> = ({ app, isAdminMode, onEdit }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: app.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 'auto',
    };

    return (
        <AppCard
            ref={setNodeRef}
            style={style}
            app={app}
            isAdminMode={isAdminMode}
            onEdit={onEdit}
            isDragging={isDragging}
            listeners={listeners}
            {...attributes}
        />
    );
};
