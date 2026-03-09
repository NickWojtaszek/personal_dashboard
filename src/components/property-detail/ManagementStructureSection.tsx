
import React, { useState, useEffect } from 'react';
import type { PropertyInfo } from '../../types';
import { BuildingLibraryIcon, EditIcon, SaveIcon } from './Icons';

interface ManagementStructureSectionProps {
    property: PropertyInfo;
    isEditing: boolean;
    onSetEditing: () => void;
    onSave: (property: PropertyInfo) => void;
    onCancel: () => void;
}

const DetailItem: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
    <div>
        <p className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm text-slate-700 dark:text-gray-200 break-words whitespace-pre-wrap">{value || 'N/A'}</p>
    </div>
);

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition" />
);

const Textarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
     <textarea {...props} className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition" />
);

const Label: React.FC<{ htmlFor?: string, children: React.ReactNode }> = ({ htmlFor, children }) => (
    <label htmlFor={htmlFor} className="block text-xs font-medium text-slate-600 dark:text-gray-300 mb-1">{children}</label>
);

const ManagementStructureSection: React.FC<ManagementStructureSectionProps> = ({ property, isEditing, onSetEditing, onSave, onCancel }) => {
    const [editedData, setEditedData] = useState<PropertyInfo['managementStructure']>(property.managementStructure);

    useEffect(() => {
        if (isEditing) {
            setEditedData(JSON.parse(JSON.stringify(property.managementStructure || {})));
        }
    }, [property, isEditing]);

    const handleSave = () => {
        onSave({ ...property, managementStructure: editedData });
    };

    const handleNestedChange = (path: string, value: any) => {
        setEditedData(prev => {
            const keys = path.split('.');
            const newState = JSON.parse(JSON.stringify(prev || {}));
            let current = newState;
            for (let i = 0; i < keys.length - 1; i++) {
                if (!current[keys[i]]) current[keys[i]] = {};
                current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = value;
            return newState;
        });
    };
    
    const commonInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => handleNestedChange(e.target.name, e.target.value);

    if (isEditing) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-brand-primary/50 dark:border-brand-secondary/50">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold flex items-center gap-3"><BuildingLibraryIcon /> Editing Management Structure</h2>
                </div>
                <div className="p-6 space-y-6">
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={editedData?.hasComplexManagement || false}
                            onChange={(e) => handleNestedChange('hasComplexManagement', e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-secondary"
                        />
                        <span className="text-sm font-medium text-slate-700 dark:text-gray-300">This property has a complex management structure</span>
                    </label>

                    {editedData?.hasComplexManagement && (
                        <div className="space-y-6">
                            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
                                <h3 className="font-semibold">Managing Agent</h3>
                                <div><Label>Name</Label><Input name="managingAgent.name" value={editedData?.managingAgent?.name || ''} onChange={commonInputChange} /></div>
                                <div><Label>Address</Label><Textarea name="managingAgent.address" value={editedData?.managingAgent?.address || ''} onChange={commonInputChange} rows={3} /></div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    <div><Label>Bank</Label><Input name="managingAgent.bank" value={editedData?.managingAgent?.bank || ''} onChange={commonInputChange} /></div>
                                    <div><Label>Sort Code</Label><Input name="managingAgent.sortCode" value={editedData?.managingAgent?.sortCode || ''} onChange={commonInputChange} /></div>
                                    <div><Label>Account No</Label><Input name="managingAgent.accountNo" value={editedData?.managingAgent?.accountNo || ''} onChange={commonInputChange} /></div>
                                </div>
                            </div>
                             <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
                                <h3 className="font-semibold">Landlord (Freeholder)</h3>
                                <div><Label>Name</Label><Input name="landlord.name" value={editedData?.landlord?.name || ''} onChange={commonInputChange} /></div>
                                <div><Label>Address</Label><Textarea name="landlord.address" value={editedData?.landlord?.address || ''} onChange={commonInputChange} rows={3} /></div>
                            </div>
                             <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
                                <h3 className="font-semibold">Right to Manage (RTM) Company</h3>
                                <div><Label>Name</Label><Input name="rtmCompany.name" value={editedData?.rtmCompany?.name || ''} onChange={commonInputChange} /></div>
                                <div><Label>Address</Label><Textarea name="rtmCompany.address" value={editedData?.rtmCompany?.address || ''} onChange={commonInputChange} rows={3} /></div>
                            </div>
                        </div>
                    )}
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                    <button onClick={onCancel} className="px-4 py-2 rounded-lg bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">Cancel</button>
                    <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-primary text-white font-semibold hover:bg-opacity-90 transition-colors"><SaveIcon /> Save Changes</button>
                </div>
            </div>
        );
    }
    
    if (!property.managementStructure?.hasComplexManagement) {
        return null;
    }

    const { managingAgent, landlord, rtmCompany } = property.managementStructure;

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-3"><BuildingLibraryIcon /> Management Structure</h2>
                <button onClick={onSetEditing} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/50 text-sm font-semibold text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"><EditIcon /><span>Edit</span></button>
            </div>
            <div className="p-6 space-y-6">
                {managingAgent && (
                    <div className="space-y-2">
                        <h3 className="font-semibold text-slate-800 dark:text-gray-200">Managing Agent</h3>
                        <DetailItem label="Name" value={managingAgent.name} />
                        <DetailItem label="Address" value={managingAgent.address} />
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-2 pt-2 border-t border-slate-100 dark:border-slate-700 mt-2">
                            <DetailItem label="Bank" value={managingAgent.bank} />
                            <DetailItem label="Sort Code" value={managingAgent.sortCode} />
                            <DetailItem label="Account No" value={managingAgent.accountNo} />
                        </div>
                    </div>
                )}
                 {landlord && (
                    <div className="space-y-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <h3 className="font-semibold text-slate-800 dark:text-gray-200">Landlord (Freeholder)</h3>
                        <DetailItem label="Name" value={landlord.name} />
                        <DetailItem label="Address" value={landlord.address} />
                    </div>
                )}
                {rtmCompany && (
                    <div className="space-y-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <h3 className="font-semibold text-slate-800 dark:text-gray-200">Right to Manage Company</h3>
                        <DetailItem label="Name" value={rtmCompany.name} />
                        <DetailItem label="Address" value={rtmCompany.address} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default ManagementStructureSection;
