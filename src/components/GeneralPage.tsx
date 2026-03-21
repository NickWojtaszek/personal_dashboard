import React, { useMemo, useState } from 'react';
import type { PropertyInfo, InsuranceInfo, ContractInfo, InvoiceInfo, VehicleInfo } from '../types';
import { parseAllDueDates } from './general/dateUtils';
import type { DueDateItem } from './general/dateUtils';
import DueDateOverview from './general/DueDateOverview';
import CalendarView from './general/CalendarView';
import CostForecastView from './general/CostForecastView';
import Button from './ui/Button';
import { ListIcon, CalIcon, CostIcon, PlusIcon } from './Icons';

type ViewMode = 'list' | 'calendar' | 'costs';

interface GeneralPageProps {
    properties: PropertyInfo[];
    insurancePolicies: InsuranceInfo[];
    contracts: ContractInfo[];
    invoices: InvoiceInfo[];
    vehicles: VehicleInfo[];
    onNewInvoice: () => void;
    onNavigate?: (item: DueDateItem) => void;
    unreadEmailCount?: number;
    onGoToEmail?: () => void;
}

const GeneralPage: React.FC<GeneralPageProps> = ({ properties, insurancePolicies, contracts, invoices, vehicles, onNewInvoice, onNavigate, unreadEmailCount, onGoToEmail }) => {
    const [viewMode, setViewMode] = useState<ViewMode>('list');

    // Include overdue for the list view
    const allDueDates = useMemo(() => {
        return parseAllDueDates(properties, insurancePolicies, invoices, vehicles, true, contracts);
    }, [properties, insurancePolicies, invoices, vehicles, contracts]);

    // Future-only for calendar
    const futureDueDates = useMemo(() => {
        return parseAllDueDates(properties, insurancePolicies, invoices, vehicles, false, contracts);
    }, [properties, insurancePolicies, invoices, vehicles, contracts]);

    const ViewButton: React.FC<{ view: ViewMode; icon: React.ReactNode; label: string }> = ({ view, icon, label }) => {
        const isActive = viewMode === view;
        return (
            <Button
                variant={isActive ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode(view)}
                leftIcon={icon}
            >
                {label}
            </Button>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">General Overview</h1>
                    <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
                        Deadlines, calendar, and cost forecast across all categories.
                    </p>
                </div>
                <div className="flex items-center gap-2 self-start">
                    {unreadEmailCount != null && unreadEmailCount > 0 && onGoToEmail && (
                        <button
                            onClick={onGoToEmail}
                            className="relative flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                            </svg>
                            {unreadEmailCount} new
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse" />
                        </button>
                    )}
                    <div className="p-1 bg-slate-100 dark:bg-slate-700/50 rounded-lg flex items-center gap-1">
                        <ViewButton view="list" icon={<ListIcon />} label="List" />
                        <ViewButton view="calendar" icon={<CalIcon />} label="Calendar" />
                        <ViewButton view="costs" icon={<CostIcon />} label="Costs" />
                    </div>
                    <Button
                        onClick={onNewInvoice}
                        leftIcon={<PlusIcon />}
                    >
                         Invoice
                    </Button>
                </div>
            </div>

            {/* Main content area */}
            {viewMode === 'list' && (
                <DueDateOverview dueDates={allDueDates} onNavigate={onNavigate} />
            )}

            {viewMode === 'calendar' && (
                <CalendarView dueDates={futureDueDates} />
            )}

            {viewMode === 'costs' && (
                <CostForecastView
                    insurancePolicies={insurancePolicies}
                    vehicles={vehicles}
                    properties={properties}
                />
            )}
        </div>
    );
};

export default GeneralPage;
