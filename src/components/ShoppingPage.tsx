
import React, { useState, useMemo } from 'react';
import type { ShoppingItem } from '../types';
import ProjectControls from './ProjectControls';
import ShoppingList from './ShoppingList';
import QuickAddShoppingItem from './QuickAddShoppingItem';

interface ShoppingPageProps {
    items: ShoppingItem[];
    onOrderChange: (activeId: string, overId: string) => void;
    isAdminMode: boolean;
    categories: string[];
    onToggleItem: (id: string) => void;
    onDeleteItem: (id: string) => void;
    onAddItem: (item: ShoppingItem) => void;
    onEditItem: (item: ShoppingItem) => void;
}

type SortOption = 'name' | 'category' | 'checked';

const ShoppingPage: React.FC<ShoppingPageProps> = ({ 
    items, 
    onOrderChange, 
    isAdminMode, 
    categories, 
    onToggleItem,
    onDeleteItem,
    onAddItem,
    onEditItem
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSort, setSelectedSort] = useState<SortOption>('category');
    const [selectedGroup, setSelectedGroup] = useState('All');

    const sortOptions = [
        { value: 'category', label: 'Sort by: Category' },
        { value: 'name', label: 'Sort by: Name (A-Z)' },
        { value: 'checked', label: 'Sort by: Status (Checked Last)' },
    ];

    const filteredItems = useMemo(() => {
        let filtered = [...items];
        
        if (selectedGroup !== 'All') {
            filtered = filtered.filter(item => 
                item.category === selectedGroup
            );
        }
        
        if (searchTerm.trim()) {
            const lowercasedTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(item =>
                item.name.toLowerCase().includes(lowercasedTerm) ||
                item.category.toLowerCase().includes(lowercasedTerm)
            );
        }
        
        return filtered.sort((a, b) => {
            switch (selectedSort) {
                case 'name': return a.name.localeCompare(b.name);
                case 'category': 
                    if (a.category === b.category) return a.name.localeCompare(b.name);
                    return a.category.localeCompare(b.category);
                case 'checked': 
                    if (a.checked === b.checked) return a.name.localeCompare(b.name);
                    return a.checked ? 1 : -1;
                default: return 0;
            }
        });
    }, [items, searchTerm, selectedSort, selectedGroup]);

    const handleNewItemClick = () => {
        // This is handled by the "New Item" button in ProjectControls
        // We'll pass a dummy empty item to trigger the modal in App.tsx
        // But ProjectControls expects onNewProject to be a void function.
        // In App.tsx, we'll implement handleNewShoppingItem to open the modal.
    };

    return (
        <div className="space-y-8">
            <ProjectControls
                title="Shopping List"
                searchTerm={searchTerm}
                onSearchTermChange={setSearchTerm}
                selectedSort={selectedSort}
                onSortChange={(sort) => setSelectedSort(sort as SortOption)}
                selectedGroup={selectedGroup}
                onGroupChange={setSelectedGroup}
                groups={categories}
                isAdminMode={isAdminMode}
                onNewProject={() => onAddItem({ id: '', name: '', category: categories[0] || '', quantity: '', checked: false })}
                projectCount={filteredItems.length}
                sortOptions={sortOptions}
            />
            
            <QuickAddShoppingItem 
                onAddItem={onAddItem} 
                categories={categories}
            />

            <ShoppingList 
                items={filteredItems}
                onToggleItem={onToggleItem}
                onDeleteItem={onDeleteItem}
                onEditItem={onEditItem}
                onOrderChange={onOrderChange}
                isAdminMode={isAdminMode}
            />
        </div>
    );
};

export default ShoppingPage;
