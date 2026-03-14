import React, { useMemo, useState } from 'react';
import type { PropertyInfo, InsuranceInfo, InvoiceInfo, VehicleInfo } from '../types';
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
    invoices: InvoiceInfo[];
    vehicles: VehicleInfo[];
    onNewInvoice: () => void;
    onNavigate?: (item: DueDateItem) => void;
}

const GeneralPage: React.FC<GeneralPageProps> = ({ properties, insurancePolicies, invoices, vehicles, onNewInvoice, onNavigate }) => {
    const [viewMode, setViewMode] = useState<ViewMode>('list');

    // Include overdue for the list view
    const allDueDates = useMemo(() => {
        return parseAllDueDates(properties, insurancePolicies, invoices, vehicles, true);
    }, [properties, insurancePolicies, invoices, vehicles]);

    // Future-only for calendar
    const futureDueDates = useMemo(() => {
        return parseAllDueDates(properties, insurancePolicies, invoices, vehicles, false);
    }, [properties, insurancePolicies, invoices, vehicles]);

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
