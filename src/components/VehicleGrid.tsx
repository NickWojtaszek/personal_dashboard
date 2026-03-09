
import React from 'react';
import type { VehicleInfo } from '../types';
import { DndContext, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import VehicleCard from './VehicleCard';
import { SortableVehicleCardItem } from './SortableVehicleCardItem';

interface VehicleGridProps {
    vehicles: VehicleInfo[];
    isAdminMode: boolean;
    onEdit: (vehicle: VehicleInfo) => void;
    onSelect: (id: string) => void;
    onOrderChange: (activeId: string, overId: string) => void;
}

const VehicleGrid: React.FC<VehicleGridProps> = ({ vehicles, isAdminMode, onEdit, onSelect, onOrderChange }) => {
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

    if (!vehicles) return null;

    if (vehicles.length === 0) {
        return (
            <div className="text-center py-16 text-slate-500 dark:text-gray-400">
                <p className="text-lg">No vehicles found.</p>
                <p>Try adjusting your search or filters.</p>
            </div>
        )
    }

    const vehicleIds = vehicles.map(v => v.id);

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {isAdminMode ? (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={vehicleIds} strategy={rectSortingStrategy}>
                        {vehicles.map(vehicle => (
                            <SortableVehicleCardItem key={vehicle.id} vehicle={vehicle} isAdminMode={isAdminMode} onEdit={onEdit} onSelect={onSelect} />
                        ))}
                    </SortableContext>
                </DndContext>
            ) : (
                vehicles.map(vehicle => (
                    <VehicleCard key={vehicle.id} vehicle={vehicle} isAdminMode={isAdminMode} onEdit={onEdit} onSelect={onSelect} />
                ))
            )}
        </div>
    );
};

export default VehicleGrid;
