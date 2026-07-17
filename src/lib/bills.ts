import { toLocalISO } from './dates';

/**
 * Minimal shape of a payable bill: a due amount, what's been paid, and the two
 * lifecycle stamps. Council rates (CouncilTax) and registration fees (FeeBill)
 * both satisfy it, so they share the same "dismiss on pay" behaviour.
 */
export interface PayableBill {
    amountDue: number;
    amountPaid: number;
    paidAt?: string;      // YYYY-MM-DD
    archivedAt?: string;  // ISO timestamp
}

/**
 * Settle a bill and archive it out of the dashboard.
 *
 * Single source of truth for "dismiss on pay". `paidAt` records *when* it was paid
 * (a date; `amountPaid >= amountDue` alone carries none) which anchors the next
 * predicted cycle. `archivedAt` removes it from the overview; the record itself
 * lives on as history. Does not mutate the input.
 */
export function markBillPaid<T extends PayableBill>(bill: T, now: Date = new Date()): T {
    return {
        ...bill,
        amountPaid: bill.amountDue,
        paidAt: toLocalISO(now),
        archivedAt: now.toISOString(),
    };
}
