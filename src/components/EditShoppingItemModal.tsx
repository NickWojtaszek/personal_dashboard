
import React, { useState, useEffect, useRef } from 'react';
import type { ShoppingItem } from '../types';

interface EditShoppingItemModalProps {
    item: ShoppingItem;
    onSave: (item: ShoppingItem) => void;
    onClose: () => void;
    allCategories: string[];
    onCategoriesChange: (categories: string[]) => void;
}

const PlusIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>);
const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition" />;
const Label = (props: React.LabelHTMLAttributes<HTMLLabelElement>) => <label {...props} className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-1" />;

const EditShoppingItemModal: React.FC<EditShoppingItemModalProps> = ({ item, onSave, onClose, allCategories, onCategoriesChange }) => {
    const [formData, setFormData] = useState<ShoppingItem>(item);
    const [newCategory, setNewCategory] = useState('');
    const mouseDownTarget = useRef<EventTarget | null>(null);

    useEffect(() => {
        setFormData(item);
    }, [item]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddCategory = () => {
        const trimmed = newCategory.trim();
        if (trimmed && !allCategories.includes(trimmed)) {
            onCategoriesChange([...allCategories, trimmed]);
            setFormData(prev => ({ ...prev, category: trimmed }));
            setNewCategory('');
        }
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        mouseDownTarget.current = e.target;
    };

    const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget && mouseDownTarget.current === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div 
            className="fixed inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" 
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
        >
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md m-4 border border-slate-200 dark:border-slate-700">
                <form onSubmit={handleSave}>
                    <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{item.id ? 'Edit Item' : 'New Item'}</h2>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <Label htmlFor="name">Item Name</Label>
                            <Input id="name" name="name" value={formData.name} onChange={handleInputChange} required autoFocus />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="quantity">Quantity</Label>
                                <Input id="quantity" name="quantity" value={formData.quantity} onChange={handleInputChange} placeholder="e.g. 1kg, 2 packs" />
                            </div>
                            <div>
                                <Label htmlFor="category">Category</Label>
                                <select 
                                    id="category" 
                                    name="category" 
                                    value={formData.category} 
                                    onChange={handleInputChange}
                                    className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition"
                                >
                                    {allCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>
                        </div>

                        <div>
                            <Label>Add New Category</Label>
                            <div className="flex gap-2">
                                <Input 
                                    value={newCategory} 
                                    onChange={(e) => setNewCategory(e.target.value)} 
                                    placeholder="New category name"
                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}
                                />
                                <button type="button" onClick={handleAddCategory} className="px-3 py-2 rounded-lg bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">
                                    <PlusIcon />
                                </button>
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="notes">Notes (Optional)</Label>
                            <Input id="notes" name="notes" value={formData.notes || ''} onChange={handleInputChange} placeholder="Brand preference, etc." />
                        </div>
                    </div>
                    <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end space-x-3 rounded-b-xl">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">Cancel</button>
                        <button type="submit" className="px-4 py-2 rounded-lg bg-brand-primary text-white font-semibold hover:bg-opacity-90 transition-colors">Save Item</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditShoppingItemModal;
