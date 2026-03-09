

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
import GeneralPage from './components/GeneralPage';
import InvoicesPage from './components/InvoicesPage';
import EditInvoiceModal from './components/EditInvoiceModal';
import VehiclesPage from './components/VehiclesPage';
import VehicleDetailPage from './components/VehicleDetailPage';
import EditVehicleModal from './components/EditVehicleModal';
import ShoppingPage from './components/ShoppingPage';
import EditShoppingItemModal from './components/EditShoppingItemModal';
import RadiologyTemplatesPage from './components/RadiologyTemplatesPage';
import { INITIAL_APPS, APP_GROUPS, INITIAL_PROJECTS, PROJECT_GROUPS, INITIAL_PROPERTIES, PROPERTY_GROUPS, INITIAL_INSURANCE_POLICIES, INSURANCE_GROUPS, INITIAL_INVOICES, PURCHASE_INVOICE_CATEGORIES, INVOICE_LOCATIONS, INITIAL_VEHICLES, VEHICLE_GROUPS, INITIAL_SHOPPING_ITEMS, SHOPPING_CATEGORIES } from './constants';
import type { AppInfo, ProjectInfo, PropertyInfo, InsuranceInfo, InvoiceInfo, VehicleInfo, ShoppingItem, Page } from './types';
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
    
    // Invoices state
    const [invoices, setInvoices] = useState<InvoiceInfo[]>([]);
    const [invoiceGroups, setInvoiceGroups] = useState<string[]>([]);
    const [invoiceLocations, setInvoiceLocations] = useState<string[]>([]);
    const [editingInvoice, setEditingInvoice] = useState<InvoiceInfo | null>(null);

    // Vehicles state
    const [vehicles, setVehicles] = useState<VehicleInfo[]>([]);
    const [vehicleGroups, setVehicleGroups] = useState<string[]>([]);
    const [editingVehicle, setEditingVehicle] = useState<VehicleInfo | null>(null);
    const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

    // Shopping state
    const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
    const [shoppingCategories, setShoppingCategories] = useState<string[]>([]);
    const [editingShoppingItem, setEditingShoppingItem] = useState<ShoppingItem | null>(null);

    // Theme state
    const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
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
        shoppingItems: 'launcher-shopping-items',
        shoppingCategories: 'launcher-shopping-categories',
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
            setShoppingItems((data.get(STORAGE_KEYS.shoppingItems) as ShoppingItem[]) || INITIAL_SHOPPING_ITEMS);
            setShoppingCategories((data.get(STORAGE_KEYS.shoppingCategories) as string[]) || SHOPPING_CATEGORIES);
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
            setShoppingItems(INITIAL_SHOPPING_ITEMS);
            setShoppingCategories(SHOPPING_CATEGORIES);
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
        items[STORAGE_KEYS.shoppingItems] = shoppingItems;
        if (shoppingCategories.length > 0) items[STORAGE_KEYS.shoppingCategories] = shoppingCategories;

        saveAllItems(items).catch((error) => {
            console.error("Failed to save data to storage", error);
        });
    }, [apps, appGroups, projects, projectGroups, properties, propertyGroups, insurancePolicies, insuranceGroups, invoices, invoiceGroups, invoiceLocations, vehicles, vehicleGroups, shoppingItems, shoppingCategories]);


    // --- General Handlers ---
    const handleToggleTheme = useCallback(() => {
        setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
    }, []);
    
    const handleToggleAdminMode = useCallback(() => {
        setIsAdminMode(prev => !prev);
    }, []);

    const handleSetPage = useCallback((newPage: Page) => {
        setPage(newPage);
        setSelectedPropertyId(null);
        setSelectedInsuranceId(null);
        setSelectedVehicleId(null);
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
        const today = new Date();
        const todayString = today.toISOString().split('T')[0];
    
        const nextYear = new Date(today);
        nextYear.setFullYear(today.getFullYear() + 1);
        const nextYearString = nextYear.toISOString().split('T')[0];
    
        const renewalMonth = nextYear.toLocaleString('en-GB', { month: 'short' });
        const renewalYear = nextYear.getFullYear();

        setEditingPolicy({
            id: uuidv4(),
            name: '',
            provider: '',
            renewalDate: `${renewalMonth} ${renewalYear}`,
            groups: [],
            policyType: '',
            policyNumber: '',
            status: 'Pending',
            startDate: todayString,
            endDate: nextYearString,
            policyholder: '',
            coverageSummary: '',
            lastReviewed: todayString,
            notes: '',
        });
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
                return prev.map(p => p.id === finalPolicy.id ? finalPolicy : p);
            } else {
                return [finalPolicy, ...prev];
            }
        });
        setEditingPolicy(null);
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
        setEditingInvoice({
            id: uuidv4(),
            description: '',
            purchaseDate: new Date().toISOString().split('T')[0],
            amount: 0,
            groups: [],
            location: '',
        });
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
        setEditingVehicle({
            id: uuidv4(),
            name: '',
            rego: '',
            state: '',
            expiryDate: new Date().toISOString().split('T')[0],
            groups: [],
        });
    }, []);

    const handleEditVehicle = useCallback((vehicle: VehicleInfo) => {
        setEditingVehicle(vehicle);
    }, []);

    const handleSaveVehicle = useCallback((vehicleToSave: VehicleInfo) => {
        setVehicles(prev => {
            const existing = prev.find(v => v.id === vehicleToSave.id);
            if (existing) {
                return prev.map(v => v.id === vehicleToSave.id ? vehicleToSave : v);
            } else {
                return [vehicleToSave, ...prev];
            }
        });
        setEditingVehicle(null);
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

    // --- Shopping Handlers ---
    const handleShoppingCategoriesChange = useCallback((newCategories: string[]) => {
        setShoppingCategories(newCategories);
    }, []);

    const handleNewShoppingItem = useCallback((item?: ShoppingItem) => {
        setEditingShoppingItem(item || {
            id: uuidv4(),
            name: '',
            category: shoppingCategories[0] || 'Groceries',
            quantity: '',
            checked: false
        });
    }, [shoppingCategories]);

    const handleEditShoppingItem = useCallback((item: ShoppingItem) => {
        setEditingShoppingItem(item);
    }, []);

    const handleSaveShoppingItem = useCallback((itemToSave: ShoppingItem) => {
        setShoppingItems(prev => {
            const existing = prev.find(i => i.id === itemToSave.id);
            if (existing) {
                return prev.map(i => i.id === itemToSave.id ? itemToSave : i);
            } else {
                return [itemToSave, ...prev];
            }
        });
        setEditingShoppingItem(null);
    }, []);

    const handleDeleteShoppingItem = useCallback((id: string) => {
        setShoppingItems(prev => prev.filter(i => i.id !== id));
    }, []);

    const handleToggleShoppingItem = useCallback((id: string) => {
        setShoppingItems(prev => prev.map(i => i.id === id ? { ...i, checked: !i.checked } : i));
    }, []);

    const handleShoppingOrderChange = useCallback((activeId: string, overId: string) => {
        setShoppingItems(prev => {
            const oldIndex = prev.findIndex(i => i.id === activeId);
            const newIndex = prev.findIndex(i => i.id === overId);
            if (oldIndex !== -1 && newIndex !== -1) {
                return arrayMove(prev, oldIndex, newIndex);
            }
            return prev;
        });
    }, []);


    const renderPage = () => {
        switch(page) {
            case 'general':
                return <GeneralPage 
                            properties={properties} 
                            insurancePolicies={insurancePolicies} 
                            invoices={invoices} 
                            vehicles={vehicles}
                            onSaveInvoice={handleSaveInvoice}
                            invoiceGroups={invoiceGroups}
                            invoiceLocations={invoiceLocations}
                        />;
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
                                onBack={() => setSelectedPropertyId(null)}
                                onSaveProperty={handleSaveProperty}
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
                    />;
            case 'insurance':
                 if (selectedInsuranceId) {
                    const selectedPolicy = insurancePolicies.find(p => p.id === selectedInsuranceId);
                    if (!selectedPolicy) { setSelectedInsuranceId(null); return null; }
                    return <InsuranceDetailPage
                                policy={selectedPolicy}
                                onBack={() => setSelectedInsuranceId(null)}
                                onSavePolicy={handleSavePolicy}
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
                                onBack={() => setSelectedVehicleId(null)}
                                onSaveVehicle={handleSaveVehicle}
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
                       />;
            case 'shopping':
                return <ShoppingPage
                        items={shoppingItems}
                        onOrderChange={handleShoppingOrderChange}
                        isAdminMode={isAdminMode}
                        categories={shoppingCategories}
                        onToggleItem={handleToggleShoppingItem}
                        onDeleteItem={handleDeleteShoppingItem}
                        onAddItem={handleSaveShoppingItem}
                        onEditItem={handleEditShoppingItem}
                    />;
            case 'radiology':
                return <RadiologyTemplatesPage />;
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

    return (
        <div className="min-h-screen bg-white dark:bg-slate-900 text-slate-800 dark:text-gray-200 font-sans">
            <Header 
                isAdminMode={isAdminMode} 
                onToggleAdminMode={handleToggleAdminMode}
                theme={theme}
                onToggleTheme={handleToggleTheme}
                page={page}
                onSetPage={handleSetPage}
            />
            <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
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
            {editingShoppingItem && (
                <EditShoppingItemModal
                    item={editingShoppingItem}
                    onSave={handleSaveShoppingItem}
                    onClose={() => setEditingShoppingItem(null)}
                    allCategories={shoppingCategories}
                    onCategoriesChange={handleShoppingCategoriesChange}
                />
            )}
        </div>
    );
};

export default App;