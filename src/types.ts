export interface AppInfo {
  id: string;
  name: string;
  description: string;
  url: string;
  icon: string;
  groups?: string[];
}

export interface ProjectInfo {
    id: string;
    name: string;
    description?: string;
    url: string;
    lastUpdated: string;
    groups?: string[];
}

export interface PropertyOverview {
    address?: string;
    propertyType?: string;
    configuration?: {
        beds?: number;
        baths?: number;
        parking?: number;
        storage?: number;
    };
}

export interface PropertyDetails {
    complexName?: string;
    unitLotNumber?: string;
    features?: string[];
}

export interface FinancialTransaction {
    id: string;
    date?: string; // YYYY-MM-DD
    description: string;
    amount: number;
    type: 'income' | 'expense';
}

export interface PropertyFinancials {
    transactions?: FinancialTransaction[];
}

export interface PropertyManagement {
    agent?: string;
    managerContact?: string;
    agreementDetails?: string;
}

export interface ManagementEntity {
    name?: string;
    address?: string;
}

export interface ManagingAgent extends ManagementEntity {
    bank?: string;
    sortCode?: string;
    accountNo?: string;
}

export interface PropertyManagementStructure {
    hasComplexManagement?: boolean;
    managingAgent?: ManagingAgent;
    landlord?: ManagementEntity;
    rtmCompany?: ManagementEntity;
}

export interface MortgagePayment {
    id: string;
    date: string; // YYYY-MM-DD
    amount: number;
    principal: number;
    interest: number;
}

export interface PropertyMortgage {
    type?: 'Fixed' | 'Variable';
    renewalDate?: string; // YYYY-MM-DD
    outstandingBalance?: number;
    payments?: MortgagePayment[];
}

export interface Document {
    name: string;
    url: string;
    data?: string; // base64 encoded
    mimeType?: string;
}

export interface EicrCheck {
    id: string;
    date: string; // YYYY-MM-DD
    document?: Document;
}

export interface TenancyAgreement {
  id: string;
  leaseStart: string; // YYYY-MM-DD
  leaseEnd: string; // YYYY-MM-DD
  document?: Document;
}

export interface GasSafetyCheck {
    id: string;
    date: string; // YYYY-MM-DD
    document?: Document;
}

export interface InsurancePolicyRecord {
    id: string;
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
    document?: Document;
}

export interface MaintenanceJob {
    id: string;
    date: string; // YYYY-MM-DD
    description: string;
    cost: number;
    document?: Document;
}

export interface EquipmentInstallation {
    id: string;
    date: string; // YYYY-MM-DD
    description: string;
    cost: number;
    document?: Document;
}

export interface ServiceCharge {
    id: string;
    year: number;
    amountDue: number;
    amountPaid: number;
    dueDate: string; // YYYY-MM-DD
    paymentDetails?: string;
}

export interface GroundRent {
    id: string;
    year: number;
    amountDue: number;
    amountPaid: number;
    dueDate: string; // YYYY-MM-DD
    paymentDetails?: string;
}

export interface CouncilTax {
    id: string;
    year: number;
    amountDue: number;
    amountPaid: number;
    dueDate: string; // YYYY-MM-DD
    paymentDetails?: string;
    paidByTenant?: boolean;
}

export interface PropertyOperations {
    tenancy?: {
        agreements: TenancyAgreement[];
    };
    maintenance?: {
        jobs?: MaintenanceJob[];
        equipment?: EquipmentInstallation[];
    };
    leaseholdCharges?: {
        serviceCharges?: ServiceCharge[];
        groundRent?: GroundRent[];
        councilTax?: CouncilTax[];
    };
    compliance?: {
        propertyInspection?: {
            last?: string;
            next?: string;
        };
        eicr?: {
            checks: EicrCheck[];
            next?: string;
        };
        gasSafety?: {
            checks: GasSafetyCheck[];
            next?: string;
        };
        insurance?: {
            policies: InsurancePolicyRecord[];
        };
        smokeAlarms?: {
            lastChecked?: string;
            nextCheck?: string;
        };
    };
}

export interface PropertyContact {
    role: string;
    name: string;
    contact: string;
}

export interface CorrespondenceItem {
  id: string;
  date: string; // YYYY-MM-DD
  from: string;
  to?: string;
  subject: string;
  body: string;
}

export interface PropertyInfo {
    id: string;
    name: string;
    location: string;
    url: string;
    groups?: string[];
    overview?: PropertyOverview;
    details?: PropertyDetails;
    financials?: PropertyFinancials;
    operations?: PropertyOperations;
    documents?: Document[];
    contacts?: PropertyContact[];
    management?: PropertyManagement;
    managementStructure?: PropertyManagementStructure;
    mortgage?: PropertyMortgage;
    notes?: string;
    correspondence?: CorrespondenceItem[];
}

export interface InsuranceInfo {
    id: string;
    name: string;
    provider: string;
    renewalDate: string;
    groups?: string[];
    policyType?: string;
    policyNumber?: string;
    coverageAmount?: number;
    premiumAmount?: number;
    paymentFrequency?: 'Monthly' | 'Annually' | 'Other';
    status?: 'Active' | 'Expired' | 'Pending';
    startDate?: string;
    endDate?: string;
    policyholder?: string;
    coverageSummary?: string;
    lastReviewed?: string;
    deductible?: number;
    contactNumber?: string;
    notes?: string;
    document?: Document;
}

export interface InvoiceInfo {
    id: string;
    description: string;
    purchaseDate: string; // YYYY-MM-DD
    amount: number;
    document?: Document;
    groups?: string[];
    location?: string;
}

export interface VehicleInfo {
    id: string;
    name: string;
    rego: string;
    state: string;
    expiryDate: string; // YYYY-MM-DD
    groups?: string[];
    vin?: string;
    make?: string;
    model?: string;
    year?: number;
    document?: Document;
}

export interface ShoppingItem {
    id: string;
    name: string;
    category: string;
    quantity: string;
    checked: boolean;
    notes?: string;
}

export type Page = 'launcher' | 'claude' | 'properties' | 'insurance' | 'general' | 'invoices' | 'vehicles' | 'shopping' | 'radiology';
export type DueDateItemSubType = 'Lease End' | 'Next Inspection' | 'Insurance End' | 'Smoke Alarm Check' | 'Policy Renewal' | 'Policy End' | 'EICR Due' | 'Gas Safety Due' | 'Rego Expiry';
