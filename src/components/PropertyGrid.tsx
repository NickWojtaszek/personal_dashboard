
import React from 'react';
import type { PropertyInfo } from '../types';
import { DndContext, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import PropertyCard from './PropertyCard';
import { SortablePropertyCardItem } from './SortablePropertyCardItem';

interface PropertyGridProps {
    properties: PropertyInfo[];
    isAdminMode: boolean;
    onEdit: (property: PropertyInfo) => void;
    onSelect: (id: string) => void;
    onOrderChange: (activeId: string, overId: string) => void;
}

const PropertyGrid: React.FC<PropertyGridProps> = ({ properties, isAdminMode, onEdit, onSelect, onOrderChange }) => {
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

    if (!properties) return null;

    if (properties.length === 0) {
        return (
            <div className="text-center py-16 text-slate-500 dark:text-gray-400">
                <p className="text-lg">No properties found.</p>
                <p>Try adjusting your search or filters.</p>
            </div>
        )
    }

    const propertyIds = properties.map(p => p.id);

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {isAdminMode ? (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={propertyIds} strategy={rectSortingStrategy}>
                        {properties.map(property => (
                            <SortablePropertyCardItem key={property.id} property={property} isAdminMode={isAdminMode} onEdit={onEdit} onSelect={onSelect} />
                        ))}
                    </SortableContext>
                </DndContext>
            ) : (
                properties.map(property => (
                    <PropertyCard key={property.id} property={property} isAdminMode={isAdminMode} onEdit={onEdit} onSelect={onSelect} />
                ))
            )}
        </div>
    );
};

export default PropertyGrid;
