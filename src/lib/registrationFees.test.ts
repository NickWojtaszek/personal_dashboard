import { describe, it, expect } from 'vitest';
import type { RegistrationFeeInfo, FeeBill } from '../types';
import { markBillPaid } from './bills';
import { parseAllDueDates, buildCostLineItems } from '../components/general/dateUtils';

const feeBill = (over: Partial<FeeBill> = {}): FeeBill => ({
    id: 'b1', amountDue: 481, amountPaid: 0, dueDate: '2026-07-15', ...over,
});

const gmc = (bills: FeeBill[], over: Partial<RegistrationFeeInfo> = {}): RegistrationFeeInfo => ({
    id: 'f1', name: 'GMC', authority: 'General Medical Council', feeType: 'ARF',
    currency: 'GBP', referenceNumber: '6121858', bills, ...over,
});

const feeDates = (fees: RegistrationFeeInfo[]) =>
    parseAllDueDates([], [], [], [], true, [], fees).filter(d => d.subType === 'Registration Fee Due');

describe('markBillPaid — shared bill lifecycle', () => {
    it('settles and stamps a fee bill just like a rates notice', () => {
        const paid = markBillPaid(feeBill(), new Date(2026, 6, 15, 9, 2));
        expect(paid.amountPaid).toBe(481);
        expect(paid.paidAt).toBe('2026-07-15');
        expect(paid.archivedAt).toBeTruthy();
    });
});

describe('registration fees reach the overview', () => {
    it('shows an outstanding GMC fee with its due date, in GBP, dismissible', () => {
        const items = feeDates([gmc([feeBill({ dueDate: '2026-07-15', amountDue: 481 })])]);
        expect(items).toHaveLength(1);
        expect(items[0].type).toBe('RegistrationFee');
        expect(items[0].date).toBe('2026-07-15');
        expect(items[0].amount).toBe(481);
        expect(items[0].currency).toBe('GBP');
        expect(items[0].recordId).toBe('b1');
        expect(items[0].detail).toContain('General Medical Council');
    });

    it('defaults to an annual cycle: predicts next year once dismissed', () => {
        const paid = markBillPaid(feeBill({ dueDate: '2026-07-15' }), new Date(2026, 6, 15));
        const items = feeDates([gmc([paid])]); // no billingFrequencyMonths → 12
        expect(items).toHaveLength(1);
        expect(items[0].date).toBe('2027-07-15');
        expect(items[0].isPredicted).toBe(true);
    });

    it('honours a custom cycle when set', () => {
        const paid = markBillPaid(feeBill({ dueDate: '2026-07-15' }), new Date(2026, 6, 15));
        const items = feeDates([gmc([paid], { billingFrequencyMonths: 6 })]);
        expect(items[0].date).toBe('2027-01-15');
    });

    it('replaces the prediction when the next real notice arrives', () => {
        const paid = markBillPaid(feeBill({ id: 'b1', dueDate: '2026-07-15' }), new Date(2026, 6, 15));
        const next = feeBill({ id: 'b2', dueDate: '2027-07-15', amountDue: 495 });
        const items = feeDates([gmc([paid, next])]);
        expect(items).toHaveLength(1);
        expect(items[0].isPredicted).toBeFalsy();
        expect(items[0].amount).toBe(495);
        expect(items[0].recordId).toBe('b2');
    });

    it('drops an archived registration entirely', () => {
        const items = feeDates([gmc([feeBill()], { status: 'Archived' })]);
        expect(items).toHaveLength(0);
    });

    it('appears in the cost forecast as a monthly set-aside', () => {
        const line = buildCostLineItems([], [], [], [gmc([feeBill({ amountDue: 481 })])])
            .find(i => i.name === 'GMC')!;
        expect(line.category).toBe('Fee');
        expect(line.currency).toBe('GBP');
        expect(line.monthlyAmount).toBeCloseTo(481 / 12, 2); // annual by default
        expect(line.rawFrequency).toContain('year');
    });

    it('spreads a non-annual fee cycle over its own period in the forecast', () => {
        const line = buildCostLineItems([], [], [], [gmc([feeBill({ amountDue: 600 })], { billingFrequencyMonths: 6 })])
            .find(i => i.name === 'GMC')!;
        expect(line.monthlyAmount).toBe(100); // 600 / 6
    });

    it('excludes an archived registration from the forecast', () => {
        const lines = buildCostLineItems([], [], [], [gmc([feeBill()], { status: 'Archived' })]);
        expect(lines.find(i => i.category === 'Fee')).toBeUndefined();
    });

    it('tracks GMC and MCIRL independently', () => {
        const items = feeDates([
            gmc([feeBill({ id: 'g', dueDate: '2026-07-15', amountDue: 481 })]),
            gmc([feeBill({ id: 'm', dueDate: '2026-09-01', amountDue: 620 })], {
                id: 'f2', name: 'Irish Medical Council', authority: 'Medical Council of Ireland', currency: 'EUR',
            }),
        ]);
        expect(items).toHaveLength(2);
        expect(items.find(i => i.sourceName === 'GMC')?.currency).toBe('GBP');
        expect(items.find(i => i.sourceName === 'Irish Medical Council')?.currency).toBe('EUR');
    });
});
