import React, { useState, useEffect, useRef } from 'react';
import type { VehicleInfo } from '../types';

const TERMS = ['1 Month', '3 Months', '6 Months', '12 Months'];
const CURRENCIES = ['AUD', 'GBP', 'USD', 'EUR', 'PLN'];

interface EditVehicleModalProps {
    vehicle: VehicleInfo;
    onSave: (vehicle: VehicleInfo) => void;
    onClose: () => void;
    allGroups: string[];
    onGroupsChange: (groups: string[]) => void;
}

const PlusIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>);
const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition" />;
const Label = (props: React.LabelHTMLAttributes<HTMLLabelElement>) => <label {...props} className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-1" />;
const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) => <select {...props} className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition" />;

const EditVehicleModal: React.FC<EditVehicleModalProps> = ({ vehicle, onSave, onClose, allGroups, onGroupsChange }) => {
    const [formData, setFormData] = useState<VehicleInfo>(vehicle);
    const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set(vehicle.groups || []));
    const [newGroup, setNewGroup] = useState('');
    const mouseDownTarget = useRef<EventTarget | null>(null);

    useEffect(() => {
        setFormData(vehicle);
        setSelectedGroups(new Set(vehicle.groups || []));
    }, [vehicle]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? (value === '' ? undefined : parseFloat(value)) : value
        }));
    };

    const handleSelectChange = (field: string) => (e: React.ChangeEvent<HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [field]: e.target.value || undefined }));
    };

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

    return (
        <div
            className="fixed inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
        >
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl m-4 border border-slate-200 dark:border-slate-700">
                <form onSubmit={handleSave}>
                    <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{formData.name ? 'Edit Vehicle' : 'New Vehicle'}</h2>
                    </div>
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        {/* Basic info */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div><Label htmlFor="name">Vehicle Name</Label><Input id="name" name="name" value={formData.name} onChange={handleInputChange} required /></div>
                            <div><Label htmlFor="rego">Registration (Rego)</Label><Input id="rego" name="rego" value={formData.rego} onChange={handleInputChange} required /></div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div><Label htmlFor="state">State/Country</Label><Input id="state" name="state" value={formData.state} onChange={handleInputChange} required /></div>
                            <div><Label htmlFor="startDate">Start Date</Label><Input id="startDate" type="date" name="startDate" value={formData.startDate || ''} onChange={handleInputChange} /></div>
                            <div><Label htmlFor="expiryDate">Expiry Date</Label><Input id="expiryDate" type="date" name="expiryDate" value={formData.expiryDate} onChange={handleInputChange} required /></div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div><Label htmlFor="make">Make</Label><Input id="make" name="make" value={formData.make || ''} onChange={handleInputChange} /></div>
                            <div><Label htmlFor="model">Model</Label><Input id="model" name="model" value={formData.model || ''} onChange={handleInputChange} /></div>
                            <div><Label htmlFor="year">Year</Label><Input id="year" type="number" name="year" value={formData.year || ''} onChange={handleInputChange} /></div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div><Label htmlFor="bodyType">Body Type</Label><Input id="bodyType" name="bodyType" value={formData.bodyType || ''} onChange={handleInputChange} /></div>
                            <div><Label htmlFor="purpose">Purpose</Label><Input id="purpose" name="purpose" value={formData.purpose || ''} onChange={handleInputChange} /></div>
                        </div>
                        <div><Label htmlFor="vin">VIN</Label><Input id="vin" name="vin" value={formData.vin || ''} onChange={handleInputChange} /></div>

                        {/* Costs */}
                        <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                            <h3 className="text-sm font-semibold text-slate-700 dark:text-gray-300 mb-3">Costs & Fees</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div><Label htmlFor="totalAmount">Total Amount</Label><Input id="totalAmount" type="number" step="0.01" name="totalAmount" value={formData.totalAmount ?? ''} onChange={handleInputChange} /></div>
                                <div>
                                    <Label htmlFor="term">Term</Label>
                                    <Select id="term" value={formData.term || ''} onChange={handleSelectChange('term')}>
                                        <option value="">Select...</option>
                                        {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="currency">Currency</Label>
                                    <Select id="currency" value={formData.currency || 'AUD'} onChange={handleSelectChange('currency')}>
                                        {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                                <div><Label htmlFor="ctpInsurer">CTP Insurer</Label><Input id="ctpInsurer" name="ctpInsurer" value={formData.ctpInsurer || ''} onChange={handleInputChange} /></div>
                                <div><Label htmlFor="ctpAmount">CTP Amount</Label><Input id="ctpAmount" type="number" step="0.01" name="ctpAmount" value={formData.ctpAmount ?? ''} onChange={handleInputChange} /></div>
                            </div>
                        </div>

                        {/* Groups */}
                        <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                            <Label>Groups</Label>
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
                        </div>
                    </div>
                    <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end space-x-3 rounded-b-xl">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">Cancel</button>
                        <button type="submit" className="px-4 py-2 rounded-lg bg-brand-primary text-white font-semibold hover:bg-opacity-90 transition-colors">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditVehicleModal;
