import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { InvoiceInfo, Document } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface EditInvoiceModalProps {
    invoice: InvoiceInfo;
    onSave: (invoice: InvoiceInfo) => void;
    onClose: () => void;
    allGroups: string[];
    onGroupsChange: (groups: string[]) => void;
    allLocations: string[];
}

const PlusIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>);
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.134H8.09a2.09 2.09 0 0 0-2.09 2.134v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>;
const DocumentTextIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>;

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition" />;
const Label = (props: React.LabelHTMLAttributes<HTMLLabelElement>) => <label {...props} className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-1" />;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

const EditInvoiceModal: React.FC<EditInvoiceModalProps> = ({ invoice, onSave, onClose, allGroups, onGroupsChange, allLocations }) => {
    const [formData, setFormData] = useState<InvoiceInfo>(invoice);
    const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set(invoice.groups || []));
    const [newGroup, setNewGroup] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [filePreviewName, setFilePreviewName] = useState<string | null>(invoice.document?.name || null);
    const mouseDownTarget = useRef<EventTarget | null>(null);

    useEffect(() => {
        setFormData(invoice);
        setSelectedGroups(new Set(invoice.groups || []));
        setFile(null);
        setFilePreviewName(invoice.document?.name || null);
    }, [invoice]);
    
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

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value === '' ? 0 : parseFloat(value) }));
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
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl m-4 border border-slate-200 dark:border-slate-700 flex flex-col">
                <form onSubmit={handleSave} className="flex flex-col h-full">
                    <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{invoice.id ? 'Edit Purchase Invoice' : 'New Purchase Invoice'}</h2>
                    </div>

                    <div className="p-6 space-y-4 flex-grow overflow-y-auto" style={{ maxHeight: '75vh' }}>
                        <div><Label htmlFor="description">Item/Service Description</Label><Input id="description" name="description" value={formData.description} onChange={handleInputChange} required /></div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><Label htmlFor="purchaseDate">Purchase Date</Label><Input id="purchaseDate" type="date" name="purchaseDate" value={formData.purchaseDate} onChange={handleInputChange} required /></div>
                            <div><Label htmlFor="amount">Amount (£)</Label><Input id="amount" type="number" name="amount" value={formData.amount} onChange={handleNumberChange} step="0.01" required /></div>
                        </div>

                        <div>
                            <Label>Invoice PDF</Label>
                            {filePreviewName ? (
                                <div className="flex items-center justify-between w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <DocumentTextIcon />
                                        <span className="text-sm font-medium text-slate-700 dark:text-gray-200 truncate">{filePreviewName}</span>
                                    </div>
                                    <button type="button" onClick={handleRemoveFile} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50"><TrashIcon /></button>
                                </div>
                            ) : (
                                 <Input id="invoice-pdf" type="file" accept="application/pdf" onChange={handleFileChange} />
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label>Category</Label>
                                <div className="flex gap-2 mb-3">
                                    <Input type="text" value={newGroup} onChange={(e) => setNewGroup(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddGroup())} placeholder="Create new category" />
                                    <button type="button" onClick={handleAddGroup} className="px-4 py-2 rounded-lg bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors flex items-center gap-1"><PlusIcon/> Add</button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 max-h-40 overflow-y-auto p-3 bg-slate-100 dark:bg-slate-900/50 rounded-lg">
                                    {allGroups.sort().map(group => (
                                        <label key={group} className="flex items-center space-x-2 cursor-pointer">
                                            <input type="checkbox" checked={selectedGroups.has(group)} onChange={() => toggleGroup(group)} className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-secondary" />
                                            <span className="text-sm text-slate-700 dark:text-gray-300">{group}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                             <div>
                                <Label htmlFor="location">Deduction Location</Label>
                                <select id="location" name="location" value={formData.location || ''} onChange={handleInputChange} className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition">
                                    <option value="">Select...</option>
                                    {allLocations.map(loc => (
                                        <option key={loc} value={loc}>{loc}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end space-x-3 rounded-b-xl mt-auto">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">Cancel</button>
                        <button type="submit" className="px-4 py-2 rounded-lg bg-brand-primary text-white font-semibold hover:bg-opacity-90 transition-colors">Save Invoice</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditInvoiceModal;