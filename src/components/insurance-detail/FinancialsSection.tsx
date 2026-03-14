import React, { useState, useEffect } from 'react';
import type { InsuranceInfo } from '../../types';
import { DollarIcon, EditIcon, SaveIcon } from './Icons';

interface FinancialsSectionProps {
    policy: InsuranceInfo;
    isEditing: boolean;
    onSetEditing: () => void;
    onSave: (policy: InsuranceInfo) => void;
    onCancel: () => void;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
    GBP: '£', USD: '$', AUD: 'A$', EUR: '€', PLN: 'zł',
};

const formatCurrency = (amount?: number, currency?: string) => {
    if (typeof amount !== 'number') return 'N/A';
    const symbol = CURRENCY_SYMBOLS[currency || 'GBP'] || (currency ? `${currency} ` : '£');
    return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const DetailItem: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
    <div>
        <p className="text-sm text-slate-500 dark:text-gray-400">{label}</p>
        <p className="font-medium text-slate-800 dark:text-gray-200">{value || 'N/A'}</p>
    </div>
);

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition" />
);
const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
    <select {...props} className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition" />
);
const Label: React.FC<{ htmlFor?: string, children: React.ReactNode }> = ({ htmlFor, children }) => (
    <label htmlFor={htmlFor} className="block text-xs font-medium text-slate-600 dark:text-gray-300 mb-1">{children}</label>
);

const FinancialsSection: React.FC<FinancialsSectionProps> = ({ policy, isEditing, onSetEditing, onSave, onCancel }) => {
    const [editedData, setEditedData] = useState<InsuranceInfo>(policy);
    
    useEffect(() => {
        if(isEditing) {
            setEditedData(policy);
        }
    }, [policy, isEditing]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setEditedData(prev => ({ ...prev, [name]: value }));
    };

    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setEditedData(prev => ({ ...prev, [name]: value === '' ? undefined : parseFloat(value) }));
    };

    const handleSave = () => {
        onSave(editedData);
    };

    if(isEditing) {
        return (
             <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-brand-primary/50 dark:border-brand-secondary/50">
                <div className="p-5 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-lg font-bold flex items-center gap-3"><DollarIcon /> Editing Financials</h2>
                </div>
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><Label>Coverage Amount</Label><Input type="number" name="coverageAmount" value={editedData.coverageAmount || ''} onChange={handleNumberChange} step="1" /></div>
                    <div><Label>Deductible/Excess</Label><Input type="number" name="deductible" value={editedData.deductible || ''} onChange={handleNumberChange} step="1" /></div>
                    <div><Label>Premium Amount</Label><Input type="number" name="premiumAmount" value={editedData.premiumAmount || ''} onChange={handleNumberChange} step="0.01" /></div>
                    <div>
                        <Label>Payment Frequency</Label>
                        <Select name="paymentFrequency" value={editedData.paymentFrequency || ''} onChange={handleInputChange}>
                            <option value="">Select...</option>
                            <option value="Monthly">Monthly</option>
                            <option value="Annually">Annually</option>
                            <option value="Other">Other</option>
                        </Select>
                    </div>
                    <div>
                        <Label>Currency</Label>
                        <Select name="currency" value={editedData.currency || 'GBP'} onChange={handleInputChange}>
                            <option value="GBP">GBP (£)</option>
                            <option value="AUD">AUD (A$)</option>
                            <option value="USD">USD ($)</option>
                            <option value="EUR">EUR (€)</option>
                            <option value="PLN">PLN (zł)</option>
                        </Select>
                    </div>
                </div>
                 <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                    <button onClick={onCancel} className="px-4 py-2 rounded-lg bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">Cancel</button>
                    <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-primary text-white font-semibold hover:bg-opacity-90 transition-colors">
                        <SaveIcon />
                        Save Changes
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <h2 className="text-lg font-bold flex items-center gap-3"><DollarIcon /> Financials & Coverage</h2>
                <button
                    onClick={onSetEditing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/50 text-sm font-semibold text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                    <EditIcon />
                    <span>Edit</span>
                </button>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <DetailItem label="Coverage Amount" value={formatCurrency(policy.coverageAmount, policy.currency)} />
                <DetailItem label="Premium" value={`${formatCurrency(policy.premiumAmount, policy.currency)} ${policy.paymentFrequency || ''}`} />
                <DetailItem label="Deductible/Excess" value={formatCurrency(policy.deductible, policy.currency)} />
            </div>
        </div>
    );
};

export default FinancialsSection;