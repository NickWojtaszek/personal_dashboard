import React, { useState, useEffect, useRef } from 'react';
import type { PropertyInfo, PropertyContact, Document, FinancialTransaction } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { INITIAL_PROPERTIES } from '../constants';

interface EditPropertyModalProps {
    property: PropertyInfo;
    onSave: (property: PropertyInfo) => void;
    onClose: () => void;
    allGroups: string[];
    onGroupsChange: (groups: string[]) => void;
}

const PlusIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>);
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.134H8.09a2.09 2.09 0 0 0-2.09 2.134v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>;

const Section: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
    <details open className="bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
        <summary className="text-lg font-semibold cursor-pointer p-4">{title}</summary>
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-4">
            {children}
        </div>
    </details>
);

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
    <input {...props} className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition" />
);

const Label: React.FC<{ htmlFor?: string, children: React.ReactNode }> = ({ htmlFor, children }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-1">{children}</label>
);

const EditPropertyModal: React.FC<EditPropertyModalProps> = ({ property, onSave, onClose, allGroups, onGroupsChange }) => {
    const [formData, setFormData] = useState<PropertyInfo>(property);
    const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set(property.groups || []));
    const [newGroup, setNewGroup] = useState('');
    const [transactions, setTransactions] = useState<FinancialTransaction[]>(property.financials?.transactions || []);
    const mouseDownTarget = useRef<EventTarget | null>(null);

    useEffect(() => {
        setFormData(property);
        setSelectedGroups(new Set(property.groups || []));
        setTransactions(property.financials?.transactions || []);
    }, [property]);

    const handleNestedChange = (path: string, value: any) => {
        setFormData(prev => {
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
    
    const handleArrayChange = (arrayName: 'documents' | 'contacts', index: number, field: string, value: string) => {
        const updatedArray = [...(formData[arrayName] || [])];
        if(updatedArray[index]) {
            (updatedArray[index] as unknown as Record<string, unknown>)[field] = value;
            setFormData(prev => ({...prev, [arrayName]: updatedArray}));
        }
    };
    
    const addArrayItem = (arrayName: 'documents' | 'contacts') => {
        const newItem = arrayName === 'documents' 
            ? { name: '', url: '' } 
            : { role: '', name: '', contact: '' };
        setFormData(prev => ({...prev, [arrayName]: [...(prev[arrayName] || []), newItem]}));
    }

    const removeArrayItem = (arrayName: 'documents' | 'contacts', index: number) => {
        setFormData(prev => ({...prev, [arrayName]: (prev[arrayName] || []).filter((_, i) => i !== index)}));
    }


    const toggleGroup = (group: string) => {
        setSelectedGroups(prev => {
            const newSet = new Set(prev);
            newSet.has(group) ? newSet.delete(group) : newSet.add(group);
            return newSet;
        });
    };

    const handleAddGroup = () => {
        const trimmedGroup = newGroup.trim();
        if (trimmedGroup && !allGroups.includes(trimmedGroup)) {
            onGroupsChange([...allGroups, trimmedGroup]);
            setSelectedGroups(prev => new Set(prev).add(trimmedGroup));
            setNewGroup('');
        }
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...formData,
            groups: Array.from(selectedGroups),
            financials: { transactions: transactions }
        });
    };
    
    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        mouseDownTarget.current = e.target;
    };

    const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget && mouseDownTarget.current === e.currentTarget) {
            onClose();
        }
    };
    
    const commonInputChange = (e: React.ChangeEvent<HTMLInputElement>) => handleNestedChange(e.target.name, e.target.value);
    const numericInputChange = (e: React.ChangeEvent<HTMLInputElement>) => handleNestedChange(e.target.name, e.target.value === '' ? undefined : parseFloat(e.target.value));

    const incomeTransactions = transactions.filter(t => t.type === 'income');
    const expenseTransactions = transactions.filter(t => t.type === 'expense');


    return (
        <div 
            className="fixed inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" 
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
        >
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-3xl m-4 border border-slate-200 dark:border-slate-700 flex flex-col">
                <form onSubmit={handleSave} className="flex flex-col h-full">
                    <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{property.id ? 'Edit Property' : 'New Property'}</h2>
                    </div>
                    <div className="p-6 space-y-6 flex-grow overflow-y-auto" style={{maxHeight: '75vh'}}>
                        <Section title="General">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div><Label htmlFor="name">Property Name</Label><Input type="text" name="name" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required /></div>
                                <div><Label htmlFor="location">Location</Label><Input type="text" name="location" value={formData.location || ''} onChange={e => setFormData({...formData, location: e.target.value})} required /></div>
                                <div><Label htmlFor="url">URL</Label><Input type="url" name="url" value={formData.url || ''} onChange={e => setFormData({...formData, url: e.target.value})} placeholder="https://example.com" /></div>
                            </div>
                        </Section>

                        <Section title="Overview & Details">
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div><Label htmlFor="overview.address">Full Address</Label><Input type="text" name="overview.address" value={formData.overview?.address || ''} onChange={commonInputChange} /></div>
                                <div><Label htmlFor="overview.propertyType">Property Type</Label><Input type="text" name="overview.propertyType" value={formData.overview?.propertyType || ''} onChange={commonInputChange} /></div>
                                <div><Label htmlFor="details.complexName">Complex/Building Name</Label><Input type="text" name="details.complexName" value={formData.details?.complexName || ''} onChange={commonInputChange} /></div>
                                <div><Label htmlFor="details.unitLotNumber">Unit/Lot Number</Label><Input type="text" name="details.unitLotNumber" value={formData.details?.unitLotNumber || ''} onChange={commonInputChange} /></div>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div><Label htmlFor="overview.configuration.beds">Beds</Label><Input type="number" name="overview.configuration.beds" value={formData.overview?.configuration?.beds || ''} onChange={numericInputChange} /></div>
                                <div><Label htmlFor="overview.configuration.baths">Baths</Label><Input type="number" name="overview.configuration.baths" value={formData.overview?.configuration?.baths || ''} onChange={numericInputChange} /></div>
                                <div><Label htmlFor="overview.configuration.parking">Parking</Label><Input type="number" name="overview.configuration.parking" value={formData.overview?.configuration?.parking || ''} onChange={numericInputChange} /></div>
                                <div><Label htmlFor="overview.configuration.storage">Storage</Label><Input type="number" name="overview.configuration.storage" value={formData.overview?.configuration?.storage || ''} onChange={numericInputChange} /></div>
                            </div>
                        </Section>

                        <Section title="Financials">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="font-semibold mb-2">Income Items</h4>
                                    <div className="space-y-2">
                                        {incomeTransactions.map(t => (
                                            <div key={t.id} className="grid grid-cols-12 gap-2 items-center">
                                                <div className="col-span-3"><Input type="date" value={t.date || ''} onChange={e => handleTransactionChange(t.id, 'date', e.target.value)} /></div>
                                                <div className="col-span-5"><Input type="text" placeholder="Description" value={t.description} onChange={e => handleTransactionChange(t.id, 'description', e.target.value)} /></div>
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
                                                <div className="col-span-3"><Input type="date" value={t.date || ''} onChange={e => handleTransactionChange(t.id, 'date', e.target.value)} /></div>
                                                <div className="col-span-5"><Input type="text" placeholder="Description" value={t.description} onChange={e => handleTransactionChange(t.id, 'description', e.target.value)} /></div>
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
                        </Section>

                        <Section title="Operations & Compliance">
                            <h4 className="font-semibold mb-2">Compliance Checks</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div><Label>Last Property Inspection</Label><Input type="date" name="operations.compliance.propertyInspection.last" value={formData.operations?.compliance?.propertyInspection?.last || ''} onChange={commonInputChange} /></div>
                                <div><Label>Next Inspection Due</Label><Input type="date" name="operations.compliance.propertyInspection.next" value={formData.operations?.compliance?.propertyInspection?.next || ''} onChange={commonInputChange} /></div>
                                <div><Label>Alarms Last Checked</Label><Input type="date" name="operations.compliance.smokeAlarms.lastChecked" value={formData.operations?.compliance?.smokeAlarms?.lastChecked || ''} onChange={commonInputChange} /></div>
                                <div><Label>Alarms Next Check Due</Label><Input type="date" name="operations.compliance.smokeAlarms.nextCheck" value={formData.operations?.compliance?.smokeAlarms?.nextCheck || ''} onChange={commonInputChange} /></div>
                            </div>
                        </Section>

                        <Section title="Notes">
                            <Label htmlFor="notes">Notes & Memos</Label>
                            <textarea
                                id="notes"
                                name="notes"
                                value={formData.notes || ''}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                rows={5}
                                className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition"
                            />
                        </Section>

                        <Section title="Groups">
                            <div className="flex gap-2 mb-3">
                                <Input type="text" value={newGroup} onChange={(e) => setNewGroup(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddGroup())} placeholder="Create new group" />
                                <button type="button" onClick={handleAddGroup} className="px-4 py-2 rounded-lg bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors flex items-center gap-1"><PlusIcon/> Add</button>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 max-h-40 overflow-y-auto p-3 bg-slate-100 dark:bg-slate-900/50 rounded-lg">
                                {allGroups.sort().map(group => (
                                    <label key={group} className="flex items-center space-x-2 cursor-pointer">
                                        <input type="checkbox" checked={selectedGroups.has(group)} onChange={() => toggleGroup(group)} className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-secondary" />
                                        <span className="text-sm text-slate-700 dark:text-gray-300">{group}</span>
                                    </label>
                                ))}
                            </div>
                        </Section>
                        
                        <Section title="Documents">
                             {(formData.documents || []).map((doc, index) => (
                                <div key={index} className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                                    <Input type="text" placeholder="Document Name" value={doc.name} onChange={(e) => handleArrayChange('documents', index, 'name', e.target.value)} />
                                    <div className="flex gap-2">
                                        <Input type="url" placeholder="URL" value={doc.url} onChange={(e) => handleArrayChange('documents', index, 'url', e.target.value)} />
                                        <button type="button" onClick={() => removeArrayItem('documents', index)} className="p-2 text-red-500 hover:text-red-700"><TrashIcon/></button>
                                    </div>
                                </div>
                            ))}
                            <button type="button" onClick={() => addArrayItem('documents')} className="text-sm font-semibold text-brand-primary hover:underline">Add Document</button>
                        </Section>
                        
                         <Section title="Contacts">
                            {(formData.contacts || []).map((contact, index) => (
                                <div key={index} className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                                    <Input type="text" placeholder="Role" value={contact.role} onChange={(e) => handleArrayChange('contacts', index, 'role', e.target.value)} />
                                    <Input type="text" placeholder="Name" value={contact.name} onChange={(e) => handleArrayChange('contacts', index, 'name', e.target.value)} />
                                    <div className="flex gap-2">
                                    <Input type="text" placeholder="Contact Info" value={contact.contact} onChange={(e) => handleArrayChange('contacts', index, 'contact', e.target.value)} />
                                    <button type="button" onClick={() => removeArrayItem('contacts', index)} className="p-2 text-red-500 hover:text-red-700"><TrashIcon/></button>
                                    </div>
                                </div>
                            ))}
                             <button type="button" onClick={() => addArrayItem('contacts')} className="text-sm font-semibold text-brand-primary hover:underline">Add Contact</button>
                        </Section>


                    </div>
                    <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end space-x-3 rounded-b-xl mt-auto">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">Cancel</button>
                        <button type="submit" className="px-4 py-2 rounded-lg bg-brand-primary text-white font-semibold hover:bg-opacity-90 transition-colors">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditPropertyModal;