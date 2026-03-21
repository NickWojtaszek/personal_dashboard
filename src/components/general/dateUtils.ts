import type { PropertyInfo, InsuranceInfo, ContractInfo, InvoiceInfo, VehicleInfo, DueDateItemSubType } from '../../types';

export interface DueDateItem {
    id: string;
    date: string; // ISO string 'YYYY-MM-DD'
    type: 'Property' | 'Insurance' | 'Contract' | 'Invoice' | 'Vehicle';
    subType: DueDateItemSubType;
    sourceName: string;
    // Extra context for row display
    detail?: string;          // e.g. provider, policy type, body type
    startDate?: string;       // period start for progress bar
    endDate?: string;         // period end for progress bar
    amount?: number;
    amountFrequency?: string; // e.g. "Monthly", "6 Months"
    currency?: string;
    status?: string;          // e.g. "Active", "Current", "Expired"
    // Navigation target
    section?: string;         // detail page section to scroll to
}

const monthMap: { [key: string]: number } = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

export function parseRenewalDate(renewalDateStr: string): Date | null {
    if (!renewalDateStr) return null;
    const parts = renewalDateStr.split(' ');
    if (parts.length !== 2) return null;

    const month = monthMap[parts[0]];
    const year = parseInt(parts[1], 10);

    if (month === undefined || isNaN(year)) return null;

    // Return the last day of that month
    return new Date(year, month + 1, 0);
}

export function parseAllDueDates(
    properties: PropertyInfo[],
    insurancePolicies: InsuranceInfo[],
    invoices: InvoiceInfo[],
    vehicles: VehicleInfo[],
    includeOverdue = false,
    contracts: ContractInfo[] = [],
): DueDateItem[] {
    const allDates: DueDateItem[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day

    properties.forEach(prop => {
        if (prop.operations?.tenancy?.agreements && prop.operations.tenancy.agreements.length > 0) {
            const latestAgreement = [...prop.operations.tenancy.agreements]
                .sort((a,b) => new Date(b.leaseEnd).getTime() - new Date(a.leaseEnd).getTime())[0];
            if (latestAgreement.leaseEnd) {
                allDates.push({ id: prop.id, date: latestAgreement.leaseEnd, type: 'Property', subType: 'Lease End', sourceName: prop.name,
                    detail: prop.overview?.address,
                    startDate: latestAgreement.leaseStart, endDate: latestAgreement.leaseEnd,
                    section: 'operations',
                });
            }
        }
        if (prop.operations?.compliance?.propertyInspection?.next) {
            allDates.push({ id: prop.id, date: prop.operations.compliance.propertyInspection.next, type: 'Property', subType: 'Next Inspection', sourceName: prop.name, section: 'compliance' });
        }
        if (prop.operations?.compliance?.eicr?.next) {
            allDates.push({ id: prop.id, date: prop.operations.compliance.eicr.next, type: 'Property', subType: 'EICR Due', sourceName: prop.name, section: 'compliance' });
        }
        if (prop.operations?.compliance?.gasSafety?.next) {
            allDates.push({ id: prop.id, date: prop.operations.compliance.gasSafety.next, type: 'Property', subType: 'Gas Safety Due', sourceName: prop.name, section: 'compliance' });
        }
        if (prop.operations?.compliance?.insurance?.policies && prop.operations.compliance.insurance.policies.length > 0) {
            const latestPolicy = [...prop.operations.compliance.insurance.policies]
                .sort((a,b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())[0];
            if (latestPolicy.endDate) {
                 allDates.push({ id: prop.id, date: latestPolicy.endDate, type: 'Property', subType: 'Insurance End', sourceName: prop.name, section: 'compliance' });
            }
        }
        if (prop.operations?.compliance?.smokeAlarms?.nextCheck) {
            allDates.push({ id: prop.id, date: prop.operations.compliance.smokeAlarms.nextCheck, type: 'Property', subType: 'Smoke Alarm Check', sourceName: prop.name, section: 'compliance' });
        }
    });

    insurancePolicies.forEach(policy => {
        // Use endDate (precise YYYY-MM-DD) if available, otherwise fall back to renewalDate (month/year)
        let dueDate: string | null = null;
        let subType: DueDateItemSubType = 'Policy End';
        if (policy.endDate) {
            dueDate = policy.endDate;
            subType = 'Policy End';
        } else {
            const renewalDate = parseRenewalDate(policy.renewalDate);
            if (renewalDate) {
                dueDate = renewalDate.toISOString().split('T')[0];
                subType = 'Policy Renewal';
            }
        }
        if (dueDate) {
            allDates.push({ id: policy.id, date: dueDate, type: 'Insurance', subType, sourceName: policy.name,
                detail: [policy.provider, policy.policyType].filter(Boolean).join(' \u00b7 '),
                startDate: policy.startDate, endDate: policy.endDate,
                amount: policy.premiumAmount, amountFrequency: policy.paymentFrequency, currency: policy.currency,
                status: policy.status, section: 'info',
            });
        }
    });

    vehicles.forEach(vehicle => {
        if (vehicle.expiryDate) {
            allDates.push({
                id: vehicle.id,
                date: vehicle.expiryDate,
                type: 'Vehicle',
                subType: 'Rego Expiry',
                sourceName: `${vehicle.name} (${vehicle.rego})`,
                detail: [vehicle.make, vehicle.model, vehicle.bodyType].filter(Boolean).join(' \u00b7 '),
                startDate: vehicle.startDate, endDate: vehicle.expiryDate,
                amount: vehicle.totalAmount, amountFrequency: vehicle.term, currency: vehicle.currency,
                status: vehicle.status, section: 'info',
            });
        }
    });

    contracts.forEach(contract => {
        if (contract.expirationDate && contract.status !== 'Archived') {
            allDates.push({
                id: contract.id,
                date: contract.expirationDate,
                type: 'Contract',
                subType: 'Contract Expiry',
                sourceName: contract.name,
                detail: [contract.contractType, contract.employer].filter(Boolean).join(' \u00b7 '),
                startDate: contract.effectiveDate, endDate: contract.expirationDate,
                amount: contract.value, currency: contract.currency,
                status: contract.status, section: 'info',
            });
        }
    });

    if (includeOverdue) {
        return allDates.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }

    return allDates
        .filter(item => new Date(item.date) >= today)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function formatDistanceToNow(date: Date): string {
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `in ${diffDays} days`;
    if (diffDays < 30) return `in ${Math.floor(diffDays / 7)} weeks`;

    const diffMonths = (date.getFullYear() - now.getFullYear()) * 12 + (date.getMonth() - now.getMonth());
    if(diffMonths === 0) return `in ${diffDays} days`;
    if (diffMonths <= 1) return 'in 1 month';
    return `in ${diffMonths} months`;
}

export function formatFullDate(date: Date): string {
    return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

// ── Cost Forecast Utilities ──

export interface CostLineItem {
    name: string;
    category: 'Insurance' | 'Vehicle' | 'Property' | 'Mortgage';
    monthlyAmount: number;
    currency: string;
    rawAmount: number;
    rawFrequency: string; // human-readable e.g. "A$145.62 / month"
}

const TERM_MONTHS: Record<string, number> = {
    '1 Month': 1,
    '3 Months': 3,
    '6 Months': 6,
    '12 Months': 12,
};

export function buildCostLineItems(
    insurancePolicies: InsuranceInfo[],
    vehicles: VehicleInfo[],
    properties: PropertyInfo[],
): CostLineItem[] {
    const items: CostLineItem[] = [];

    // Insurance premiums
    insurancePolicies.forEach(policy => {
        if (typeof policy.premiumAmount !== 'number' || !policy.premiumAmount) return;
        const cur = policy.currency || 'GBP';
        let monthly: number;
        let rawFreq: string;
        if (policy.paymentFrequency === 'Monthly') {
            monthly = policy.premiumAmount;
            rawFreq = `${policy.premiumAmount.toFixed(2)} / month`;
        } else {
            // Annually or Other — treat as annual
            monthly = policy.premiumAmount / 12;
            rawFreq = `${policy.premiumAmount.toFixed(2)} / year`;
        }
        items.push({
            name: policy.name,
            category: 'Insurance',
            monthlyAmount: monthly,
            currency: cur,
            rawAmount: policy.premiumAmount,
            rawFrequency: rawFreq,
        });
    });

    // Vehicle rego
    vehicles.forEach(vehicle => {
        if (typeof vehicle.totalAmount !== 'number' || !vehicle.totalAmount) return;
        const cur = vehicle.currency || 'AUD';
        const termMonths = vehicle.term ? (TERM_MONTHS[vehicle.term] || 6) : 6;
        const monthly = vehicle.totalAmount / termMonths;
        items.push({
            name: `${vehicle.name} (${vehicle.rego})`,
            category: 'Vehicle',
            monthlyAmount: monthly,
            currency: cur,
            rawAmount: vehicle.totalAmount,
            rawFrequency: `${vehicle.totalAmount.toFixed(2)} / ${vehicle.term || '6 Months'}`,
        });
    });

    // Property costs: mortgage, service charges, ground rent, council tax
    properties.forEach(prop => {
        const cur = 'GBP'; // properties are typically GBP in this app

        // Mortgage
        if (prop.mortgage?.payments && prop.mortgage.payments.length > 0) {
            const latestPayment = [...prop.mortgage.payments]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
            items.push({
                name: `${prop.name} — Mortgage`,
                category: 'Mortgage',
                monthlyAmount: latestPayment.amount,
                currency: cur,
                rawAmount: latestPayment.amount,
                rawFrequency: `${latestPayment.amount.toFixed(2)} / month`,
            });
        }

        // Service charges (latest year)
        const scs = prop.operations?.leaseholdCharges?.serviceCharges;
        if (scs && scs.length > 0) {
            const latest = [...scs].sort((a, b) => b.year - a.year)[0];
            items.push({
                name: `${prop.name} — Service Charge`,
                category: 'Property',
                monthlyAmount: latest.amountDue / 12,
                currency: cur,
                rawAmount: latest.amountDue,
                rawFrequency: `${latest.amountDue.toFixed(2)} / year`,
            });
        }

        // Ground rent (latest year)
        const gr = prop.operations?.leaseholdCharges?.groundRent;
        if (gr && gr.length > 0) {
            const latest = [...gr].sort((a, b) => b.year - a.year)[0];
            items.push({
                name: `${prop.name} — Ground Rent`,
                category: 'Property',
                monthlyAmount: latest.amountDue / 12,
                currency: cur,
                rawAmount: latest.amountDue,
                rawFrequency: `${latest.amountDue.toFixed(2)} / year`,
            });
        }

        // Council tax (latest year, only if not paid by tenant)
        const ct = prop.operations?.leaseholdCharges?.councilTax;
        if (ct && ct.length > 0) {
            const latest = [...ct].sort((a, b) => b.year - a.year)[0];
            if (!latest.paidByTenant) {
                items.push({
                    name: `${prop.name} — Council Tax`,
                    category: 'Property',
                    monthlyAmount: latest.amountDue / 12,
                    currency: cur,
                    rawAmount: latest.amountDue,
                    rawFrequency: `${latest.amountDue.toFixed(2)} / year`,
                });
            }
        }
    });

    return items;
}
