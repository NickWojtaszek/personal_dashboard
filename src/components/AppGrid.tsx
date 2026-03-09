

import React from 'react';
import type { AppInfo } from '../types';
import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import AppCard from './AppCard';
import { SortableAppCardItem } from './SortableAppCardItem';

interface AppGridProps {
    apps: AppInfo[];
    isAdminMode: boolean;
    onEdit: (app: AppInfo) => void;
    onAppOrderChange: (activeId: string, overId: string) => void;
}

const AppGrid: React.FC<AppGridProps> = ({ apps, isAdminMode, onEdit, onAppOrderChange }) => {
    const sensors = useSensors(
        useSensor(MouseSensor, {
            // Require the mouse to move 5px before activating, to distinguish from clicks
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(TouchSensor, {
            // Press and hold for 150ms before activating
            activationConstraint: {
                delay: 150,
                tolerance: 5,
            },
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const {active, over} = event;
        if (over && active.id !== over.id) {
            onAppOrderChange(String(active.id), String(over.id));
        }
    };
    
    if (!apps) return null;

    if (apps.length === 0) {
        return (
            <div className="text-center py-16 text-slate-500 dark:text-gray-400">
                <p className="text-lg">No applications found.</p>
                <p>Try adjusting your search or filters.</p>
            </div>
        )
    }

    const appIds = apps.map(app => app.id);

    return (
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 py-8">
             {isAdminMode ? (
                <DndContext 
                    sensors={sensors} 
                    collisionDetection={closestCenter} 
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext items={appIds} strategy={rectSortingStrategy}>
                        {apps.map(app => (
                           <SortableAppCardItem key={app.id} app={app} isAdminMode={isAdminMode} onEdit={onEdit} />
                        ))}
                    </SortableContext>
                </DndContext>
             ) : (
                apps.map(app => (
                    <AppCard key={app.id} app={app} isAdminMode={isAdminMode} onEdit={onEdit} />
                ))
             )}
        </div>
    );
};

export default AppGrid;