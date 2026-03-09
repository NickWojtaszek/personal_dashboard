

import React, { useMemo } from 'react';
import type { PropertyInfo, InsuranceInfo, InvoiceInfo, VehicleInfo } from '../types';
import { parseAllDueDates, type DueDateItem } from './general/dateUtils';
import DueDateOverview from './general/DueDateOverview';
import CalendarView from './general/CalendarView';
import QuickAddInvoice from './general/QuickAddInvoice';

interface GeneralPageProps {
    properties: PropertyInfo[];
    insurancePolicies: InsuranceInfo[];
    invoices: InvoiceInfo[];
    vehicles: VehicleInfo[];
    onSaveInvoice: (invoice: InvoiceInfo) => void;
    invoiceGroups: string[];
    invoiceLocations: string[];
}

const GeneralPage: React.FC<GeneralPageProps> = ({ properties, insurancePolicies, invoices, vehicles, onSaveInvoice, invoiceGroups, invoiceLocations }) => {
    const upcomingDueDates = useMemo(() => {
        return parseAllDueDates(properties, insurancePolicies, invoices, vehicles);
    }, [properties, insurancePolicies, invoices, vehicles]);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">General Overview</h1>
                <p className="text-lg text-slate-500 dark:text-gray-400 mt-1">
                    A centralized dashboard for all upcoming dates and events.
                </p>
            </div>
            
            <QuickAddInvoice
                onSaveInvoice={onSaveInvoice}
                groups={invoiceGroups}
                locations={invoiceLocations}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-1">
                    <DueDateOverview dueDates={upcomingDueDates} />
                </div>
                <div className="lg:col-span-2">
                    <CalendarView dueDates={upcomingDueDates} />
                </div>
            </div>
        </div>
    );
};

export default GeneralPage;