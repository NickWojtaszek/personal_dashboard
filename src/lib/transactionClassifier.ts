/**
 * Classifies expense transactions into categories for auto-populating
 * maintenance jobs and compliance records from rental statements.
 */

import type { FinancialTransaction, MaintenanceJob, EicrCheck, GasSafetyCheck } from '../types';
import { v4 as uuidv4 } from 'uuid';

export type TransactionCategory = 'maintenance' | 'eicr' | 'gas_safety' | 'skip';

const EICR_PATTERNS = [
    /\beicr\b/i,
    /\belectrical\s*(inspection|safety|certificate|check|test)/i,
    /\bperiodic\s*inspection/i,
];

const GAS_SAFETY_PATTERNS = [
    /\bgas\s*safety/i,
    /\bgas\s*check/i,
    /\bgas\s*certificate/i,
    /\bgas\s*inspection/i,
    /\bcp12\b/i,
    /\blandlord\s*gas/i,
];

const SKIP_PATTERNS = [
    /\bmanagement\s*fee/i,
    /\bagency\s*fee/i,
    /\bletting\s*fee/i,
    /\brenewal\s*fee/i,
    /\badmin(istration)?\s*fee/i,
    /\bwithdrawal\b/i,
    /\btransfer\s*(to|eft)/i,
    /\bpayment\s*(to|sent)/i,
    /\bvat\b/i,
    /\bgst\b/i,
    /\brent\s*(received|collected|paid)/i,
    /\badvance\s*rent/i,
    /\bopening\s*balance/i,
    /\bbalance\s*(brought|remaining|carried)/i,
    /\bpre.?tenancy\s*package/i,
    /\bground\s*rent/i,
    /\bservice\s*charge/i,
    /\binsurance\b/i,
    /\bterri\s*scheer\b/i,
    /\bcouncil\s*(tax|rate)/i,
    /\bstrata\s*levy/i,
    /\bbody\s*corp/i,
    /\btax\s*on\s*rental/i,
    /\btax\s*to\s*hmrc/i,
    /\badminister\s*tax/i,
    /\bnon.?resident\s*tax/i,
    /\bcompliance\s*fee\s*charge/i,
];

/**
 * Classify a single expense transaction.
 */
export function classifyTransaction(description: string): TransactionCategory {
    for (const pattern of EICR_PATTERNS) {
        if (pattern.test(description)) return 'eicr';
    }
    for (const pattern of GAS_SAFETY_PATTERNS) {
        if (pattern.test(description)) return 'gas_safety';
    }
    for (const pattern of SKIP_PATTERNS) {
        if (pattern.test(description)) return 'skip';
    }
    // Default: anything else that's an expense is likely maintenance/repairs
    return 'maintenance';
}

/**
 * From a list of expense transactions, produce maintenance jobs,
 * EICR checks, and gas safety checks.
 */
export function classifyExpenseTransactions(transactions: FinancialTransaction[]): {
    maintenanceJobs: MaintenanceJob[];
    eicrChecks: EicrCheck[];
    gasSafetyChecks: GasSafetyCheck[];
} {
    const maintenanceJobs: MaintenanceJob[] = [];
    const eicrChecks: EicrCheck[] = [];
    const gasSafetyChecks: GasSafetyCheck[] = [];

    for (const tx of transactions) {
        if (tx.type !== 'expense') continue;

        const category = classifyTransaction(tx.description);

        switch (category) {
            case 'maintenance':
                maintenanceJobs.push({
                    id: uuidv4(),
                    date: tx.date || new Date().toISOString().split('T')[0],
                    description: tx.description,
                    cost: tx.amount,
                });
                break;
            case 'eicr':
                eicrChecks.push({
                    id: uuidv4(),
                    date: tx.date || new Date().toISOString().split('T')[0],
                });
                break;
            case 'gas_safety':
                gasSafetyChecks.push({
                    id: uuidv4(),
                    date: tx.date || new Date().toISOString().split('T')[0],
                });
                break;
            // 'skip' — do nothing
        }
    }

    return { maintenanceJobs, eicrChecks, gasSafetyChecks };
}

/**
 * Calculate next due date for EICR (5 years from last check).
 */
export function calcEicrNextDue(lastCheckDate: string): string {
    const d = new Date(lastCheckDate);
    d.setFullYear(d.getFullYear() + 5);
    return d.toISOString().split('T')[0];
}

/**
 * Calculate next due date for Gas Safety (1 year from last check).
 */
export function calcGasSafetyNextDue(lastCheckDate: string): string {
    const d = new Date(lastCheckDate);
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
}
