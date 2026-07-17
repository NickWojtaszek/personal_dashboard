import type { CouncilTax } from '../types';
import { markBillPaid } from './bills';

/**
 * Settle a rates notice and archive it out of the dashboard. Thin alias over the
 * shared bill lifecycle (see markBillPaid) — used by both the dashboard row action
 * and the property section's Mark Paid, so the two can't drift.
 */
export function markRatesPaid(charge: CouncilTax, now: Date = new Date()): CouncilTax {
    return markBillPaid(charge, now);
}
