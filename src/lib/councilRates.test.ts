import { describe, it, expect } from 'vitest';
import type { CouncilTax, PropertyInfo } from '../types';
import { markRatesPaid } from './councilRates';
import { parseAllDueDates } from '../components/general/dateUtils';

const bill = (over: Partial<CouncilTax> = {}): CouncilTax => ({
    id: 'r1', year: 2026, amountDue: 812.4, amountPaid: 0, dueDate: '2026-07-17', ...over,
});

describe('markRatesPaid', () => {
    it('settles the amount and stamps when it was paid and archived', () => {
        const paid = markRatesPaid(bill(), new Date(2026, 6, 20, 14, 30));
        expect(paid.amountPaid).toBe(812.4);
        expect(paid.paidAt).toBe('2026-07-20');
        expect(paid.archivedAt).toBeTruthy();
    });

    it('records paidAt as a local date, so a late-evening payment keeps its own day', () => {
        // 23:30 local on the 20th. toISOString() would report the 21st in a UTC- zone
        // and the 20th shifted in others; the local date is what the user actually did.
        const paid = markRatesPaid(bill(), new Date(2026, 6, 20, 23, 30));
        expect(paid.paidAt).toBe('2026-07-20');
    });

    it('does not mutate the original record', () => {
        const original = bill();
        markRatesPaid(original);
        expect(original.amountPaid).toBe(0);
        expect(original.archivedAt).toBeUndefined();
    });
});

describe('the full flow: outstanding → dismiss → wait for next', () => {
    const hillview = (councilTax: CouncilTax[]): PropertyInfo => ({
        id: 'p1', name: 'Hillview', location: 'Sunshine Coast', url: '', country: 'AU',
        billingFrequencyMonths: 6,
        operations: { leaseholdCharges: { councilTax } },
    } as PropertyInfo);

    const overview = (p: PropertyInfo) =>
        parseAllDueDates([p], [], [], [], true).filter(d => d.subType === 'Council Rates Due');

    it('shows the real notice, then the projected next one after dismissal', () => {
        // 1. Notice logged against the property — the dashboard shows the real due date.
        const before = overview(hillview([bill({ dueDate: '2026-07-17' })]));
        expect(before).toHaveLength(1);
        expect(before[0].date).toBe('2026-07-17');
        expect(before[0].isPredicted).toBeFalsy();
        expect(before[0].recordId).toBe('r1'); // dismissible
        expect(before[0].currency).toBe('AUD');

        // 2. Paid → dismissed. The record is archived, not deleted.
        const dismissed = markRatesPaid(before[0] && bill({ dueDate: '2026-07-17' }), new Date(2026, 6, 20));

        // 3. The overview now shows the projected next notice, 6 months on, greyed out.
        const after = overview(hillview([dismissed]));
        expect(after).toHaveLength(1);
        expect(after[0].date).toBe('2027-01-17');
        expect(after[0].isPredicted).toBe(true);
        expect(after[0].recordId).toBeUndefined(); // nothing real to dismiss

        // 4. The bill still lives on the property as history.
        expect(dismissed.paidAt).toBe('2026-07-20');
        expect(dismissed.amountPaid).toBe(dismissed.amountDue);
    });

    it('replaces the projection once the next real notice arrives', () => {
        const dismissed = markRatesPaid(bill({ dueDate: '2026-07-17' }), new Date(2026, 6, 20));
        const nextNotice = bill({ id: 'r2', dueDate: '2027-01-17', amountDue: 845.1, year: 2027 });

        const items = overview(hillview([dismissed, nextNotice]));
        expect(items).toHaveLength(1);
        expect(items[0].isPredicted).toBeFalsy();
        expect(items[0].amount).toBe(845.1); // the real amount, not last period's estimate
        expect(items[0].recordId).toBe('r2');
    });
});
