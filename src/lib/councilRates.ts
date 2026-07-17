import type { CouncilTax } from '../types';
import { toLocalISO } from './dates';

/**
 * Settle a rates notice and archive it out of the dashboard.
 *
 * Single source of truth for "dismiss on pay" — used by both the dashboard row
 * action and the property section's Mark Paid, so the two can't drift.
 *
 * `paidAt` matters: it records *when* it was paid. `amountPaid >= amountDue` alone
 * carries no date, so it can't anchor the next billing period. `archivedAt` is what
 * removes it from the overview; the record itself stays on the property as history.
 */
export function markRatesPaid(charge: CouncilTax, now: Date = new Date()): CouncilTax {
    return {
        ...charge,
        amountPaid: charge.amountDue,
        paidAt: toLocalISO(now),
        archivedAt: now.toISOString(),
    };
}
