

import React, { useState, useEffect, useRef } from 'react';
import type { PropertyInfo, FinancialTransaction, Document, PropertyContact, TenancyAgreement, InsurancePolicyRecord } from '../types';
import PropertyInfoSection from './property-detail/PropertyInfoSection';
import FinancialsSection from './property-detail/FinancialsSection';
import OperationsSection from './property-detail/OperationsSection';
import AIAssistantSection from './property-detail/AIAssistantSection';
import MortgageSection from './property-detail/MortgageSection';
import ComplianceSection from './property-detail/ComplianceSection';
import MaintenanceSection from './property-detail/MaintenanceSection';
import NotesSection from './property-detail/NotesSection';
import ManagementStructureSection from './property-detail/ManagementStructureSection';
import LeaseholdChargesSection from './property-detail/LeaseholdChargesSection';
import CouncilTaxSection from './property-detail/CouncilTaxSection';
import CorrespondenceSection from './property-detail/CorrespondenceSection';
import PrintModal from './property-detail/PrintModal';
import PrintablePropertyReport from './property-detail/PrintablePropertyReport';
import { v4 as uuidv4 } from 'uuid';
import { PrintIcon, ExportIcon, ImportIcon } from './property-detail/Icons';

const BackIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>);

type EditableSection = 'info' | 'financials' | 'operations' | 'mortgage' | 'compliance' | 'maintenance' | 'correspondence' | 'notes' | 'managementStructure' | 'leaseholdCharges' | 'councilTax' | null;

interface PropertyDetailPageProps {
    property: PropertyInfo;
    onBack: () => void;
    onSaveProperty: (property: PropertyInfo) => void;
}

interface ExtractedData {
    leaseStart?: string;
    leaseEnd?: string;
    transactions?: FinancialTransaction[];
    document?: Document;
    contacts?: PropertyContact[];
    features?: string[];
}

const PropertyDetailPage: React.FC<PropertyDetailPageProps> = ({ property, onBack, onSaveProperty }) => {
    const [editingSection, setEditingSection] = useState<EditableSection>(null);
    const [modalConfig, setModalConfig] = useState<{ action: 'print' | 'export', title: string, buttonText: string } | null>(null);
    const [propertyToPrint, setPropertyToPrint] = useState<PropertyInfo | null>(null);
    const importInputRef = useRef<HTMLInputElement>(null);


    const handleSave = (updatedProperty: PropertyInfo) => {
        onSaveProperty(updatedProperty);
        setEditingSection(null);
    };

    const handleCancel = () => {
        setEditingSection(null);
    };
    
    const handleSetEditing = (section: EditableSection) => {
        setEditingSection(current => current === section ? null : section);
    };

    const handleDataExtracted = (extractedData: ExtractedData) => {
        const updatedProperty = JSON.parse(JSON.stringify(property)) as PropertyInfo;

        if (!updatedProperty.operations) updatedProperty.operations = {};
        if (!updatedProperty.operations.tenancy) updatedProperty.operations.tenancy = { agreements: [] };
        else if (!updatedProperty.operations.tenancy.agreements) updatedProperty.operations.tenancy.agreements = [];

        if (!updatedProperty.financials) updatedProperty.financials = {};
        if (!updatedProperty.financials.transactions) updatedProperty.financials.transactions = [];
        if (!updatedProperty.documents) updatedProperty.documents = [];
        if (!updatedProperty.contacts) updatedProperty.contacts = [];
        if (!updatedProperty.details) updatedProperty.details = {};
        if (!updatedProperty.details.features) updatedProperty.details.features = [];

        let isTenancyAgreement = false;
        if (extractedData.leaseStart && extractedData.leaseEnd) {
            isTenancyAgreement = true;
            const newAgreement: TenancyAgreement = {
                id: uuidv4(),
                leaseStart: extractedData.leaseStart,
                leaseEnd: extractedData.leaseEnd,
                document: extractedData.document,
            };
            updatedProperty.operations.tenancy.agreements.unshift(newAgreement);
        }

        if (extractedData.transactions && extractedData.transactions.length > 0) {
            updatedProperty.financials.transactions.push(...extractedData.transactions);
        }

        if (extractedData.contacts && extractedData.contacts.length > 0) {
            const existingContacts = new Set(updatedProperty.contacts.map(c => `${c.name}-${c.role}`.toLowerCase()));
            const newContacts = extractedData.contacts.filter(
                c => !existingContacts.has(`${c.name}-${c.role}`.toLowerCase())
            );
            updatedProperty.contacts.push(...newContacts);
        }

        if (extractedData.features && extractedData.features.length > 0) {
            const existingFeatures = new Set(updatedProperty.details.features.map(f => f.toLowerCase()));
            const newFeatures = extractedData.features.filter(
                f => !existingFeatures.has(f.toLowerCase())
            );
            updatedProperty.details.features.push(...newFeatures);
        }

        if (extractedData.document && !isTenancyAgreement) {
            updatedProperty.documents.push(extractedData.document);
        }

        onSaveProperty(updatedProperty);
    };

    const filterPropertyData = (startYear: number, endYear: number) => {
        const newProperty = JSON.parse(JSON.stringify(property)) as PropertyInfo;
        
        const isInRange = (dateStr?: string) => {
            if (!dateStr) return false;
            try {
                const year = new Date(dateStr).getFullYear();
                return year >= startYear && year <= endYear;
            } catch { return false; }
        };

        const filterArrayByDate = <T extends { date?: string | undefined }>(arr?: T[]): T[] | undefined => arr?.filter(item => isInRange(item.date));
        const filterChecksByDate = <T extends { date: string }>(arr?: T[]): T[] | undefined => arr?.filter(item => isInRange(item.date));
        const filterPoliciesByDate = (arr?: InsurancePolicyRecord[]): InsurancePolicyRecord[] | undefined => arr?.filter(item => isInRange(item.startDate) || isInRange(item.endDate));
        const filterChargesByYear = <T extends { year: number }>(arr?: T[]): T[] | undefined => arr?.filter(item => item.year >= startYear && item.year <= endYear);
        
        if (newProperty.financials?.transactions) newProperty.financials.transactions = filterArrayByDate(newProperty.financials.transactions);
        if (newProperty.mortgage?.payments) newProperty.mortgage.payments = filterArrayByDate(newProperty.mortgage.payments);
        if (newProperty.operations?.maintenance?.jobs) newProperty.operations.maintenance.jobs = filterArrayByDate(newProperty.operations.maintenance.jobs);
        if (newProperty.operations?.maintenance?.equipment) newProperty.operations.maintenance.equipment = filterArrayByDate(newProperty.operations.maintenance.equipment);
        if (newProperty.operations?.compliance?.eicr?.checks) newProperty.operations.compliance.eicr.checks = filterChecksByDate(newProperty.operations.compliance.eicr.checks);
        if (newProperty.operations?.compliance?.gasSafety?.checks) newProperty.operations.compliance.gasSafety.checks = filterChecksByDate(newProperty.operations.compliance.gasSafety.checks);
        if (newProperty.operations?.compliance?.insurance?.policies) newProperty.operations.compliance.insurance.policies = filterPoliciesByDate(newProperty.operations.compliance.insurance.policies);
        if (newProperty.operations?.leaseholdCharges?.serviceCharges) newProperty.operations.leaseholdCharges.serviceCharges = filterChargesByYear(newProperty.operations.leaseholdCharges.serviceCharges);
        if (newProperty.operations?.leaseholdCharges?.groundRent) newProperty.operations.leaseholdCharges.groundRent = filterChargesByYear(newProperty.operations.leaseholdCharges.groundRent);
        if (newProperty.operations?.leaseholdCharges?.councilTax) newProperty.operations.leaseholdCharges.councilTax = filterChargesByYear(newProperty.operations.leaseholdCharges.councilTax);
        if (newProperty.correspondence) newProperty.correspondence = filterArrayByDate(newProperty.correspondence);
        
        return newProperty;
    };

    const handlePrint = (startYear: number, endYear: number) => {
        const filteredProperty = filterPropertyData(startYear, endYear);
        setPropertyToPrint(filteredProperty);
    };

    const handleExport = (startYear: number, endYear: number) => {
        const filteredProperty = filterPropertyData(startYear, endYear);
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(filteredProperty, null, 2))}`;
        const link = document.createElement("a");
        link.href = jsonString;
        link.download = `${property.name.replace(/\s+/g, '_')}_${startYear}-${endYear}.json`;
        link.click();
    };
    
    const handleModalConfirm = (startYear: number, endYear: number) => {
        if (modalConfig?.action === 'print') {
            handlePrint(startYear, endYear);
        } else if (modalConfig?.action === 'export') {
            handleExport(startYear, endYear);
        }
        setModalConfig(null);
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') {
                    throw new Error("File could not be read as text.");
                }
                const importedData: PropertyInfo = JSON.parse(text);

                if (!importedData.id || importedData.id !== property.id) {
                    alert(`Error: The imported file appears to be for a different property ("${importedData.name || 'Unknown'}"). Please import a file that matches this property ("${property.name}").`);
                    return;
                }

                if (window.confirm(`Are you sure you want to overwrite all current data for "${property.name}" with the data from the imported file? This action cannot be undone.`)) {
                    onSaveProperty(importedData);
                    alert("Data imported successfully!");
                }

            } catch (error) {
                console.error("Failed to parse imported JSON file:", error);
                alert("Error: The selected file is not a valid JSON file or is corrupted.");
            } finally {
                if (importInputRef.current) {
                    importInputRef.current.value = '';
                }
            }
        };
        reader.readAsText(file);
    };
    
    useEffect(() => {
        if (propertyToPrint) {
            const timer = setTimeout(() => {
                window.print();
                setPropertyToPrint(null);
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [propertyToPrint]);

    return (
        <>
            {propertyToPrint && <PrintablePropertyReport property={propertyToPrint} />}
            {modalConfig && (
                <PrintModal
                    isOpen={!!modalConfig}
                    onClose={() => setModalConfig(null)}
                    onConfirm={handleModalConfirm}
                    property={property}
                    title={modalConfig.title}
                    confirmButtonText={modalConfig.buttonText}
                />
            )}
            <input
                type="file"
                ref={importInputRef}
                className="hidden"
                accept="application/json"
                onChange={handleFileSelect}
            />

            <div className="space-y-8">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-gray-300 hover:text-brand-primary dark:hover:text-brand-secondary transition-colors">
                        <BackIcon />
                        Back to All Properties
                    </button>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setModalConfig({ action: 'print', title: 'Print / Save Property Report', buttonText: 'Generate & Print' })} className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-gray-300 hover:text-brand-primary dark:hover:text-brand-secondary transition-colors p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                            <PrintIcon />
                            Print / Save PDF
                        </button>
                        <button onClick={() => setModalConfig({ action: 'export', title: 'Export Property Data', buttonText: 'Generate & Export' })} className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-gray-300 hover:text-brand-primary dark:hover:text-brand-secondary transition-colors p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                            <ExportIcon />
                            Export Data
                        </button>
                         <button onClick={() => importInputRef.current?.click()} className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-gray-300 hover:text-brand-primary dark:hover:text-brand-secondary transition-colors p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                            <ImportIcon />
                            Import Data
                        </button>
                    </div>
                </div>

                <header className="pb-4 border-b border-slate-200 dark:border-slate-700">
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{property.name}</h1>
                    <p className="text-lg text-slate-500 dark:text-gray-400 mt-1">{property.location}</p>
                </header>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    <div className="lg:col-span-2 space-y-8">
                        <CorrespondenceSection
                            property={property}
                            isEditing={editingSection === 'correspondence'}
                            onSetEditing={() => handleSetEditing('correspondence')}
                            onSave={handleSave}
                            onCancel={handleCancel}
                        />
                        <FinancialsSection 
                            property={property}
                            isEditing={editingSection === 'financials'}
                            onSetEditing={() => handleSetEditing('financials')}
                            onSave={handleSave}
                            onCancel={handleCancel}
                        />
                        <MortgageSection
                            property={property}
                            isEditing={editingSection === 'mortgage'}
                            onSetEditing={() => handleSetEditing('mortgage')}
                            onSave={handleSave}
                            onCancel={handleCancel}
                        />
                        <LeaseholdChargesSection
                            property={property}
                            isEditing={editingSection === 'leaseholdCharges'}
                            onSetEditing={() => handleSetEditing('leaseholdCharges')}
                            onSave={handleSave}
                            onCancel={handleCancel}
                        />
                        <CouncilTaxSection
                            property={property}
                            isEditing={editingSection === 'councilTax'}
                            onSetEditing={() => handleSetEditing('councilTax')}
                            onSave={handleSave}
                            onCancel={handleCancel}
                        />
                        <OperationsSection 
                            property={property}
                            isEditing={editingSection === 'operations'}
                            onSetEditing={() => handleSetEditing('operations')}
                            onSave={handleSave}
                            onCancel={handleCancel}
                         />
                         <MaintenanceSection
                            property={property}
                            isEditing={editingSection === 'maintenance'}
                            onSetEditing={() => handleSetEditing('maintenance')}
                            onSave={handleSave}
                            onCancel={handleCancel}
                        />
                         <ComplianceSection
                            property={property}
                            isEditing={editingSection === 'compliance'}
                            onSetEditing={() => handleSetEditing('compliance')}
                            onSave={handleSave}
                            onCancel={handleCancel}
                        />
                        <NotesSection
                            property={property}
                            isEditing={editingSection === 'notes'}
                            onSetEditing={() => handleSetEditing('notes')}
                            onSave={handleSave}
                            onCancel={handleCancel}
                        />
                    </div>
                    <div className="space-y-8 lg:sticky lg:top-28">
                        <PropertyInfoSection 
                            property={property} 
                            isEditing={editingSection === 'info'}
                            onSetEditing={() => handleSetEditing('info')}
                            onSave={handleSave}
                            onCancel={handleCancel}
                        />
                         <ManagementStructureSection
                            property={property}
                            isEditing={editingSection === 'managementStructure'}
                            onSetEditing={() => handleSetEditing('managementStructure')}
                            onSave={handleSave}
                            onCancel={handleCancel}
                        />
                        <AIAssistantSection onDataExtracted={handleDataExtracted} />
                    </div>
                </div>

            </div>
        </>
    );
};

export default PropertyDetailPage;