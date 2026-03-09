

import React, { useState } from 'react';
import type { InsuranceInfo, Document } from '../types';
import InsuranceInfoSection from './insurance-detail/InsuranceInfoSection';
import FinancialsSection from './insurance-detail/FinancialsSection';
import TimelineSection from './insurance-detail/TimelineSection';
import DetailsSection from './insurance-detail/DetailsSection';
import AIAssistantSection from './insurance-detail/AIAssistantSection';

const BackIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>);

export type EditableInsuranceSection = 'info' | 'financials' | 'timeline' | 'details' | null;

interface InsuranceDetailPageProps {
    policy: InsuranceInfo;
    onBack: () => void;
    onSavePolicy: (policy: InsuranceInfo) => void;
}

interface ExtractedData extends Partial<InsuranceInfo> {
    document?: Document;
}

const InsuranceDetailPage: React.FC<InsuranceDetailPageProps> = ({ policy, onBack, onSavePolicy }) => {
    const [editingSection, setEditingSection] = useState<EditableInsuranceSection>(null);

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
        
        onSavePolicy(updatedPolicy);
    };

    const getStatusColor = (status?: string) => {
        switch (status) {
            case 'Active': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
            case 'Expired': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
            case 'Pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
            default: return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-gray-300 hover:text-brand-primary dark:hover:text-brand-secondary transition-colors">
                    <BackIcon />
                    Back to All Policies
                </button>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{policy.name}</h1>
                            {policy.status && <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${getStatusColor(policy.status)}`}>{policy.status}</span>}
                        </div>
                        <p className="text-md text-slate-500 dark:text-gray-400 mt-1">Provider: <span className="font-semibold">{policy.provider}</span></p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-8">
                    <AIAssistantSection onDataExtracted={handleDataExtracted} />
                    <InsuranceInfoSection
                        policy={policy}
                        isEditing={editingSection === 'info'}
                        onSetEditing={() => handleSetEditing('info')}
                        onSave={handleSave}
                        onCancel={handleCancel}
                    />
                    <FinancialsSection
                        policy={policy}
                        isEditing={editingSection === 'financials'}
                        onSetEditing={() => handleSetEditing('financials')}
                        onSave={handleSave}
                        onCancel={handleCancel}
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