

import React, { useState, useEffect } from 'react';
import type { PropertyInfo, Document, PropertyContact } from '../../types';
import { DocumentTextIcon, AtSymbolIcon, PhoneIcon, ChevronRightIcon, PaperClipIcon, UserGroupIcon, LightningBoltIcon, EditIcon, SaveIcon, TrashIcon, PlusIcon } from './Icons';
import { openDocument } from '../../lib/openDocument';

interface DocumentsContactsSectionProps {
    property: PropertyInfo;
    isEditing: boolean;
    onSetEditing: () => void;
    onSave: (property: PropertyInfo) => void;
    onCancel: () => void;
}

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition" />
);


const DocumentsContactsSection: React.FC<DocumentsContactsSectionProps> = ({ property, isEditing, onSetEditing, onSave, onCancel }) => {
    const [editedData, setEditedData] = useState<PropertyInfo>(property);

    useEffect(() => {
        if(isEditing) {
            setEditedData(property);
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
    const commonInputChange = (e: React.ChangeEvent<HTMLInputElement>) => handleNestedChange(e.target.name, e.target.value);


    const handleArrayChange = (arrayName: 'documents' | 'contacts', index: number, field: string, value: string) => {
        const updatedArray = [...(editedData[arrayName] || [])];
        if(updatedArray[index]) {
            (updatedArray[index] as any)[field] = value;
            setEditedData(prev => ({...prev, [arrayName]: updatedArray}));
        }
    };
    
    const addArrayItem = (arrayName: 'documents' | 'contacts') => {
        const newItem = arrayName === 'documents' 
            ? { name: '', url: '' } 
            : { role: '', name: '', contact: '' };
        setEditedData(prev => ({...prev, [arrayName]: [...(prev[arrayName] || []), newItem]}));
    }

    const removeArrayItem = (arrayName: 'documents' | 'contacts', index: number) => {
        setEditedData(prev => ({...prev, [arrayName]: (prev[arrayName] || []).filter((_, i) => i !== index)}));
    }

    const handleSave = () => {
        onSave(editedData);
    };
    

    if (isEditing) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-brand-primary/50 dark:border-brand-secondary/50">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold flex items-center gap-3"><PaperClipIcon /> Editing Info</h2>
                </div>
                <div className="p-6 space-y-6">
                    <div>
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-gray-300 mb-3 uppercase tracking-wider"><UserGroupIcon /> Management</h3>
                        <div className="space-y-2">
                             <Input type="text" placeholder="Managing Agent" name="management.agent" value={editedData.management?.agent || ''} onChange={commonInputChange} />
                             <Input type="text" placeholder="Manager Contact" name="management.managerContact" value={editedData.management?.managerContact || ''} onChange={commonInputChange} />
                             <Input type="text" placeholder="Agreement Details" name="management.agreementDetails" value={editedData.management?.agreementDetails || ''} onChange={commonInputChange} />
                        </div>
                    </div>
                    <div className="pt-6 border-t border-slate-200 dark:border-slate-600">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-gray-300 mb-3 uppercase tracking-wider"><DocumentTextIcon /> Documents</h3>
                        <div className="space-y-2">
                            {(editedData.documents || []).map((doc, index) => (
                                <div key={index} className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                                    <Input type="text" placeholder="Document Name" value={doc.name} onChange={(e) => handleArrayChange('documents', index, 'name', e.target.value)} />
                                    <div className="flex gap-2">
                                        <Input type="url" placeholder="URL (if not uploaded)" value={doc.url} onChange={(e) => handleArrayChange('documents', index, 'url', e.target.value)} disabled={!!doc.data} />
                                        <button type="button" onClick={() => removeArrayItem('documents', index)} className="p-2 text-red-500 hover:text-red-700"><TrashIcon/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={() => addArrayItem('documents')} className="mt-2 flex items-center gap-1 text-sm font-semibold text-brand-primary hover:underline"><PlusIcon /> Add Document</button>
                    </div>
                    <div className="pt-6 border-t border-slate-200 dark:border-slate-600">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-gray-300 mb-3 uppercase tracking-wider"><UserGroupIcon /> Contacts</h3>
                        <div className="space-y-2">
                            {(editedData.contacts || []).map((contact, index) => (
                                <div key={index} className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                                    <Input type="text" placeholder="Role" value={contact.role} onChange={(e) => handleArrayChange('contacts', index, 'role', e.target.value)} />
                                    <Input type="text" placeholder="Name" value={contact.name} onChange={(e) => handleArrayChange('contacts', index, 'name', e.target.value)} />
                                    <div className="flex gap-2">
                                        <Input type="text" placeholder="Contact Info" value={contact.contact} onChange={(e) => handleArrayChange('contacts', index, 'contact', e.target.value)} />
                                        <button type="button" onClick={() => removeArrayItem('contacts', index)} className="p-2 text-red-500 hover:text-red-700"><TrashIcon/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                         <button type="button" onClick={() => addArrayItem('contacts')} className="mt-2 flex items-center gap-1 text-sm font-semibold text-brand-primary hover:underline"><PlusIcon /> Add Contact</button>
                    </div>
                </div>
                 <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                    <button onClick={onCancel} className="px-4 py-2 rounded-lg bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">Cancel</button>
                    <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-primary text-white font-semibold hover:bg-opacity-90 transition-colors"><SaveIcon /> Save Changes</button>
                </div>
            </div>
        );
    }


    const { documents, contacts, management } = property;
    const manager = contacts?.find(c => c.role.toLowerCase().includes('manager'));

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-3"><PaperClipIcon /> Details</h2>
                <button
                    onClick={onSetEditing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/50 text-sm font-semibold text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                    <EditIcon />
                    <span>Add/Edit</span>
                </button>
            </div>
            <div className="p-6 space-y-6">
                 <div>
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-gray-300 mb-3 uppercase tracking-wider"><UserGroupIcon /> Management</h3>
                     <div className="space-y-1 text-sm">
                        <p><span className="font-semibold text-slate-600 dark:text-gray-300">Agent: </span><span className="text-slate-500 dark:text-gray-400">{management?.agent || 'N/A'}</span></p>
                        <p><span className="font-semibold text-slate-600 dark:text-gray-300">Contact: </span><span className="text-slate-500 dark:text-gray-400">{management?.managerContact || 'N/A'}</span></p>
                        <p><span className="font-semibold text-slate-600 dark:text-gray-300">Agreement: </span><span className="text-slate-500 dark:text-gray-400">{management?.agreementDetails || 'N/A'}</span></p>
                    </div>
                </div>

                <div className="pt-6 border-t border-slate-200 dark:border-slate-600">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-gray-300 mb-3 uppercase tracking-wider"><DocumentTextIcon /> Documents</h3>
                    <div className="space-y-2">
                        {documents && documents.length > 0 ? documents.map(doc => (
                            <button type="button" key={doc.name} onClick={() => openDocument(doc)} className="w-full flex justify-between items-center p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors group text-left">
                                <span className="text-sm font-medium text-brand-primary dark:text-brand-secondary truncate">{doc.name}</span>
                                <ChevronRightIcon className="text-slate-400 group-hover:text-brand-primary" />
                            </button>
                        )) : <p className="text-sm text-slate-500 dark:text-gray-400 p-2">No documents uploaded.</p>}
                    </div>
                </div>

                 <div className="pt-6 border-t border-slate-200 dark:border-slate-600">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-gray-300 mb-3 uppercase tracking-wider"><UserGroupIcon /> Contacts</h3>
                     <div className="space-y-3">
                         {contacts && contacts.length > 0 ? contacts.map(contact => (
                            <div key={contact.role} className="text-sm">
                                <p className="font-semibold text-slate-700 dark:text-slate-200">{contact.role}</p>
                                <p className="text-slate-500 dark:text-gray-400">{contact.name} - <span className="text-brand-primary dark:text-brand-secondary">{contact.contact}</span></p>
                            </div>
                         )) : <p className="text-sm text-slate-500 dark:text-gray-400">No contacts available.</p>}
                     </div>
                </div>

                <div className="pt-6 border-t border-slate-200 dark:border-slate-600">
                     <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-gray-300 mb-3 uppercase tracking-wider"><LightningBoltIcon /> Quick Actions</h3>
                    <div className="space-y-2">
                         <button className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-gray-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                             <DocumentTextIcon /> Download All Documents
                         </button>
                         {manager && <a href={`mailto:${manager.contact}`} className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-gray-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                             <AtSymbolIcon /> Email Property Manager
                         </a>}
                         <button className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-gray-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                             <PhoneIcon /> Request Maintenance
                         </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DocumentsContactsSection;