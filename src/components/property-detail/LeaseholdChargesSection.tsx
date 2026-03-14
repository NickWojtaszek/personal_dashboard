

import React, { useState, useEffect } from 'react';
import type { PropertyInfo, ServiceCharge, GroundRent } from '../../types';
import { ReceiptPercentIcon, EditIcon, SaveIcon, TrashIcon, PlusIcon, ExternalLinkIcon } from './Icons';
import { v4 as uuidv4 } from 'uuid';
import { getPropertyLabels } from '../../lib/countryLabels';

interface LeaseholdChargesSectionProps {
    property: PropertyInfo;
    isEditing: boolean;
    onSetEditing: () => void;
    onSave: (property: PropertyInfo) => void;
    onCancel: () => void;
}

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition" />
);

const Label: React.FC<{ htmlFor?: string, children: React.ReactNode }> = ({ htmlFor, children }) => (
    <label htmlFor={htmlFor} className="block text-xs font-medium text-slate-600 dark:text-gray-300 mb-1">{children}</label>
);

const LeaseholdChargesSection: React.FC<LeaseholdChargesSectionProps> = ({ property, isEditing, onSetEditing, onSave, onCancel }) => {
    const [editedData, setEditedData] = useState<PropertyInfo['operations']>(property.operations);

    useEffect(() => {
        if (isEditing) {
            setEditedData(JSON.parse(JSON.stringify(property.operations || {})));
        }
    }, [property, isEditing]);

    const handleSave = () => {
        onSave({ ...property, operations: editedData });
    };

    const handleItemChange = <T extends { id: string }>(
        listName: 'serviceCharges' | 'groundRent', 
        itemId: string, 
        field: keyof T, 
        value: any
    ) => {
        setEditedData(prev => {
            // FIX: Cast to unknown first to safely handle the union type.
            const list = (prev?.leaseholdCharges?.[listName] as unknown as T[]) || [];
            const newList = list.map(item => 
                item.id === itemId ? { ...item, [field]: value } : item
            );
            return {
                ...prev,
                leaseholdCharges: {
                    ...prev?.leaseholdCharges,
                    [listName]: newList
                }
            };
        });
    };
    
    const addItem = (listName: 'serviceCharges' | 'groundRent') => {
        const newItem = {
            id: uuidv4(),
            year: new Date().getFullYear(),
            amountDue: 0,
            amountPaid: 0,
            dueDate: new Date().toISOString().split('T')[0],
            paymentDetails: ''
        };
        setEditedData(prev => {
            const list = prev?.leaseholdCharges?.[listName] || [];
            const newList = [newItem, ...list];
             return {
                ...prev,
                leaseholdCharges: {
                    ...prev?.leaseholdCharges,
                    [listName]: newList
                }
            };
        });
    };
    
    const removeItem = (listName: 'serviceCharges' | 'groundRent', itemId: string) => {
        setEditedData(prev => {
            const list = prev?.leaseholdCharges?.[listName] || [];
            const newList = list.filter(item => item.id !== itemId);
             return {
                ...prev,
                leaseholdCharges: {
                    ...prev?.leaseholdCharges,
                    [listName]: newList
                }
            };
        });
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    };
    
    const getStatus = (charge: ServiceCharge | GroundRent) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = new Date(charge.dueDate);
        
        if (charge.amountPaid >= charge.amountDue && charge.amountDue > 0) return { text: 'Paid', color: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' };
        if (dueDate < today && charge.amountPaid < charge.amountDue) return { text: 'Overdue', color: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' };
        if (charge.amountPaid > 0) return { text: 'Part Paid', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' };
        return { text: 'Due', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300' };
    };

    const isUrl = (text: string) => text.startsWith('http://') || text.startsWith('https://');

    const editLabels = getPropertyLabels(property.country);

    if (isEditing) {
        const serviceCharges = editedData?.leaseholdCharges?.serviceCharges || [];
        const groundRent = editedData?.leaseholdCharges?.groundRent || [];

        return (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-brand-primary/50 dark:border-brand-secondary/50">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold flex items-center gap-3"><ReceiptPercentIcon /> Editing {editLabels.leaseholdSection}</h2>
                </div>
                <div className="p-6 space-y-6">
                    <div className="space-y-2">
                        <h4 className="font-semibold">{editLabels.serviceCharge} History</h4>
                        {serviceCharges.map((charge) => (
                            <div key={charge.id} className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg space-y-2">
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                                    <Input type="number" placeholder="Year" value={charge.year} onChange={e => handleItemChange<ServiceCharge>('serviceCharges', charge.id, 'year', parseInt(e.target.value) || new Date().getFullYear())} />
                                    <Input type="number" placeholder="Amount Due" value={charge.amountDue} onChange={e => handleItemChange<ServiceCharge>('serviceCharges', charge.id, 'amountDue', parseFloat(e.target.value) || 0)} />
                                    <Input type="number" placeholder="Amount Paid" value={charge.amountPaid} onChange={e => handleItemChange<ServiceCharge>('serviceCharges', charge.id, 'amountPaid', parseFloat(e.target.value) || 0)} />
                                    <Input type="date" value={charge.dueDate} onChange={e => handleItemChange<ServiceCharge>('serviceCharges', charge.id, 'dueDate', e.target.value)} />
                                </div>
                                <div className="flex items-center gap-2">
                                     <Input type="text" placeholder="Payment Details (URL or Bank Info)" value={charge.paymentDetails} onChange={e => handleItemChange<ServiceCharge>('serviceCharges', charge.id, 'paymentDetails', e.target.value)} />
                                    <button type="button" onClick={() => removeItem('serviceCharges', charge.id)} className="p-2 text-red-500 hover:text-red-700"><TrashIcon /></button>
                                </div>
                            </div>
                        ))}
                        <button type="button" onClick={() => addItem('serviceCharges')} className="mt-2 flex items-center gap-1 text-sm font-semibold text-brand-primary hover:underline"><PlusIcon /> Add {editLabels.serviceCharge}</button>
                    </div>

                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
                        <h4 className="font-semibold">{editLabels.groundRent} History</h4>
                        {groundRent.map((charge) => (
                            <div key={charge.id} className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg space-y-2">
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                                    <Input type="number" placeholder="Year" value={charge.year} onChange={e => handleItemChange<GroundRent>('groundRent', charge.id, 'year', parseInt(e.target.value) || new Date().getFullYear())} />
                                    <Input type="number" placeholder="Amount Due" value={charge.amountDue} onChange={e => handleItemChange<GroundRent>('groundRent', charge.id, 'amountDue', parseFloat(e.target.value) || 0)} />
                                    <Input type="number" placeholder="Amount Paid" value={charge.amountPaid} onChange={e => handleItemChange<GroundRent>('groundRent', charge.id, 'amountPaid', parseFloat(e.target.value) || 0)} />
                                    <Input type="date" value={charge.dueDate} onChange={e => handleItemChange<GroundRent>('groundRent', charge.id, 'dueDate', e.target.value)} />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Input type="text" placeholder="Payment Details (URL or Bank Info)" value={charge.paymentDetails} onChange={e => handleItemChange<GroundRent>('groundRent', charge.id, 'paymentDetails', e.target.value)} />
                                    <button type="button" onClick={() => removeItem('groundRent', charge.id)} className="p-2 text-red-500 hover:text-red-700"><TrashIcon /></button>
                                </div>
                            </div>
                        ))}
                        <button type="button" onClick={() => addItem('groundRent')} className="mt-2 flex items-center gap-1 text-sm font-semibold text-brand-primary hover:underline"><PlusIcon /> Add {editLabels.groundRent}</button>
                    </div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                    <button onClick={onCancel} className="px-4 py-2 rounded-lg bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">Cancel</button>
                    <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-primary text-white font-semibold hover:bg-opacity-90 transition-colors"><SaveIcon /> Save Changes</button>
                </div>
            </div>
        );
    }

    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const { leaseholdCharges } = property.operations || {};
    const serviceCharges = (leaseholdCharges?.serviceCharges || []).sort((a,b) => b.year - a.year);
    const groundRent = (leaseholdCharges?.groundRent || []).sort((a,b) => b.year - a.year);
    const totalItems = serviceCharges.length + groundRent.length;

    const labels = getPropertyLabels(property.country);
    const currencyCode = property.financials?.currency || labels.currency;
    const symbol = { AUD: '$', USD: '$', GBP: '£', EUR: '€', NZD: '$', PLN: 'zł' }[currencyCode] || currencyCode + ' ';

    const handleMarkPaid = (listName: 'serviceCharges' | 'groundRent', itemId: string) => {
        const updatedProperty = JSON.parse(JSON.stringify(property)) as PropertyInfo;
        if (!updatedProperty.operations?.leaseholdCharges) return;
        const list = updatedProperty.operations.leaseholdCharges[listName];
        if (!list) return;
        const item = list.find((c: ServiceCharge | GroundRent) => c.id === itemId);
        if (item) {
            item.amountPaid = item.amountDue;
        }
        onSave(updatedProperty);
    };

    const renderTable = (title: string, items: (ServiceCharge | GroundRent)[], listName: 'serviceCharges' | 'groundRent') => (
        <div className="py-4 first:pt-0 last:pb-0">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</p>
            {items.length > 0 ? (
                <div className="mt-2 border border-slate-200 dark:border-slate-700 rounded-lg overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-50 dark:bg-slate-700/50">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-gray-300 uppercase tracking-wider">Year</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-gray-300 uppercase tracking-wider">Due</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-gray-300 uppercase tracking-wider">Paid</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-gray-300 uppercase tracking-wider">Balance</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-gray-300 uppercase tracking-wider">Due Date</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-gray-300 uppercase tracking-wider">Payment</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                            {items.map(item => {
                                const status = getStatus(item);
                                const paymentInfo = item.paymentDetails || '';
                                return (
                                    <tr key={item.id}>
                                        <td className="px-4 py-3 text-sm font-medium text-slate-800 dark:text-gray-200">{item.year}</td>
                                        <td className="px-4 py-3 text-sm font-mono text-slate-600 dark:text-gray-300">{symbol}{item.amountDue.toFixed(2)}</td>
                                        <td className="px-4 py-3 text-sm font-mono text-slate-600 dark:text-gray-300">{symbol}{item.amountPaid.toFixed(2)}</td>
                                        <td className={`px-4 py-3 text-sm font-mono font-semibold ${
                                            item.amountDue - item.amountPaid > 0 ? 'text-red-600 dark:text-red-400' :
                                            item.amountPaid - item.amountDue > 0 ? 'text-green-600 dark:text-green-400' :
                                            'text-slate-400 dark:text-gray-500'
                                        }`}>
                                            {item.amountDue === item.amountPaid ? '—' :
                                             item.amountDue > item.amountPaid ? `${symbol}${(item.amountDue - item.amountPaid).toFixed(2)}` :
                                             `-${symbol}${(item.amountPaid - item.amountDue).toFixed(2)}`}
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            {status.text === 'Paid' ? (
                                                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${status.color}`}>{status.text}</span>
                                            ) : (
                                                <button
                                                    onClick={() => handleMarkPaid(listName, item.id)}
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
            ) : <p className="mt-2 text-sm text-slate-500 dark:text-gray-400">No records found.</p>}
        </div>
    );

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-3"><ReceiptPercentIcon /> {labels.leaseholdSection}</h2>
                <div className="flex items-center gap-2">
                    {totalItems > 0 && (
                        <button onClick={() => setShowClearConfirm(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"><TrashIcon /><span>Clear All</span></button>
                    )}
                    <button onClick={onSetEditing} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/50 text-sm font-semibold text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"><EditIcon /><span>Edit</span></button>
                </div>
            </div>
            <div className="p-6 divide-y divide-slate-100 dark:divide-slate-700">
                {renderTable(`${labels.serviceCharge} History`, serviceCharges, 'serviceCharges')}
                {labels.hasGroundRent && renderTable(`${labels.groundRent} History`, groundRent, 'groundRent')}
            </div>
            {showClearConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowClearConfirm(false)}>
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 max-w-md mx-4" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Clear All {labels.leaseholdSection} Data?</h3>
                        <p className="text-sm text-slate-600 dark:text-gray-400 mb-1">This will permanently delete <span className="font-semibold text-red-600 dark:text-red-400">{serviceCharges.length} {labels.serviceCharge.toLowerCase()} records</span>{groundRent.length > 0 ? <> and <span className="font-semibold text-red-600 dark:text-red-400">{groundRent.length} {labels.groundRent.toLowerCase()} records</span></> : ''}.</p>
                        <p className="text-sm text-slate-500 dark:text-gray-500 mb-6">This action cannot be undone.</p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setShowClearConfirm(false)} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 dark:text-gray-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">Cancel</button>
                            <button onClick={() => { onSave({ ...property, operations: { ...property.operations, leaseholdCharges: { serviceCharges: [], groundRent: [] } } }); setShowClearConfirm(false); }} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors">Clear All</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LeaseholdChargesSection;
