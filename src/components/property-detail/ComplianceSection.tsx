

import React, { useState, useEffect } from 'react';
import type { PropertyInfo, EicrCheck, GasSafetyCheck, InsurancePolicyRecord, Document } from '../../types';
import { ShieldCheckIcon, EditIcon, SaveIcon, LightningBoltIcon, FireIcon, DocumentTextIcon, ChevronRightIcon, TrashIcon, PlusIcon } from './Icons';
import { v4 as uuidv4 } from 'uuid';

interface ComplianceSectionProps {
    property: PropertyInfo;
    isEditing: boolean;
    onSetEditing: () => void;
    onSave: (property: PropertyInfo) => void;
    onCancel: () => void;
}

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition" />
);

const Label: React.FC<{ htmlFor?: string, children: React.ReactNode }> = ({ htmlFor, children }) => (
    <label htmlFor={htmlFor} className="block text-xs font-medium text-slate-600 dark:text-gray-300 mb-1">{children}</label>
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

const ComplianceSection: React.FC<ComplianceSectionProps> = ({ property, isEditing, onSetEditing, onSave, onCancel }) => {
    const [editedData, setEditedData] = useState<PropertyInfo>(property);

    useEffect(() => {
        if (isEditing) {
            setEditedData(JSON.parse(JSON.stringify(property)));
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

    const handleSave = () => {
        onSave(editedData);
    };
    
    const commonInputChange = (e: React.ChangeEvent<HTMLInputElement>) => handleNestedChange(e.target.name, e.target.value);
    
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

    // EICR Handlers
    const handleEicrCheckChange = (id: string, value: string) => handleNestedChange(`operations.compliance.eicr.checks`, (editedData.operations?.compliance?.eicr?.checks || []).map(c => c.id === id ? { ...c, date: value } : c));
    const addEicrCheck = () => handleNestedChange('operations.compliance.eicr.checks', [{ id: uuidv4(), date: new Date().toISOString().split('T')[0] }, ...(editedData.operations?.compliance?.eicr?.checks || [])]);
    const removeEicrCheck = (id: string) => handleNestedChange('operations.compliance.eicr.checks', (editedData.operations?.compliance?.eicr?.checks || []).filter(c => c.id !== id));
    const handleEicrFileChange = async (e: React.ChangeEvent<HTMLInputElement>, checkId: string) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const base64Data = arrayBufferToBase64(await file.arrayBuffer());
            const newDoc = { name: file.name, url: '#', data: base64Data, mimeType: file.type };
            handleNestedChange('operations.compliance.eicr.checks', (editedData.operations?.compliance?.eicr?.checks || []).map(c => c.id === checkId ? { ...c, document: newDoc } : c));
        }
    };
    
    // Gas Safety Handlers
    const handleGasCheckChange = (id: string, value: string) => handleNestedChange(`operations.compliance.gasSafety.checks`, (editedData.operations?.compliance?.gasSafety?.checks || []).map(c => c.id === id ? { ...c, date: value } : c));
    const addGasCheck = () => handleNestedChange('operations.compliance.gasSafety.checks', [{ id: uuidv4(), date: new Date().toISOString().split('T')[0] }, ...(editedData.operations?.compliance?.gasSafety?.checks || [])]);
    const removeGasCheck = (id: string) => handleNestedChange('operations.compliance.gasSafety.checks', (editedData.operations?.compliance?.gasSafety?.checks || []).filter(c => c.id !== id));
    const handleGasFileChange = async (e: React.ChangeEvent<HTMLInputElement>, checkId: string) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const base64Data = arrayBufferToBase64(await file.arrayBuffer());
            const newDoc = { name: file.name, url: '#', data: base64Data, mimeType: file.type };
            handleNestedChange('operations.compliance.gasSafety.checks', (editedData.operations?.compliance?.gasSafety?.checks || []).map(c => c.id === checkId ? { ...c, document: newDoc } : c));
        }
    };

    // Insurance Handlers
    const handleInsurancePolicyChange = (id: string, field: 'startDate' | 'endDate', value: string) => handleNestedChange(`operations.compliance.insurance.policies`, (editedData.operations?.compliance?.insurance?.policies || []).map(p => p.id === id ? { ...p, [field]: value } : p));
    const addInsurancePolicy = () => handleNestedChange('operations.compliance.insurance.policies', [{ id: uuidv4(), startDate: new Date().toISOString().split('T')[0], endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0] }, ...(editedData.operations?.compliance?.insurance?.policies || [])]);
    const removeInsurancePolicy = (id: string) => handleNestedChange('operations.compliance.insurance.policies', (editedData.operations?.compliance?.insurance?.policies || []).filter(p => p.id !== id));
    const handleInsuranceFileChange = async (e: React.ChangeEvent<HTMLInputElement>, policyId: string) => {
         if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const base64Data = arrayBufferToBase64(await file.arrayBuffer());
            const newDoc = { name: file.name, url: '#', data: base64Data, mimeType: file.type };
            handleNestedChange('operations.compliance.insurance.policies', (editedData.operations?.compliance?.insurance?.policies || []).map(p => p.id === policyId ? { ...p, document: newDoc } : p));
        }
    };


    if (isEditing) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-brand-primary/50 dark:border-brand-secondary/50">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold flex items-center gap-3"><ShieldCheckIcon /> Editing Compliance</h2>
                </div>
                <div className="p-6 space-y-6">
                    {/* EICR Edit Section */}
                    <div className="space-y-2">
                        <h4 className="font-semibold flex items-center gap-2"><LightningBoltIcon/> EICR</h4>
                        <Label>Next Due Date</Label>
                        <Input type="date" name="operations.compliance.eicr.next" value={editedData.operations?.compliance?.eicr?.next || ''} onChange={commonInputChange} />
                        <Label>Certificate History</Label>
                        {(editedData.operations?.compliance?.eicr?.checks || []).map((check, index) => (
                            <div key={check.id} className="flex items-center gap-2">
                                <Input type="date" value={check.date} onChange={(e) => handleEicrCheckChange(check.id, e.target.value)} className="w-1/3" />
                                <input type="file" id={`eicr-file-${index}`} className="hidden" onChange={(e) => handleEicrFileChange(e, check.id)} accept=".pdf" />
                                <label htmlFor={`eicr-file-${index}`} className="flex-grow text-center cursor-pointer p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg text-sm truncate">{check.document?.name || "Upload PDF"}</label>
                                <button type="button" onClick={() => removeEicrCheck(check.id)} className="p-2 text-red-500 hover:text-red-700"><TrashIcon /></button>
                            </div>
                        ))}
                        <button type="button" onClick={addEicrCheck} className="mt-2 flex items-center gap-1 text-sm font-semibold text-brand-primary hover:underline"><PlusIcon /> Add Certificate</button>
                    </div>

                    {/* Gas Safety Edit Section */}
                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
                        <h4 className="font-semibold flex items-center gap-2"><FireIcon/> Gas Safety</h4>
                        <Label>Next Due Date</Label>
                        <Input type="date" name="operations.compliance.gasSafety.next" value={editedData.operations?.compliance?.gasSafety?.next || ''} onChange={commonInputChange} />
                        <Label>Certificate History</Label>
                         {(editedData.operations?.compliance?.gasSafety?.checks || []).map((check, index) => (
                            <div key={check.id} className="flex items-center gap-2">
                                <Input type="date" value={check.date} onChange={(e) => handleGasCheckChange(check.id, e.target.value)} className="w-1/3" />
                                <input type="file" id={`gas-file-${index}`} className="hidden" onChange={(e) => handleGasFileChange(e, check.id)} accept=".pdf" />
                                <label htmlFor={`gas-file-${index}`} className="flex-grow text-center cursor-pointer p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg text-sm truncate">{check.document?.name || "Upload PDF"}</label>
                                <button type="button" onClick={() => removeGasCheck(check.id)} className="p-2 text-red-500 hover:text-red-700"><TrashIcon /></button>
                            </div>
                        ))}
                        <button type="button" onClick={addGasCheck} className="mt-2 flex items-center gap-1 text-sm font-semibold text-brand-primary hover:underline"><PlusIcon /> Add Certificate</button>
                    </div>

                    {/* Insurance Edit Section */}
                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
                        <h4 className="font-semibold flex items-center gap-2"><ShieldCheckIcon/> Insurance</h4>
                        <Label>Policy History</Label>
                        {(editedData.operations?.compliance?.insurance?.policies || []).map((policy, index) => (
                            <div key={policy.id} className="p-2 border border-slate-200 dark:border-slate-600 rounded-lg space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <div><Label>Start Date</Label><Input type="date" value={policy.startDate} onChange={(e) => handleInsurancePolicyChange(policy.id, 'startDate', e.target.value)} /></div>
                                    <div><Label>End Date</Label><Input type="date" value={policy.endDate} onChange={(e) => handleInsurancePolicyChange(policy.id, 'endDate', e.target.value)} /></div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input type="file" id={`ins-file-${index}`} className="hidden" onChange={(e) => handleInsuranceFileChange(e, policy.id)} accept=".pdf" />
                                    <label htmlFor={`ins-file-${index}`} className="flex-grow text-center cursor-pointer p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg text-sm truncate">{policy.document?.name || "Upload PDF"}</label>
                                    <button type="button" onClick={() => removeInsurancePolicy(policy.id)} className="p-2 text-red-500 hover:text-red-700"><TrashIcon /></button>
                                </div>
                            </div>
                        ))}
                        <button type="button" onClick={addInsurancePolicy} className="mt-2 flex items-center gap-1 text-sm font-semibold text-brand-primary hover:underline"><PlusIcon /> Add Policy</button>
                    </div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                    <button onClick={onCancel} className="px-4 py-2 rounded-lg bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">Cancel</button>
                    <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-primary text-white font-semibold hover:bg-opacity-90 transition-colors"><SaveIcon /> Save Changes</button>
                </div>
            </div>
        );
    }
    
    const { compliance } = property.operations || {};
    const sortedEicr = (compliance?.eicr?.checks || []).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const sortedGas = (compliance?.gasSafety?.checks || []).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const sortedInsurance = (compliance?.insurance?.policies || []).sort((a,b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
    const latestInsuranceExpiry = sortedInsurance[0]?.endDate;

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-3"><ShieldCheckIcon /> Compliance</h2>
                <button onClick={onSetEditing} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/50 text-sm font-semibold text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"><EditIcon /><span>Edit</span></button>
            </div>
            <div className="p-6 divide-y divide-slate-100 dark:divide-slate-700">
                {/* EICR */}
                <div className="py-4 first:pt-0 last:pb-0">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2"><LightningBoltIcon /> EICR</p>
                    <div className="mt-2 text-xs text-slate-500 dark:text-gray-400">Next Due: <span className="text-sm font-medium text-slate-600 dark:text-gray-300">{formatDate(compliance?.eicr?.next) || 'N/A'}</span></div>
                    {sortedEicr.length > 0 && <details className="mt-2 text-sm"><summary className="cursor-pointer text-xs text-slate-500 dark:text-gray-400 hover:underline">View History</summary><div className="space-y-1 mt-2">{sortedEicr.map(check => (<a key={check.id} href={getDocumentUrl(check.document)} target="_blank" rel="noopener noreferrer" className="flex justify-between items-center p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 group"><div className="flex items-center gap-2"><DocumentTextIcon /><span className="font-medium text-brand-primary dark:text-brand-secondary truncate">{check.document?.name || formatDate(check.date)}</span></div><ChevronRightIcon className="text-slate-400 group-hover:text-brand-primary" /></a>))}</div></details>}
                </div>
                {/* Gas Safety */}
                <div className="py-4 first:pt-0 last:pb-0">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2"><FireIcon /> Gas Safety</p>
                    <div className="mt-2 text-xs text-slate-500 dark:text-gray-400">Next Due: <span className="text-sm font-medium text-slate-600 dark:text-gray-300">{formatDate(compliance?.gasSafety?.next) || 'N/A'}</span></div>
                    {sortedGas.length > 0 && <details className="mt-2 text-sm"><summary className="cursor-pointer text-xs text-slate-500 dark:text-gray-400 hover:underline">View History</summary><div className="space-y-1 mt-2">{sortedGas.map(check => (<a key={check.id} href={getDocumentUrl(check.document)} target="_blank" rel="noopener noreferrer" className="flex justify-between items-center p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 group"><div className="flex items-center gap-2"><DocumentTextIcon /><span className="font-medium text-brand-primary dark:text-brand-secondary truncate">{check.document?.name || formatDate(check.date)}</span></div><ChevronRightIcon className="text-slate-400 group-hover:text-brand-primary" /></a>))}</div></details>}
                </div>
                {/* Insurance */}
                <div className="py-4 first:pt-0 last:pb-0">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2"><ShieldCheckIcon /> Insurance</p>
                    <div className="mt-2 text-xs text-slate-500 dark:text-gray-400">Next Expiry: <span className="text-sm font-medium text-slate-600 dark:text-gray-300">{formatDate(latestInsuranceExpiry) || 'N/A'}</span></div>
                    {sortedInsurance.length > 0 && <details className="mt-2 text-sm"><summary className="cursor-pointer text-xs text-slate-500 dark:text-gray-400 hover:underline">View History</summary><div className="space-y-1 mt-2">{sortedInsurance.map(policy => (<a key={policy.id} href={getDocumentUrl(policy.document)} target="_blank" rel="noopener noreferrer" className="flex justify-between items-center p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 group"><div className="flex items-center gap-2"><DocumentTextIcon /><span className="font-medium text-brand-primary dark:text-brand-secondary truncate">{policy.document?.name || `${formatDate(policy.startDate)} - ${formatDate(policy.endDate)}`}</span></div><ChevronRightIcon className="text-slate-400 group-hover:text-brand-primary" /></a>))}</div></details>}
                </div>
            </div>
        </div>
    );
};

export default ComplianceSection;
