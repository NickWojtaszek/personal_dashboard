
import React from 'react';
import type { ProjectInfo } from '../types';
import { DndContext, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import ProjectCard from './ProjectCard';
import { SortableProjectCardItem } from './SortableProjectCardItem';

interface ProjectGridProps {
    projects: ProjectInfo[];
    isAdminMode: boolean;
    onEdit: (project: ProjectInfo) => void;
    onOrderChange: (activeId: string, overId: string) => void;
}

const ProjectGrid: React.FC<ProjectGridProps> = ({ projects, isAdminMode, onEdit, onOrderChange }) => {
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

    if (!projects) return null;

    if (projects.length === 0) {
        return (
            <div className="text-center py-16 text-slate-500 dark:text-gray-400">
                <p className="text-lg">No projects found.</p>
                <p>Try adjusting your search or filters.</p>
            </div>
        )
    }

    const projectIds = projects.map(p => p.id);

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {isAdminMode ? (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={projectIds} strategy={rectSortingStrategy}>
                        {projects.map(project => (
                            <SortableProjectCardItem key={project.id} project={project} isAdminMode={isAdminMode} onEdit={onEdit} />
                        ))}
                    </SortableContext>
                </DndContext>
            ) : (
                projects.map(project => (
                    <ProjectCard key={project.id} project={project} isAdminMode={isAdminMode} onEdit={onEdit} />
                ))
            )}
        </div>
    );
};

export default ProjectGrid;
