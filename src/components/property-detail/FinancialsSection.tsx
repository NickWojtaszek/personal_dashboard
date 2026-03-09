

import React, { useState, useEffect, useMemo } from 'react';
import type { PropertyInfo, FinancialTransaction } from '../../types';
import { DollarIcon, EditIcon, TrashIcon, SaveIcon } from './Icons';
import FinancialsStatement from './FinancialsStatement';
import { v4 as uuidv4 } from 'uuid';
import { INITIAL_PROPERTIES } from '../../constants';

interface FinancialsSectionProps {
    property: PropertyInfo;
    isEditing: boolean;
    onSetEditing: () => void;
    onSave: (property: PropertyInfo) => void;
    onCancel: () => void;
}

const SummaryCard: React.FC<{ title: string; amount: number; colorClass: string }> = ({ title, amount, colorClass }) => (
    <div className="bg-slate-100 dark:bg-slate-700/50 p-4 rounded-lg text-center">
        <p className="text-sm text-slate-500 dark:text-gray-400">{title}</p>
        <p className={`text-2xl font-bold font-mono ${colorClass}`}>
            £{amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
    </div>
);

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition" />
);

const FinancialsSection: React.FC<FinancialsSectionProps> = ({ property, isEditing, onSetEditing, onSave, onCancel }) => {
    const [transactions, setTransactions] = useState<FinancialTransaction[]>(property.financials?.transactions || []);

    useEffect(() => {
        if(isEditing) {
            setTransactions(property.financials?.transactions || []);
        }
    }, [property, isEditing]);

    const handleTransactionChange = (id: string, field: 'description' | 'amount' | 'date', value: string | number) => {
        setTransactions(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
    };

    const addTransaction = (type: 'income' | 'expense') => {
        const initialPropertyData = INITIAL_PROPERTIES.find(p => p.id === property.id);
        const initialTransactions = initialPropertyData?.financials?.transactions;
        const isDataUntouchedMock = initialTransactions && JSON.stringify(transactions) === JSON.stringify(initialTransactions);

        const today = new Date().toISOString().split('T')[0];
        const newTransaction = { id: uuidv4(), date: today, type, description: '', amount: 0 };
        
        if (isDataUntouchedMock) {
            setTransactions([newTransaction]);
        } else {
            setTransactions(prev => [...prev, newTransaction]);
        }
    };
    
    const removeTransaction = (id: string) => {
        setTransactions(prev => prev.filter(t => t.id !== id));
    };

    const handleSave = () => {
        const updatedProperty = {
            ...property,
            financials: {
                ...property.financials,
                transactions: transactions
            }
        };
        onSave(updatedProperty);
    };

    const { totalIncome, totalExpenses, netMonthly } = useMemo(() => {
        const currentTransactions = isEditing ? transactions : (property.financials?.transactions || []);
        const income = currentTransactions.filter(t => t.type === 'income');
        const expenses = currentTransactions.filter(t => t.type === 'expense');
        const totalIncome = income.reduce((sum, t) => sum + Number(t.amount), 0);
        const totalExpenses = expenses.reduce((sum, t) => sum + Number(t.amount), 0);
        const netMonthly = totalIncome - totalExpenses;
        return { totalIncome, totalExpenses, netMonthly };
    }, [transactions, property.financials, isEditing]);

    if (isEditing) {
        const incomeTransactions = transactions.filter(t => t.type === 'income');
        const expenseTransactions = transactions.filter(t => t.type === 'expense');
        return (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-brand-primary/50 dark:border-brand-secondary/50">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold flex items-center gap-3"><DollarIcon /> Editing Financials</h2>
                </div>
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-semibold mb-2">Income Items</h4>
                            <div className="space-y-2">
                                {incomeTransactions.map(t => (
                                    <div key={t.id} className="grid grid-cols-12 gap-2 items-center">
                                        <div className="col-span-3">
                                            <Input type="date" value={t.date || ''} onChange={e => handleTransactionChange(t.id, 'date', e.target.value)} />
                                        </div>
                                        <div className="col-span-5">
                                           <Input type="text" placeholder="Description" value={t.description} onChange={e => handleTransactionChange(t.id, 'description', e.target.value)} />
                                        </div>
                                        <div className="col-span-4 flex items-center gap-1">
                                            <Input type="number" placeholder="Amount" value={t.amount} onChange={e => handleTransactionChange(t.id, 'amount', parseFloat(e.target.value) || 0)} />
                                            <button type="button" onClick={() => removeTransaction(t.id)} className="p-2 text-red-500 hover:text-red-700"><TrashIcon/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button type="button" onClick={() => addTransaction('income')} className="mt-2 text-sm font-semibold text-brand-primary hover:underline">Add Income</button>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-2">Expense Items</h4>
                            <div className="space-y-2">
                                {expenseTransactions.map(t => (
                                     <div key={t.id} className="grid grid-cols-12 gap-2 items-center">
                                        <div className="col-span-3">
                                            <Input type="date" value={t.date || ''} onChange={e => handleTransactionChange(t.id, 'date', e.target.value)} />
                                        </div>
                                        <div className="col-span-5">
                                            <Input type="text" placeholder="Description" value={t.description} onChange={e => handleTransactionChange(t.id, 'description', e.target.value)} />
                                        </div>
                                        <div className="col-span-4 flex items-center gap-1">
                                            <Input type="number" placeholder="Amount" value={t.amount} onChange={e => handleTransactionChange(t.id, 'amount', parseFloat(e.target.value) || 0)} />
                                            <button type="button" onClick={() => removeTransaction(t.id)} className="p-2 text-red-500 hover:text-red-700"><TrashIcon/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button type="button" onClick={() => addTransaction('expense')} className="mt-2 text-sm font-semibold text-brand-primary hover:underline">Add Expense</button>
                        </div>
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
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-3"><DollarIcon /> Financials</h2>
                <button
                    onClick={onSetEditing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/50 text-sm font-semibold text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                    <EditIcon />
                    <span>Add/Edit</span>
                </button>
            </div>
            <div className="p-6 space-y-6">
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <SummaryCard title="Money In" amount={totalIncome} colorClass="text-green-600 dark:text-green-400" />
                    <SummaryCard title="Money Out" amount={totalExpenses} colorClass="text-red-600 dark:text-red-400" />
                    <SummaryCard title="Net Income" amount={netMonthly} colorClass="text-brand-primary dark:text-brand-secondary" />
                </div>
                <FinancialsStatement transactions={property.financials?.transactions} />
            </div>
        </div>
    );
};

export default FinancialsSection;