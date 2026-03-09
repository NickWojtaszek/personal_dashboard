import React, { useState } from 'react';
import type { InvoiceInfo } from '../../types';
import { v4 as uuidv4 } from 'uuid';

interface QuickAddInvoiceProps {
    onSaveInvoice: (invoice: InvoiceInfo) => void;
    groups: string[];
    locations: string[];
}

const PlusIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>);

const QuickAddInvoice: React.FC<QuickAddInvoiceProps> = ({ onSaveInvoice, groups, locations }) => {
    const initialState = {
        description: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        amount: '',
        location: '',
        group: '',
    };
    const [formData, setFormData] = useState(initialState);
    const [isExpanded, setIsExpanded] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newInvoice: InvoiceInfo = {
            id: uuidv4(),
            description: formData.description,
            purchaseDate: formData.purchaseDate,
            amount: parseFloat(formData.amount) || 0,
            location: formData.location,
            groups: formData.group ? [formData.group] : [],
        };
        onSaveInvoice(newInvoice);
        setFormData(initialState);
        setIsExpanded(false);
    };
    
    if (!isExpanded) {
        return (
             <div className="flex justify-center">
                <button 
                    onClick={() => setIsExpanded(true)}
                    className="flex items-center gap-2 px-6 py-3 rounded-full bg-brand-primary text-white font-semibold hover:bg-opacity-90 transition-all shadow-lg hover:shadow-xl"
                >
                    <PlusIcon />
                    Quick Add Purchase Invoice
                </button>
            </div>
        )
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-lg font-bold mb-4">Add a Purchase Invoice</h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-end">
                <div className="md:col-span-3 lg:col-span-1">
                    <label htmlFor="quick-description" className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-1">Description</label>
                    <input type="text" id="quick-description" name="description" value={formData.description} onChange={handleChange} required className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary outline-none" />
                </div>

                <div>
                    <label htmlFor="quick-purchaseDate" className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-1">Date</label>
                    <input type="date" id="quick-purchaseDate" name="purchaseDate" value={formData.purchaseDate} onChange={handleChange} required className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary outline-none" />
                </div>
                
                 <div>
                    <label htmlFor="quick-amount" className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-1">Amount (£)</label>
                    <input type="number" id="quick-amount" name="amount" value={formData.amount} onChange={handleChange} step="0.01" required placeholder="0.00" className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary outline-none" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="quick-location" className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-1">Location</label>
                        <select id="quick-location" name="location" value={formData.location} onChange={handleChange} className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary outline-none">
                            <option value="">Select...</option>
                            {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="quick-group" className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-1">Category</label>
                        <select id="quick-group" name="group" value={formData.group} onChange={handleChange} className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary outline-none">
                            <option value="">Select...</option>
                            {groups.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button type="submit" className="w-full flex-grow flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-brand-primary text-white font-semibold hover:bg-opacity-90 transition-colors">
                        <PlusIcon /> Add
                    </button>
                     <button type="button" onClick={() => setIsExpanded(false)} className="px-4 py-2 rounded-lg bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
};

export default QuickAddInvoice;