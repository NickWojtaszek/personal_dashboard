/**
 * Shared AI extraction logic for property documents (rental statements, tenancy agreements).
 * Used by both the AI Assistant (file upload) and Correspondence (Gmail attachment extraction).
 */

import type { FinancialTransaction, ServiceCharge, CouncilTax, Document, PropertyContact, PropertyCountry, MortgageLoan, MortgagePayment, TitleEncumbrance } from '../types';
import { GoogleGenAI, Type } from "@google/genai";
import * as pdfjs from 'pdfjs-dist';

pdfjs.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@4.5.136/build/pdf.worker.mjs';

export interface ExtractedMortgageData {
    loans?: Array<{
        accountNumber?: string;
        lender?: string;
        type?: 'Fixed' | 'Variable' | 'Tracker';
        interestRate?: number;
        outstandingBalance?: number;
        creditLimit?: number;
        repaymentAmount?: number;
        payments?: Array<{
            date: string;
            amount: number;
            interest: number;
            paymentType?: 'regular' | 'overpayment';
        }>;
    }>;
    offsetBalance?: number;
    offsetAccountNumber?: string;
    currency?: string;
}

export interface ExtractedTitleData {
    titleReference?: string;
    dateCreated?: string;
    previousTitle?: string;
    estate?: string;
    lotPlan?: string;
    localGovernment?: string;
    registeredOwner?: string;
    ownershipDate?: string;
    dealingNumber?: string;
    encumbrances?: Array<{
        type: string;
        reference?: string;
        date?: string;
        party?: string;
        details?: string;
    }>;
    communityStatements?: string[];
    searchDate?: string;
}

export interface ExtractedPropertyData {
    leaseStart?: string;
    leaseEnd?: string;
    currency?: string;
    transactions?: FinancialTransaction[];
    serviceCharges?: ServiceCharge[];
    councilRates?: CouncilTax[];
    contacts?: PropertyContact[];
    features?: string[];
    mortgage?: ExtractedMortgageData;
    title?: ExtractedTitleData;
    document?: Document;
    // Source tracking (set by caller, not by extraction logic)
    sourceDocumentName?: string;
    sourceEmailSubject?: string;
    sourceCorrespondenceId?: string;
    sourceAttachmentId?: string;
}

const propertySchema = {
    type: Type.OBJECT,
    properties: {
        leaseStart: { type: Type.STRING, description: "The lease start date in YYYY-MM-DD format.", nullable: true },
        leaseEnd: { type: Type.STRING, description: "The lease end date in YYYY-MM-DD format.", nullable: true },
        currency: { type: Type.STRING, description: "The ISO 4217 currency code detected from the document (e.g. 'AUD', 'GBP', 'USD'). Detect from currency symbols ($=AUD/USD based on context, £=GBP, €=EUR) or explicit mentions.", nullable: true },
        transactions: {
            type: Type.ARRAY,
            description: "A list of financial transactions from the rental statement.",
            nullable: true,
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING, description: "A unique ID for the transaction, like a UUID." },
                    date: { type: Type.STRING, description: "The date of the transaction in YYYY-MM-DD format. Use the statement period end date if no specific date is available. Must not be null." },
                    description: { type: Type.STRING, description: "The description of the transaction line item." },
                    amount: { type: Type.NUMBER, description: "The monetary value of the transaction." },
                    type: { type: Type.STRING, enum: ['income', 'expense'], description: "The type of transaction, either 'income' for money received or 'expense' for money paid out." }
                },
                required: ['id', 'date', 'description', 'amount', 'type']
            }
        },
        contacts: {
            type: Type.ARRAY,
            description: "A list of contacts mentioned in the document, such as the landlord or agent.",
            nullable: true,
            items: {
                type: Type.OBJECT,
                properties: {
                    role: { type: Type.STRING, description: "The role of the contact (e.g., Landlord, Agent, Tenant)." },
                    name: { type: Type.STRING, description: "The full name of the contact." },
                    contact: { type: Type.STRING, description: "The contact details (e.g., address, email, or phone number)." },
                },
                required: ['role', 'name', 'contact']
            }
        },
        serviceCharges: {
            type: Type.ARRAY,
            description: "A list of service charge / levy line items from a body corporate or strata notice.",
            nullable: true,
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING, description: "A unique UUID for this charge." },
                    year: { type: Type.NUMBER, description: "The financial year this charge relates to (e.g. 2025)." },
                    amountDue: { type: Type.NUMBER, description: "The net amount due after any credits/payments." },
                    amountPaid: { type: Type.NUMBER, description: "Amount already paid or credited. Use 0 if unknown." },
                    dueDate: { type: Type.STRING, description: "The due date in YYYY-MM-DD format." },
                    paymentDetails: { type: Type.STRING, description: "A brief breakdown of the charge components (e.g. 'Admin Fund $1617.45, Sinking Fund $155.16, Insurance Levy $300.23').", nullable: true },
                },
                required: ['id', 'year', 'amountDue', 'amountPaid', 'dueDate']
            }
        },
        councilRates: {
            type: Type.ARRAY,
            description: "Council rates/tax line items from a council rates notice or property tax bill. NOT strata/body corporate levies.",
            nullable: true,
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING, description: "A unique UUID for this charge." },
                    year: { type: Type.NUMBER, description: "The financial year this charge relates to." },
                    amountDue: { type: Type.NUMBER, description: "The total amount due." },
                    amountPaid: { type: Type.NUMBER, description: "Amount already paid or credited. Use 0 if unknown." },
                    dueDate: { type: Type.STRING, description: "The due date in YYYY-MM-DD format." },
                    paymentDetails: { type: Type.STRING, description: "A brief breakdown of the charge components (e.g. 'General Rates $362.03, Waste Utility $128.24').", nullable: true },
                },
                required: ['id', 'year', 'amountDue', 'amountPaid', 'dueDate']
            }
        },
        features: {
            type: Type.ARRAY,
            description: "A list of up to 5 key special conditions or important terms from the tenancy agreement. Do not include standard clauses.",
            nullable: true,
            items: { type: Type.STRING }
        },
        title: {
            type: Type.OBJECT,
            description: "Property title/deed data extracted from a title search or land registry document.",
            nullable: true,
            properties: {
                titleReference: { type: Type.STRING, description: "The title reference or title number (e.g. '51200071').", nullable: true },
                dateCreated: { type: Type.STRING, description: "Date the title was created, in YYYY-MM-DD format.", nullable: true },
                previousTitle: { type: Type.STRING, description: "Previous title reference number, if any.", nullable: true },
                estate: { type: Type.STRING, description: "The estate type (e.g. 'Estate in Fee Simple', 'Leasehold', 'Freehold').", nullable: true },
                lotPlan: { type: Type.STRING, description: "The lot/plan description (e.g. 'LOT 12203 SURVEY PLAN 282123').", nullable: true },
                localGovernment: { type: Type.STRING, description: "The local government area (e.g. 'BRISBANE CITY').", nullable: true },
                registeredOwner: { type: Type.STRING, description: "The registered owner's full name.", nullable: true },
                ownershipDate: { type: Type.STRING, description: "Date of the ownership transfer/dealing, in YYYY-MM-DD format.", nullable: true },
                dealingNumber: { type: Type.STRING, description: "The dealing or transfer reference number.", nullable: true },
                encumbrances: {
                    type: Type.ARRAY,
                    description: "Easements, encumbrances, interests, and registered dealings on the title.",
                    nullable: true,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            type: { type: Type.STRING, description: "The type of encumbrance (e.g. 'Mortgage', 'Easement', 'Building Management Statement', 'Covenant', 'Crown Rights')." },
                            reference: { type: Type.STRING, description: "The dealing/registration number.", nullable: true },
                            date: { type: Type.STRING, description: "The registration date in YYYY-MM-DD format.", nullable: true },
                            party: { type: Type.STRING, description: "The benefiting/burdening party (e.g. lender name, company).", nullable: true },
                            details: { type: Type.STRING, description: "Brief description of the encumbrance.", nullable: true },
                        },
                        required: ['type']
                    }
                },
                communityStatements: {
                    type: Type.ARRAY,
                    description: "Community/building management statement reference numbers.",
                    nullable: true,
                    items: { type: Type.STRING }
                },
                searchDate: { type: Type.STRING, description: "The date the title search was conducted, in YYYY-MM-DD format.", nullable: true },
            }
        },
        mortgage: {
            type: Type.OBJECT,
            description: "Mortgage/home loan data extracted from a bank mortgage statement.",
            nullable: true,
            properties: {
                loans: {
                    type: Type.ARRAY,
                    description: "Each separate loan account found in the statement.",
                    nullable: true,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            accountNumber: { type: Type.STRING, description: "The loan account number.", nullable: true },
                            lender: { type: Type.STRING, description: "The bank or lender name.", nullable: true },
                            type: { type: Type.STRING, enum: ['Fixed', 'Variable', 'Tracker'], description: "The loan type.", nullable: true },
                            interestRate: { type: Type.NUMBER, description: "The annual interest rate as a percentage (e.g. 6.04).", nullable: true },
                            outstandingBalance: { type: Type.NUMBER, description: "The closing/outstanding balance of the loan. Always positive.", nullable: true },
                            creditLimit: { type: Type.NUMBER, description: "The credit limit or approved amount of the loan.", nullable: true },
                            repaymentAmount: { type: Type.NUMBER, description: "The regular repayment amount.", nullable: true },
                            payments: {
                                type: Type.ARRAY,
                                description: "Individual payment transactions for this loan within the statement period.",
                                nullable: true,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        date: { type: Type.STRING, description: "Payment date in YYYY-MM-DD format." },
                                        amount: { type: Type.NUMBER, description: "The repayment/credit amount (positive number)." },
                                        interest: { type: Type.NUMBER, description: "Interest charged in this period/on this date (positive number). Use 0 if not separately listed." },
                                        paymentType: { type: Type.STRING, enum: ['regular', 'overpayment'], description: "Whether this is a 'regular' scheduled payment or an 'overpayment' (voluntary capital reduction). Regular payments recur monthly at the same amount. Overpayments are ad-hoc, often larger or irregular amounts.", nullable: true },
                                    },
                                    required: ['date', 'amount', 'interest']
                                }
                            }
                        },
                        required: ['accountNumber']
                    }
                },
                offsetBalance: { type: Type.NUMBER, description: "The balance in the offset account (if any). This is a credit balance that offsets one or more loans.", nullable: true },
                offsetAccountNumber: { type: Type.STRING, description: "The offset account number.", nullable: true },
                currency: { type: Type.STRING, description: "ISO 4217 currency code (e.g. 'AUD', 'GBP').", nullable: true },
            }
        }
    },
};

function buildPrompt(pdfText: string, country?: PropertyCountry): string {
    const countryHint = country ? `\n\n**PROPERTY COUNTRY:** ${country} — Use this to disambiguate document types. For example, in Australia "Council Rates" is the equivalent of UK "Council Tax".\n` : '';
    return `You are an intelligent assistant for property management. Your task is to analyze the provided document text and determine its type.${countryHint}

**DOCUMENT TYPE IDENTIFICATION:**
- Look for keywords like "Tenancy Agreement", "Lease Agreement" → Tenancy Agreement
- Look for keywords like "Landlord Statement", "Statement of Account" (with rent/management fee context), "Rental Statement" → Rental Statement
- Look for keywords like "Notice of Contributions", "Body Corporate", "Strata Levy", "Service Charge", "Levy Notice", "Reserve Fund", "Demands", "Receipts" (with service charge context), or "Account Statement" with "Service Charge / Reserve Fund" → Body Corporate / Strata / Service Charge Notice

⚠️ **DISAMBIGUATION:** An "Account Statement" or "Statement of Account" can be either a Rental Statement OR a Service Charge Statement. Check the content:
- If it has "Money In" / "Money Out" columns with rent, management fees → **Rental Statement**
- If it has "Demands" / "Receipts" columns with service charges, reserve fund → **Service Charge Notice**
- Look for keywords like "Council Rates", "Rate Notice", "Council Tax", "Property Tax", "Rates and Charges" → Council Rates / Property Tax Notice
- Look for keywords like "Home Loan", "Mortgage Statement", "Loan Account", "Offset Account", "Interest Charged", "Principal", "Repayment" → Mortgage / Home Loan Statement
- Look for a bank transaction list (e.g. HSBC, Barclays, NatWest) showing filtered payments to a mortgage lender (e.g. "BHAM MIDSHIRES", "Birmingham Midshir", "Nationwide", "Halifax") → Treat as **Mortgage / Home Loan Statement** — extract the payments as mortgage payments
- Look for keywords like "Title Search", "Title Reference", "Land Registry", "Title Register", "Deed", "Estate in Fee Simple", "Registered Owner", "Survey Plan", "Lot on Plan", "Easements, Encumbrances" → Property Title / Deed Search

---

**1. IF THE DOCUMENT IS A TENANCY AGREEMENT:**

Extract the following information:
- 'leaseStart': The tenancy/lease start date
- 'leaseEnd': The tenancy/lease end date
- 'contacts': Key contacts such as Landlord, Agent, or Property Manager with their role, name, and contact details
- 'features': Up to 5 special conditions or important terms (NOT standard legal clauses)

**Date Format:**
- Convert all dates to YYYY-MM-DD format

**CRITICAL RULES FOR TENANCY AGREEMENTS:**
- DO NOT extract any fee schedules, rent amounts, or financial charges as transactions
- The 'transactions' array must be null or omitted entirely
- Ignore any payment tables or fee breakdowns

---

**2. IF THE DOCUMENT IS A RENTAL STATEMENT (Landlord Statement/Statement of Account):**

⚠️ **IMPORTANT CONTEXT:** This statement is being viewed from the **property OWNER's perspective** (the landlord). The statement is produced by the letting/management agent.

**How these statements work:**
1. Rent is collected by the agent → this is the owner's **income**
2. The agent pays expenses (repairs, insurance, fees) out of that rent → these are the owner's **expenses**
3. The agent transfers the remainder to the owner ("Withdrawal by EFT to owner") → this is NOT a separate transaction, it is simply the net payout

**STEP 1: LOCATE THE STATEMENT OF ACCOUNT TABLE**

Look for a table with headers similar to:
- Date | Description | Money In | Money Out | Balance

This is the PRIMARY source for transaction data.

**STEP 2: UNDERSTAND THE TABLE STRUCTURE**

The table has these columns:
1. **Date** - When the transaction occurred
2. **Description** - What the transaction was for
3. **Money In** - Funds received into the agent's account (rent payments etc.)
4. **Money Out** - Funds paid out of the agent's account (expenses, owner withdrawals)
5. **Balance** - Running total after each transaction

⚠️ **CRITICAL WARNING — DISCARD THE BALANCE COLUMN ENTIRELY:**
The Balance column shows running cumulative totals — it is NOT a transaction amount.
Before processing ANY row, mentally remove the Balance column so it cannot influence your extraction.
The ONLY columns that contain transaction amounts are **Money In** and **Money Out**.
For each row, the amount comes from whichever of Money In or Money Out has a value. If NEITHER has a value (like an Opening Balance row where the number is only in the Balance column), that row has NO transaction amount — SKIP it.

**STEP 3: CLASSIFY TRANSACTIONS**

| Statement column | Description pattern | Action |
|---|---|---|
| Money In | Rent received / rent paid | type = **income** |
| Money Out | Maintenance, repairs, cleaning, pest control, insurance, fees | type = **expense** |
| Money Out | "Withdrawal by EFT to owner" / "payment to landlord" / "EFT Transfer to" owner | **SKIP — do NOT create a transaction** (this is just the net payout, not a separate income/expense) |
| Money Out | Agency fees, management fees | type = **expense** |
| Money Out | "Retained" / "Withheld" / "Held back" for maintenance, repairs, or works | type = **expense** (this is money kept from rent to pay for property work — it IS a real cost to the owner) |
| Either | "Balance brought forward" / "Opening Balance" | **SKIP — do NOT create a transaction** |
| Either | "Balance remaining" / "Closing Balance" | **SKIP — do NOT create a transaction** |

**STEP 4: EXTRACT EACH TRANSACTION ROW**

For each row in the Statement of Account table (skipping rows marked SKIP above), create a transaction:

**A. Extract the Date:**
- Dates may appear in various formats: DD/MM/YYYY, DD MMM YYYY, DD-MM-YYYY, or similar
- Convert ALL dates to YYYY-MM-DD format
- If a date is associated with a statement period header (e.g., "Statement Period: 01/01/2025 to 31/01/2025"), use the relevant date from that period for transactions that don't have their own date
- If a specific transaction row has no explicit date, try to infer it from the statement period or nearby context. Use the statement end date as a fallback
- EVERY transaction MUST have a date — do NOT return null for date

**B. Extract the Description:**
- Copy the exact text from the Description column

**C. Extract the Amount and Determine Type:**

Use the classification table in STEP 3 to determine the type. The amount is always the number from whichever column (Money In or Money Out) contains it.

- amount = the number value (e.g., 2,200.00 → 2200.00)
- type = determined by STEP 3 classification (NOT simply by which column it appears in)
- IGNORE what's in the Balance column

**D. Generate Transaction ID:**
- Create a unique UUID for each transaction

**STEP 5: WHAT TO EXCLUDE**

DO NOT extract transactions from:
- Rows marked **SKIP** in the STEP 3 table (withdrawals to owner, zero balances, balance remaining)
- "Breakdown of Agency Fees" sections (these detail fees already captured in the main table)
- "Account Transactions" sections (these show the EFT payout details — already excluded by STEP 3)
- "GST Summary" sections
- Any footer, summary, or total rows

**IMPORTANT — "Purchase Orders / Work in Progress" and similar supplementary sections:**
- If a maintenance/repair cost ALREADY appears as a line item in the main Statement of Account table (e.g., "Retained re: leak" in Money Out), extract it from the main table and do NOT duplicate it from the supplementary section.
- If a maintenance/repair cost appears ONLY in a supplementary section (not in the main table), DO extract it as an expense with the best available date.
- Never double-count: each real expense should appear exactly once.

Extract income/expense line items primarily from the main "Statement of Account" table, but also capture any real expenses from supplementary sections that are not already represented in the main table.

**STEP 5: VALIDATION**

- All amounts must be positive numbers (no negatives)
- Remove currency symbols and commas from amounts (£2,200.00 → 2200.00)
- The Balance column is ONLY for reference - never use it as a transaction amount
- Include ALL rows from the Statement of Account table, even Opening Balance

**FIELDS TO OMIT:**
- DO NOT extract 'leaseStart' or 'leaseEnd' from rental statements
- DO NOT extract 'contacts' or 'features' from rental statements
- Leave those fields null or omit them

---

**3. IF THE DOCUMENT IS A BODY CORPORATE / STRATA NOTICE OR SERVICE CHARGE STATEMENT:**

⚠️ **IMPORTANT CONTEXT:** This is viewed from the **property OWNER's perspective**. The owner receives these notices from the body corporate / strata manager / freeholder management company and must pay the levies/service charges.

**There are TWO formats — identify which one you have:**

**FORMAT A — Point-in-time Levy Notice** (single demand with a due date):
Typically titled "Notice of Contributions", "Levy Notice", etc. Shows one or more levy periods with amounts due.

**FORMAT B — Account Statement / Ledger** (running history of demands and payments):
Typically titled "Account Statement", "Statement of Account" with a date range (e.g. "From: 1 Oct 2023 To: 13 Mar 2026"). Has columns like Date | Description | Demands | Receipts | Balance. Shows a running history of charges and payments over multiple periods.

---

**FOR FORMAT A (Levy Notice):**

Extract each levy period as a **serviceCharge** entry. A single notice may contain one or multiple levy periods.

For each levy period:
- **id**: Generate a unique UUID
- **year**: The calendar year the levy period falls in (use the due date year)
- **amountDue**: The **net amount** the owner must pay (after any credits/payments applied). Look for "Net Amount", "Total", or "Amount Due" column
- **amountPaid**: Amount already credited or paid (from "Payment/Credit" rows). Use 0 if no credits
- **dueDate**: The due date in YYYY-MM-DD format
- **paymentDetails**: A brief breakdown listing each fund/component and its amount (e.g. "Admin Fund $1,617.45, Sinking Fund $155.16, Insurance Levy $300.23")

---

**FOR FORMAT B (Account Statement / Ledger):**

**STEP 1: Identify all DEMAND rows**

Demand rows appear in the "Demands" column (not "Receipts"). These are:
- "Service charge for period ..." — the main annual/semi-annual service charge
- "Year End Balancing Adjustment ..." — adjustments for prior periods

Each demand is a **serviceCharge** entry.

**STEP 2: Identify all RECEIPT rows**

Receipt rows appear in the "Receipts" column. These are payments made by the owner. They typically have a reference number and amount.

**STEP 3: Extract each demand as a serviceCharge**

For each demand row:
- **id**: Generate a unique UUID
- **year**: The calendar year from the service charge period start (e.g., "Service charge for period 01 Oct 24 to 30 Sep 25" → year = 2025; "Year End Balancing Adjustment - 01 October 2023 to 30 September 2024" → year = 2024)
- **amountDue**: The demand amount (from the Demands column). Use the absolute value (always positive)
- **dueDate**: The date of the demand row in YYYY-MM-DD format
- **paymentDetails**: The description from the demand row

**STEP 4: Calculate amountPaid using the closing balance**

⚠️ **CRITICAL:** Do NOT set amountPaid = amountDue for all entries. You must calculate actual payments.

1. Find the **closing balance** at the bottom of the statement
2. If closing balance > 0: the owner still owes money. The **most recent demand** is partially paid:
   - All older demands: amountPaid = amountDue (fully paid)
   - Most recent demand: amountPaid = amountDue - closingBalance
3. If closing balance <= 0: all demands are fully paid (owner has credit)
   - All demands: amountPaid = amountDue
4. If closing balance = 0: all demands exactly paid
   - All demands: amountPaid = amountDue

**STEP 5: Skip non-demand rows**

Do NOT create serviceCharge entries for:
- Receipt/payment rows (these are just payments, not charges)
- Opening balance rows
- Closing balance rows

**Currency:** Detect the currency from symbols or context (£ = GBP, $ in Australian documents = AUD).

**FIELDS TO OMIT:**
- DO NOT extract 'leaseStart', 'leaseEnd', 'transactions', 'contacts', 'features', or 'councilRates'
- Leave those fields null or omit them

---

**4. IF THE DOCUMENT IS A COUNCIL RATES / PROPERTY TAX NOTICE:**

⚠️ **IMPORTANT:** This is DIFFERENT from Body Corporate / Strata levies. Council rates are issued by the local government (council/municipality), NOT by a body corporate or strata manager.

**How to distinguish:**
- **Council Rates:** Issued by a city council or local government authority. Contains "General Rates", "Waste Charge", "Water Charge", "Environmental Levy", "Fire Levy", etc.
- **Body Corporate / Strata:** Issued by a body corporate, strata manager, or owners corporation. Contains "Admin Fund", "Sinking Fund", "Capital Works Fund", "Insurance Levy".

**What to extract:**

Extract each rating period as a **councilRates** entry.

For each period:
- **id**: Generate a unique UUID
- **year**: The calendar year (use the due date year)
- **amountDue**: The total amount due
- **amountPaid**: Amount already paid or credited. Use 0 if unknown
- **dueDate**: The due date in YYYY-MM-DD format
- **paymentDetails**: A brief breakdown listing each component and its amount (e.g. "General Rates $362.03, Waste Utility Charge $128.24, Bushland Preservation Levy $13.31")

**Currency:** Detect the currency from symbols or context.

**FIELDS TO OMIT:**
- DO NOT extract 'leaseStart', 'leaseEnd', 'transactions', 'contacts', 'features', or 'serviceCharges'
- Leave those fields null or omit them

---

**5. IF THE DOCUMENT IS A MORTGAGE / HOME LOAN STATEMENT:**

⚠️ **IMPORTANT CONTEXT:** This is viewed from the **property OWNER's perspective**. The owner has one or more loan accounts with a bank, and possibly an offset account.

**Understanding Mortgage Statements:**

There are TWO formats you may encounter:

**FORMAT A — Direct mortgage statement from the lender:**
Shows loan account details, interest charges, repayments, and balances directly from the mortgage provider.

**FORMAT B — Bank transaction statement showing payments TO a mortgage lender:**
A bank account transaction listing (e.g. from HSBC, Barclays, NatWest) filtered to show payments to a mortgage lender (e.g. "BHAM MIDSHIRES", "Birmingham Midshir", "Nationwide", "Halifax"). This shows the outgoing payments from the borrower's current account. Each "Amount out" entry is a payment to the mortgage lender. "Amount in" entries with descriptions like "REVERSAL OF" are payment corrections — these cancel the corresponding outgoing payment and should be excluded (both the reversal and the original payment it reverses).

For FORMAT B:
- The **lender name** is the payee (e.g. "BHAM MIDSHIRES" = Birmingham Midshires)
- The **bank account number** shown in the header is the source account, NOT the mortgage account number — leave accountNumber null or use the lender name
- Each "Amount out" row is a mortgage payment
- **Detecting regular vs overpayment**: If there are two sets of transactions — one with consistent recurring amounts (monthly, same value) and another with irregular/larger amounts — the recurring ones are regular interest payments and the irregular ones are overpayments (voluntary capital reductions). Create separate loan entries if they clearly go to different payment references, or use the paymentType field to distinguish them on a single loan.

**How to identify loan accounts vs offset accounts (FORMAT A):**
- **Loan accounts**: Show a DR (debit) balance, have interest charges, receive repayment credits. Often labelled "Home Loan", "Variable Rate", "Fixed Rate", etc.
- **Offset accounts**: Show a CR (credit) balance, receive deposits and withdrawals. Often labelled "Offset", "Transaction Account", "Everyday Offset". The balance here offsets interest on the linked loan.

**What to extract into 'mortgage':**

For each **loan account** found, create an entry in 'mortgage.loans':
- **accountNumber**: The account number (null if not identifiable, e.g. from a bank statement)
- **lender**: The bank/lender name (from the statement header or payee name)
- **type**: 'Fixed', 'Variable', or 'Tracker' based on the loan product name. If not identifiable, omit.
- **interestRate**: The annual interest rate if stated
- **outstandingBalance**: The closing balance of the loan (always positive, even if shown as DR)
- **creditLimit**: The credit/borrowing limit if shown
- **repaymentAmount**: The regular repayment amount (infer from consistent credit amounts)
- **payments**: For each repayment credit on this loan:
  - **date**: In YYYY-MM-DD format
  - **amount**: The repayment amount (positive)
  - **interest**: Interest charged in the same period. If interest is charged as a separate line item on a specific date, match it to the nearest repayment. If interest is charged monthly, assign it to the repayment in that month. Use 0 if not separately listed (common for bank statements which only show the total payment).
  - **paymentType**: 'regular' for scheduled recurring payments, 'overpayment' for voluntary extra/irregular capital payments. If monthly payments are consistent in amount, they are 'regular'. Payments that are notably different amounts, ad-hoc, or appear alongside the regular payments as additional transfers are 'overpayment'.

For the **offset account** (if present):
- **offsetBalance**: The closing CR balance
- **offsetAccountNumber**: The account number

**Deriving principal from each payment:**
Do NOT include a 'principal' field — the caller will calculate: principal = amount - interest.

**Currency:** Detect from symbols/context.

**HANDLING REVERSALS (bank statements):**
If you see a payment out followed by a "REVERSAL OF ..." payment in for the same amount on the same or next day, these cancel each other out. Exclude BOTH the original and the reversal from the payments list.

**FIELDS TO OMIT:**
- DO NOT extract 'leaseStart', 'leaseEnd', 'transactions', 'contacts', 'features', 'serviceCharges', or 'councilRates'
- Leave those fields null or omit them

---

**6. IF THE DOCUMENT IS A PROPERTY TITLE / DEED SEARCH:**

⚠️ **IMPORTANT CONTEXT:** This is a title search result or land registry extract showing the legal ownership and encumbrances on a property. Common formats include Australian Title Search (Queensland, NSW, VIC), UK Land Registry, and other national registries.

**What to extract into 'title':**

- **titleReference**: The title reference or title number (e.g. "51200071" in QLD, or a UK title number)
- **dateCreated**: The date the title was first created (YYYY-MM-DD)
- **previousTitle**: Previous title reference if mentioned
- **estate**: The estate type — e.g. "Estate in Fee Simple" (freehold), "Leasehold"
- **lotPlan**: The lot and plan description (e.g. "LOT 12203 SURVEY PLAN 282123")
- **localGovernment**: The local government/council area
- **registeredOwner**: The current registered owner's full name
- **ownershipDate**: The date of the most recent ownership transfer (YYYY-MM-DD). In QLD this is the Dealing date under REGISTERED OWNER
- **dealingNumber**: The dealing/transfer reference number
- **encumbrances**: Each item under "Easements, Encumbrances and Interests" as a separate entry:
  - **type**: Category — "Mortgage", "Easement", "Building Management Statement", "Covenant", "Crown Rights", etc.
  - **reference**: The dealing/registration number
  - **date**: The registration date (YYYY-MM-DD)
  - **party**: The named party (e.g. lender name like "MACQUARIE BANK LIMITED")
  - **details**: Brief description if available (e.g. "benefiting and burdening the lot")
- **communityStatements**: Community Management Statement or Building Management Statement reference numbers as a list of strings
- **searchDate**: The date the title search was conducted (YYYY-MM-DD)

**FIELDS TO OMIT:**
- DO NOT extract 'leaseStart', 'leaseEnd', 'transactions', 'contacts', 'features', 'serviceCharges', 'councilRates', or 'mortgage'
- Leave those fields null or omit them

---

**DOCUMENT TEXT TO ANALYZE:**

${pdfText}`;
}

/**
 * Extract text from a PDF given as an ArrayBuffer.
 */
async function extractPdfText(data: ArrayBuffer): Promise<string> {
    const loadingTask = pdfjs.getDocument({ data });
    const pdf = await loadingTask.promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        text += textContent.items.map(item => (item as any).str).join(' ') + '\n';
    }
    return text;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

/**
 * Extract property data from a PDF File object.
 */
export async function extractFromFile(file: File, country?: PropertyCountry): Promise<ExtractedPropertyData> {
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = arrayBufferToBase64(arrayBuffer);
    const documentToStore: Document = {
        name: file.name,
        url: '#',
        data: base64Data,
        mimeType: 'application/pdf',
    };

    const pdfText = await extractPdfText(arrayBuffer);
    const result = await callGemini(pdfText, country, base64Data);
    return { ...result, document: documentToStore };
}

/**
 * Extract property data from base64-encoded PDF data (e.g., from Gmail attachment).
 */
export async function extractFromBase64(base64Data: string, fileName: string, sourceLabel?: string, country?: PropertyCountry): Promise<ExtractedPropertyData> {
    // Convert base64 to ArrayBuffer
    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
    }
    const arrayBuffer = bytes.buffer;

    const docName = sourceLabel ? `${fileName} (from: ${sourceLabel})` : fileName;
    const documentToStore: Document = {
        name: docName,
        url: '#',
        data: base64Data,
        mimeType: 'application/pdf',
    };

    const pdfText = await extractPdfText(arrayBuffer);
    const result = await callGemini(pdfText, country, base64Data);
    return { ...result, document: documentToStore };
}

/**
 * Send extracted PDF text to Gemini and parse the structured response.
 * If base64Data is provided and text extraction is sparse, sends the PDF
 * as an inline data part for vision-based extraction.
 */
async function callGemini(pdfText: string, country?: PropertyCountry, base64Data?: string): Promise<ExtractedPropertyData> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    const prompt = buildPrompt(pdfText, country);

    // Always send the raw PDF alongside text when available — Gemini vision handles
    // browser-printed PDFs and table layouts much better than extracted text alone.
    const useVision = !!base64Data;

    const contents: any = useVision
        ? [
            { inlineData: { mimeType: 'application/pdf', data: base64Data } },
            { text: prompt },
          ]
        : prompt;

    if (useVision) {
        console.log(`Sending PDF to Gemini with vision (text: ${pdfText.trim().length} chars)`);
    }

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents,
        config: {
            responseMimeType: "application/json",
            responseSchema: propertySchema,
        },
    });

    const jsonStr = response.text.trim();
    return JSON.parse(jsonStr);
}
