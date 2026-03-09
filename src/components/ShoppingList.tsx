
import React from 'react';
import type { ShoppingItem } from '../types';
import { DndContext, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableShoppingItem } from './SortableShoppingItem';
import ShoppingItemRow from './ShoppingItem';

interface ShoppingListProps {
    items: ShoppingItem[];
    onToggleItem: (id: string) => void;
    onDeleteItem: (id: string) => void;
    onEditItem: (item: ShoppingItem) => void;
    onOrderChange: (activeId: string, overId: string) => void;
    isAdminMode: boolean;
}

const ShoppingList: React.FC<ShoppingListProps> = ({ 
    items, 
    onToggleItem, 
    onDeleteItem, 
    onEditItem, 
    onOrderChange,
    isAdminMode 
}) => {
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

    if (items.length === 0) {
        return (
            <div className="text-center py-16 text-slate-500 dark:text-gray-400 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <p className="text-lg">Your shopping list is empty.</p>
                <p>Add items using the quick add bar above.</p>
            </div>
        )
    }

    const itemIds = items.map(item => item.id);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                        {items.map(item => (
                            <SortableShoppingItem 
                                key={item.id} 
                                item={item} 
                                onToggle={onToggleItem} 
                                onDelete={onDeleteItem} 
                                onEdit={onEditItem}
                                isAdminMode={isAdminMode}
                            />
                        ))}
                    </SortableContext>
                </DndContext>
            </div>
        </div>
    );
};

export default ShoppingList;
