import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { VehicleInfo } from '../types';
import VehicleCard from './VehicleCard';

interface SortableVehicleCardItemProps {
    vehicle: VehicleInfo;
    isAdminMode: boolean;
    onEdit: (vehicle: VehicleInfo) => void;
    onSelect: (id: string) => void;
}

export const SortableVehicleCardItem: React.FC<SortableVehicleCardItemProps> = ({ vehicle, isAdminMode, onEdit, onSelect }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: vehicle.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 'auto',
    };

    return (
        <VehicleCard
            ref={setNodeRef}
            style={style}
            vehicle={vehicle}
            isAdminMode={isAdminMode}
            onEdit={onEdit}
            onSelect={onSelect}
            isDragging={isDragging}
            listeners={listeners}
            {...attributes}
        />
    );
};
