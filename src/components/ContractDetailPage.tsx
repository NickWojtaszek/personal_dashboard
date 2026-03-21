import React, { useState, useCallback } from 'react';
import type { ContractInfo, InsuranceInfo, PropertyCountry } from '../types';
import DocumentsContainer from './DocumentsContainer';
import { getCountryBg, getCountryFlag, currencyToCountry } from '../lib/countryColors';
import { COUNTRY_OPTIONS } from '../lib/countryLabels';
import { openDocument } from '../lib/openDocument';
import { GoogleGenAI } from '@google/genai';
import * as pdfjs from 'pdfjs-dist';

const BackIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>);
const TrashIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>);
const EditIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>);
const SaveIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>);
const DocIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>);

const STATUS_OPTIONS: ContractInfo['status'][] = ['Active', 'Expired', 'Pending', 'Archived'];

interface ContractDetailPageProps {
    contract: ContractInfo;
    allContracts?: ContractInfo[];
    insurancePolicies?: InsuranceInfo[];
    onBack: () => void;
    onSaveContract: (contract: ContractInfo) => void;
    onDeleteContract?: (contractId: string) => void;
    pendingFile?: File | null;
    onPendingFileConsumed?: () => void;
}

const getStatusColor = (status?: string) => {
    switch (status) {
        case 'Active': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
        case 'Expired': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
        case 'Pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
        case 'Archived': return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
        default: return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
    }
};

function daysUntil(dateStr?: string): number | null {
    if (!dateStr) return null;
    return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function contractProgress(start?: string, end?: string): number | null {
    if (!start || !end) return null;
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    if (e <= s) return 100;
    return Math.max(0, Math.min(100, ((Date.now() - s) / (e - s)) * 100));
}

const DetailItem: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
    <div>
        <p className="text-sm text-slate-500 dark:text-gray-400">{label}</p>
        <p className="font-medium text-slate-800 dark:text-gray-200 break-words">{value || 'N/A'}</p>
    </div>
);

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary outline-none transition" />
);

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <label className="block text-xs font-medium text-slate-600 dark:text-gray-300 mb-1">{children}</label>
);

const ContractDetailPage: React.FC<ContractDetailPageProps> = ({
    contract, insurancePolicies, onBack, onSaveContract, onDeleteContract,
}) => {
    const [editingName, setEditingName] = useState(false);
    const [editNameValue, setEditNameValue] = useState('');
    const [isEditingInfo, setIsEditingInfo] = useState(false);
    const [editedData, setEditedData] = useState<ContractInfo>(contract);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [aiFile, setAiFile] = useState<File | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const [aiSuccess, setAiSuccess] = useState<string | null>(null);

    const days = daysUntil(contract.expirationDate);
    const progress = contractProgress(contract.effectiveDate, contract.expirationDate);

    const handleAiExtract = useCallback(async () => {
        if (!aiFile) return;
        setAiLoading(true);
        setAiError(null);
        setAiSuccess(null);
        try {
            const arrayBuffer = await aiFile.arrayBuffer();
            const base64Data = btoa(Array.from(new Uint8Array(arrayBuffer), b => String.fromCharCode(b)).join(''));
            const doc = { name: aiFile.name, url: '#', data: base64Data, mimeType: 'application/pdf' };

            // Extract text from PDF
            const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;
            let pdfText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const pg = await pdf.getPage(i);
                const content = await pg.getTextContent();
                pdfText += (content.items as any[]).map(item => item.str).join(' ') + '\n';
            }

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const prompt = `Extract contract/agreement details from the text below. The document may be in ANY language (English, Polish, German, etc.). Return all values in English.
Rules:
- For company/organization names: keep original names, do not translate.
- For person names: keep original names.
- For "contractType": translate to English (e.g. "umowa o udzielanie świadczeń zdrowotnych" → "Healthcare Services Agreement", "umowa zlecenie" → "Service Contract", "umowa o pracę" → "Employment Contract").
- For "description": provide a concise English summary of what the contract covers.
- Format all dates as YYYY-MM-DD.
- All monetary values must be plain numbers without currency symbols.
- Detect the correct currency (e.g. PLN, GBP, AUD).
- If a field cannot be determined, return null.

Contract text:
${pdfText}`;

            const contractSchema = {
                type: 'OBJECT' as const,
                properties: {
                    contractType: { type: 'STRING' as const, nullable: true },
                    employer: { type: 'STRING' as const, nullable: true, description: 'The organization/company offering the contract' },
                    contractor: { type: 'STRING' as const, nullable: true, description: 'The person/entity providing services' },
                    signedDate: { type: 'STRING' as const, nullable: true },
                    effectiveDate: { type: 'STRING' as const, nullable: true },
                    expirationDate: { type: 'STRING' as const, nullable: true },
                    value: { type: 'NUMBER' as const, nullable: true },
                    currency: { type: 'STRING' as const, nullable: true },
                    paymentTerms: { type: 'STRING' as const, nullable: true },
                    minimumHours: { type: 'NUMBER' as const, nullable: true, description: 'Minimum monthly hours if specified' },
                    description: { type: 'STRING' as const, nullable: true },
                    contactEmail: { type: 'STRING' as const, nullable: true },
                    contactPhone: { type: 'STRING' as const, nullable: true },
                    notes: { type: 'STRING' as const, nullable: true, description: 'Any other important details, translated to English' },
                },
            };

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: { temperature: 0.1, responseMimeType: 'application/json', responseSchema: contractSchema },
            });

            const extracted = JSON.parse(response.text || '{}');
            const updated: ContractInfo = { ...contract };
            if (extracted.contractType) updated.contractType = extracted.contractType;
            if (extracted.employer) updated.employer = extracted.employer;
            if (extracted.contractor) updated.contractor = extracted.contractor;
            if (extracted.signedDate) updated.signedDate = extracted.signedDate;
            if (extracted.effectiveDate) updated.effectiveDate = extracted.effectiveDate;
            if (extracted.expirationDate) updated.expirationDate = extracted.expirationDate;
            if (extracted.value != null) updated.value = extracted.value;
            if (extracted.currency) updated.currency = extracted.currency;
            if (extracted.paymentTerms) updated.paymentTerms = extracted.paymentTerms;
            if (extracted.minimumHours != null) updated.minimumHours = extracted.minimumHours;
            if (extracted.description) updated.description = extracted.description;
            if (extracted.contactEmail) updated.contactEmail = extracted.contactEmail;
            if (extracted.contactPhone) updated.contactPhone = extracted.contactPhone;
            if (extracted.notes) updated.notes = extracted.notes;

            // Auto-name
            if (updated.name === 'New Contract') {
                const parts: string[] = [];
                if (updated.employer) parts.push(updated.employer);
                if (updated.contractType) parts.push(updated.contractType);
                if (parts.length > 0) updated.name = parts.join(' - ');
            }
            // Auto-detect country from currency
            if (!updated.country && updated.currency) {
                const detected = currencyToCountry(updated.currency);
                if (detected) updated.country = detected;
            }
            // Auto-set status
            if (updated.status === 'Pending' && updated.effectiveDate) updated.status = 'Active';

            // Store PDF document
            updated.document = doc;
            updated.documents = [...(updated.documents || []), doc];

            onSaveContract(updated);
            setAiSuccess('Contract details extracted successfully!');
            setAiFile(null);
        } catch (err: any) {
            setAiError(err.message || 'Failed to extract contract details');
        } finally {
            setAiLoading(false);
        }
    }, [aiFile, contract, onSaveContract]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setEditedData(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveInfo = () => {
        onSaveContract({ ...editedData, minimumHours: editedData.minimumHours ? Number(editedData.minimumHours) : undefined, value: editedData.value ? Number(editedData.value) : undefined });
        setIsEditingInfo(false);
    };

    const handleStatusChange = (newStatus: ContractInfo['status']) => {
        onSaveContract({ ...contract, status: newStatus });
    };

    const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A';
    const formatCurrency = (v?: number, c?: string) => {
        if (v == null) return 'N/A';
        const sym = c === 'PLN' ? 'zł' : c === 'GBP' ? '£' : c === 'AUD' ? 'A$' : c === 'USD' ? '$' : (c || '');
        return `${sym}${v.toLocaleString()}`;
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-gray-300 hover:text-brand-primary dark:hover:text-brand-secondary transition-colors">
                    <BackIcon /> Back to Contracts
                </button>
            </div>

            {/* Header */}
            <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 ${getCountryBg(contract.country)}`}>
                <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                    <div>
                        <div className="flex items-center gap-3 flex-wrap">
                            {contract.country && <span className="text-xl">{getCountryFlag(contract.country)}</span>}
                            {editingName ? (
                                <input autoFocus value={editNameValue}
                                    onChange={e => setEditNameValue(e.target.value)}
                                    onBlur={() => { if (editNameValue.trim()) onSaveContract({ ...contract, name: editNameValue.trim() }); setEditingName(false); }}
                                    onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setEditingName(false); }}
                                    className="text-2xl font-bold text-slate-900 dark:text-white bg-transparent border-b-2 border-brand-primary outline-none px-0"
                                />
                            ) : (
                                <h1 className="text-2xl font-bold text-slate-900 dark:text-white cursor-pointer hover:text-brand-primary transition-colors"
                                    onClick={() => { setEditNameValue(contract.name); setEditingName(true); }}
                                    title="Click to rename"
                                >{contract.name}</h1>
                            )}
                            <select value={contract.country || ''} onChange={e => onSaveContract({ ...contract, country: (e.target.value || undefined) as PropertyCountry | undefined })}
                                className="text-xs bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded px-1.5 py-0.5 text-slate-600 dark:text-slate-300 cursor-pointer outline-none" title="Country/region">
                                <option value="">Region</option>
                                {COUNTRY_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                            </select>
                            <select value={contract.status || ''} onChange={e => handleStatusChange(e.target.value as ContractInfo['status'])}
                                className={`px-2 py-0.5 text-xs rounded-full font-medium border-0 cursor-pointer appearance-none pr-5 ${getStatusColor(contract.status)}`}
                                style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 2px center', backgroundRepeat: 'no-repeat', backgroundSize: '16px' }}>
                                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <p className="text-md text-slate-500 dark:text-gray-400 mt-1">
                            {contract.contractType || 'Contract'}
                            {contract.employer && <> &middot; <span className="font-semibold">{contract.employer}</span></>}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {contract.document && (
                            <button onClick={() => openDocument(contract.document!)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                <DocIcon /> View PDF
                            </button>
                        )}
                        {onDeleteContract && (
                            confirmDelete ? (
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xs text-red-600 dark:text-red-400">Delete?</span>
                                    <button onClick={() => onDeleteContract(contract.id)} className="px-2 py-1 text-xs font-medium rounded bg-red-600 text-white hover:bg-red-700">Yes</button>
                                    <button onClick={() => setConfirmDelete(false)} className="px-2 py-1 text-xs font-medium rounded bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-gray-200">No</button>
                                </div>
                            ) : (
                                <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                    <TrashIcon /> Delete
                                </button>
                            )
                        )}
                    </div>
                </div>
            </div>

            {/* AI Extraction */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-brand-primary"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" /></svg>
                    AI Contract Extraction
                </h2>
                <p className="text-sm text-slate-500 dark:text-gray-400 mb-4">Upload a contract PDF and AI will extract all key details automatically.</p>
                <div className="flex flex-col sm:flex-row gap-3">
                    <label className="flex-1 flex items-center justify-center h-16 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                        <div className="text-center">
                            <p className="text-sm text-slate-500"><span className="font-semibold">{aiFile ? aiFile.name : 'Choose PDF'}</span></p>
                        </div>
                        <input type="file" className="hidden" accept=".pdf" onChange={e => { setAiFile(e.target.files?.[0] || null); setAiError(null); setAiSuccess(null); }} />
                    </label>
                    <button
                        onClick={handleAiExtract}
                        disabled={!aiFile || aiLoading}
                        className="px-6 py-3 bg-brand-primary text-white rounded-lg font-semibold text-sm hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {aiLoading ? (
                            <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Extracting...</>
                        ) : 'Extract Details'}
                    </button>
                </div>
                {aiError && <p className="mt-3 text-sm text-red-500">{aiError}</p>}
                {aiSuccess && <p className="mt-3 text-sm text-green-500">{aiSuccess}</p>}
            </div>

            {/* Timeline */}
            {(contract.effectiveDate || contract.expirationDate) && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
                    <h2 className="text-lg font-bold mb-4">Contract Timeline</h2>
                    <div className="space-y-3">
                        {progress !== null && (
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                                <div className={`h-full rounded-full transition-all ${progress >= 90 ? 'bg-red-500' : progress >= 75 ? 'bg-amber-500' : 'bg-blue-500'}`}
                                    style={{ width: `${progress}%` }} />
                            </div>
                        )}
                        <div className="flex justify-between text-sm text-slate-500 dark:text-gray-400">
                            <span>Start: {formatDate(contract.effectiveDate)}</span>
                            <span className={`font-semibold ${days !== null && days <= 30 ? 'text-red-500' : days !== null && days <= 90 ? 'text-amber-500' : ''}`}>
                                {days !== null ? (days > 0 ? `${days} days remaining` : days === 0 ? 'Expires today' : `Expired ${Math.abs(days)} days ago`) : ''}
                            </span>
                            <span>End: {formatDate(contract.expirationDate)}</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-8">
                    {/* Contract Info */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                        <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                            <h2 className="text-lg font-bold">Contract Details</h2>
                            {!isEditingInfo ? (
                                <button onClick={() => { setEditedData(contract); setIsEditingInfo(true); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/50 text-sm font-semibold text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                    <EditIcon /> Edit
                                </button>
                            ) : (
                                <div className="flex gap-2">
                                    <button onClick={() => setIsEditingInfo(false)} className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-600 text-sm text-slate-800 dark:text-white">Cancel</button>
                                    <button onClick={handleSaveInfo} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-primary text-white text-sm font-semibold"><SaveIcon /> Save</button>
                                </div>
                            )}
                        </div>
                        <div className="p-5">
                            {isEditingInfo ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div><Label>Contract Type</Label><Input name="contractType" value={editedData.contractType || ''} onChange={handleInputChange} /></div>
                                    <div><Label>Employer / Client</Label><Input name="employer" value={editedData.employer || ''} onChange={handleInputChange} /></div>
                                    <div><Label>Contractor</Label><Input name="contractor" value={editedData.contractor || ''} onChange={handleInputChange} /></div>
                                    <div><Label>Signed Date</Label><Input name="signedDate" type="date" value={editedData.signedDate || ''} onChange={handleInputChange} /></div>
                                    <div><Label>Effective Date</Label><Input name="effectiveDate" type="date" value={editedData.effectiveDate || ''} onChange={handleInputChange} /></div>
                                    <div><Label>Expiration Date</Label><Input name="expirationDate" type="date" value={editedData.expirationDate || ''} onChange={handleInputChange} /></div>
                                    <div><Label>Value</Label><Input name="value" type="number" value={editedData.value || ''} onChange={handleInputChange} /></div>
                                    <div><Label>Currency</Label>
                                        <select name="currency" value={editedData.currency || ''} onChange={handleInputChange} className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none">
                                            <option value="">Select</option><option value="PLN">PLN</option><option value="GBP">GBP</option><option value="AUD">AUD</option><option value="USD">USD</option><option value="NZD">NZD</option>
                                        </select>
                                    </div>
                                    <div><Label>Payment Terms</Label><Input name="paymentTerms" value={editedData.paymentTerms || ''} onChange={handleInputChange} placeholder="e.g., NFZ pricing, monthly" /></div>
                                    <div><Label>Minimum Hours/Month</Label><Input name="minimumHours" type="number" value={editedData.minimumHours || ''} onChange={handleInputChange} /></div>
                                    <div><Label>Renewal Type</Label>
                                        <select name="renewalType" value={editedData.renewalType || ''} onChange={handleInputChange} className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none">
                                            <option value="">Select</option><option value="Auto">Auto-renew</option><option value="Manual">Manual</option><option value="Fixed">Fixed term</option>
                                        </select>
                                    </div>
                                    <div><Label>Contact Email</Label><Input name="contactEmail" type="email" value={editedData.contactEmail || ''} onChange={handleInputChange} /></div>
                                    <div><Label>Contact Phone</Label><Input name="contactPhone" type="tel" value={editedData.contactPhone || ''} onChange={handleInputChange} /></div>
                                    {insurancePolicies && insurancePolicies.length > 0 && (
                                        <div>
                                            <Label>Linked Insurance Policy</Label>
                                            <select
                                                value={editedData.linkedInsuranceId || ''}
                                                onChange={e => setEditedData(prev => ({ ...prev, linkedInsuranceId: e.target.value || undefined }))}
                                                className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary outline-none transition"
                                            >
                                                <option value="">None</option>
                                                {insurancePolicies.map(p => <option key={p.id} value={p.id}>{p.name} ({p.provider})</option>)}
                                            </select>
                                        </div>
                                    )}
                                    <div className="sm:col-span-2"><Label>Description</Label><textarea name="description" value={editedData.description || ''} onChange={handleInputChange} rows={3} className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary outline-none resize-none" /></div>
                                    <div className="sm:col-span-2"><Label>Notes</Label><textarea name="notes" value={editedData.notes || ''} onChange={handleInputChange} rows={2} className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary outline-none resize-none" /></div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                                    <DetailItem label="Contract Type" value={contract.contractType} />
                                    <DetailItem label="Employer / Client" value={contract.employer} />
                                    <DetailItem label="Contractor" value={contract.contractor} />
                                    <DetailItem label="Signed Date" value={formatDate(contract.signedDate)} />
                                    <DetailItem label="Effective Date" value={formatDate(contract.effectiveDate)} />
                                    <DetailItem label="Expiration Date" value={formatDate(contract.expirationDate)} />
                                    <DetailItem label="Value" value={formatCurrency(contract.value, contract.currency)} />
                                    <DetailItem label="Payment Terms" value={contract.paymentTerms} />
                                    <DetailItem label="Minimum Hours/Month" value={contract.minimumHours?.toString()} />
                                    <DetailItem label="Renewal Type" value={contract.renewalType} />
                                    <DetailItem label="Contact Email" value={contract.contactEmail} />
                                    <DetailItem label="Contact Phone" value={contract.contactPhone} />
                                    <DetailItem label="Linked Insurance" value={contract.linkedInsuranceId ? insurancePolicies?.find(p => p.id === contract.linkedInsuranceId)?.name || 'Unknown' : undefined} />
                                    {contract.description && <div className="sm:col-span-2"><DetailItem label="Description" value={contract.description} /></div>}
                                    {contract.notes && <div className="sm:col-span-2"><DetailItem label="Notes" value={contract.notes} /></div>}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-8">
                    {/* Quick Stats */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-5 space-y-4">
                        <h3 className="font-bold text-slate-800 dark:text-gray-200">Quick Info</h3>
                        {contract.minimumHours && (
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500 dark:text-gray-400">Min. hours/month</span>
                                <span className="font-semibold text-slate-800 dark:text-gray-200">{contract.minimumHours}h</span>
                            </div>
                        )}
                        {contract.value != null && (
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500 dark:text-gray-400">Contract Value</span>
                                <span className="font-semibold text-slate-800 dark:text-gray-200">{formatCurrency(contract.value, contract.currency)}</span>
                            </div>
                        )}
                        {contract.renewalType && (
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500 dark:text-gray-400">Renewal</span>
                                <span className="font-semibold text-slate-800 dark:text-gray-200">{contract.renewalType}</span>
                            </div>
                        )}
                    </div>

                    {/* Documents */}
                    <DocumentsContainer
                        documents={contract.documents || (contract.document ? [contract.document] : [])}
                        onChange={(docs) => onSaveContract({ ...contract, documents: docs, document: docs[0] })}
                        title="Contract Documents"
                    />
                </div>
            </div>
        </div>
    );
};

export default ContractDetailPage;
