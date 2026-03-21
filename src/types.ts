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

export type ExpenseCategory =
    | 'Advertising'
    | 'Body Corporate'
    | 'Borrowing Expenses'
    | 'Council Rates'
    | 'Insurance'
    | 'Interest on Loan'
    | 'Land Tax'
    | 'Legal Fees'
    | 'Pest Control'
    | 'Property Management'
    | 'Repairs & Maintenance'
    | 'Capital Works'
    | 'Stationery & Admin'
    | 'Travel'
    | 'Water Charges'
    | 'Other';

export type IncomeCategory =
    | 'Rent'
    | 'Bond/Deposit'
    | 'Insurance Payout'
    | 'Other Income';

export interface FinancialTransaction {
    id: string;
    date?: string; // YYYY-MM-DD
    description: string;
    amount: number;
    type: 'income' | 'expense';
    category?: ExpenseCategory | IncomeCategory;
    sourceDocumentName?: string;   // Name of the PDF document this was extracted from
    sourceEmailSubject?: string;   // Subject of the email the document came from
    sourceCorrespondenceId?: string; // ID of the CorrespondenceItem it was extracted from
}

export interface PropertyFinancials {
    currency?: string; // e.g. 'AUD', 'GBP', 'USD'
    transactions?: FinancialTransaction[];
    purchasePrice?: number;
    purchaseDate?: string; // YYYY-MM-DD
    estimatedValue?: number;
    estimatedValueDate?: string; // YYYY-MM-DD
    // Tax & depreciation
    annualDepreciation?: number; // From quantity surveyor report (Div 40 + Div 43 combined)
    marginalTaxRate?: number; // e.g. 0.37 for 37% bracket
    buildYear?: number; // For Div 43 eligibility context
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
    paymentType?: 'regular' | 'overpayment'; // regular = scheduled, overpayment = voluntary capital reduction
    source?: string; // e.g. 'HSBC 42509407' — which bank account it came from
}

export interface MortgageRatePeriod {
    id: string;
    startDate: string; // YYYY-MM-DD
    endDate?: string; // YYYY-MM-DD, undefined = current/ongoing
    type: 'Fixed' | 'Variable' | 'Tracker' | 'SVR' | 'Discount';
    rate?: number; // interest rate % p.a.
    monthlyPayment?: number; // payment amount during this period
    notes?: string;
}

export interface MortgageLoan {
    id: string;
    accountNumber?: string;
    lender?: string;
    type?: 'Fixed' | 'Variable' | 'Tracker';
    repaymentType?: 'interest-only' | 'capital-repayment';
    interestRate?: number; // e.g. 6.04
    outstandingBalance?: number;
    originalAmount?: number; // original loan amount
    creditLimit?: number;
    repaymentAmount?: number; // regular repayment amount
    startDate?: string; // YYYY-MM-DD — when loan originated
    term?: string; // e.g. "25 years"
    dealEndDate?: string; // YYYY-MM-DD — when current rate deal expires (triggers remortgage)
    ratePeriods?: MortgageRatePeriod[];
    payments?: MortgagePayment[];
    notes?: string;
}

export interface PropertyMortgage {
    // Legacy single-loan fields (backward compat)
    type?: 'Fixed' | 'Variable';
    renewalDate?: string; // YYYY-MM-DD
    outstandingBalance?: number;
    payments?: MortgagePayment[];
    // Multi-loan support
    loans?: MortgageLoan[];
    // Offset account (AU-specific)
    offsetBalance?: number;
    offsetAccountNumber?: string;
    // Derived summary
    totalDebt?: number; // sum of all loan balances
    netExposure?: number; // totalDebt - offsetBalance
}

export interface TitleEncumbrance {
    type: string; // e.g. 'Mortgage', 'Easement', 'Building Management Statement', 'Covenant'
    reference?: string; // dealing/registration number
    date?: string; // YYYY-MM-DD
    party?: string; // e.g. lender name
    details?: string;
}

export interface PropertyTitle {
    titleReference?: string; // AU: title ref, UK: title number
    dateCreated?: string; // YYYY-MM-DD
    previousTitle?: string;
    estate?: string; // e.g. 'Estate in Fee Simple' (freehold), 'Leasehold'
    lotPlan?: string; // e.g. 'LOT 12203 SURVEY PLAN 282123'
    localGovernment?: string; // e.g. 'BRISBANE CITY'
    registeredOwner?: string;
    ownershipDate?: string; // YYYY-MM-DD — date of ownership transfer
    dealingNumber?: string; // dealing/transfer reference
    encumbrances?: TitleEncumbrance[];
    communityStatements?: string[]; // community/building management statement refs
    searchDate?: string; // YYYY-MM-DD — when the title search was conducted
    document?: Document;
}

export type DocumentCategory =
    | 'Policy'
    | 'Certificate'
    | 'Purchase'
    | 'Tenancy Agreement'
    | 'Lease'
    | 'Title Deed'
    | 'Mortgage'
    | 'Invoice'
    | 'Receipt'
    | 'Inspection Report'
    | 'Compliance'
    | 'Correspondence'
    | 'Valuation'
    | 'Tax'
    | 'Other';

export interface Document {
    id?: string;
    name: string;
    label?: string; // user-friendly display name
    category?: DocumentCategory;
    url: string;
    data?: string; // base64 encoded
    mimeType?: string;
    uploadedAt?: string; // ISO date
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

export interface EmailAttachment {
  id: string;          // Gmail attachment ID (for fetching on demand)
  name: string;
  mimeType: string;
  size: number;
  cached?: string;     // base64 data if pinned locally
}

export interface CorrespondenceItem {
  id: string;
  date: string; // YYYY-MM-DD
  from: string;
  to?: string;
  subject: string;
  body: string;
  source?: 'manual' | 'gmail';
  gmailMessageId?: string;
  gmailThreadId?: string;
  labelIds?: string[];
  attachments?: EmailAttachment[];
  starred?: boolean;
  read?: boolean;
  extracted?: boolean;                // Whether data has been extracted from this email's attachments
  extractedAttachmentIds?: string[];  // Which attachment IDs have been extracted (dedup)
}

/** User-defined tag for grouping sync rules (e.g. 'statements', 'agent', 'strata'). */
export type SyncRuleCategory = string;

export interface GmailSyncRule {
  id: string;
  query: string;       // Gmail search query e.g. "from:agent@example.com" or "1 Cordelia Street"
  label?: string;      // Optional: descriptive label for the rule
  category?: SyncRuleCategory; // Categorise the rule for quick filtering
}

export interface GmailSyncConfig {
  rules: GmailSyncRule[];
  tags?: string[];          // user-defined labels for grouping rules & threads
  lastSyncedAt?: string;    // ISO timestamp
  autoSync: boolean;
}

export interface ThreadAction {
  id: string;
  description: string;
  status: 'pending' | 'done';
  addedAt: string;       // ISO timestamp — when AI identified this action
  resolvedAt?: string;   // ISO timestamp — when marked done
  sourceEmailId?: string; // correspondence ID that triggered this action
}

export interface ConversationThread {
  id: string;
  title: string;
  category?: SyncRuleCategory;       // ties to sync rule categories
  filterSenders?: string[];          // sender addresses included in this thread
  summary: string;                   // AI-generated markdown summary
  actions: ThreadAction[];
  timeline?: string;                 // AI-generated timeline of key events
  lastProcessedDate?: string;        // ISO timestamp — newest email included in summary
  lastProcessedEmailIds?: string[];  // correspondence IDs already summarised (dedup)
  createdAt: string;
  updatedAt: string;
}

export type PropertyCountry = 'AU' | 'UK' | 'US' | 'NZ' | 'PL';

export interface PropertyInfo {
    id: string;
    name: string;
    location: string;
    country?: PropertyCountry;
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
    title?: PropertyTitle;
    notes?: string;
    correspondence?: CorrespondenceItem[];
    gmailSync?: GmailSyncConfig;
    threads?: ConversationThread[];
}

export interface PolicyHistoryEntry {
    id: string;
    periodStart: string;
    periodEnd: string;
    premiumAmount?: number;
    paymentFrequency?: 'Monthly' | 'Annually' | 'Other';
    coverageAmount?: number;
    deductible?: number;
    provider: string;
    policyNumber?: string;
    currency?: string;
    document?: Document;
    archivedAt: string;
    notes?: string;
}

export interface InsuranceInfo {
    id: string;
    name: string;
    provider: string;
    renewalDate: string;
    country?: PropertyCountry;
    groups?: string[];
    propertyId?: string; // Link to a PropertyInfo.id for compliance sync
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
    currency?: string;
    document?: Document;
    documents?: Document[];
    history?: PolicyHistoryEntry[];
}

export interface ContractInfo {
    id: string;
    name: string;
    contractType?: string;
    employer?: string;
    contractor?: string;
    parties?: string[];
    signedDate?: string;
    effectiveDate?: string;
    expirationDate?: string;
    value?: number;
    currency?: string;
    paymentTerms?: string;
    status?: 'Active' | 'Expired' | 'Pending' | 'Archived';
    renewalType?: 'Auto' | 'Manual' | 'Fixed';
    description?: string;
    document?: Document;
    documents?: Document[];
    groups?: string[];
    notes?: string;
    country?: PropertyCountry;
    minimumHours?: number;
    contactEmail?: string;
    contactPhone?: string;
    linkedInsuranceId?: string;
}

export interface InvoiceInfo {
    id: string;
    description: string;
    purchaseDate: string; // YYYY-MM-DD
    amount: number;
    currency?: string;
    document?: Document;
    groups?: string[];
    location?: string;
}

export interface RegistrationHistoryEntry {
    id: string;
    periodStart: string;       // YYYY-MM-DD
    periodEnd: string;         // YYYY-MM-DD
    totalAmount?: number;
    ctpAmount?: number;
    registrationFee?: number;
    term?: string;
    ctpInsurer?: string;
    currency?: string;
    document?: Document;
    archivedAt: string;        // ISO timestamp
    notes?: string;
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
    bodyType?: string;
    purpose?: string;
    currency?: string;
    // Registration costs
    totalAmount?: number;
    ctpAmount?: number;
    registrationFee?: number;
    trafficImprovementFee?: number;
    term?: '1 Month' | '3 Months' | '6 Months' | '12 Months';
    // CTP insurance
    ctpInsurer?: string;
    ctpClass?: string;
    // Dates
    startDate?: string;  // YYYY-MM-DD - when current rego period started
    // Status
    status?: 'Current' | 'Expired' | 'Due Soon';
    notes?: string;
    document?: Document;           // legacy / fallback
    renewalDocument?: Document;    // renewal notice PDF
    paymentDocument?: Document;    // payment confirmation PDF
    history?: RegistrationHistoryEntry[];
}

export interface ShoppingItem {
    id: string;
    name: string;
    category: string;
    quantity: string;
    checked: boolean;
    notes?: string;
}

export type Page = 'launcher' | 'claude' | 'properties' | 'insurance' | 'general' | 'invoices' | 'vehicles' | 'contracts' | 'radiology' | 'dictation' | 'correspondence';

/** Standalone correspondence store — not tied to any property. */
export interface CorrespondenceStore {
    correspondence: CorrespondenceItem[];
    gmailSync: GmailSyncConfig;
    threads: ConversationThread[];
}
export type DueDateItemSubType = 'Lease End' | 'Next Inspection' | 'Insurance End' | 'Smoke Alarm Check' | 'Policy Renewal' | 'Policy End' | 'EICR Due' | 'Gas Safety Due' | 'Rego Expiry' | 'Rego Due' | 'Contract Expiry';
