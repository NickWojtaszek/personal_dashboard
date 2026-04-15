


import React, { useState, useEffect } from 'react';
import type { InsuranceInfo, PropertyInfo, PropertyCountry, Document } from '../types';
import InsuranceInfoSection from './insurance-detail/InsuranceInfoSection';
import FinancialsSection from './insurance-detail/FinancialsSection';
import TimelineSection from './insurance-detail/TimelineSection';
import DetailsSection from './insurance-detail/DetailsSection';
import AIAssistantSection from './insurance-detail/AIAssistantSection';
import PolicyHistorySection from './insurance-detail/PolicyHistorySection';
import DocumentsContainer from './DocumentsContainer';
import { getCountryBg, getCountryFlag, currencyToCountry } from '../lib/countryColors';
import { COUNTRY_OPTIONS } from '../lib/countryLabels';
import { getStatusColor } from '../lib/formatting';
import { BackIcon, TrashIcon } from './Icons';

const MergeIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" /></svg>);

export type EditableInsuranceSection = 'info' | 'financials' | 'timeline' | 'details' | null;

interface InsuranceDetailPageProps {
    policy: InsuranceInfo;
    allPolicies?: InsuranceInfo[];
    onBack: () => void;
    onSavePolicy: (policy: InsuranceInfo) => void;
    onDeletePolicy?: (policyId: string) => void;
    onMergePolicyInto?: (sourceId: string, targetId: string) => void;
    pendingFile?: File | null;
    onPendingFileConsumed?: () => void;
    properties?: PropertyInfo[];
    scrollToSection?: string | null;
    onScrollComplete?: () => void;
}

interface ExtractedData extends Partial<InsuranceInfo> {
    document?: Document;
}

const STATUS_OPTIONS: InsuranceInfo['status'][] = ['Active', 'Expired', 'Pending'];

const InsuranceDetailPage: React.FC<InsuranceDetailPageProps> = ({ policy, allPolicies, onBack, onSavePolicy, onDeletePolicy, onMergePolicyInto, pendingFile, onPendingFileConsumed, properties, scrollToSection, onScrollComplete }) => {
    const [editingSection, setEditingSection] = useState<EditableInsuranceSection>(null);
    const [showMergeMenu, setShowMergeMenu] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [editingName, setEditingName] = useState(false);
    const [editNameValue, setEditNameValue] = useState('');

    const handleSave = (updatedPolicy: InsuranceInfo) => {
        onSavePolicy(updatedPolicy);
        setEditingSection(null);
    };

    const handleCancel = () => {
        setEditingSection(null);
    };

    const handleSetEditing = (section: EditableInsuranceSection) => {
        setEditingSection(current => current === section ? null : section);
    };

    const handleDataExtracted = (extractedData: ExtractedData) => {
        const { document, ...policyData } = extractedData;
        const updatedPolicy = {
            ...policy,
            ...policyData,
            document: document || policy.document,
        };

        // Auto-activate: if we got meaningful data from PDF, mark as Active
        if (updatedPolicy.status === 'Pending' && (updatedPolicy.startDate || updatedPolicy.provider)) {
            updatedPolicy.status = 'Active';
        }

        // Auto-assign groups based on policyType
        const pType = (updatedPolicy.policyType || '').toLowerCase();
        if (!updatedPolicy.groups || updatedPolicy.groups.length === 0) {
            if (pType.includes('car') || pType.includes('vehicle') || pType.includes('motor') || pType.includes('auto')) {
                updatedPolicy.groups = ['Vehicle'];
            } else if (pType.includes('home') || pType.includes('contents') || pType.includes('landlord') || pType.includes('property') || pType.includes('building') || pType.includes('renters')) {
                updatedPolicy.groups = ['Property'];
            } else if (pType.includes('life') || pType.includes('health') || pType.includes('medical') || pType.includes('dental')) {
                updatedPolicy.groups = ['Life', 'Health'];
            } else if (pType.includes('travel')) {
                updatedPolicy.groups = ['Travel'];
            } else if (pType.includes('pet')) {
                updatedPolicy.groups = ['Pet'];
            } else if (pType.includes('business') || pType.includes('indemnity') || pType.includes('liability')) {
                updatedPolicy.groups = ['Business'];
            }
        }

        // Auto-name: replace generic "New ... Policy" with extracted info
        if (updatedPolicy.name.startsWith('New ') && updatedPolicy.name.endsWith(' Policy')) {
            const parts: string[] = [];
            if (updatedPolicy.provider) parts.push(updatedPolicy.provider);
            if (updatedPolicy.policyType) parts.push(updatedPolicy.policyType);
            if (parts.length > 0) {
                updatedPolicy.name = parts.join(' - ');
            }
        }

        // Auto-detect country from currency
        if (!updatedPolicy.country && updatedPolicy.currency) {
            const detected = currencyToCountry(updatedPolicy.currency);
            if (detected) updatedPolicy.country = detected;
        }

        onSavePolicy(updatedPolicy);
    };

    const handleStatusChange = (newStatus: InsuranceInfo['status']) => {
        onSavePolicy({ ...policy, status: newStatus });
    };

    const mergeTargets = (allPolicies || []).filter(p => p.id !== policy.id);

    useEffect(() => {
        if (!scrollToSection) return;
        const timer = setTimeout(() => {
            const el = document.querySelector(`[data-section="${scrollToSection}"]`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            onScrollComplete?.();
        }, 150);
        return () => clearTimeout(timer);
    }, [scrollToSection, onScrollComplete]);

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-gray-300 hover:text-brand-primary dark:hover:text-brand-secondary transition-colors">
                    <BackIcon />
                    Back to All Policies
                </button>
            </div>

            <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 ${getCountryBg(policy.country)}`}>
                <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            {policy.country && <span className="text-xl">{getCountryFlag(policy.country)}</span>}
                            {editingName ? (
                                <input
                                    autoFocus
                                    value={editNameValue}
                                    onChange={e => setEditNameValue(e.target.value)}
                                    onBlur={() => { if (editNameValue.trim()) { onSavePolicy({ ...policy, name: editNameValue.trim() }); } setEditingName(false); }}
                                    onKeyDown={e => { if (e.key === 'Enter') { e.currentTarget.blur(); } if (e.key === 'Escape') { setEditingName(false); } }}
                                    className="text-2xl font-bold text-slate-900 dark:text-white bg-transparent border-b-2 border-brand-primary outline-none px-0"
                                />
                            ) : (
                                <h1
                                    className="text-2xl font-bold text-slate-900 dark:text-white cursor-pointer hover:text-brand-primary transition-colors"
                                    onClick={() => { setEditNameValue(policy.name); setEditingName(true); }}
                                    title="Click to rename"
                                >{policy.name}</h1>
                            )}
                            {/* Country selector */}
                            <select
                                value={policy.country || ''}
                                onChange={e => onSavePolicy({ ...policy, country: (e.target.value || undefined) as PropertyCountry | undefined })}
                                className="text-xs bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded px-1.5 py-0.5 text-slate-600 dark:text-slate-300 cursor-pointer outline-none"
                                title="Country/region"
                            >
                                <option value="">Region</option>
                                {COUNTRY_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                            </select>
                            {/* Status dropdown */}
                            <div className="relative">
                                <select
                                    value={policy.status || ''}
                                    onChange={(e) => handleStatusChange(e.target.value as InsuranceInfo['status'])}
                                    className={`px-2 py-0.5 text-xs rounded-full font-medium border-0 cursor-pointer appearance-none pr-5 ${getStatusColor(policy.status)}`}
                                    style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 2px center', backgroundRepeat: 'no-repeat', backgroundSize: '16px' }}
                                >
                                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>
                        <p className="text-md text-slate-500 dark:text-gray-400 mt-1">Provider: <span className="font-semibold">{policy.provider}</span></p>
                    </div>
                    {/* Action buttons */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {onMergePolicyInto && mergeTargets.length > 0 && (
                            <div className="relative">
                                <button
                                    onClick={() => setShowMergeMenu(!showMergeMenu)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                    title="Archive this policy into another policy's history"
                                >
                                    <MergeIcon /> Archive Into...
                                </button>
                                {showMergeMenu && (
                                    <div className="absolute right-0 top-full mt-1 z-30 w-72 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 py-1 max-h-64 overflow-y-auto">
                                        <p className="px-3 py-2 text-xs text-slate-500 dark:text-gray-400 border-b border-slate-100 dark:border-slate-700">
                                            Merge this policy into another's history and remove this card:
                                        </p>
                                        {mergeTargets.map(target => (
                                            <button
                                                key={target.id}
                                                onClick={() => {
                                                    onMergePolicyInto(policy.id, target.id);
                                                    setShowMergeMenu(false);
                                                }}
                                                className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                            >
                                                <span className="font-medium text-slate-700 dark:text-gray-200">{target.name}</span>
                                                <span className="block text-xs text-slate-400 dark:text-gray-500">{target.provider} {target.status && `\u2022 ${target.status}`}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        {onDeletePolicy && (
                            <div className="relative">
                                {confirmDelete ? (
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs text-red-600 dark:text-red-400">Delete?</span>
                                        <button
                                            onClick={() => onDeletePolicy(policy.id)}
                                            className="px-2 py-1 text-xs font-medium rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
                                        >
                                            Yes
                                        </button>
                                        <button
                                            onClick={() => setConfirmDelete(false)}
                                            className="px-2 py-1 text-xs font-medium rounded bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-gray-200 hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
                                        >
                                            No
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setConfirmDelete(true)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                    >
                                        <TrashIcon /> Delete
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-8">
                    <AIAssistantSection onDataExtracted={handleDataExtracted} pendingFile={pendingFile} onPendingFileConsumed={onPendingFileConsumed} />
                    <div data-section="info">
                    <InsuranceInfoSection
                        policy={policy}
                        isEditing={editingSection === 'info'}
                        onSetEditing={() => handleSetEditing('info')}
                        onSave={handleSave}
                        onCancel={handleCancel}
                        properties={properties}
                    />
                    </div>
                    <div data-section="financials">
                    <FinancialsSection
                        policy={policy}
                        isEditing={editingSection === 'financials'}
                        onSetEditing={() => handleSetEditing('financials')}
                        onSave={handleSave}
                        onCancel={handleCancel}
                    />
                    </div>
                    <PolicyHistorySection policy={policy} />
                    <DocumentsContainer
                        documents={policy.documents || []}
                        onChange={(docs) => onSavePolicy({ ...policy, documents: docs })}
                        defaultCategory="Policy"
                        title="Policy Documents"
                    />
                </div>
                <div className="space-y-8 lg:sticky lg:top-28">
                    <TimelineSection
                        policy={policy}
                        isEditing={editingSection === 'timeline'}
                        onSetEditing={() => handleSetEditing('timeline')}
                        onSave={handleSave}
                        onCancel={handleCancel}
                    />
                    <DetailsSection
                        policy={policy}
                        isEditing={editingSection === 'details'}
                        onSetEditing={() => handleSetEditing('details')}
                        onSave={handleSave}
                        onCancel={handleCancel}
                    />
                </div>
            </div>
        </div>
    );
};

export default InsuranceDetailPage;
