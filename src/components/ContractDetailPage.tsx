import React, { useState, useCallback } from 'react';
import type { ContractInfo, InsuranceInfo, PropertyCountry } from '../types';
import DocumentsContainer from './DocumentsContainer';
import { getCountryBg, getCountryFlag, currencyToCountry } from '../lib/countryColors';
import { COUNTRY_OPTIONS } from '../lib/countryLabels';
import { openDocument } from '../lib/openDocument';
import { extractFromPdf, Type } from '../lib/pdfExtraction';
import { getStatusColor, daysUntil, periodProgress } from '../lib/formatting';
import { BackIcon, EditIcon, SaveIcon, DocumentIcon as DocIcon } from './Icons';
import EditableName from './ui/EditableName';
import DeleteConfirmButton from './ui/DeleteConfirmButton';

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

// Status colors, daysUntil, and periodProgress now come from lib/formatting
const contractProgress = periodProgress;

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
    const [isEditingInfo, setIsEditingInfo] = useState(false);
    const [editedData, setEditedData] = useState<ContractInfo>(contract);
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
            const contractSchema = {
                type: Type.OBJECT,
                properties: {
                    contractType: { type: Type.STRING, nullable: true },
                    employer: { type: Type.STRING, nullable: true, description: 'The organization/company offering the contract' },
                    contractor: { type: Type.STRING, nullable: true, description: 'The person/entity providing services' },
                    signedDate: { type: Type.STRING, nullable: true },
                    effectiveDate: { type: Type.STRING, nullable: true },
                    expirationDate: { type: Type.STRING, nullable: true },
                    value: { type: Type.NUMBER, nullable: true },
                    currency: { type: Type.STRING, nullable: true },
                    paymentTerms: { type: Type.STRING, nullable: true },
                    minimumHours: { type: Type.NUMBER, nullable: true, description: 'Minimum monthly hours if specified' },
                    description: { type: Type.STRING, nullable: true },
                    contactEmail: { type: Type.STRING, nullable: true },
                    contactPhone: { type: Type.STRING, nullable: true },
                    notes: { type: Type.STRING, nullable: true, description: 'Any other important details, translated to English' },
                },
            };

            const buildPrompt = (pdfText: string) => `Extract contract/agreement details from the text below. The document may be in ANY language (English, Polish, German, etc.). Return all values in English.
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

            const { data: extracted, document: doc } = await extractFromPdf<any>(aiFile, buildPrompt, contractSchema);
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
                            <EditableName value={contract.name} onSave={name => onSaveContract({ ...contract, name })} />
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
                            <DeleteConfirmButton onConfirm={() => onDeleteContract(contract.id)} />
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
