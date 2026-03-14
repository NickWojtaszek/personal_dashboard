import React, { useState, useEffect } from 'react';
import type { PropertyInfo, CouncilTax } from '../../types';
import { ReceiptPercentIcon, EditIcon, SaveIcon, TrashIcon, PlusIcon, ExternalLinkIcon } from './Icons';
import { v4 as uuidv4 } from 'uuid';
import { getPropertyLabels } from '../../lib/countryLabels';

interface CouncilTaxSectionProps {
    property: PropertyInfo;
    isEditing: boolean;
    onSetEditing: () => void;
    onSave: (property: PropertyInfo) => void;
    onCancel: () => void;
}

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:cursor-not-allowed" />
);

const CouncilTaxSection: React.FC<CouncilTaxSectionProps> = ({ property, isEditing, onSetEditing, onSave, onCancel }) => {
    const [editedData, setEditedData] = useState<PropertyInfo['operations']>(property.operations);

    const labels = getPropertyLabels(property.country);

    useEffect(() => {
        if (isEditing) {
            setEditedData(JSON.parse(JSON.stringify(property.operations || {})));
        }
    }, [property, isEditing]);

    const handleSave = () => {
        onSave({ ...property, operations: editedData });
    };

    const handleItemChange = (itemId: string, field: keyof CouncilTax, value: any) => {
        setEditedData(prev => {
            const list = (prev?.leaseholdCharges?.councilTax || []);
            const newList = list.map(item => {
                if (item.id === itemId) {
                    const updatedItem = { ...item, [field]: value };
                    // If paid by tenant, nullify financial values
                    if (field === 'paidByTenant' && value === true) {
                        updatedItem.amountDue = 0;
                        updatedItem.amountPaid = 0;
                    }
                    return updatedItem;
                }
                return item;
            });
            return {
                ...prev,
                leaseholdCharges: { ...prev?.leaseholdCharges, councilTax: newList }
            };
        });
    };
    
    const addItem = () => {
        const newItem: CouncilTax = {
            id: uuidv4(),
            year: new Date().getFullYear(),
            amountDue: 0,
            amountPaid: 0,
            dueDate: new Date().toISOString().split('T')[0],
            paymentDetails: '',
            paidByTenant: property.country === 'UK' ? false : undefined,
        };
        setEditedData(prev => ({
            ...prev,
            leaseholdCharges: { ...prev?.leaseholdCharges, councilTax: [newItem, ...(prev?.leaseholdCharges?.councilTax || [])] }
        }));
    };
    
    const removeItem = (itemId: string) => {
        setEditedData(prev => ({
            ...prev,
            leaseholdCharges: { ...prev?.leaseholdCharges, councilTax: (prev?.leaseholdCharges?.councilTax || []).filter(item => item.id !== itemId) }
        }));
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    };
    
    const getStatus = (charge: CouncilTax) => {
        if (charge.paidByTenant) return { text: 'Paid by Tenant', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' };
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = new Date(charge.dueDate);
        
        if (charge.amountPaid >= charge.amountDue && charge.amountDue > 0) return { text: 'Paid', color: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' };
        if (dueDate < today && charge.amountPaid < charge.amountDue) return { text: 'Overdue', color: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' };
        if (charge.amountPaid > 0) return { text: 'Part Paid', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' };
        return { text: 'Due', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300' };
    };

    const handleMarkPaid = (itemId: string) => {
        const updatedProperty = JSON.parse(JSON.stringify(property)) as PropertyInfo;
        if (!updatedProperty.operations?.leaseholdCharges?.councilTax) return;
        const item = updatedProperty.operations.leaseholdCharges.councilTax.find(ct => ct.id === itemId);
        if (!item) return;
        item.amountPaid = item.amountDue;
        onSave(updatedProperty);
    };

    const isUrl = (text: string) => text.startsWith('http://') || text.startsWith('https://');

    // Show council tax/rates section for all properties — the label adapts per country

    if (isEditing) {
        const councilTaxCharges = editedData?.leaseholdCharges?.councilTax || [];

        return (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-brand-primary/50 dark:border-brand-secondary/50">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold flex items-center gap-3"><ReceiptPercentIcon /> Editing {labels.councilTax}</h2>
                </div>
                <div className="p-6 space-y-4">
                    {councilTaxCharges.map((charge) => {
                        const isPaidByTenant = charge.paidByTenant || false;
                        return (
                        <div key={charge.id} className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg space-y-3">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <Input type="number" placeholder="Year" value={charge.year} onChange={e => handleItemChange(charge.id, 'year', parseInt(e.target.value) || new Date().getFullYear())} />
                                <Input type="date" value={charge.dueDate} onChange={e => handleItemChange(charge.id, 'dueDate', e.target.value)} />
                                <Input type="number" placeholder="Amount Due" value={charge.amountDue} disabled={isPaidByTenant} onChange={e => handleItemChange(charge.id, 'amountDue', parseFloat(e.target.value) || 0)} />
                                <Input type="number" placeholder="Amount Paid" value={charge.amountPaid} disabled={isPaidByTenant} onChange={e => handleItemChange(charge.id, 'amountPaid', parseFloat(e.target.value) || 0)} />
                            </div>
                            <div className="flex items-center gap-2">
                                 <Input type="text" placeholder="Payment Details (URL or Authority)" value={charge.paymentDetails} onChange={e => handleItemChange(charge.id, 'paymentDetails', e.target.value)} />
                                <button type="button" onClick={() => removeItem(charge.id)} className="p-2 text-red-500 hover:text-red-700"><TrashIcon /></button>
                            </div>
                             {property.country === 'UK' && (
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input type="checkbox" checked={isPaidByTenant} onChange={e => handleItemChange(charge.id, 'paidByTenant', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-secondary" />
                                    Paid by Tenant
                                </label>
                            )}
                        </div>
                    )})}
                    <button type="button" onClick={addItem} className="mt-2 flex items-center gap-1 text-sm font-semibold text-brand-primary hover:underline"><PlusIcon /> Add {labels.councilTax} Record</button>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                    <button onClick={onCancel} className="px-4 py-2 rounded-lg bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">Cancel</button>
                    <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-primary text-white font-semibold hover:bg-opacity-90 transition-colors"><SaveIcon /> Save Changes</button>
                </div>
            </div>
        );
    }

    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const councilTax = (property.operations?.leaseholdCharges?.councilTax || []).sort((a,b) => b.year - a.year);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-3"><ReceiptPercentIcon /> {labels.councilTax}</h2>
                <div className="flex items-center gap-2">
                    {councilTax.length > 0 && (
                        <button onClick={() => setShowClearConfirm(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"><TrashIcon /><span>Clear All</span></button>
                    )}
                    <button onClick={onSetEditing} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/50 text-sm font-semibold text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"><EditIcon /><span>Edit</span></button>
                </div>
            </div>
            <div className="p-6">
                {councilTax.length > 0 ? (
                    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                            <thead className="bg-slate-50 dark:bg-slate-700/50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-gray-300 uppercase tracking-wider">Year</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-gray-300 uppercase tracking-wider">Due</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-gray-300 uppercase tracking-wider">Paid</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-gray-300 uppercase tracking-wider">Due Date</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-gray-300 uppercase tracking-wider">Authority/Payment</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                                {councilTax.map(item => {
                                    const status = getStatus(item);
                                    const paymentInfo = item.paymentDetails || '';
                                    return (
                                        <tr key={item.id}>
                                            <td className="px-4 py-3 text-sm font-medium text-slate-800 dark:text-gray-200">{item.year}</td>
                                            <td className="px-4 py-3 text-sm font-mono text-slate-600 dark:text-gray-300">{item.paidByTenant ? 'N/A' : `${labels.currencySymbol}${item.amountDue.toFixed(2)}`}</td>
                                            <td className="px-4 py-3 text-sm font-mono text-slate-600 dark:text-gray-300">{item.paidByTenant ? 'N/A' : `${labels.currencySymbol}${item.amountPaid.toFixed(2)}`}</td>
                                            <td className="px-4 py-3 text-sm">
                                                {status.text === 'Paid' || status.text === 'Paid by Tenant' ? (
                                                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${status.color}`}>{status.text}</span>
                                                ) : (
                                                    <button
                                                        onClick={() => handleMarkPaid(item.id)}
                                                        className={`px-2 py-0.5 text-xs font-semibold rounded-full cursor-pointer transition-opacity hover:opacity-80 ${status.color}`}
                                                        title="Click to mark as paid"
                                                    >
                                                        {status.text} — Mark Paid
                                                    </button>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-500 dark:text-gray-400">{formatDate(item.dueDate)}</td>
                                            <td className="px-4 py-3 text-sm">
                                                {isUrl(paymentInfo) ? (
                                                    <a href={paymentInfo} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand-primary hover:underline">
                                                        Pay Online <ExternalLinkIcon />
                                                    </a>
                                                ) : (
                                                    <span className="text-slate-500 dark:text-gray-400">{paymentInfo}</span>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : <p className="text-sm text-slate-500 dark:text-gray-400">No records found.</p>}
            </div>
            {showClearConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowClearConfirm(false)}>
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 max-w-md mx-4" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Clear All {labels.councilTax} Data?</h3>
                        <p className="text-sm text-slate-600 dark:text-gray-400 mb-1">This will permanently delete <span className="font-semibold text-red-600 dark:text-red-400">{councilTax.length} records</span>.</p>
                        <p className="text-sm text-slate-500 dark:text-gray-500 mb-6">This action cannot be undone.</p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setShowClearConfirm(false)} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 dark:text-gray-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">Cancel</button>
                            <button onClick={() => { onSave({ ...property, operations: { ...property.operations, leaseholdCharges: { ...property.operations?.leaseholdCharges, councilTax: [] } } }); setShowClearConfirm(false); }} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors">Clear All</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CouncilTaxSection;