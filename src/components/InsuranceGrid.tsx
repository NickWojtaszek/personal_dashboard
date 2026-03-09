import React from 'react';
import type { InsuranceInfo } from '../types';
import { DndContext, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import InsuranceCard from './InsuranceCard';
import { SortableInsuranceCardItem } from './SortableInsuranceCardItem';

interface InsuranceGridProps {
    policies: InsuranceInfo[];
    isAdminMode: boolean;
    onEdit: (policy: InsuranceInfo) => void;
    onSelect: (id: string) => void;
    onOrderChange: (activeId: string, overId: string) => void;
}

const InsuranceGrid: React.FC<InsuranceGridProps> = ({ policies, isAdminMode, onEdit, onSelect, onOrderChange }) => {
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

    if (!policies || policies.length === 0) return null;

    const policyIds = policies.map(p => p.id);

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {isAdminMode ? (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={policyIds} strategy={rectSortingStrategy}>
                        {policies.map(policy => (
                            <SortableInsuranceCardItem key={policy.id} policy={policy} isAdminMode={isAdminMode} onEdit={onEdit} onSelect={onSelect} />
                        ))}
                    </SortableContext>
                </DndContext>
            ) : (
                policies.map(policy => (
                    <InsuranceCard key={policy.id} policy={policy} isAdminMode={isAdminMode} onEdit={onEdit} onSelect={onSelect} />
                ))
            )}
        </div>
    );
};

export default InsuranceGrid;
