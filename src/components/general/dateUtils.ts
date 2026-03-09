import type { PropertyInfo, InsuranceInfo, InvoiceInfo, VehicleInfo, DueDateItemSubType } from '../../types';

export interface DueDateItem {
    id: string;
    date: string; // ISO string 'YYYY-MM-DD'
    type: 'Property' | 'Insurance' | 'Invoice' | 'Vehicle';
    subType: DueDateItemSubType;
    sourceName: string;
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

export function parseAllDueDates(properties: PropertyInfo[], insurancePolicies: InsuranceInfo[], invoices: InvoiceInfo[], vehicles: VehicleInfo[]): DueDateItem[] {
    const allDates: DueDateItem[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day

    properties.forEach(prop => {
        if (prop.operations?.tenancy?.agreements && prop.operations.tenancy.agreements.length > 0) {
            const latestAgreement = [...prop.operations.tenancy.agreements]
                .sort((a,b) => new Date(b.leaseEnd).getTime() - new Date(a.leaseEnd).getTime())[0];
            if (latestAgreement.leaseEnd) {
                allDates.push({ id: prop.id, date: latestAgreement.leaseEnd, type: 'Property', subType: 'Lease End', sourceName: prop.name });
            }
        }
        if (prop.operations?.compliance?.propertyInspection?.next) {
            allDates.push({ id: prop.id, date: prop.operations.compliance.propertyInspection.next, type: 'Property', subType: 'Next Inspection', sourceName: prop.name });
        }
        if (prop.operations?.compliance?.eicr?.next) {
            allDates.push({ id: prop.id, date: prop.operations.compliance.eicr.next, type: 'Property', subType: 'EICR Due', sourceName: prop.name });
        }
        if (prop.operations?.compliance?.gasSafety?.next) {
            allDates.push({ id: prop.id, date: prop.operations.compliance.gasSafety.next, type: 'Property', subType: 'Gas Safety Due', sourceName: prop.name });
        }
        if (prop.operations?.compliance?.insurance?.policies && prop.operations.compliance.insurance.policies.length > 0) {
            const latestPolicy = [...prop.operations.compliance.insurance.policies]
                .sort((a,b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())[0];
            if (latestPolicy.endDate) {
                 allDates.push({ id: prop.id, date: latestPolicy.endDate, type: 'Property', subType: 'Insurance End', sourceName: prop.name });
            }
        }
        if (prop.operations?.compliance?.smokeAlarms?.nextCheck) {
            allDates.push({ id: prop.id, date: prop.operations.compliance.smokeAlarms.nextCheck, type: 'Property', subType: 'Smoke Alarm Check', sourceName: prop.name });
        }
    });

    insurancePolicies.forEach(policy => {
        const renewalDate = parseRenewalDate(policy.renewalDate);
        if (renewalDate) {
            allDates.push({ id: policy.id, date: renewalDate.toISOString().split('T')[0], type: 'Insurance', subType: 'Policy Renewal', sourceName: policy.name });
        }
        if (policy.endDate) {
            allDates.push({ id: policy.id, date: policy.endDate, type: 'Insurance', subType: 'Policy End', sourceName: policy.name });
        }
    });

    vehicles.forEach(vehicle => {
        if (vehicle.expiryDate) {
            allDates.push({
                id: vehicle.id,
                date: vehicle.expiryDate,
                type: 'Vehicle',
                subType: 'Rego Expiry',
                sourceName: `${vehicle.name} (${vehicle.rego})`
            });
        }
    });

    return allDates
        .filter(item => new Date(item.date) >= today)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function formatDistanceToNow(date: Date): string {
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return 'Due now';
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