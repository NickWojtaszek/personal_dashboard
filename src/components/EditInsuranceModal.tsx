
import React, { useState, useEffect, useRef } from 'react';
import type { InsuranceInfo, Document } from '../types';

interface EditInsuranceModalProps {
    policy: InsuranceInfo;
    onSave: (policy: InsuranceInfo) => void;
    onClose: () => void;
    allGroups: string[];
    onGroupsChange: (groups: string[]) => void;
}

const PlusIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>);
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.134H8.09a2.09 2.09 0 0 0-2.09 2.134v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>;
const DocumentTextIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>;

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
    <input {...props} className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition" />
);
const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => (
    <textarea {...props} className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition" />
);
const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
    <select {...props} className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition" />
);
const Label: React.FC<{ htmlFor?: string, children: React.ReactNode }> = ({ htmlFor, children }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-1">{children}</label>
);

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

const EditInsuranceModal: React.FC<EditInsuranceModalProps> = ({ policy, onSave, onClose, allGroups, onGroupsChange }) => {
    const [formData, setFormData] = useState(policy);
    const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set(policy.groups || []));
    const [newGroup, setNewGroup] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [filePreviewName, setFilePreviewName] = useState<string | null>(policy.document?.name || null);
    const mouseDownTarget = useRef<EventTarget | null>(null);
    
    useEffect(() => {
        setFormData(policy);
        setSelectedGroups(new Set(policy.groups || []));
        setFile(null);
        setFilePreviewName(policy.document?.name || null);
    }, [policy]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value === '' ? undefined : parseFloat(value) }));
    };

    const toggleGroup = (group: string) => {
        setSelectedGroups(prev => {
            const newSet = new Set(prev);
            if (newSet.has(group)) {
                newSet.delete(group);
            } else {
                newSet.add(group);
            }
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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (selectedFile.type === 'application/pdf') {
                setFile(selectedFile);
                setFilePreviewName(selectedFile.name);
            } else {
                alert('Please select a PDF file.');
                e.target.value = ''; // Reset file input
            }
        }
    };

    const handleRemoveFile = () => {
        setFile(null);
        setFilePreviewName(null);
        setFormData(prev => ({...prev, document: undefined}));
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        
        let documentData = formData.document;
        if (file) {
            const arrayBuffer = await file.arrayBuffer();
            const base64Data = arrayBufferToBase64(arrayBuffer);
            documentData = {
                name: file.name,
                url: '#',
                data: base64Data,
                mimeType: file.type,
            };
        } else if (!filePreviewName) {
            documentData = undefined;
        }

        onSave({
            ...formData,
            document: documentData,
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
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-3xl m-4 border border-slate-200 dark:border-slate-700">
                <form onSubmit={handleSave}>
                    <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{policy.name ? 'Edit Policy' : 'New Policy'}</h2>
                    </div>
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        <div><Label htmlFor="name">Policy Name</Label><Input type="text" name="name" value={formData.name} onChange={handleInputChange} required /></div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div><Label htmlFor="provider">Provider</Label><Input type="text" name="provider" value={formData.provider} onChange={handleInputChange} required /></div>
                            <div><Label htmlFor="policyType">Policy Type</Label><Input type="text" name="policyType" value={formData.policyType || ''} onChange={handleInputChange} /></div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div><Label htmlFor="policyNumber">Policy Number</Label><Input type="text" name="policyNumber" value={formData.policyNumber || ''} onChange={handleInputChange} /></div>
                            <div><Label htmlFor="policyholder">Policyholder Name</Label><Input type="text" name="policyholder" value={formData.policyholder || ''} onChange={handleInputChange} /></div>
                        </div>

                        <div className="pt-2">
                            <h3 className="text-lg font-semibold mb-2 text-slate-700 dark:text-gray-300">Financials & Coverage</h3>
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="premiumAmount">Premium Amount</Label>
                                    <Input type="number" name="premiumAmount" value={formData.premiumAmount || ''} onChange={handleNumberChange} step="0.01" />
                                </div>
                                <div>
                                    <Label htmlFor="paymentFrequency">Payment Frequency</Label>
                                    <Select name="paymentFrequency" value={formData.paymentFrequency || ''} onChange={handleInputChange}>
                                        <option value="">Select...</option>
                                        <option value="Monthly">Monthly</option>
                                        <option value="Annually">Annually</option>
                                        <option value="Other">Other</option>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                <div><Label htmlFor="coverageAmount">Coverage Amount</Label><Input type="number" name="coverageAmount" value={formData.coverageAmount || ''} onChange={handleNumberChange} step="1" /></div>
                                <div><Label htmlFor="deductible">Deductible/Excess</Label><Input type="number" name="deductible" value={formData.deductible || ''} onChange={handleNumberChange} step="1" /></div>
                            </div>
                        </div>

                         <div className="pt-2">
                            <h3 className="text-lg font-semibold mb-2 text-slate-700 dark:text-gray-300">Dates & Status</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="status">Policy Status</Label>
                                    <Select name="status" value={formData.status || ''} onChange={handleInputChange}>
                                        <option value="Pending">Pending</option>
                                        <option value="Active">Active</option>
                                        <option value="Expired">Expired</option>
                                    </Select>
                                </div>
                                <div><Label htmlFor="contactNumber">Insurer Contact Number</Label><Input type="tel" name="contactNumber" value={formData.contactNumber || ''} onChange={handleInputChange} /></div>

                            </div>
                             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                                <div><Label htmlFor="startDate">Start Date</Label><Input type="date" name="startDate" value={formData.startDate || ''} onChange={handleInputChange} /></div>
                                <div><Label htmlFor="endDate">End Date</Label><Input type="date" name="endDate" value={formData.endDate || ''} onChange={handleInputChange} /></div>
                                <div><Label htmlFor="renewalDate">Renewal Date</Label><Input type="text" name="renewalDate" value={formData.renewalDate || ''} onChange={handleInputChange} placeholder="e.g., Mar 2025" /></div>
                                <div><Label htmlFor="lastReviewed">Last Reviewed</Label><Input type="date" name="lastReviewed" value={formData.lastReviewed || ''} onChange={handleInputChange} /></div>
                            </div>
                        </div>

                        <div className="pt-2">
                            <h3 className="text-lg font-semibold mb-2 text-slate-700 dark:text-gray-300">Details & Notes</h3>
                            <div><Label htmlFor="coverageSummary">Key Coverage Summary</Label><Textarea name="coverageSummary" value={formData.coverageSummary || ''} onChange={handleInputChange} rows={3} /></div>
                            <div className="mt-4"><Label htmlFor="notes">Notes</Label><Textarea name="notes" value={formData.notes || ''} onChange={handleInputChange} rows={3} /></div>
                            <div className="mt-4">
                                <Label>Policy PDF</Label>
                                {filePreviewName ? (
                                    <div className="flex items-center justify-between w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <DocumentTextIcon />
                                            <span className="text-sm font-medium text-slate-700 dark:text-gray-200 truncate">{filePreviewName}</span>
                                        </div>
                                        <button type="button" onClick={handleRemoveFile} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50"><TrashIcon /></button>
                                    </div>
                                ) : (
                                    <Input id="policy-pdf" type="file" accept="application/pdf" onChange={handleFileChange} />
                                )}
                            </div>
                        </div>

                        <div>
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

export default EditInsuranceModal;