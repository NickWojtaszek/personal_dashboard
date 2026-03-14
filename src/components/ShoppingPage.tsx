import React, { useState, useMemo } from 'react';
import type { ShoppingItem } from '../types';
import ShoppingList from './ShoppingList';
import QuickAddShoppingItem from './QuickAddShoppingItem';
import Button from './ui/Button';
import { ListIcon, TilesIcon, PlusIcon, SearchIcon } from './Icons';

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
type ViewMode = 'list' | 'tiles';

const SORT_OPTIONS = [
    { value: 'category', label: 'Category' },
    { value: 'name', label: 'Name (A-Z)' },
    { value: 'checked', label: 'Status (Checked Last)' },
];

// --- Tiles View Card ---
const ShoppingCard: React.FC<{ item: ShoppingItem; onToggle: (id: string) => void; onDelete: (id: string) => void }> = ({ item, onToggle, onDelete }) => (
    <div className={`rounded-lg border p-4 transition-colors ${item.checked
        ? 'bg-slate-50 dark:bg-slate-700/30 border-slate-200 dark:border-slate-700 opacity-60'
        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-brand-primary dark:hover:border-brand-secondary'
    }`}>
        <div className="flex items-start gap-3">
            <input
                type="checkbox"
                checked={item.checked}
                onChange={() => onToggle(item.id)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-primary focus:ring-brand-primary"
            />
            <div className="flex-1 min-w-0">
                <p className={`font-medium text-sm ${item.checked ? 'line-through text-slate-400 dark:text-gray-500' : 'text-slate-800 dark:text-gray-200'}`}>{item.name}</p>
                <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-gray-400">{item.category}</span>
                    {item.quantity && <span className="text-xs text-slate-500 dark:text-gray-400">x{item.quantity}</span>}
                </div>
            </div>
            <button onClick={() => onDelete(item.id)} className="p-1 text-slate-400 hover:text-red-500 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
            </button>
        </div>
    </div>
);

const ShoppingPage: React.FC<ShoppingPageProps> = ({
    items, onOrderChange, isAdminMode, categories,
    onToggleItem, onDeleteItem, onAddItem, onEditItem,
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSort, setSelectedSort] = useState<SortOption>('category');
    const [selectedGroup, setSelectedGroup] = useState('All');
    const [viewMode, setViewMode] = useState<ViewMode>('list');

    const filteredItems = useMemo(() => {
        let filtered = [...items];

        if (selectedGroup !== 'All') {
            filtered = filtered.filter(item => item.category === selectedGroup);
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

    const uncheckedCount = filteredItems.filter(i => !i.checked).length;

    const selectClasses = "bg-slate-50 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition";

    // Group items by category for tiles view
    const groupedByCategory = useMemo(() => {
        const groups: Record<string, ShoppingItem[]> = {};
        filteredItems.forEach(item => {
            if (!groups[item.category]) groups[item.category] = [];
            groups[item.category].push(item);
        });
        return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
    }, [filteredItems]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Shopping List</h1>
                    <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
                        {uncheckedCount} item{uncheckedCount !== 1 ? 's' : ''} remaining, {filteredItems.length} total.
                    </p>
                </div>
                <div className="flex items-center gap-2 self-start">
                    <div className="p-1 bg-slate-100 dark:bg-slate-700/50 rounded-lg flex items-center gap-1">
                        <Button variant={viewMode === 'list' ? 'primary' : 'ghost'} size="sm" onClick={() => setViewMode('list')} leftIcon={<ListIcon />}>List</Button>
                        <Button variant={viewMode === 'tiles' ? 'primary' : 'ghost'} size="sm" onClick={() => setViewMode('tiles')} leftIcon={<TilesIcon />}>Tiles</Button>
                    </div>
                    <Button onClick={() => onAddItem({ id: '', name: '', category: categories[0] || '', quantity: '', checked: false })} leftIcon={<PlusIcon />}>Item</Button>
                </div>
            </div>

            {/* Content card */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                <div className="p-5 border-b border-slate-200 dark:border-slate-700">
                    {/* Quick add */}
                    <QuickAddShoppingItem onAddItem={onAddItem} categories={categories} />

                    {/* Search, filter, sort */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <SearchIcon className="w-5 h-5 text-slate-400 dark:text-gray-500" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search items..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-lg pl-10 pr-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition"
                            />
                        </div>
                        <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)} className={selectClasses}>
                            <option value="All">All Categories</option>
                            {categories.sort().map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                        <select value={selectedSort} onChange={(e) => setSelectedSort(e.target.value as SortOption)} className={selectClasses}>
                            {SORT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </div>
                </div>

                <div className="p-5">
                    {filteredItems.length === 0 ? (
                        <div className="text-center py-16 text-slate-500 dark:text-gray-400">
                            <p className="text-lg">No items found.</p>
                            <p>Try adjusting your search or add a new item.</p>
                        </div>
                    ) : viewMode === 'list' ? (
                        <ShoppingList
                            items={filteredItems}
                            onToggleItem={onToggleItem}
                            onDeleteItem={onDeleteItem}
                            onEditItem={onEditItem}
                            onOrderChange={onOrderChange}
                            isAdminMode={isAdminMode}
                        />
                    ) : (
                        <div className="space-y-6">
                            {groupedByCategory.map(([category, catItems]) => (
                                <div key={category}>
                                    <h3 className="text-sm font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-3">{category}</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {catItems.map(item => (
                                            <ShoppingCard key={item.id} item={item} onToggle={onToggleItem} onDelete={onDeleteItem} />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ShoppingPage;
