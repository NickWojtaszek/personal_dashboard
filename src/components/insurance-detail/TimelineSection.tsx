import React, { useState, useEffect } from 'react';
import type { InsuranceInfo } from '../../types';
import { CalendarIcon, EditIcon, SaveIcon } from './Icons';

interface TimelineSectionProps {
    policy: InsuranceInfo;
    isEditing: boolean;
    onSetEditing: () => void;
    onSave: (policy: InsuranceInfo) => void;
    onCancel: () => void;
}

const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    // Check if the string is in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        try {
            return new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        } catch (e) {
            return dateString;
        }
    }
    return dateString; // Fallback for other formats like "Dec 2024"
};


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

const TimelineSection: React.FC<TimelineSectionProps> = ({ policy, isEditing, onSetEditing, onSave, onCancel }) => {
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

    const handleSave = () => {
        onSave(editedData);
    };

    if(isEditing) {
        return (
             <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-brand-primary/50 dark:border-brand-secondary/50">
                <div className="p-5 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-lg font-bold flex items-center gap-3"><CalendarIcon /> Editing Timeline & Status</h2>
                </div>
                <div className="p-5 space-y-4">
                     <div>
                        <Label>Policy Status</Label>
                        <Select name="status" value={editedData.status || ''} onChange={handleInputChange}>
                            <option value="Pending">Pending</option>
                            <option value="Active">Active</option>
                            <option value="Expired">Expired</option>
                        </Select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div><Label>Start Date</Label><Input type="date" name="startDate" value={editedData.startDate || ''} onChange={handleInputChange} /></div>
                        <div><Label>End Date</Label><Input type="date" name="endDate" value={editedData.endDate || ''} onChange={handleInputChange} /></div>
                    </div>
                     <div><Label>Renewal Date</Label><Input type="text" name="renewalDate" value={editedData.renewalDate || ''} placeholder="e.g. Dec 2024" onChange={handleInputChange} /></div>
                     <div><Label>Last Reviewed</Label><Input type="date" name="lastReviewed" value={editedData.lastReviewed || ''} onChange={handleInputChange} /></div>
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
                <h2 className="text-lg font-bold flex items-center gap-3"><CalendarIcon /> Timeline</h2>
                <button
                    onClick={onSetEditing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/50 text-sm font-semibold text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                    <EditIcon />
                    <span>Edit</span>
                </button>
            </div>
            <div className="p-5 space-y-4">
                <DetailItem label="Start Date" value={formatDate(policy.startDate)} />
                <DetailItem label="End Date" value={formatDate(policy.endDate)} />
                <DetailItem label="Renewal Date" value={policy.renewalDate} />
                <DetailItem label="Last Reviewed" value={formatDate(policy.lastReviewed)} />
            </div>
        </div>
    );
};

export default TimelineSection;