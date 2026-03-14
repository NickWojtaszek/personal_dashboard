import React, { useState, useEffect } from 'react';
import type { InsuranceInfo, PropertyInfo } from '../../types';
import { DocumentTextIcon, EditIcon, SaveIcon } from './Icons';

interface InsuranceInfoSectionProps {
    policy: InsuranceInfo;
    isEditing: boolean;
    onSetEditing: () => void;
    onSave: (policy: InsuranceInfo) => void;
    onCancel: () => void;
    properties?: PropertyInfo[];
}

const DetailItem: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
    <div>
        <p className="text-sm text-slate-500 dark:text-gray-400">{label}</p>
        <p className="font-medium text-slate-800 dark:text-gray-200 break-words">{value || 'N/A'}</p>
    </div>
);

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition" />
);

const Label: React.FC<{ htmlFor?: string, children: React.ReactNode }> = ({ htmlFor, children }) => (
    <label htmlFor={htmlFor} className="block text-xs font-medium text-slate-600 dark:text-gray-300 mb-1">{children}</label>
);

const InsuranceInfoSection: React.FC<InsuranceInfoSectionProps> = ({ policy, isEditing, onSetEditing, onSave, onCancel, properties }) => {
    const [editedData, setEditedData] = useState<InsuranceInfo>(policy);
    
    useEffect(() => {
        if(isEditing) {
            setEditedData(policy);
        }
    }, [policy, isEditing]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setEditedData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        onSave(editedData);
    };

    if(isEditing) {
        return (
             <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-brand-primary/50 dark:border-brand-secondary/50">
                <div className="p-5 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-lg font-bold flex items-center gap-3"><DocumentTextIcon /> Editing Key Information</h2>
                </div>
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><Label>Policyholder</Label><Input type="text" name="policyholder" value={editedData.policyholder || ''} onChange={handleInputChange} /></div>
                    <div><Label>Policy Type</Label><Input type="text" name="policyType" value={editedData.policyType || ''} onChange={handleInputChange} /></div>
                    <div><Label>Policy Number</Label><Input type="text" name="policyNumber" value={editedData.policyNumber || ''} onChange={handleInputChange} /></div>
                    <div><Label>Insurer Contact</Label><Input type="text" name="contactNumber" value={editedData.contactNumber || ''} onChange={handleInputChange} /></div>
                    {properties && properties.length > 0 && (
                        <div>
                            <Label>Linked Property</Label>
                            <select
                                value={editedData.propertyId || ''}
                                onChange={e => setEditedData(prev => ({ ...prev, propertyId: e.target.value || undefined }))}
                                className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition"
                            >
                                <option value="">None</option>
                                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                    )}
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
                <h2 className="text-lg font-bold flex items-center gap-3"><DocumentTextIcon /> Key Information</h2>
                <button
                    onClick={onSetEditing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/50 text-sm font-semibold text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                    <EditIcon />
                    <span>Edit</span>
                </button>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <DetailItem label="Policyholder" value={policy.policyholder} />
                <DetailItem label="Policy Type" value={policy.policyType} />
                <DetailItem label="Policy Number" value={policy.policyNumber} />
                <DetailItem label="Insurer Contact" value={policy.contactNumber} />
                <DetailItem label="Linked Property" value={policy.propertyId ? properties?.find(p => p.id === policy.propertyId)?.name || 'Unknown' : undefined} />
            </div>
        </div>
    );
};

export default InsuranceInfoSection;