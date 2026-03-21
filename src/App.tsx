

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import AppsPage from './components/AppsPage';
import EditAppModal from './components/EditAppModal';
import ClaudeProjectsPage from './components/ClaudeProjectsPage';
import PropertiesPage from './components/PropertiesPage';
import PropertyDetailPage from './components/PropertyDetailPage';
import EditPropertyModal from './components/EditPropertyModal';
import InsurancePage from './components/InsurancePage';
import InsuranceDetailPage from './components/InsuranceDetailPage';
import EditInsuranceModal from './components/EditInsuranceModal';
import NewPolicyModal from './components/NewPolicyModal';
import GeneralPage from './components/GeneralPage';
import InvoicesPage from './components/InvoicesPage';
import EditInvoiceModal from './components/EditInvoiceModal';
import NewInvoiceModal from './components/NewInvoiceModal';
import VehiclesPage from './components/VehiclesPage';
import VehicleDetailPage from './components/VehicleDetailPage';
import EditVehicleModal from './components/EditVehicleModal';
import NewRegistrationModal from './components/NewRegistrationModal';
import ContractsPage from './components/ContractsPage';
import ContractDetailPage from './components/ContractDetailPage';
import RadiologyTemplatesPage from './components/RadiologyTemplatesPage';
import DictationPage from './components/DictationPage';
import AllowedUsersModal from './components/AllowedUsersModal';
import { isSupabaseEnabled } from './lib/supabase';
import { INITIAL_APPS, APP_GROUPS, INITIAL_PROJECTS, PROJECT_GROUPS, INITIAL_PROPERTIES, PROPERTY_GROUPS, INITIAL_INSURANCE_POLICIES, INSURANCE_GROUPS, INITIAL_CONTRACTS, CONTRACT_GROUPS, INITIAL_INVOICES, PURCHASE_INVOICE_CATEGORIES, INVOICE_LOCATIONS, INITIAL_VEHICLES, VEHICLE_GROUPS } from './constants';
import CorrespondencePage from './components/CorrespondencePage';
import type { AppInfo, ProjectInfo, PropertyInfo, InsuranceInfo, ContractInfo, InvoiceInfo, VehicleInfo, Page, CorrespondenceStore } from './types';
import type { DueDateItem } from './components/general/dateUtils';
import { loadAllItems, saveAllItems } from './lib/storage';
import { arrayMove } from '@dnd-kit/sortable';
import { v4 as uuidv4 } from 'uuid';

type Theme = 'light' | 'dark';

const App: React.FC = () => {
    // Page state
    const [page, setPage] = useState<Page>('general');
    
    // App Launcher state
    const [apps, setApps] = useState<AppInfo[]>([]);
    const [appGroups, setAppGroups] = useState<string[]>([]);
    const [editingApp, setEditingApp] = useState<AppInfo | null>(null);

    // Claude Projects state
    const [projects, setProjects] = useState<ProjectInfo[]>([]);
    const [projectGroups, setProjectGroups] = useState<string[]>([]);
    
    // Properties state
    const [properties, setProperties] = useState<PropertyInfo[]>([]);
    const [propertyGroups, setPropertyGroups] = useState<string[]>([]);
    const [editingProperty, setEditingProperty] = useState<PropertyInfo | null>(null);
    const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

    // Insurance state
    const [insurancePolicies, setInsurancePolicies] = useState<InsuranceInfo[]>([]);
    const [insuranceGroups, setInsuranceGroups] = useState<string[]>([]);
    const [editingPolicy, setEditingPolicy] = useState<InsuranceInfo | null>(null);
    const [selectedInsuranceId, setSelectedInsuranceId] = useState<string | null>(null);
    const [showNewPolicyModal, setShowNewPolicyModal] = useState(false);
    const [pendingPolicyFile, setPendingPolicyFile] = useState<File | null>(null);
    
    // Invoices state
    const [invoices, setInvoices] = useState<InvoiceInfo[]>([]);
    const [invoiceGroups, setInvoiceGroups] = useState<string[]>([]);
    const [invoiceLocations, setInvoiceLocations] = useState<string[]>([]);
    const [editingInvoice, setEditingInvoice] = useState<InvoiceInfo | null>(null);
    const [showNewInvoiceModal, setShowNewInvoiceModal] = useState(false);

    // Vehicles state
    const [vehicles, setVehicles] = useState<VehicleInfo[]>([]);
    const [vehicleGroups, setVehicleGroups] = useState<string[]>([]);
    const [editingVehicle, setEditingVehicle] = useState<VehicleInfo | null>(null);
    const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
    const [scrollToSection, setScrollToSection] = useState<string | null>(null);
    const [showNewRegistrationModal, setShowNewRegistrationModal] = useState(false);
    const [pendingVehicleFile, setPendingVehicleFile] = useState<File | null>(null);
    const [pendingVehicleDocType, setPendingVehicleDocType] = useState<'renewal' | 'payment'>('renewal');

    // Contracts state
    const [contracts, setContracts] = useState<ContractInfo[]>([]);
    const [contractGroups, setContractGroups] = useState<string[]>([]);
    const [selectedContractId, setSelectedContractId] = useState<string | null>(null);

    // Correspondence state (standalone, not tied to any property)
    const [correspondenceStore, setCorrespondenceStore] = useState<CorrespondenceStore>({
        correspondence: [],
        gmailSync: { rules: [], autoSync: false },
        threads: [],
    });

    // Save error state
    const [saveError, setSaveError] = useState<string | null>(null);

    // Theme state
    const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
    const [showUsersModal, setShowUsersModal] = useState(false);

    const [theme, setTheme] = useState<Theme>(() => {
        const storedTheme = localStorage.getItem('app-theme');
        if (storedTheme === 'light' || storedTheme === 'dark') return storedTheme;
        return 'dark';
    });

    // Theme effect
    useEffect(() => {
        const root = window.document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        localStorage.setItem('app-theme', theme);
    }, [theme]);

    // Track whether initial load is complete to avoid saving defaults back
    const dataLoadedRef = useRef(false);

    // Storage key mapping
    const STORAGE_KEYS = {
        apps: 'launcher-apps',
        appGroups: 'launcher-app-groups',
        projects: 'launcher-projects',
        projectGroups: 'launcher-project-groups',
        properties: 'launcher-properties',
        propertyGroups: 'launcher-property-groups',
        insurance: 'launcher-insurance',
        insuranceGroups: 'launcher-insurance-groups',
        invoices: 'launcher-invoices',
        invoiceGroups: 'launcher-invoice-groups',
        invoiceLocations: 'launcher-invoice-locations',
        vehicles: 'launcher-vehicles',
        vehicleGroups: 'launcher-vehicle-groups',
        contracts: 'launcher-contracts',
        contractGroups: 'launcher-contract-groups',
        correspondenceStore: 'launcher-correspondence-store',
    } as const;

    // Load data from storage on mount (Supabase-first, localStorage fallback)
    useEffect(() => {
        const allKeys = Object.values(STORAGE_KEYS);
        loadAllItems(allKeys).then((data) => {
            setApps((data.get(STORAGE_KEYS.apps) as AppInfo[]) || INITIAL_APPS);
            setAppGroups((data.get(STORAGE_KEYS.appGroups) as string[]) || APP_GROUPS);
            setProjects((data.get(STORAGE_KEYS.projects) as ProjectInfo[]) || INITIAL_PROJECTS);
            setProjectGroups((data.get(STORAGE_KEYS.projectGroups) as string[]) || PROJECT_GROUPS);
            setProperties((data.get(STORAGE_KEYS.properties) as PropertyInfo[]) || INITIAL_PROPERTIES);
            setPropertyGroups((data.get(STORAGE_KEYS.propertyGroups) as string[]) || PROPERTY_GROUPS);
            setInsurancePolicies((data.get(STORAGE_KEYS.insurance) as InsuranceInfo[]) || INITIAL_INSURANCE_POLICIES);
            setInsuranceGroups((data.get(STORAGE_KEYS.insuranceGroups) as string[]) || INSURANCE_GROUPS);
            setInvoices((data.get(STORAGE_KEYS.invoices) as InvoiceInfo[]) || INITIAL_INVOICES);
            setInvoiceGroups((data.get(STORAGE_KEYS.invoiceGroups) as string[]) || PURCHASE_INVOICE_CATEGORIES);
            setInvoiceLocations((data.get(STORAGE_KEYS.invoiceLocations) as string[]) || INVOICE_LOCATIONS);
            setVehicles((data.get(STORAGE_KEYS.vehicles) as VehicleInfo[]) || INITIAL_VEHICLES);
            setVehicleGroups((data.get(STORAGE_KEYS.vehicleGroups) as string[]) || VEHICLE_GROUPS);
            setContracts((data.get(STORAGE_KEYS.contracts) as ContractInfo[]) || INITIAL_CONTRACTS);
            setContractGroups((data.get(STORAGE_KEYS.contractGroups) as string[]) || CONTRACT_GROUPS);
            const loadedCorr = data.get(STORAGE_KEYS.correspondenceStore) as CorrespondenceStore | undefined;
            if (loadedCorr) setCorrespondenceStore(loadedCorr);
            dataLoadedRef.current = true;
        }).catch((error) => {
            console.error("Failed to load data from storage", error);
            setApps(INITIAL_APPS);
            setAppGroups(APP_GROUPS);
            setProjects(INITIAL_PROJECTS);
            setProjectGroups(PROJECT_GROUPS);
            setProperties(INITIAL_PROPERTIES);
            setPropertyGroups(PROPERTY_GROUPS);
            setInsurancePolicies(INITIAL_INSURANCE_POLICIES);
            setInsuranceGroups(INSURANCE_GROUPS);
            setInvoices(INITIAL_INVOICES);
            setInvoiceGroups(PURCHASE_INVOICE_CATEGORIES);
            setInvoiceLocations(INVOICE_LOCATIONS);
            setVehicles(INITIAL_VEHICLES);
            setVehicleGroups(VEHICLE_GROUPS);
            setContracts(INITIAL_CONTRACTS);
            setContractGroups(CONTRACT_GROUPS);
            dataLoadedRef.current = true;
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Save data to storage on change (localStorage + Supabase)
    useEffect(() => {
        if (!dataLoadedRef.current) return; // Don't save until initial load completes

        const items: Record<string, unknown> = {};
        if (apps.length > 0) items[STORAGE_KEYS.apps] = apps;
        if (appGroups.length > 0) items[STORAGE_KEYS.appGroups] = appGroups;
        if (projects.length > 0) items[STORAGE_KEYS.projects] = projects;
        if (projectGroups.length > 0) items[STORAGE_KEYS.projectGroups] = projectGroups;
        if (properties.length > 0) items[STORAGE_KEYS.properties] = properties;
        if (propertyGroups.length > 0) items[STORAGE_KEYS.propertyGroups] = propertyGroups;
        if (insurancePolicies.length > 0) items[STORAGE_KEYS.insurance] = insurancePolicies;
        if (insuranceGroups.length > 0) items[STORAGE_KEYS.insuranceGroups] = insuranceGroups;
        if (invoices.length > 0) items[STORAGE_KEYS.invoices] = invoices;
        if (invoiceGroups.length > 0) items[STORAGE_KEYS.invoiceGroups] = invoiceGroups;
        if (invoiceLocations.length > 0) items[STORAGE_KEYS.invoiceLocations] = invoiceLocations;
        if (vehicles.length > 0) items[STORAGE_KEYS.vehicles] = vehicles;
        if (vehicleGroups.length > 0) items[STORAGE_KEYS.vehicleGroups] = vehicleGroups;
        if (contracts.length > 0) items[STORAGE_KEYS.contracts] = contracts;
        if (contractGroups.length > 0) items[STORAGE_KEYS.contractGroups] = contractGroups;
        if (correspondenceStore.correspondence.length > 0 || correspondenceStore.threads.length > 0 || correspondenceStore.gmailSync.rules.length > 0) {
            items[STORAGE_KEYS.correspondenceStore] = correspondenceStore;
        }

        saveAllItems(items).then(() => {
            setSaveError(null);
        }).catch((error) => {
            console.error("Failed to save data to storage", error);
            setSaveError(`Save failed: ${error?.message || 'Unknown error'}. Your changes may not persist on refresh.`);
        });
    }, [apps, appGroups, projects, projectGroups, properties, propertyGroups, insurancePolicies, insuranceGroups, invoices, invoiceGroups, invoiceLocations, vehicles, vehicleGroups, contracts, contractGroups, correspondenceStore]);


    // --- General Handlers ---
    const handleToggleTheme = useCallback(() => {
        setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
    }, []);
    
    const handleToggleAdminMode = useCallback(() => {
        setIsAdminMode(prev => !prev);
    }, []);

    const handleExportData = useCallback(() => {
        const data: Record<string, unknown> = {
            _exportedAt: new Date().toISOString(),
            _version: 1,
            [STORAGE_KEYS.apps]: apps,
            [STORAGE_KEYS.appGroups]: appGroups,
            [STORAGE_KEYS.projects]: projects,
            [STORAGE_KEYS.projectGroups]: projectGroups,
            [STORAGE_KEYS.properties]: properties,
            [STORAGE_KEYS.propertyGroups]: propertyGroups,
            [STORAGE_KEYS.insurance]: insurancePolicies,
            [STORAGE_KEYS.insuranceGroups]: insuranceGroups,
            [STORAGE_KEYS.invoices]: invoices,
            [STORAGE_KEYS.invoiceGroups]: invoiceGroups,
            [STORAGE_KEYS.invoiceLocations]: invoiceLocations,
            [STORAGE_KEYS.vehicles]: vehicles,
            [STORAGE_KEYS.vehicleGroups]: vehicleGroups,
            [STORAGE_KEYS.correspondenceStore]: correspondenceStore,
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dashboard-backup-${new Date().toISOString().replace(/[:.]/g, '').slice(0, 15)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }, [apps, appGroups, projects, projectGroups, properties, propertyGroups, insurancePolicies, insuranceGroups, invoices, invoiceGroups, invoiceLocations, vehicles, vehicleGroups, contracts, contractGroups, correspondenceStore]);

    const handleImportData = useCallback(() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            try {
                const text = await file.text();
                const data = JSON.parse(text);

                // Build summary of what will be imported
                const counts: string[] = [];
                const arr = (v: unknown) => Array.isArray(v) ? v.length : 0;
                if (arr(data[STORAGE_KEYS.apps])) counts.push(`${arr(data[STORAGE_KEYS.apps])} apps`);
                if (arr(data[STORAGE_KEYS.projects])) counts.push(`${arr(data[STORAGE_KEYS.projects])} projects`);
                if (arr(data[STORAGE_KEYS.properties])) counts.push(`${arr(data[STORAGE_KEYS.properties])} properties`);
                if (arr(data[STORAGE_KEYS.insurance])) counts.push(`${arr(data[STORAGE_KEYS.insurance])} insurance policies`);
                if (arr(data[STORAGE_KEYS.invoices])) counts.push(`${arr(data[STORAGE_KEYS.invoices])} invoices`);
                if (arr(data[STORAGE_KEYS.vehicles])) counts.push(`${arr(data[STORAGE_KEYS.vehicles])} vehicles`);
                const exportDate = data._exportedAt ? `\nExported: ${new Date(data._exportedAt).toLocaleString()}` : '';
                const sizeMB = (text.length / (1024 * 1024)).toFixed(1);

                if (!window.confirm(
                    `Import ${file.name} (${sizeMB} MB)?${exportDate}\n\nThis will replace:\n${counts.join(', ') || 'No data found'}\n\nThis cannot be undone.`
                )) return;

                if (data[STORAGE_KEYS.apps]) setApps(data[STORAGE_KEYS.apps]);
                if (data[STORAGE_KEYS.appGroups]) setAppGroups(data[STORAGE_KEYS.appGroups]);
                if (data[STORAGE_KEYS.projects]) setProjects(data[STORAGE_KEYS.projects]);
                if (data[STORAGE_KEYS.projectGroups]) setProjectGroups(data[STORAGE_KEYS.projectGroups]);
                if (data[STORAGE_KEYS.properties]) setProperties(data[STORAGE_KEYS.properties]);
                if (data[STORAGE_KEYS.propertyGroups]) setPropertyGroups(data[STORAGE_KEYS.propertyGroups]);
                if (data[STORAGE_KEYS.insurance]) setInsurancePolicies(data[STORAGE_KEYS.insurance]);
                if (data[STORAGE_KEYS.insuranceGroups]) setInsuranceGroups(data[STORAGE_KEYS.insuranceGroups]);
                if (data[STORAGE_KEYS.invoices]) setInvoices(data[STORAGE_KEYS.invoices]);
                if (data[STORAGE_KEYS.invoiceGroups]) setInvoiceGroups(data[STORAGE_KEYS.invoiceGroups]);
                if (data[STORAGE_KEYS.invoiceLocations]) setInvoiceLocations(data[STORAGE_KEYS.invoiceLocations]);
                if (data[STORAGE_KEYS.vehicles]) setVehicles(data[STORAGE_KEYS.vehicles]);
                if (data[STORAGE_KEYS.vehicleGroups]) setVehicleGroups(data[STORAGE_KEYS.vehicleGroups]);
                if (data[STORAGE_KEYS.correspondenceStore]) setCorrespondenceStore(data[STORAGE_KEYS.correspondenceStore]);
            } catch (err) {
                console.error('Failed to import data:', err);
                alert('Failed to import: invalid JSON file.');
            }
        };
        input.click();
    }, []);

    const handleSetPage = useCallback((newPage: Page) => {
        setPage(newPage);
        setSelectedPropertyId(null);
        setSelectedInsuranceId(null);
        setSelectedVehicleId(null);
        setScrollToSection(null);
    }, []);

    const handleDashboardNavigate = useCallback((item: DueDateItem) => {
        const pageMap: Record<string, Page> = { Property: 'properties', Insurance: 'insurance', Vehicle: 'vehicles' };
        const targetPage = pageMap[item.type];
        if (!targetPage) return;
        setPage(targetPage);
        if (item.type === 'Property') { setSelectedPropertyId(item.id); setSelectedInsuranceId(null); setSelectedVehicleId(null); }
        else if (item.type === 'Insurance') { setSelectedInsuranceId(item.id); setSelectedPropertyId(null); setSelectedVehicleId(null); }
        else if (item.type === 'Vehicle') { setSelectedVehicleId(item.id); setSelectedPropertyId(null); setSelectedInsuranceId(null); }
        setScrollToSection(item.section || null);
    }, []);

    // --- App Launcher Handlers ---
    const handleNewApp = useCallback(() => {
        setEditingApp({
            id: uuidv4(),
            name: '',
            description: '',
            url: '',
            icon: 'LauncherIcon',
            groups: [],
        });
    }, []);
    const handleEditApp = useCallback((app: AppInfo) => setEditingApp(app), []);
    const handleSaveApp = useCallback((updatedApp: AppInfo) => {
        setApps(prevApps => {
            const exists = prevApps.some(app => app.id === updatedApp.id);
            if (exists) {
                return prevApps.map(app => (app.id === updatedApp.id ? updatedApp : app));
            }
            return [updatedApp, ...prevApps];
        });
        setEditingApp(null);
    }, []);
    const handleAppOrderChange = useCallback((activeId: string, overId: string) => {
        setApps(prevApps => {
            const oldIndex = prevApps.findIndex(app => app.id === activeId);
            const newIndex = prevApps.findIndex(app => app.id === overId);
            if (oldIndex === -1 || newIndex === -1) return prevApps;
            return arrayMove(prevApps, oldIndex, newIndex);
        });
    }, []);
    const handleCloseAppModal = useCallback(() => setEditingApp(null), []);
    const handleAppGroupsChange = useCallback((newGroups: string[]) => {
        setAppGroups(newGroups);
    }, []);
    
    // --- Claude Projects Handlers ---
    const handleProjectsChange = useCallback((newProjects: ProjectInfo[]) => {
        setProjects(newProjects);
    }, []);

    const handleProjectGroupsChange = useCallback((newGroups: string[]) => {
        setProjectGroups(newGroups);
    }, []);

    // --- Properties Handlers ---
    const handlePropertyGroupsChange = useCallback((newGroups: string[]) => {
        setPropertyGroups(newGroups);
    }, []);

    const handleNewProperty = useCallback(() => {
        setEditingProperty({
            id: uuidv4(),
            name: '',
            url: '#',
            location: '',
            groups: [],
        });
    }, []);

    const handleEditProperty = useCallback((property: PropertyInfo) => {
        setEditingProperty(property);
    }, []);

    const handleSaveProperty = useCallback((propertyToSave: PropertyInfo) => {
        setProperties(prev => {
            const existing = prev.find(p => p.id === propertyToSave.id);
            if(existing) {
                 return prev.map(p => p.id === propertyToSave.id ? propertyToSave : p);
            } else {
                return [propertyToSave, ...prev];
            }
        });
        setEditingProperty(null);
    }, []);
    
    const handlePropertyOrderChange = useCallback((activeId: string, overId: string) => {
        setProperties(prev => {
            const oldIndex = prev.findIndex(p => p.id === activeId);
            const newIndex = prev.findIndex(p => p.id === overId);
            if (oldIndex !== -1 && newIndex !== -1) {
                return arrayMove(prev, oldIndex, newIndex);
            }
            return prev;
        });
    }, []);


    // --- Insurance Handlers ---
    const handleInsuranceGroupsChange = useCallback((newGroups: string[]) => {
        setInsuranceGroups(newGroups);
    }, []);

    const handleNewPolicy = useCallback(() => {
        setShowNewPolicyModal(true);
    }, []);

    const handleCreatePolicy = useCallback((policyType: string, currency: string, file: File | null) => {
        const newId = uuidv4();
        const todayString = new Date().toISOString().split('T')[0];

        const newPolicy: InsuranceInfo = {
            id: newId,
            name: `New ${policyType} Policy`,
            provider: '',
            renewalDate: '',
            groups: [],
            policyType,
            status: 'Pending',
            policyholder: '',
            currency,
            lastReviewed: todayString,
        };

        setInsurancePolicies(prev => [newPolicy, ...prev]);
        setShowNewPolicyModal(false);

        // Navigate to detail page; if file provided, store it for auto-extraction
        if (file) {
            setPendingPolicyFile(file);
        }
        setSelectedInsuranceId(newId);
    }, []);

    const handleEditPolicy = useCallback((policy: InsuranceInfo) => {
        setEditingPolicy(policy);
    }, []);

    const handleSavePolicy = useCallback((policyToSave: InsuranceInfo) => {
        let finalPolicy = { ...policyToSave };

        // If endDate is present (likely from AI extraction), calculate renewalDate
        if (finalPolicy.endDate && /^\d{4}-\d{2}-\d{2}$/.test(finalPolicy.endDate)) {
            try {
                const endDate = new Date(finalPolicy.endDate);
                const renewalMonth = endDate.toLocaleString('en-GB', { month: 'short' });
                const renewalYear = endDate.getFullYear();
                finalPolicy.renewalDate = `${renewalMonth} ${renewalYear}`;
            } catch (e) {
                console.error("Could not parse end date to create renewal date", e);
            }
        }

        setInsurancePolicies(prev => {
            const existing = prev.find(p => p.id === finalPolicy.id);
            if (existing) {
                // Auto-archive: if dates changed on a policy that had both dates, snapshot the older period into history
                const datesChanged = (existing.startDate !== finalPolicy.startDate || existing.endDate !== finalPolicy.endDate);
                if (datesChanged && existing.startDate && existing.endDate && finalPolicy.startDate && finalPolicy.endDate) {
                    const existingEnd = new Date(existing.endDate).getTime();
                    const incomingEnd = new Date(finalPolicy.endDate).getTime();
                    const incomingIsOlder = incomingEnd < existingEnd;

                    // Build history entry from whichever period is older
                    const olderSource = incomingIsOlder ? finalPolicy : existing;
                    const historyEntry: import('./types').PolicyHistoryEntry = {
                        id: crypto.randomUUID(),
                        periodStart: olderSource.startDate!,
                        periodEnd: olderSource.endDate!,
                        premiumAmount: olderSource.premiumAmount,
                        paymentFrequency: olderSource.paymentFrequency,
                        coverageAmount: olderSource.coverageAmount,
                        deductible: olderSource.deductible,
                        provider: olderSource.provider,
                        policyNumber: olderSource.policyNumber,
                        currency: olderSource.currency,
                        document: olderSource.document,
                        archivedAt: new Date().toISOString(),
                    };

                    // Keep the newer period as the current policy
                    const newerSource = incomingIsOlder ? existing : finalPolicy;
                    finalPolicy = {
                        ...newerSource,
                        history: [historyEntry, ...(existing.history || [])],
                    };

                    // Recalculate renewalDate from the newer policy's endDate
                    if (finalPolicy.endDate && /^\d{4}-\d{2}-\d{2}$/.test(finalPolicy.endDate)) {
                        try {
                            const endDate = new Date(finalPolicy.endDate);
                            finalPolicy.renewalDate = `${endDate.toLocaleString('en-GB', { month: 'short' })} ${endDate.getFullYear()}`;
                        } catch { /* keep existing */ }
                    }
                } else if (datesChanged && existing.startDate && existing.endDate) {
                    // Incoming has no dates but existing does — just archive existing
                    const historyEntry: import('./types').PolicyHistoryEntry = {
                        id: crypto.randomUUID(),
                        periodStart: existing.startDate,
                        periodEnd: existing.endDate,
                        premiumAmount: existing.premiumAmount,
                        paymentFrequency: existing.paymentFrequency,
                        coverageAmount: existing.coverageAmount,
                        deductible: existing.deductible,
                        provider: existing.provider,
                        policyNumber: existing.policyNumber,
                        currency: existing.currency,
                        document: existing.document,
                        archivedAt: new Date().toISOString(),
                    };
                    finalPolicy = {
                        ...finalPolicy,
                        history: [historyEntry, ...(existing.history || [])],
                    };
                }
                return prev.map(p => p.id === finalPolicy.id ? finalPolicy : p);
            } else {
                return [finalPolicy, ...prev];
            }
        });
        setEditingPolicy(null);
    }, []);

    const handleDeletePolicy = useCallback((policyId: string) => {
        setInsurancePolicies(prev => prev.filter(p => p.id !== policyId));
        setSelectedInsuranceId(null);
    }, []);

    const handleClearAllPolicies = useCallback(() => {
        setInsurancePolicies([]);
        setSelectedInsuranceId(null);
    }, []);

    const handleMergePolicyInto = useCallback((sourceId: string, targetId: string) => {
        setInsurancePolicies(prev => {
            const source = prev.find(p => p.id === sourceId);
            const target = prev.find(p => p.id === targetId);
            if (!source || !target) return prev;

            // Create a history entry from the source policy
            const historyEntry: import('./types').PolicyHistoryEntry = {
                id: crypto.randomUUID(),
                periodStart: source.startDate || '',
                periodEnd: source.endDate || '',
                premiumAmount: source.premiumAmount,
                paymentFrequency: source.paymentFrequency,
                coverageAmount: source.coverageAmount,
                deductible: source.deductible,
                provider: source.provider,
                policyNumber: source.policyNumber,
                currency: source.currency,
                document: source.document,
                archivedAt: new Date().toISOString(),
            };

            // Merge into target's history (sorted newest first)
            const mergedHistory = [historyEntry, ...(target.history || []), ...(source.history || [])];
            mergedHistory.sort((a, b) => new Date(b.periodEnd).getTime() - new Date(a.periodEnd).getTime());

            const updatedTarget = { ...target, history: mergedHistory };

            // Remove source, update target
            return prev.filter(p => p.id !== sourceId).map(p => p.id === targetId ? updatedTarget : p);
        });
        setSelectedInsuranceId(null);
    }, []);

    const handleInsuranceOrderChange = useCallback((activeId: string, overId: string) => {
        setInsurancePolicies(prev => {
            const oldIndex = prev.findIndex(p => p.id === activeId);
            const newIndex = prev.findIndex(p => p.id === overId);
            if (oldIndex !== -1 && newIndex !== -1) {
                return arrayMove(prev, oldIndex, newIndex);
            }
            return prev;
        });
    }, []);


    // --- Invoices Handlers ---
    const handleInvoiceGroupsChange = useCallback((newGroups: string[]) => {
        setInvoiceGroups(newGroups);
    }, []);

    const handleNewInvoice = useCallback(() => {
        setShowNewInvoiceModal(true);
    }, []);

    const handleCreateInvoice = useCallback((invoice: InvoiceInfo) => {
        setInvoices(prev => [invoice, ...prev]);
        setShowNewInvoiceModal(false);
    }, []);

    const handleEditInvoice = useCallback((invoice: InvoiceInfo) => {
        setEditingInvoice(invoice);
    }, []);

    const handleSaveInvoice = useCallback((invoiceToSave: InvoiceInfo) => {
        setInvoices(prev => {
            const existing = prev.find(i => i.id === invoiceToSave.id);
            if (existing) {
                return prev.map(i => i.id === invoiceToSave.id ? invoiceToSave : i);
            } else {
                return [invoiceToSave, ...prev];
            }
        });
        setEditingInvoice(null);
    }, []);

    const handleInvoiceOrderChange = useCallback((activeId: string, overId: string) => {
        setInvoices(prev => {
            const oldIndex = prev.findIndex(i => i.id === activeId);
            const newIndex = prev.findIndex(i => i.id === overId);
            if (oldIndex !== -1 && newIndex !== -1) {
                return arrayMove(prev, oldIndex, newIndex);
            }
            return prev;
        });
    }, []);
    
    const handleViewInvoicePdf = (invoiceId: string) => {
        const invoice = invoices.find(i => i.id === invoiceId);
        if (invoice?.document?.data && invoice.document.mimeType) {
            const url = `data:${invoice.document.mimeType};base64,${invoice.document.data}`;
            window.open(url, '_blank');
        } else {
            alert('No PDF attached to this invoice.');
        }
    };

    // --- Vehicles Handlers ---
    const handleVehicleGroupsChange = useCallback((newGroups: string[]) => {
        setVehicleGroups(newGroups);
    }, []);

    const handleNewVehicle = useCallback(() => {
        setShowNewRegistrationModal(true);
    }, []);

    const handleCreateVehicle = useCallback((currency: string, docType: 'renewal' | 'payment', file: File | null) => {
        const newId = uuidv4();
        const newVehicle: VehicleInfo = {
            id: newId,
            name: 'New Registration',
            rego: '',
            state: '',
            expiryDate: new Date().toISOString().split('T')[0],
            currency,
            status: 'Current',
            groups: [],
        };
        setVehicles(prev => [newVehicle, ...prev]);
        setSelectedVehicleId(newId);
        setShowNewRegistrationModal(false);
        if (file) {
            setPendingVehicleFile(file);
            setPendingVehicleDocType(docType);
        }
    }, []);

    const handleEditVehicle = useCallback((vehicle: VehicleInfo) => {
        setEditingVehicle(vehicle);
    }, []);

    const handleSaveVehicle = useCallback((vehicleToSave: VehicleInfo) => {
        setVehicles(prev => {
            const existing = prev.find(v => v.id === vehicleToSave.id);
            if (existing) {
                // Auto-archive when the expiry date moves forward and there's meaningful existing data
                const hasExistingData = existing.expiryDate && (existing.totalAmount || existing.renewalDocument || existing.document);
                const expiryMovedForward = vehicleToSave.expiryDate && existing.expiryDate &&
                    existing.expiryDate !== vehicleToSave.expiryDate &&
                    new Date(vehicleToSave.expiryDate) > new Date(existing.expiryDate);
                if (hasExistingData && expiryMovedForward) {
                    const historyEntry: import('./types').RegistrationHistoryEntry = {
                        id: uuidv4(),
                        periodStart: existing.startDate || existing.expiryDate!,
                        periodEnd: existing.expiryDate!,
                        totalAmount: existing.totalAmount,
                        ctpAmount: existing.ctpAmount,
                        registrationFee: existing.registrationFee,
                        term: existing.term,
                        ctpInsurer: existing.ctpInsurer,
                        currency: existing.currency,
                        document: existing.renewalDocument || existing.document,
                        archivedAt: new Date().toISOString(),
                    };
                    vehicleToSave.history = [historyEntry, ...(vehicleToSave.history || [])];
                }
                return prev.map(v => v.id === vehicleToSave.id ? vehicleToSave : v);
            } else {
                return [vehicleToSave, ...prev];
            }
        });
        setEditingVehicle(null);
    }, []);

    const handleDeleteVehicle = useCallback((id: string) => {
        setVehicles(prev => prev.filter(v => v.id !== id));
        setSelectedVehicleId(null);
    }, []);

    const handleClearAllVehicles = useCallback(() => {
        setVehicles([]);
        setSelectedVehicleId(null);
    }, []);

    const handleVehicleOrderChange = useCallback((activeId: string, overId: string) => {
        setVehicles(prev => {
            const oldIndex = prev.findIndex(v => v.id === activeId);
            const newIndex = prev.findIndex(v => v.id === overId);
            if (oldIndex !== -1 && newIndex !== -1) {
                return arrayMove(prev, oldIndex, newIndex);
            }
            return prev;
        });
    }, []);

    // --- Contracts Handlers ---
    const handleNewContract = useCallback(() => {
        const newId = uuidv4();
        const newContract: ContractInfo = { id: newId, name: 'New Contract', status: 'Pending', groups: [] };
        setContracts(prev => [newContract, ...prev]);
        setSelectedContractId(newId);
    }, []);

    const handleSaveContract = useCallback((contractToSave: ContractInfo) => {
        setContracts(prev => {
            const existing = prev.find(c => c.id === contractToSave.id);
            if (existing) return prev.map(c => c.id === contractToSave.id ? contractToSave : c);
            return [contractToSave, ...prev];
        });
    }, []);

    const handleDeleteContract = useCallback((contractId: string) => {
        setContracts(prev => prev.filter(c => c.id !== contractId));
        setSelectedContractId(null);
    }, []);

    const handleContractOrderChange = useCallback((activeId: string, overId: string) => {
        setContracts(prev => {
            const oldIndex = prev.findIndex(c => c.id === activeId);
            const newIndex = prev.findIndex(c => c.id === overId);
            if (oldIndex !== -1 && newIndex !== -1) return arrayMove(prev, oldIndex, newIndex);
            return prev;
        });
    }, []);

    const renderPage = () => {
        switch(page) {
            case 'general': {
                const unreadCount = correspondenceStore.correspondence.filter(c => !c.read).length;
                return <GeneralPage
                            properties={properties}
                            insurancePolicies={insurancePolicies}
                            contracts={contracts}
                            invoices={invoices}
                            vehicles={vehicles}
                            onNewInvoice={handleNewInvoice}
                            onNavigate={handleDashboardNavigate}
                            unreadEmailCount={unreadCount}
                            onGoToEmail={() => setPage('correspondence')}
                        />;
            }
            case 'launcher':
                return <AppsPage
                            apps={apps}
                            onAppOrderChange={handleAppOrderChange}
                            isAdminMode={isAdminMode}
                            appGroups={appGroups}
                            onEditApp={handleEditApp}
                            onNewApp={handleNewApp}
                            onAppGroupsChange={handleAppGroupsChange}
                        />;
            case 'claude':
                return <ClaudeProjectsPage
                        projects={projects}
                        onProjectsChange={handleProjectsChange}
                        isAdminMode={isAdminMode}
                        projectGroups={projectGroups}
                        onProjectGroupsChange={handleProjectGroupsChange}
                    />;
            case 'properties':
                if (selectedPropertyId) {
                    const selectedProperty = properties.find(p => p.id === selectedPropertyId);
                    if (!selectedProperty) { setSelectedPropertyId(null); return null; }
                    return <PropertyDetailPage
                                property={selectedProperty}
                                onBack={() => { setSelectedPropertyId(null); setScrollToSection(null); }}
                                onSaveProperty={handleSaveProperty}
                                insurancePolicies={insurancePolicies}
                                scrollToSection={scrollToSection}
                                onScrollComplete={() => setScrollToSection(null)}
                            />;
                }
                return <PropertiesPage
                        properties={properties}
                        onOrderChange={handlePropertyOrderChange}
                        isAdminMode={isAdminMode}
                        propertyGroups={propertyGroups}
                        onSelectProperty={(id) => setSelectedPropertyId(id)}
                        onNewProperty={handleNewProperty}
                        onEditProperty={handleEditProperty}
                        onImportProperty={handleSaveProperty}
                    />;
            case 'insurance':
                 if (selectedInsuranceId) {
                    const selectedPolicy = insurancePolicies.find(p => p.id === selectedInsuranceId);
                    if (!selectedPolicy) { setSelectedInsuranceId(null); return null; }
                    return <InsuranceDetailPage
                                policy={selectedPolicy}
                                allPolicies={insurancePolicies}
                                onBack={() => { setSelectedInsuranceId(null); setPendingPolicyFile(null); setScrollToSection(null); }}
                                onSavePolicy={handleSavePolicy}
                                onDeletePolicy={handleDeletePolicy}
                                onMergePolicyInto={handleMergePolicyInto}
                                pendingFile={pendingPolicyFile}
                                onPendingFileConsumed={() => setPendingPolicyFile(null)}
                                properties={properties}
                                scrollToSection={scrollToSection}
                                onScrollComplete={() => setScrollToSection(null)}
                            />;
                }
                return <InsurancePage
                        policies={insurancePolicies}
                        onOrderChange={handleInsuranceOrderChange}
                        isAdminMode={isAdminMode}
                        insuranceGroups={insuranceGroups}
                        onSelectPolicy={(id) => setSelectedInsuranceId(id)}
                        onNewPolicy={handleNewPolicy}
                        onEditPolicy={handleEditPolicy}
                        onClearAll={handleClearAllPolicies}
                    />;
            case 'invoices':
                return <InvoicesPage
                        invoices={invoices}
                        onOrderChange={handleInvoiceOrderChange}
                        isAdminMode={isAdminMode}
                        invoiceGroups={invoiceGroups}
                        onSelectInvoice={handleViewInvoicePdf}
                        onNewInvoice={handleNewInvoice}
                        onEditInvoice={handleEditInvoice}
                    />;
            case 'vehicles':
                if (selectedVehicleId) {
                    const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
                    if (!selectedVehicle) { setSelectedVehicleId(null); return null; }
                    return <VehicleDetailPage
                                vehicle={selectedVehicle}
                                onBack={() => { setSelectedVehicleId(null); setScrollToSection(null); }}
                                onSaveVehicle={handleSaveVehicle}
                                onDeleteVehicle={handleDeleteVehicle}
                                pendingFile={pendingVehicleFile}
                                pendingDocType={pendingVehicleDocType}
                                onPendingFileConsumed={() => { setPendingVehicleFile(null); }}
                                scrollToSection={scrollToSection}
                                onScrollComplete={() => setScrollToSection(null)}
                           />;
                }
                return <VehiclesPage
                        vehicles={vehicles}
                        onOrderChange={handleVehicleOrderChange}
                        isAdminMode={isAdminMode}
                        vehicleGroups={vehicleGroups}
                        onSelectVehicle={(id) => setSelectedVehicleId(id)}
                        onNewVehicle={handleNewVehicle}
                        onEditVehicle={handleEditVehicle}
                        onClearAll={handleClearAllVehicles}
                       />;
            case 'contracts':
                if (selectedContractId) {
                    const selectedContract = contracts.find(c => c.id === selectedContractId);
                    if (!selectedContract) { setSelectedContractId(null); return null; }
                    return <ContractDetailPage
                                contract={selectedContract}
                                allContracts={contracts}
                                insurancePolicies={insurancePolicies}
                                onBack={() => setSelectedContractId(null)}
                                onSaveContract={handleSaveContract}
                                onDeleteContract={handleDeleteContract}
                            />;
                }
                return <ContractsPage
                        contracts={contracts}
                        onOrderChange={handleContractOrderChange}
                        isAdminMode={isAdminMode}
                        contractGroups={contractGroups}
                        onSelectContract={(id) => setSelectedContractId(id)}
                        onNewContract={handleNewContract}
                        onEditContract={() => {}}
                        onGroupsChange={(groups) => setContractGroups(groups)}
                    />;
            case 'correspondence':
                return <CorrespondencePage
                            store={correspondenceStore}
                            onSave={setCorrespondenceStore}
                        />;
            case 'radiology':
                return (
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Quick Templates</h1>
                                <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
                                    Radiology report templates with customizable verbosity levels.
                                </p>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden" style={{ height: 'calc(100vh - 240px)', minHeight: 500 }}>
                            <RadiologyTemplatesPage />
                        </div>
                    </div>
                );
            case 'dictation':
                return <DictationPage theme={theme} />;
            default:
                return <AppsPage
                            apps={apps}
                            onAppOrderChange={handleAppOrderChange}
                            isAdminMode={isAdminMode}
                            appGroups={appGroups}
                            onEditApp={handleEditApp}
                            onNewApp={handleNewApp}
                            onAppGroupsChange={handleAppGroupsChange}
                        />;
        }
    }

    const isFullHeight = false;

    return (
        <div className={`bg-white dark:bg-slate-900 text-slate-800 dark:text-gray-200 font-sans ${isFullHeight ? 'h-screen flex flex-col overflow-hidden' : 'min-h-screen'}`}>
            {saveError && (
                <div className="sticky top-0 z-50 bg-red-600 text-white px-4 py-2 text-sm flex items-center justify-between">
                    <span>{saveError}</span>
                    <button onClick={() => setSaveError(null)} className="ml-4 text-white/80 hover:text-white font-bold">✕</button>
                </div>
            )}
            <Header
                isAdminMode={isAdminMode}
                onToggleAdminMode={handleToggleAdminMode}
                theme={theme}
                onToggleTheme={handleToggleTheme}
                page={page}
                onSetPage={handleSetPage}
                onExport={handleExportData}
                onImport={handleImportData}
                onManageUsers={isSupabaseEnabled() ? () => setShowUsersModal(true) : undefined}
            />
            <main className={`container mx-auto ${isFullHeight ? 'flex-grow min-h-0 px-0 py-0' : 'px-4 sm:px-6 lg:px-8 py-8'}`}>
                {renderPage()}
            </main>
            {editingApp && (
                <EditAppModal
                    app={editingApp}
                    onSave={handleSaveApp}
                    onClose={handleCloseAppModal}
                    allGroups={appGroups}
                    onGroupsChange={handleAppGroupsChange}
                />
            )}
            {editingProperty && (
                <EditPropertyModal 
                    property={editingProperty}
                    onSave={handleSaveProperty}
                    onClose={() => setEditingProperty(null)}
                    allGroups={propertyGroups}
                    onGroupsChange={handlePropertyGroupsChange}
                />
            )}
            {editingPolicy && (
                <EditInsuranceModal
                    policy={editingPolicy}
                    onSave={handleSavePolicy}
                    onClose={() => setEditingPolicy(null)}
                    allGroups={insuranceGroups}
                    onGroupsChange={handleInsuranceGroupsChange}
                />
            )}
            {showNewPolicyModal && (
                <NewPolicyModal
                    onClose={() => setShowNewPolicyModal(false)}
                    onCreate={handleCreatePolicy}
                />
            )}
            {showNewInvoiceModal && (
                <NewInvoiceModal
                    onClose={() => setShowNewInvoiceModal(false)}
                    onCreate={handleCreateInvoice}
                    allGroups={invoiceGroups}
                />
            )}
            {editingInvoice && (
                <EditInvoiceModal
                    invoice={editingInvoice}
                    onSave={handleSaveInvoice}
                    onClose={() => setEditingInvoice(null)}
                    allGroups={invoiceGroups}
                    onGroupsChange={handleInvoiceGroupsChange}
                    allLocations={invoiceLocations}
                />
            )}
            {editingVehicle && (
                <EditVehicleModal
                    vehicle={editingVehicle}
                    onSave={handleSaveVehicle}
                    onClose={() => setEditingVehicle(null)}
                    allGroups={vehicleGroups}
                    onGroupsChange={handleVehicleGroupsChange}
                />
            )}
            {showNewRegistrationModal && (
                <NewRegistrationModal
                    onClose={() => setShowNewRegistrationModal(false)}
                    onCreate={handleCreateVehicle}
                />
            )}
            {isSupabaseEnabled() && (
                <AllowedUsersModal open={showUsersModal} onClose={() => setShowUsersModal(false)} />
            )}
        </div>
    );
};

export default App;