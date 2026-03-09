


import React, { useState, useEffect } from 'react';
import type { PropertyInfo, MaintenanceJob, EquipmentInstallation, Document } from '../../types';
import { WrenchScrewdriverIcon, EditIcon, SaveIcon, DocumentTextIcon, ChevronRightIcon, TrashIcon, PlusIcon } from './Icons';
import { v4 as uuidv4 } from 'uuid';

interface MaintenanceSectionProps {
    property: PropertyInfo;
    isEditing: boolean;
    onSetEditing: () => void;
    onSave: (property: PropertyInfo) => void;
    onCancel: () => void;
}

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition" />
);

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

const MaintenanceSection: React.FC<MaintenanceSectionProps> = ({ property, isEditing, onSetEditing, onSave, onCancel }) => {
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
        listName: 'jobs' | 'equipment', 
        itemId: string, 
        field: keyof T, 
        value: any
    ) => {
        setEditedData(prev => {
            // FIX: Cast to unknown first to safely handle the union type.
            const newList = ((prev?.maintenance?.[listName] as unknown as T[]) || []).map(item => 
                item.id === itemId ? { ...item, [field]: value } : item
            );
            return {
                ...prev,
                maintenance: {
                    ...prev?.maintenance,
                    [listName]: newList
                }
            };
        });
    };
    
    const addItem = (listName: 'jobs' | 'equipment') => {
        const newItem = {
            id: uuidv4(),
            date: new Date().toISOString().split('T')[0],
            description: '',
            cost: 0,
        };

        setEditedData(prev => {
            const oldMaintenance = prev?.maintenance ?? {};
            const newMaintenance = { ...oldMaintenance };
            if (listName === 'jobs') {
                newMaintenance.jobs = [newItem, ...(oldMaintenance.jobs ?? [])];
            } else {
                newMaintenance.equipment = [newItem, ...(oldMaintenance.equipment ?? [])];
            }
            return {
                ...prev,
                maintenance: newMaintenance,
            };
        });
    };
    
    const removeItem = (listName: 'jobs' | 'equipment', itemId: string) => {
        setEditedData(prev => {
            const oldMaintenance = prev?.maintenance ?? {};
            const newMaintenance = { ...oldMaintenance };

            if (listName === 'jobs') {
                newMaintenance.jobs = (oldMaintenance.jobs ?? []).filter(item => item.id !== itemId);
            } else {
                newMaintenance.equipment = (oldMaintenance.equipment ?? []).filter(item => item.id !== itemId);
            }
            return {
                ...prev,
                maintenance: newMaintenance,
            };
        });
    };
    
    const handleFileChange = async <T extends { id: string, document?: Document }>(
        listName: 'jobs' | 'equipment', 
        itemId: string, 
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const base64Data = arrayBufferToBase64(await file.arrayBuffer());
            const newDoc: Document = { name: file.name, url: '#', data: base64Data, mimeType: file.type };
            
             setEditedData(prev => {
                // FIX: Cast to unknown first to safely handle the union type.
                const newList = ((prev?.maintenance?.[listName] as unknown as T[]) || []).map(item => 
                    item.id === itemId ? { ...item, document: newDoc } : item
                );
                return {
                    ...prev,
                    maintenance: {
                        ...prev?.maintenance,
                        [listName]: newList
                    }
                };
            });
        }
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return null;
        return new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const getDocumentUrl = (doc?: Document) => {
        if (doc?.data && doc?.mimeType) {
            return `data:${doc.mimeType};base64,${doc.data}`;
        }
        return doc?.url || '#';
    };

    if (isEditing) {
        const jobs = editedData?.maintenance?.jobs || [];
        const equipment = editedData?.maintenance?.equipment || [];

        return (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-brand-primary/50 dark:border-brand-secondary/50">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold flex items-center gap-3"><WrenchScrewdriverIcon /> Editing Maintenance & Equipment</h2>
                </div>
                <div className="p-6 space-y-6">
                    <div className="space-y-2">
                        <h4 className="font-semibold">Maintenance History</h4>
                        {jobs.map((job, index) => (
                            <div key={job.id} className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg space-y-2">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                    <Input type="date" value={job.date} onChange={(e) => handleItemChange<MaintenanceJob>('jobs', job.id, 'date', e.target.value)} />
                                    <Input type="text" placeholder="Description" value={job.description} onChange={(e) => handleItemChange<MaintenanceJob>('jobs', job.id, 'description', e.target.value)} />
                                    <Input type="number" placeholder="Cost" value={job.cost} onChange={(e) => handleItemChange<MaintenanceJob>('jobs', job.id, 'cost', parseFloat(e.target.value) || 0)} />
                                </div>
                                <div className="flex items-center gap-2">
                                    <input type="file" id={`job-file-${index}`} className="hidden" onChange={(e) => handleFileChange<MaintenanceJob>('jobs', job.id, e)} accept=".pdf" />
                                    <label htmlFor={`job-file-${index}`} className="flex-grow text-center cursor-pointer p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg text-sm truncate">{job.document?.name || "Upload Invoice PDF"}</label>
                                    <button type="button" onClick={() => removeItem('jobs', job.id)} className="p-2 text-red-500 hover:text-red-700"><TrashIcon /></button>
                                </div>
                            </div>
                        ))}
                        <button type="button" onClick={() => addItem('jobs')} className="mt-2 flex items-center gap-1 text-sm font-semibold text-brand-primary hover:underline"><PlusIcon /> Add Maintenance Job</button>
                    </div>

                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
                        <h4 className="font-semibold">Equipment & Appliances</h4>
                        {equipment.map((item, index) => (
                            <div key={item.id} className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg space-y-2">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                    <Input type="date" value={item.date} onChange={(e) => handleItemChange<EquipmentInstallation>('equipment', item.id, 'date', e.target.value)} />
                                    <Input type="text" placeholder="Equipment Name/Description" value={item.description} onChange={(e) => handleItemChange<EquipmentInstallation>('equipment', item.id, 'description', e.target.value)} />
                                    <Input type="number" placeholder="Cost" value={item.cost} onChange={(e) => handleItemChange<EquipmentInstallation>('equipment', item.id, 'cost', parseFloat(e.target.value) || 0)} />
                                </div>
                                <div className="flex items-center gap-2">
                                    <input type="file" id={`equip-file-${index}`} className="hidden" onChange={(e) => handleFileChange<EquipmentInstallation>('equipment', item.id, e)} accept=".pdf" />
                                    <label htmlFor={`equip-file-${index}`} className="flex-grow text-center cursor-pointer p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg text-sm truncate">{item.document?.name || "Upload Warranty/Invoice PDF"}</label>
                                    <button type="button" onClick={() => removeItem('equipment', item.id)} className="p-2 text-red-500 hover:text-red-700"><TrashIcon /></button>
                                </div>
                            </div>
                        ))}
                        <button type="button" onClick={() => addItem('equipment')} className="mt-2 flex items-center gap-1 text-sm font-semibold text-brand-primary hover:underline"><PlusIcon /> Add Equipment</button>
                    </div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                    <button onClick={onCancel} className="px-4 py-2 rounded-lg bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">Cancel</button>
                    <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-primary text-white font-semibold hover:bg-opacity-90 transition-colors"><SaveIcon /> Save Changes</button>
                </div>
            </div>
        );
    }
    
    const { maintenance } = property.operations || {};
    const jobs = (maintenance?.jobs || []).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const equipment = (maintenance?.equipment || []).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const renderTable = (title: string, items: (MaintenanceJob | EquipmentInstallation)[]) => (
        <div className="py-4 first:pt-0 last:pb-0">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</p>
            {items.length > 0 ? (
                <div className="mt-2 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                        {items.map(item => (
                             <div key={item.id} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                <div className="flex justify-between items-start gap-4">
                                    <div>
                                        <p className="text-xs text-slate-500 dark:text-gray-400">{formatDate(item.date)}</p>
                                        <p className="text-sm font-medium text-slate-800 dark:text-gray-200">{item.description}</p>
                                    </div>
                                    <p className="text-sm font-mono text-slate-600 dark:text-gray-300">£{item.cost.toFixed(2)}</p>
                                </div>
                                {item.document && (
                                    <a href={getDocumentUrl(item.document)} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-2 text-sm text-brand-primary hover:underline">
                                        <DocumentTextIcon size={14}/> {item.document.name}
                                    </a>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ) : <p className="mt-2 text-sm text-slate-500 dark:text-gray-400">No records found.</p>}
        </div>
    );

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-3"><WrenchScrewdriverIcon /> Maintenance & Equipment</h2>
                <button onClick={onSetEditing} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/50 text-sm font-semibold text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"><EditIcon /><span>Edit</span></button>
            </div>
            <div className="p-6 divide-y divide-slate-100 dark:divide-slate-700">
                {renderTable("Maintenance History", jobs)}
                {renderTable("Equipment & Appliances", equipment)}
            </div>
        </div>
    );
};

export default MaintenanceSection;
