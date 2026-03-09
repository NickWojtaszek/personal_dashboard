
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ProjectInfo } from '../types';
import ProjectCard from './ProjectCard';

interface SortableProjectCardItemProps {
    project: ProjectInfo;
    isAdminMode: boolean;
    onEdit: (project: ProjectInfo) => void;
}

export const SortableProjectCardItem: React.FC<SortableProjectCardItemProps> = ({ project, isAdminMode, onEdit }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: project.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 'auto',
    };

    return (
        <ProjectCard
            ref={setNodeRef}
            style={style}
            project={project}
            isAdminMode={isAdminMode}
            onEdit={onEdit}
            isDragging={isDragging}
            listeners={listeners}
            {...attributes}
        />
    );
};
