

import React, { useState, useEffect, useRef } from 'react';
import type { PropertyInfo, InsuranceInfo, FinancialTransaction, ServiceCharge, CouncilTax, Document, PropertyContact, TenancyAgreement, InsurancePolicyRecord, MortgageLoan, MortgagePayment } from '../types';
import PropertyInfoSection from './property-detail/PropertyInfoSection';
import FinancialsSection from './property-detail/FinancialsSection';
import OperationsSection from './property-detail/OperationsSection';
import AIAssistantSection from './property-detail/AIAssistantSection';
import MortgageSection from './property-detail/MortgageSection';
import TitleSection from './property-detail/TitleSection';
import ComplianceSection from './property-detail/ComplianceSection';
import MaintenanceSection from './property-detail/MaintenanceSection';
import NotesSection from './property-detail/NotesSection';
import ManagementStructureSection from './property-detail/ManagementStructureSection';
import LeaseholdChargesSection from './property-detail/LeaseholdChargesSection';
import CouncilTaxSection from './property-detail/CouncilTaxSection';
import CorrespondenceSection from './property-detail/CorrespondenceSection';
import ThreadsSection from './property-detail/ThreadsSection';
import FinancialHealthSection from './property-detail/FinancialHealthSection';
import DocumentsContainer from './DocumentsContainer';
import PrintModal from './property-detail/PrintModal';
import PrintablePropertyReport from './property-detail/PrintablePropertyReport';
import { v4 as uuidv4 } from 'uuid';
import { PrintIcon, ExportIcon, ImportIcon, TrashIcon } from './property-detail/Icons';
import { findDuplicatesWithNew, findDuplicates, type DuplicateGroup } from '../lib/duplicateDetection';
import { classifyExpenseTransactions, calcEicrNextDue, calcGasSafetyNextDue } from '../lib/transactionClassifier';
import type { ExtractedMortgageData, ExtractedTitleData } from '../lib/extractPropertyData';

const BackIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>);

type EditableSection = 'info' | 'financials' | 'operations' | 'mortgage' | 'title' | 'compliance' | 'maintenance' | 'correspondence' | 'notes' | 'managementStructure' | 'leaseholdCharges' | 'councilTax' | null;

interface PropertyDetailPageProps {
    property: PropertyInfo;
    onBack: () => void;
    onSaveProperty: (property: PropertyInfo) => void;
    insurancePolicies?: InsuranceInfo[];
    scrollToSection?: string | null;
    onScrollComplete?: () => void;
}

interface ExtractedData {
    leaseStart?: string;
    leaseEnd?: string;
    currency?: string;
    transactions?: FinancialTransaction[];
    serviceCharges?: ServiceCharge[];
    councilRates?: CouncilTax[];
    document?: Document;
    contacts?: PropertyContact[];
    features?: string[];
    mortgage?: ExtractedMortgageData;
    title?: ExtractedTitleData;
    // Source tracking for traceability
    sourceDocumentName?: string;
    sourceEmailSubject?: string;
    sourceCorrespondenceId?: string;
    sourceAttachmentId?: string;
}

type ViewMode = 'details' | 'metrics' | 'correspondence' | 'threads';

const PropertyDetailPage: React.FC<PropertyDetailPageProps> = ({ property, onBack, onSaveProperty, insurancePolicies, scrollToSection, onScrollComplete }) => {
    const [editingSection, setEditingSection] = useState<EditableSection>(null);
    const [modalConfig, setModalConfig] = useState<{ action: 'print' | 'export', title: string, buttonText: string } | null>(null);
    const [propertyToPrint, setPropertyToPrint] = useState<PropertyInfo | null>(null);
    const importInputRef = useRef<HTMLInputElement>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('details');
    const [focusCorrespondenceId, setFocusCorrespondenceId] = useState<string | null>(null);
    const [duplicateWarnings, setDuplicateWarnings] = useState<DuplicateGroup[]>([]);
    const [showResetConfirm, setShowResetConfirm] = useState(false);


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

    const handleSourceClick = (correspondenceId: string) => {
        setFocusCorrespondenceId(correspondenceId);
        setViewMode('correspondence');
    };

    const handleDataExtracted = (extractedData: ExtractedData) => {
        const updatedProperty = JSON.parse(JSON.stringify(property)) as PropertyInfo;

        if (!updatedProperty.operations) updatedProperty.operations = {};
        if (!updatedProperty.operations.tenancy) updatedProperty.operations.tenancy = { agreements: [] };
        else if (!updatedProperty.operations.tenancy.agreements) updatedProperty.operations.tenancy.agreements = [];

        if (!updatedProperty.financials) updatedProperty.financials = {};
        if (!updatedProperty.financials.transactions) updatedProperty.financials.transactions = [];
        if (extractedData.currency && !updatedProperty.financials.currency) {
            updatedProperty.financials.currency = extractedData.currency;
        }
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
            const stampedTransactions = extractedData.transactions.map(t => ({
                ...t,
                sourceDocumentName: extractedData.sourceDocumentName || extractedData.document?.name,
                sourceEmailSubject: extractedData.sourceEmailSubject,
                sourceCorrespondenceId: extractedData.sourceCorrespondenceId,
            }));
            updatedProperty.financials.transactions.push(...stampedTransactions);
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

        if (extractedData.serviceCharges && extractedData.serviceCharges.length > 0) {
            if (!updatedProperty.operations!.leaseholdCharges) updatedProperty.operations!.leaseholdCharges = {};
            if (!updatedProperty.operations!.leaseholdCharges.serviceCharges) updatedProperty.operations!.leaseholdCharges.serviceCharges = [];
            const existingDueDates = new Set(
                updatedProperty.operations!.leaseholdCharges.serviceCharges.map(sc => `${sc.year}-${sc.dueDate}`)
            );
            const newCharges = extractedData.serviceCharges.filter(
                sc => !existingDueDates.has(`${sc.year}-${sc.dueDate}`)
            );
            updatedProperty.operations!.leaseholdCharges.serviceCharges.push(...newCharges);
        }

        if (extractedData.councilRates && extractedData.councilRates.length > 0) {
            if (!updatedProperty.operations!.leaseholdCharges) updatedProperty.operations!.leaseholdCharges = {};
            if (!updatedProperty.operations!.leaseholdCharges.councilTax) updatedProperty.operations!.leaseholdCharges.councilTax = [];
            const existingDueDates = new Set(
                updatedProperty.operations!.leaseholdCharges.councilTax.map(ct => `${ct.year}-${ct.dueDate}`)
            );
            const newRates = extractedData.councilRates.filter(
                ct => !existingDueDates.has(`${ct.year}-${ct.dueDate}`)
            );
            updatedProperty.operations!.leaseholdCharges.councilTax.push(...newRates);
        }

        // Route extracted mortgage data into property.mortgage
        if (extractedData.mortgage?.loans && extractedData.mortgage.loans.length > 0) {
            if (!updatedProperty.mortgage) updatedProperty.mortgage = {};
            if (!updatedProperty.mortgage.loans) updatedProperty.mortgage.loans = [];

            // Derive principal/interest from payment type when source doesn't provide the split.
            // Bank statements only show total amount — interest=0 from extraction.
            // - Overpayments are capital reductions: principal = amount, interest = 0
            // - Regular payments with no interest breakdown: assume interest-only
            //   (principal = 0, interest = amount) — safer default since mortgage statements
            //   that DO provide the split will have interest > 0 and the else branch handles it.
            const derivePrincipalInterest = (p: { amount: number; interest: number; paymentType?: string }) => {
                if (p.paymentType === 'overpayment') {
                    return { principal: p.amount, interest: 0 };
                }
                if (p.interest > 0) {
                    // Source provided interest breakdown — calculate principal normally
                    return { principal: Math.max(0, p.amount - p.interest), interest: p.interest };
                }
                // Bank statement regular payment — no interest breakdown known.
                // Default: assume entire amount is interest (interest-only mortgage safe default).
                // User can edit to correct if it's actually a capital repayment mortgage.
                return { principal: 0, interest: p.amount };
            };

            for (const extractedLoan of extractedData.mortgage.loans) {
                // Match by account number first, then by lender name (for bank statements where account# may be null)
                const existingLoan = updatedProperty.mortgage.loans.find(
                    l => (extractedLoan.accountNumber && l.accountNumber === extractedLoan.accountNumber) ||
                         (extractedLoan.lender && l.lender && l.lender.toLowerCase().includes(extractedLoan.lender.toLowerCase().substring(0, 10)))
                );

                if (existingLoan) {
                    // Update balance and rate, merge payments
                    if (extractedLoan.outstandingBalance !== undefined) existingLoan.outstandingBalance = extractedLoan.outstandingBalance;
                    if (extractedLoan.interestRate !== undefined) existingLoan.interestRate = extractedLoan.interestRate;
                    if (extractedLoan.creditLimit !== undefined) existingLoan.creditLimit = extractedLoan.creditLimit;
                    if (extractedLoan.repaymentAmount !== undefined) existingLoan.repaymentAmount = extractedLoan.repaymentAmount;

                    if (extractedLoan.payments && extractedLoan.payments.length > 0) {
                        if (!existingLoan.payments) existingLoan.payments = [];
                        // Deduplicate by date + amount (not just date, since overpayments can be on the same day as regular)
                        const existingKeys = new Set(existingLoan.payments.map(p => `${p.date}|${p.amount}`));
                        for (const p of extractedLoan.payments) {
                            const key = `${p.date}|${p.amount}`;
                            if (!existingKeys.has(key)) {
                                const { principal, interest } = derivePrincipalInterest(p);
                                existingLoan.payments.push({
                                    id: uuidv4(),
                                    date: p.date,
                                    amount: p.amount,
                                    interest,
                                    principal,
                                    paymentType: p.paymentType || undefined,
                                });
                                existingKeys.add(key);
                            }
                        }
                        existingLoan.payments.sort((a, b) => b.date.localeCompare(a.date));
                    }
                } else {
                    // New loan account
                    const newLoan: MortgageLoan = {
                        id: uuidv4(),
                        accountNumber: extractedLoan.accountNumber,
                        lender: extractedLoan.lender,
                        type: extractedLoan.type,
                        interestRate: extractedLoan.interestRate,
                        outstandingBalance: extractedLoan.outstandingBalance,
                        creditLimit: extractedLoan.creditLimit,
                        repaymentAmount: extractedLoan.repaymentAmount,
                        payments: (extractedLoan.payments || []).map(p => {
                            const { principal, interest } = derivePrincipalInterest(p);
                            return {
                                id: uuidv4(),
                                date: p.date,
                                amount: p.amount,
                                interest,
                                principal,
                                paymentType: p.paymentType || undefined,
                            };
                        }),
                    };
                    newLoan.payments?.sort((a, b) => b.date.localeCompare(a.date));
                    updatedProperty.mortgage.loans.push(newLoan);
                }
            }

            // Update offset
            if (extractedData.mortgage.offsetBalance !== undefined) {
                updatedProperty.mortgage.offsetBalance = extractedData.mortgage.offsetBalance;
            }
            if (extractedData.mortgage.offsetAccountNumber) {
                updatedProperty.mortgage.offsetAccountNumber = extractedData.mortgage.offsetAccountNumber;
            }

            // Recalculate summary fields
            updatedProperty.mortgage.totalDebt = updatedProperty.mortgage.loans.reduce(
                (sum, l) => sum + (l.outstandingBalance || 0), 0
            );
            updatedProperty.mortgage.netExposure = updatedProperty.mortgage.totalDebt - (updatedProperty.mortgage.offsetBalance || 0);

            // Also update legacy single-loan field for backward compat
            updatedProperty.mortgage.outstandingBalance = updatedProperty.mortgage.totalDebt;

            // Set currency if from mortgage extraction
            if (extractedData.mortgage.currency && !updatedProperty.financials?.currency) {
                if (!updatedProperty.financials) updatedProperty.financials = {};
                updatedProperty.financials.currency = extractedData.mortgage.currency;
            }
        }

        // Route extracted title/deed data
        if (extractedData.title?.titleReference || extractedData.title?.registeredOwner) {
            if (!updatedProperty.title) updatedProperty.title = {};
            const t = extractedData.title;
            if (t.titleReference) updatedProperty.title.titleReference = t.titleReference;
            if (t.dateCreated) updatedProperty.title.dateCreated = t.dateCreated;
            if (t.previousTitle) updatedProperty.title.previousTitle = t.previousTitle;
            if (t.estate) updatedProperty.title.estate = t.estate;
            if (t.lotPlan) updatedProperty.title.lotPlan = t.lotPlan;
            if (t.localGovernment) updatedProperty.title.localGovernment = t.localGovernment;
            if (t.registeredOwner) updatedProperty.title.registeredOwner = t.registeredOwner;
            if (t.ownershipDate) updatedProperty.title.ownershipDate = t.ownershipDate;
            if (t.dealingNumber) updatedProperty.title.dealingNumber = t.dealingNumber;
            if (t.searchDate) updatedProperty.title.searchDate = t.searchDate;
            if (t.communityStatements && t.communityStatements.length > 0) {
                updatedProperty.title.communityStatements = t.communityStatements;
            }
            if (t.encumbrances && t.encumbrances.length > 0) {
                updatedProperty.title.encumbrances = t.encumbrances.map(e => ({
                    type: e.type,
                    reference: e.reference,
                    date: e.date,
                    party: e.party,
                    details: e.details,
                }));
            }
            if (extractedData.document) {
                updatedProperty.title.document = extractedData.document;
            }
        }

        // Auto-populate maintenance jobs and compliance records from expense transactions
        if (extractedData.transactions && extractedData.transactions.length > 0) {
            const { maintenanceJobs, eicrChecks, gasSafetyChecks } = classifyExpenseTransactions(extractedData.transactions);

            if (maintenanceJobs.length > 0) {
                if (!updatedProperty.operations!.maintenance) updatedProperty.operations!.maintenance = {};
                if (!updatedProperty.operations!.maintenance.jobs) updatedProperty.operations!.maintenance.jobs = [];
                const existingKeys = new Set(
                    updatedProperty.operations!.maintenance.jobs.map(j => `${j.date}-${j.cost}`)
                );
                const newJobs = maintenanceJobs.filter(j => !existingKeys.has(`${j.date}-${j.cost}`));
                updatedProperty.operations!.maintenance.jobs.push(...newJobs);
            }

            if (eicrChecks.length > 0) {
                if (!updatedProperty.operations!.compliance) updatedProperty.operations!.compliance = {};
                if (!updatedProperty.operations!.compliance.eicr) updatedProperty.operations!.compliance.eicr = { checks: [] };
                const existingDates = new Set(updatedProperty.operations!.compliance.eicr.checks.map(c => c.date));
                const newChecks = eicrChecks.filter(c => !existingDates.has(c.date));
                updatedProperty.operations!.compliance.eicr.checks.push(...newChecks);
                // Recalculate next due from the latest check
                const allChecks = updatedProperty.operations!.compliance.eicr.checks;
                const latest = allChecks.reduce((a, b) => a.date > b.date ? a : b);
                updatedProperty.operations!.compliance.eicr.next = calcEicrNextDue(latest.date);
            }

            if (gasSafetyChecks.length > 0) {
                if (!updatedProperty.operations!.compliance) updatedProperty.operations!.compliance = {};
                if (!updatedProperty.operations!.compliance.gasSafety) updatedProperty.operations!.compliance.gasSafety = { checks: [] };
                const existingDates = new Set(updatedProperty.operations!.compliance.gasSafety.checks.map(c => c.date));
                const newChecks = gasSafetyChecks.filter(c => !existingDates.has(c.date));
                updatedProperty.operations!.compliance.gasSafety.checks.push(...newChecks);
                // Recalculate next due from the latest check
                const allChecks = updatedProperty.operations!.compliance.gasSafety.checks;
                const latest = allChecks.reduce((a, b) => a.date > b.date ? a : b);
                updatedProperty.operations!.compliance.gasSafety.next = calcGasSafetyNextDue(latest.date);
            }
        }

        if (extractedData.document && !isTenancyAgreement) {
            updatedProperty.documents.push(extractedData.document);
        }

        // Mark correspondence item as extracted (single atomic save)
        if (extractedData.sourceCorrespondenceId && extractedData.sourceAttachmentId && updatedProperty.correspondence) {
            updatedProperty.correspondence = updatedProperty.correspondence.map(c => {
                if (c.id !== extractedData.sourceCorrespondenceId) return c;
                const existingIds = c.extractedAttachmentIds || [];
                return {
                    ...c,
                    extracted: true,
                    extractedAttachmentIds: existingIds.includes(extractedData.sourceAttachmentId!)
                        ? existingIds
                        : [...existingIds, extractedData.sourceAttachmentId!],
                };
            });
        }

        // Check for duplicate transactions after extraction
        if (extractedData.transactions && extractedData.transactions.length > 0) {
            const existingTransactions = property.financials?.transactions || [];
            const stampedNew = extractedData.transactions.map(t => ({
                ...t,
                sourceDocumentName: extractedData.sourceDocumentName || extractedData.document?.name,
                sourceEmailSubject: extractedData.sourceEmailSubject,
                sourceCorrespondenceId: extractedData.sourceCorrespondenceId,
            }));
            const dupes = findDuplicatesWithNew(existingTransactions, stampedNew);
            if (dupes.length > 0) {
                setDuplicateWarnings(prev => [...prev, ...dupes]);
            }
        }

        onSaveProperty(updatedProperty);
    };

    const handleScanDuplicates = () => {
        const transactions = property.financials?.transactions || [];
        const dupes = findDuplicates(transactions);
        setDuplicateWarnings(dupes);
    };

    const handleDismissDuplicate = (index: number) => {
        setDuplicateWarnings(prev => prev.filter((_, i) => i !== index));
    };

    const handleRemoveDuplicateTransaction = (transactionId: string, groupIndex: number) => {
        const updatedProperty = JSON.parse(JSON.stringify(property)) as PropertyInfo;
        if (updatedProperty.financials?.transactions) {
            updatedProperty.financials.transactions = updatedProperty.financials.transactions.filter(
                (t: FinancialTransaction) => t.id !== transactionId
            );
        }
        onSaveProperty(updatedProperty);
        // Remove the resolved warning
        setDuplicateWarnings(prev => prev.filter((_, i) => i !== groupIndex));
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
        if (newProperty.mortgage?.loans) {
            for (const loan of newProperty.mortgage.loans) {
                if (loan.payments) loan.payments = filterChecksByDate(loan.payments);
            }
        }
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
        link.download = `${property.name.replace(/\s+/g, '_')}_${startYear}-${endYear}_${new Date().toISOString().replace(/[:.]/g, '').slice(0, 15)}.json`;
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
                        <button onClick={() => setShowResetConfirm(true)} className="flex items-center gap-2 text-sm font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                            <TrashIcon />
                            Reset Property
                        </button>
                    </div>
                </div>

                <header className="pb-4 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{property.name}</h1>
                            <p className="text-lg text-slate-500 dark:text-gray-400 mt-1">{property.location}</p>
                        </div>
                        <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                            <button
                                onClick={() => setViewMode('details')}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${viewMode === 'details' ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white'}`}
                            >
                                Property Details
                            </button>
                            <button
                                onClick={() => setViewMode('metrics')}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-2 ${viewMode === 'metrics' ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white'}`}
                            >
                                Metrics
                            </button>
                            <button
                                onClick={() => setViewMode('correspondence')}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-2 ${viewMode === 'correspondence' ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white'}`}
                            >
                                Correspondence
                                {(property.correspondence?.filter(c => !c.read).length ?? 0) > 0 && (
                                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-blue-600 text-white">
                                        {property.correspondence!.filter(c => !c.read).length}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => setViewMode('threads')}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-2 ${viewMode === 'threads' ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white'}`}
                            >
                                Threads
                                {(property.threads?.some(t => t.actions.some(a => a.status === 'pending'))) && (
                                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                                )}
                            </button>
                        </div>
                    </div>
                </header>

                <div className={viewMode !== 'correspondence' ? 'hidden' : ''}>
                    <CorrespondenceSection
                        property={property}
                        isEditing={editingSection === 'correspondence'}
                        onSetEditing={() => handleSetEditing('correspondence')}
                        onSave={handleSave}
                        onCancel={handleCancel}
                        onDataExtracted={handleDataExtracted}
                        focusCorrespondenceId={focusCorrespondenceId}
                        onFocusHandled={() => setFocusCorrespondenceId(null)}
                    />
                </div>
                <div className={viewMode !== 'threads' ? 'hidden' : ''}>
                    <ThreadsSection
                        property={property}
                        onSave={handleSave}
                    />
                </div>
                {viewMode === 'metrics' && (
                    <FinancialHealthSection property={property} onSave={handleSave} />
                )}
                {viewMode === 'details' && (
                <>
                {/* Duplicate detection */}
                {duplicateWarnings.length === 0 && (property.financials?.transactions?.length || 0) >= 2 && (
                    <div className="flex justify-end">
                        <button
                            onClick={handleScanDuplicates}
                            className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
                            Scan for duplicate transactions
                        </button>
                    </div>
                )}
                {duplicateWarnings.length > 0 && (
                    <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-amber-700 dark:text-amber-300 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
                                {duplicateWarnings.length} possible duplicate{duplicateWarnings.length !== 1 ? 's' : ''} detected
                            </h3>
                            <button
                                onClick={() => setDuplicateWarnings([])}
                                className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                            >
                                Dismiss all
                            </button>
                        </div>
                        {duplicateWarnings.map((group, gi) => (
                            <div key={gi} className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <div>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${group.confidence === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'}`}>
                                            {group.confidence} confidence
                                        </span>
                                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{group.reason}</p>
                                    </div>
                                    <button onClick={() => handleDismissDuplicate(gi)} className="text-xs text-slate-400 hover:text-slate-600 flex-shrink-0">
                                        &times;
                                    </button>
                                </div>
                                <div className="space-y-1">
                                    {group.transactions.map(t => (
                                        <div key={t.id} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-white/60 dark:bg-slate-800/40">
                                            <div className="flex-1 min-w-0">
                                                <span className="text-slate-700 dark:text-slate-300">{t.date}</span>
                                                <span className="mx-1.5 text-slate-400">·</span>
                                                <span className="text-slate-600 dark:text-slate-400 truncate">{t.description}</span>
                                                {t.sourceDocumentName && (
                                                    <span className="ml-1.5 text-[10px] text-slate-400 dark:text-slate-500">
                                                        from: {t.sourceDocumentName}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                                <span className={`font-semibold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                                    ${t.amount.toFixed(2)}
                                                </span>
                                                <button
                                                    onClick={() => handleRemoveDuplicateTransaction(t.id, gi)}
                                                    className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                                                    title="Remove this transaction"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    <div className="lg:col-span-2 space-y-8">
                        <div data-section="financials">
                        <FinancialsSection
                            property={property}
                            isEditing={editingSection === 'financials'}
                            onSetEditing={() => handleSetEditing('financials')}
                            onSave={handleSave}
                            onCancel={handleCancel}
                            onSourceClick={handleSourceClick}
                        />
                        </div>
                        <div data-section="mortgage">
                        <MortgageSection
                            property={property}
                            isEditing={editingSection === 'mortgage'}
                            onSetEditing={() => handleSetEditing('mortgage')}
                            onSave={handleSave}
                            onCancel={handleCancel}
                        />
                        </div>
                        <div data-section="leaseholdCharges">
                        <LeaseholdChargesSection
                            property={property}
                            isEditing={editingSection === 'leaseholdCharges'}
                            onSetEditing={() => handleSetEditing('leaseholdCharges')}
                            onSave={handleSave}
                            onCancel={handleCancel}
                        />
                        </div>
                        <div data-section="councilTax">
                        <CouncilTaxSection
                            property={property}
                            isEditing={editingSection === 'councilTax'}
                            onSetEditing={() => handleSetEditing('councilTax')}
                            onSave={handleSave}
                            onCancel={handleCancel}
                        />
                        </div>
                        <div data-section="operations">
                        <OperationsSection
                            property={property}
                            isEditing={editingSection === 'operations'}
                            onSetEditing={() => handleSetEditing('operations')}
                            onSave={handleSave}
                            onCancel={handleCancel}
                         />
                        </div>
                        <div data-section="maintenance">
                         <MaintenanceSection
                            property={property}
                            isEditing={editingSection === 'maintenance'}
                            onSetEditing={() => handleSetEditing('maintenance')}
                            onSave={handleSave}
                            onCancel={handleCancel}
                        />
                        </div>
                        <div data-section="compliance">
                         <ComplianceSection
                            property={property}
                            isEditing={editingSection === 'compliance'}
                            onSetEditing={() => handleSetEditing('compliance')}
                            onSave={handleSave}
                            onCancel={handleCancel}
                            linkedInsurance={insurancePolicies?.filter(p => p.propertyId === property.id)}
                        />
                        </div>
                        <DocumentsContainer
                            documents={property.documents || []}
                            onChange={(docs) => handleSave({ ...property, documents: docs })}
                            defaultCategory="Other"
                            title="Property Documents"
                        />
                        <div data-section="notes">
                        <NotesSection
                            property={property}
                            isEditing={editingSection === 'notes'}
                            onSetEditing={() => handleSetEditing('notes')}
                            onSave={handleSave}
                            onCancel={handleCancel}
                        />
                        </div>
                    </div>
                    <div className="space-y-8 lg:sticky lg:top-28 min-w-0 overflow-hidden">
                        <PropertyInfoSection 
                            property={property} 
                            isEditing={editingSection === 'info'}
                            onSetEditing={() => handleSetEditing('info')}
                            onSave={handleSave}
                            onCancel={handleCancel}
                        />
                        <TitleSection
                            property={property}
                            isEditing={editingSection === 'title'}
                            onSetEditing={() => handleSetEditing('title')}
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
                        <AIAssistantSection onDataExtracted={handleDataExtracted} country={property.country} />
                    </div>
                </div>
                </>
                )}

            </div>

            {showResetConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowResetConfirm(false)}>
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 max-w-lg mx-4" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Reset "{property.name}"?</h3>
                        <p className="text-sm text-slate-600 dark:text-gray-400 mb-2">
                            This will <span className="font-semibold text-red-600 dark:text-red-400">permanently delete all data</span> from this property, including:
                        </p>
                        <ul className="text-sm text-slate-600 dark:text-gray-400 mb-4 ml-4 list-disc space-y-0.5">
                            <li>Financial transactions ({property.financials?.transactions?.length || 0})</li>
                            <li>Correspondence & emails ({property.correspondence?.length || 0})</li>
                            <li>Conversation threads ({property.threads?.length || 0})</li>
                            <li>Documents ({property.documents?.length || 0})</li>
                            <li>Mortgage, compliance, maintenance, operations data</li>
                            <li>Contacts, notes, management structure</li>
                        </ul>
                        <p className="text-sm text-slate-600 dark:text-gray-400 mb-1">Only the property name, location, country, and groups will be kept.</p>
                        <p className="text-sm font-semibold text-red-600 dark:text-red-400 mb-6">Export first if you need to restore later.</p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setShowResetConfirm(false)} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 dark:text-gray-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">Cancel</button>
                            <button onClick={() => {
                                onSaveProperty({
                                    id: property.id,
                                    name: property.name,
                                    location: property.location,
                                    country: property.country,
                                    url: property.url,
                                    groups: property.groups,
                                });
                                setShowResetConfirm(false);
                            }} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors">Reset Property</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default PropertyDetailPage;