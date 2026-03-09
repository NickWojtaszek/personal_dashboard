
import React, { useState } from 'react';
import type { ShoppingItem } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface QuickAddShoppingItemProps {
    onAddItem: (item: ShoppingItem) => void;
    categories: string[];
}

const PlusIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>);

const QuickAddShoppingItem: React.FC<QuickAddShoppingItemProps> = ({ onAddItem, categories }) => {
    const [name, setName] = useState('');
    const [quantity, setQuantity] = useState('');
    const [category, setCategory] = useState(categories[0] || 'Groceries');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        const newItem: ShoppingItem = {
            id: uuidv4(),
            name: name.trim(),
            quantity: quantity.trim(),
            category: category,
            checked: false,
        };

        onAddItem(newItem);
        setName('');
        setQuantity('');
        // Keep last category selected for faster entry of similar items
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-4 flex flex-col sm:flex-row gap-3 items-center">
            <div className="flex-grow w-full sm:w-auto">
                <input 
                    type="text" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    placeholder="Add item (e.g. Milk)" 
                    className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary outline-none"
                />
            </div>
            <div className="w-full sm:w-32">
                <input 
                    type="text" 
                    value={quantity} 
                    onChange={(e) => setQuantity(e.target.value)} 
                    placeholder="Qty" 
                    className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary outline-none"
                />
            </div>
            <div className="w-full sm:w-48">
                <select 
                    value={category} 
                    onChange={(e) => setCategory(e.target.value)} 
                    className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary outline-none"
                >
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
            </div>
            <button 
                type="submit" 
                className="w-full sm:w-auto px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-opacity-90 transition-colors flex items-center justify-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!name.trim()}
            >
                <PlusIcon /> Add
            </button>
        </form>
    );
};

export default QuickAddShoppingItem;
