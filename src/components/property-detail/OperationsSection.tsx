

import React, { useState, useEffect } from 'react';
import type { PropertyInfo, TenancyAgreement, Document } from '../../types';
import { UsersIcon, EditIcon, SaveIcon, DocumentTextIcon, TrashIcon, PlusIcon, DocumentDuplicateIcon } from './Icons';
import { v4 as uuidv4 } from 'uuid';
import { openDocument } from '../../lib/openDocument';
import { getPolicyProgress, type ProgressStatus } from '../insurance-detail/policyUtils';

const statusColors: Record<ProgressStatus, string> = { green: 'bg-green-500', yellow: 'bg-yellow-500', orange: 'bg-orange-500', red: 'bg-red-500', expired: 'bg-red-700' };
const statusBgColors: Record<ProgressStatus, string> = { green: 'bg-green-500/20', yellow: 'bg-yellow-500/20', orange: 'bg-orange-500/20', red: 'bg-red-500/20', expired: 'bg-red-700/20' };
const statusTextColors: Record<ProgressStatus, string> = { green: 'text-green-600 dark:text-green-400', yellow: 'text-yellow-600 dark:text-yellow-400', orange: 'text-orange-600 dark:text-orange-400', red: 'text-red-600 dark:text-red-400', expired: 'text-red-700 dark:text-red-400' };

const TimeBar: React.FC<{ startDate?: string; endDate?: string; label?: string }> = ({ startDate, endDate, label }) => {
    const progress = getPolicyProgress(startDate, endDate);
    if (!progress) return null;
    const { percentage, daysRemaining, status } = progress;
    const text = label || (status === 'expired' ? 'Lease expired' : `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`);
    return (
        <div className="mt-2 space-y-1">
            <div className={`w-full rounded-full h-1.5 ${statusBgColors[status]}`}>
                <div className={`h-1.5 rounded-full transition-all duration-500 ${statusColors[status]}`} style={{ width: `${percentage}%` }} />
            </div>
            <p className={`text-xs font-medium ${statusTextColors[status]}`}>{text}</p>
        </div>
    );
};

interface OperationsSectionProps {
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
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

const OperationsSection: React.FC<OperationsSectionProps> = ({ property, isEditing, onSetEditing, onSave, onCancel }) => {
    const [editedAgreements, setEditedAgreements] = useState<TenancyAgreement[]>([]);

    useEffect(() => {
        if (isEditing) {
            setEditedAgreements(property.operations?.tenancy?.agreements || []);
        }
    }, [property, isEditing]);

    const handleSave = () => {
        const updatedProperty = {
            ...property,
            operations: {
                ...property.operations,
                tenancy: {
                    ...property.operations?.tenancy,
                    agreements: editedAgreements,
                }
            }
        };
        onSave(updatedProperty);
    };

    const handleAgreementChange = (id: string, field: 'leaseStart' | 'leaseEnd', value: string) => {
        setEditedAgreements(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
    };

    const addAgreement = () => {
        const newAgreement: TenancyAgreement = {
            id: uuidv4(),
            leaseStart: new Date().toISOString().split('T')[0],
            leaseEnd: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
        };
        setEditedAgreements(prev => [newAgreement, ...prev]);
    };

    const removeAgreement = (id: string) => {
        setEditedAgreements(prev => prev.filter(a => a.id !== id));
    };
    
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, agreementId: string) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.type === 'application/pdf') {
                const arrayBuffer = await file.arrayBuffer();
                const base64Data = arrayBufferToBase64(arrayBuffer);
                const newDocument: Document = { name: file.name, url: '#', data: base64Data, mimeType: file.type };
                setEditedAgreements(prev => prev.map(a => a.id === agreementId ? { ...a, document: newDocument } : a));
            } else {
                alert('Please upload a valid PDF file.');
            }
        }
    };
    
    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    if (isEditing) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-brand-primary/50 dark:border-brand-secondary/50">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold flex items-center gap-3"><DocumentDuplicateIcon /> Editing Tenancy</h2>
                </div>
                <div className="p-6 space-y-4">
                     {(editedAgreements || []).sort((a,b) => new Date(b.leaseStart).getTime() - new Date(a.leaseStart).getTime()).map((agreement, index) => (
                        <div key={agreement.id} className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg space-y-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <Input type="date" value={agreement.leaseStart} onChange={(e) => handleAgreementChange(agreement.id, 'leaseStart', e.target.value)} />
                                <Input type="date" value={agreement.leaseEnd} onChange={(e) => handleAgreementChange(agreement.id, 'leaseEnd', e.target.value)} />
                            </div>
                            <div className="flex items-center gap-2">
                                 {agreement.document ? (
                                    <div className="flex-grow flex items-center gap-2 p-2 bg-slate-200 dark:bg-slate-600 rounded-lg text-sm">
                                        <DocumentTextIcon />
                                        <span className="truncate">{agreement.document.name}</span>
                                    </div>
                                ) : (
                                    <div className="flex-grow">
                                        <input type="file" id={`tenancy-file-${index}`} className="hidden" onChange={(e) => handleFileChange(e, agreement.id)} accept="application/pdf" />
                                        <label htmlFor={`tenancy-file-${index}`} className="w-full text-center cursor-pointer p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg text-sm block">
                                            Upload Agreement PDF
                                        </label>
                                    </div>
                                )}
                                <button type="button" onClick={() => removeAgreement(agreement.id)} className="p-2 text-red-500 hover:text-red-700"><TrashIcon /></button>
                            </div>
                        </div>
                    ))}
                    <button type="button" onClick={addAgreement} className="mt-2 flex items-center gap-1 text-sm font-semibold text-brand-primary hover:underline"><PlusIcon /> Add Agreement</button>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                    <button onClick={onCancel} className="px-4 py-2 rounded-lg bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">Cancel</button>
                    <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-primary text-white font-semibold hover:bg-opacity-90 transition-colors"><SaveIcon /> Save Changes</button>
                </div>
            </div>
        );
    }
    
    const agreements = (property.operations?.tenancy?.agreements || []).sort((a,b) => new Date(b.leaseEnd).getTime() - new Date(a.leaseEnd).getTime());
    const today = new Date();
    const currentAgreement = agreements.find(a => new Date(a.leaseStart) <= today && new Date(a.leaseEnd) >= today);
    const pastAgreements = agreements.filter(a => new Date(a.leaseEnd) < today && a.id !== currentAgreement?.id);
    const futureAgreements = agreements.filter(a => new Date(a.leaseStart) > today && a.id !== currentAgreement?.id);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-3"><DocumentDuplicateIcon /> Tenancy</h2>
                <button
                    onClick={onSetEditing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/50 text-sm font-semibold text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                    <EditIcon />
                    <span>Edit</span>
                </button>
            </div>
            <div className="p-6 space-y-4">
                {currentAgreement ? (
                    <div>
                        <h3 className="text-sm font-semibold text-slate-600 dark:text-gray-300 mb-2 uppercase tracking-wider">Current Agreement</h3>
                        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-slate-500 dark:text-gray-400">Lease Start</p>
                                    <p className="text-sm font-medium">{formatDate(currentAgreement.leaseStart)}</p>
                                </div>
                                 <div>
                                    <p className="text-xs text-slate-500 dark:text-gray-400">Lease End</p>
                                    <p className="text-sm font-medium">{formatDate(currentAgreement.leaseEnd)}</p>
                                </div>
                            </div>
                            <TimeBar startDate={currentAgreement.leaseStart} endDate={currentAgreement.leaseEnd} />
                            {currentAgreement.document && (
                                <div className="mt-3 flex items-center gap-2 px-3 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
                                    <DocumentTextIcon />
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate flex-1">{currentAgreement.document.name}</span>
                                    <button type="button" onClick={() => openDocument(currentAgreement.document!)} className="px-2.5 py-1.5 text-xs rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors flex items-center gap-1 flex-shrink-0">
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/></svg>
                                        View
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ) : <p className="text-sm text-slate-500 dark:text-gray-400">No current tenancy agreement found.</p>}

                {(pastAgreements.length > 0 || futureAgreements.length > 0) && (
                    <details>
                        <summary className="cursor-pointer text-sm font-semibold text-slate-600 dark:text-gray-300 hover:underline">View History</summary>
                        <div className="mt-2 space-y-2">
                            {[...futureAgreements, ...pastAgreements].map(agreement => (
                                <div key={agreement.id} className="p-3 rounded-lg bg-slate-50/50 dark:bg-slate-900/30">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div><p className="text-xs text-slate-500 dark:text-gray-400">Start</p><p className="text-sm">{formatDate(agreement.leaseStart)}</p></div>
                                        <div><p className="text-xs text-slate-500 dark:text-gray-400">End</p><p className="text-sm">{formatDate(agreement.leaseEnd)}</p></div>
                                    </div>
                                    {agreement.document && (
                                        <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
                                            <DocumentTextIcon size={14} />
                                            <span className="text-sm text-slate-600 dark:text-slate-300 truncate flex-1">{agreement.document.name}</span>
                                            <button type="button" onClick={() => openDocument(agreement.document!)} className="px-2 py-1 text-xs rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors flex-shrink-0">View</button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </details>
                )}
            </div>
        </div>
    );
};

export default OperationsSection;
