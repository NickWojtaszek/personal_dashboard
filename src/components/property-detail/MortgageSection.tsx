
import React, { useState, useEffect, useMemo } from 'react';
import type { PropertyInfo, MortgagePayment } from '../../types';
import { BanknotesIcon, EditIcon, SaveIcon, TrashIcon, PlusIcon } from './Icons';
import { v4 as uuidv4 } from 'uuid';

interface MortgageSectionProps {
    property: PropertyInfo;
    isEditing: boolean;
    onSetEditing: () => void;
    onSave: (property: PropertyInfo) => void;
    onCancel: () => void;
}

const DetailItem: React.FC<{ label: string; value?: string | number | null; }> = ({ label, value }) => (
    <div>
        <p className="text-sm text-slate-500 dark:text-gray-400">{label}</p>
        <p className="font-medium text-slate-800 dark:text-gray-200 break-words">{value || 'N/A'}</p>
    </div>
);

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

const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
    <select {...props} className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition" />
);

const Label: React.FC<{ htmlFor?: string, children: React.ReactNode }> = ({ htmlFor, children }) => (
    <label htmlFor={htmlFor} className="block text-xs font-medium text-slate-600 dark:text-gray-300 mb-1">{children}</label>
);

const MortgageSection: React.FC<MortgageSectionProps> = ({ property, isEditing, onSetEditing, onSave, onCancel }) => {
    const [editedData, setEditedData] = useState<PropertyInfo>(property);

    useEffect(() => {
        if (isEditing) {
            const initialData = JSON.parse(JSON.stringify(property));
            if (!initialData.mortgage) {
                initialData.mortgage = { type: 'Fixed', payments: [] };
            }
            if (!initialData.mortgage.payments) {
                initialData.mortgage.payments = [];
            }
            setEditedData(initialData);
        }
    }, [property, isEditing]);

    const handleNestedChange = (path: string, value: any) => {
        setEditedData(prev => {
            const keys = path.split('.');
            const newState = JSON.parse(JSON.stringify(prev));
            let current = newState;
            for (let i = 0; i < keys.length - 1; i++) {
                if (!current[keys[i]]) current[keys[i]] = {};
                current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = value;
            return newState;
        });
    };
    
    const handlePaymentChange = (id: string, field: keyof MortgagePayment, value: string | number) => {
        const payments = editedData.mortgage?.payments || [];
        const updatedPayments = payments.map(p => p.id === id ? { ...p, [field]: value } : p);
        handleNestedChange('mortgage.payments', updatedPayments);
    };
    
    const addPayment = () => {
        const today = new Date().toISOString().split('T')[0];
        const newPayment: MortgagePayment = { id: uuidv4(), date: today, amount: 0, principal: 0, interest: 0 };
        const payments = editedData.mortgage?.payments || [];
        handleNestedChange('mortgage.payments', [newPayment, ...payments]);
    };
    
    const removePayment = (id: string) => {
        const payments = editedData.mortgage?.payments || [];
        handleNestedChange('mortgage.payments', payments.filter(p => p.id !== id));
    };

    const handleSave = () => {
        onSave(editedData);
    };

    const commonInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => handleNestedChange(e.target.name, e.target.value);
    const numericInputChange = (e: React.ChangeEvent<HTMLInputElement>) => handleNestedChange(e.target.name, e.target.value === '' ? undefined : parseFloat(e.target.value));
    
    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    };
    
    const formatCurrency = (amount: number | undefined) => {
        if (amount === undefined || amount === null) return '';
        return `£${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    if (isEditing) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-brand-primary/50 dark:border-brand-secondary/50">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold flex items-center gap-3"><BanknotesIcon /> Editing Mortgage Details</h2>
                </div>
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <Label>Mortgage Type</Label>
                            <Select name="mortgage.type" value={editedData.mortgage?.type || ''} onChange={commonInputChange}>
                                <option value="Fixed">Fixed</option>
                                <option value="Variable">Variable</option>
                            </Select>
                        </div>
                        {editedData.mortgage?.type === 'Fixed' && (
                            <div>
                                <Label>Renewal Date</Label>
                                <Input type="date" name="mortgage.renewalDate" value={editedData.mortgage?.renewalDate || ''} onChange={commonInputChange} />
                            </div>
                        )}
                        <div>
                            <Label>Outstanding Balance</Label>
                            <Input type="number" name="mortgage.outstandingBalance" value={editedData.mortgage?.outstandingBalance || ''} onChange={numericInputChange} placeholder="e.g., 350000" />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Payments</h3>
                        <div className="space-y-2">
                             <div className="grid grid-cols-12 gap-2 text-sm font-medium text-slate-600 dark:text-gray-300 px-1">
                                <div className="col-span-3">Date</div>
                                <div className="col-span-3">Total Paid</div>
                                <div className="col-span-2">Principal</div>
                                <div className="col-span-2">Interest</div>
                                <div className="col-span-2"></div>
                            </div>
                            {(editedData.mortgage?.payments || []).map(p => (
                                <div key={p.id} className="grid grid-cols-12 gap-2 items-center">
                                    <div className="col-span-3"><Input type="date" value={p.date} onChange={e => handlePaymentChange(p.id, 'date', e.target.value)} /></div>
                                    <div className="col-span-3"><Input type="number" value={p.amount} onChange={e => handlePaymentChange(p.id, 'amount', parseFloat(e.target.value) || 0)} /></div>
                                    <div className="col-span-2"><Input type="number" value={p.principal} onChange={e => handlePaymentChange(p.id, 'principal', parseFloat(e.target.value) || 0)} /></div>
                                    <div className="col-span-2"><Input type="number" value={p.interest} onChange={e => handlePaymentChange(p.id, 'interest', parseFloat(e.target.value) || 0)} /></div>
                                    <div className="col-span-2 text-right">
                                        <button type="button" onClick={() => removePayment(p.id)} className="p-2 text-red-500 hover:text-red-700"><TrashIcon /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                         <button type="button" onClick={addPayment} className="mt-3 flex items-center gap-1 text-sm font-semibold text-brand-primary hover:underline"><PlusIcon/> Add Payment</button>
                    </div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                    <button onClick={onCancel} className="px-4 py-2 rounded-lg bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">Cancel</button>
                    <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-primary text-white font-semibold hover:bg-opacity-90 transition-colors"><SaveIcon /> Save Changes</button>
                </div>
            </div>
        );
    }
    
    const { mortgage } = property;

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-3"><BanknotesIcon /> Mortgage</h2>
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
                    <DetailItem label="Mortgage Type" value={mortgage?.type} />
                    {mortgage?.type === 'Fixed' && <DetailItem label="Renewal Date" value={formatDate(mortgage?.renewalDate)} />}
                    <div className="sm:col-span-3">
                         <SummaryCard title="Outstanding Balance" amount={mortgage?.outstandingBalance ?? 0} colorClass="text-brand-primary dark:text-brand-secondary" />
                    </div>
                </div>
                <div>
                     <h3 className="text-lg font-semibold mb-2 text-slate-700 dark:text-gray-300">Payment History</h3>
                     <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                        <div className="grid grid-cols-10 px-4 py-2 bg-slate-50 dark:bg-slate-700/50 font-semibold text-sm text-slate-600 dark:text-gray-300">
                            <div className="col-span-3">Date</div>
                            <div className="col-span-3 text-right">Total Paid</div>
                            <div className="col-span-2 text-right">Principal</div>
                            <div className="col-span-2 text-right">Interest</div>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-700 min-h-[6rem]">
                            {mortgage?.payments && mortgage.payments.length > 0 ? mortgage.payments.map(p => (
                                <div key={p.id} className="grid grid-cols-10 px-4 py-3 text-sm font-mono">
                                    <div className="col-span-3 text-slate-500 dark:text-gray-400">{formatDate(p.date)}</div>
                                    <div className="col-span-3 text-right text-slate-700 dark:text-slate-200">{formatCurrency(p.amount)}</div>
                                    <div className="col-span-2 text-right text-slate-500 dark:text-gray-400">{formatCurrency(p.principal)}</div>
                                    <div className="col-span-2 text-right text-slate-500 dark:text-gray-400">{formatCurrency(p.interest)}</div>
                                </div>
                            )) : (
                                <div className="px-4 py-8 text-center text-slate-500 dark:text-gray-400 col-span-10">
                                    No mortgage payments recorded.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MortgageSection;