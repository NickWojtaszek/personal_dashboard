

import React, { useState, useEffect } from 'react';
import type { InsuranceInfo, Document } from '../../types';
import { PaperClipIcon, EditIcon, SaveIcon, ExternalLinkIcon, DocumentTextIcon, ChevronRightIcon } from './Icons';
import { getColorForGroup } from '../../constants';

interface DetailsSectionProps {
    policy: InsuranceInfo;
    isEditing: boolean;
    onSetEditing: () => void;
    onSave: (policy: InsuranceInfo) => void;
    onCancel: () => void;
}

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition" />
);
const Textarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea {...props} className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition" />
);
const Label: React.FC<{ htmlFor?: string, children: React.ReactNode }> = ({ htmlFor, children }) => (
    <label htmlFor={htmlFor} className="block text-xs font-medium text-slate-600 dark:text-gray-300 mb-1">{children}</label>
);

const DetailsSection: React.FC<DetailsSectionProps> = ({ policy, isEditing, onSetEditing, onSave, onCancel }) => {
    const [editedData, setEditedData] = useState<InsuranceInfo>(policy);
    
    useEffect(() => {
        if(isEditing) {
            setEditedData(policy);
        }
    }, [policy, isEditing]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setEditedData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        onSave(editedData);
    };
    
    const getDocumentUrl = (doc: Document) => {
        if (doc.data && doc.mimeType) {
            return `data:${doc.mimeType};base64,${doc.data}`;
        }
        return doc.url;
    };

    if(isEditing) {
        return (
             <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-brand-primary/50 dark:border-brand-secondary/50">
                <div className="p-5 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-lg font-bold flex items-center gap-3"><PaperClipIcon /> Editing Details</h2>
                </div>
                <div className="p-5 space-y-4">
                    <div>
                        <Label>Coverage Summary</Label>
                        <Textarea name="coverageSummary" value={editedData.coverageSummary || ''} onChange={handleInputChange} rows={4} />
                    </div>
                    <div>
                        <Label>Notes</Label>
                        <Textarea name="notes" value={editedData.notes || ''} onChange={handleInputChange} rows={4} />
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
             <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <h2 className="text-lg font-bold flex items-center gap-3"><PaperClipIcon /> Details</h2>
                <button
                    onClick={onSetEditing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/50 text-sm font-semibold text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                    <EditIcon />
                    <span>Edit</span>
                </button>
            </div>
            <div className="p-5 space-y-4 divide-y divide-slate-100 dark:divide-slate-700">
                <div className="pb-4">
                    <h3 className="text-sm font-medium text-slate-600 dark:text-gray-300 mb-2 uppercase tracking-wider">Coverage Summary</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 prose prose-sm dark:prose-invert max-w-none">{policy.coverageSummary || 'No summary provided.'}</p>
                </div>
                 <div className="py-4">
                    <h3 className="text-sm font-medium text-slate-600 dark:text-gray-300 mb-2 uppercase tracking-wider">Notes</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 prose prose-sm dark:prose-invert max-w-none">{policy.notes || 'No notes available.'}</p>
                </div>
                <div className="py-4">
                    <h3 className="text-sm font-medium text-slate-600 dark:text-gray-300 mb-2 uppercase tracking-wider">Document</h3>
                     <div className="space-y-2">
                        {policy.document ? (
                             <a href={getDocumentUrl(policy.document)} target="_blank" rel="noopener noreferrer" download={policy.document.name} className="flex justify-between items-center p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors group">
                                <div className="flex items-center gap-2">
                                    <DocumentTextIcon/>
                                    <span className="text-sm font-medium text-brand-primary dark:text-brand-secondary truncate">{policy.document.name}</span>
                                </div>
                                <ChevronRightIcon className="text-slate-400 group-hover:text-brand-primary" />
                            </a>
                        ) : <p className="text-sm text-slate-500 dark:text-gray-400 p-2">No document attached.</p>}
                    </div>
                </div>
                 <div className="py-4">
                    <h3 className="text-sm font-medium text-slate-600 dark:text-gray-300 mb-2 uppercase tracking-wider">Groups</h3>
                    {policy.groups && policy.groups.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {policy.groups.map(group => (
                                <span key={group} className={`px-2 py-1 text-xs rounded-full font-medium ${getColorForGroup(group)}`}>{group}</span>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-slate-500 dark:text-gray-400">No groups assigned.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DetailsSection;