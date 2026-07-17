import { describe, it, expect } from 'vitest';
import type { PropertyInfo, InsuranceInfo, CouncilTax, ServiceCharge, FinancialTransaction } from '../types';
import { detectPropertyGaps, inferFrequencyMonths } from './gapDetection';

const TODAY = '2026-09-01';

const ct = (dueDate: string, over: Partial<CouncilTax> = {}): CouncilTax =>
    ({ id: dueDate, year: 2026, amountDue: 585, amountPaid: 585, dueDate, ...over });

const prop = (over: Partial<PropertyInfo> = {}): PropertyInfo =>
    ({ id: 'p1', name: 'Test', location: '', url: '', country: 'AU', ...over } as PropertyInfo);

const withCouncil = (bills: CouncilTax[], over: Partial<PropertyInfo> = {}) =>
    prop({ operations: { leaseholdCharges: { councilTax: bills } }, ...over });

const councilGap = (p: PropertyInfo, ins?: InsuranceInfo[]) =>
    detectPropertyGaps(p, ins, TODAY).find(g => g.source === 'council');

describe('inferFrequencyMonths', () => {
    it('snaps quarterly spacing to 3', () => {
        expect(inferFrequencyMonths(['2026-02-05', '2026-05-07', '2026-08-05'])).toBe(3);
    });
    it('snaps ~yearly to 12', () => {
        expect(inferFrequencyMonths(['2024-06-13', '2025-06-13', '2026-06-13'])).toBe(12);
    });
    it('needs at least two dates', () => {
        expect(inferFrequencyMonths(['2026-02-05'])).toBeNull();
    });
});

describe('council rates gaps (the reported case)', () => {
    it('flags the missing quarter(s) for a Brisbane quarterly property', () => {
        // Exactly the user's data: Feb, May, Aug 2026 — quarterly, so ~Nov is absent.
        const p = withCouncil(
            [ct('2026-02-05'), ct('2026-05-07'), ct('2026-08-05')],
            { billingFrequencyMonths: 3, financials: { purchaseDate: '2025-11-01' } },
        );
        const gap = councilGap(p)!;
        expect(gap).toBeTruthy();
        // Expected dates are phased on the actual bills (due on the 5th), so the
        // missing quarter lands on 2025-11-05, not the purchase date.
        expect(gap.around).toContain('2025-11-05');
        expect(gap.message).toMatch(/expected found/);
    });

    it('no gap when every quarter in the window is present', () => {
        const p = withCouncil(
            [ct('2026-02-05'), ct('2026-05-07'), ct('2026-08-05')],
            { billingFrequencyMonths: 3, financials: { purchaseDate: '2026-01-01' } },
        );
        // Ownership from Jan 2026, quarterly from Feb → Feb/May/Aug all present, none missing.
        expect(councilGap(p)).toBeUndefined();
    });

    it('infers the cadence when billingFrequencyMonths is unset', () => {
        const p = withCouncil(
            [ct('2026-02-05'), ct('2026-05-07'), ct('2026-08-05')],
            { financials: { purchaseDate: '2025-11-01' } },
        );
        expect(councilGap(p)).toBeTruthy(); // inferred 3-monthly → Nov'25 gap
    });

    it('ignores tenant-paid council bills', () => {
        const p = withCouncil([ct('2026-08-05', { paidByTenant: true })], { billingFrequencyMonths: 3 });
        expect(councilGap(p)).toBeUndefined();
    });

    it('caps the lookback at ~2 years, not the whole ownership history', () => {
        const p = withCouncil(
            [ct('2026-08-05')],
            { billingFrequencyMonths: 3, financials: { purchaseDate: '2010-01-01' } },
        );
        const gap = councilGap(p)!;
        // Would be dozens of quarters since 2010 if unbounded; 2-year floor keeps it to ~8.
        expect(gap.around.length).toBeLessThanOrEqual(8);
    });
});

describe('strata gaps', () => {
    const sc = (dueDate: string): ServiceCharge => ({ id: dueDate, year: 2026, amountDue: 500, amountPaid: 500, dueDate });
    it('detects a missing half-yearly strata levy from inferred cadence', () => {
        // Half-yearly: Jan and Jul 2025, then Jul 2026 — Jan 2026 is missing.
        const p = prop({
            operations: { leaseholdCharges: { serviceCharges: [sc('2025-01-15'), sc('2025-07-15'), sc('2026-07-15')] } },
            financials: { purchaseDate: '2025-01-01' },
        });
        const gap = detectPropertyGaps(p, [], TODAY).find(g => g.source === 'strata')!;
        expect(gap).toBeTruthy();
        expect(gap.around).toContain('2026-01-15');
    });
});

describe('insurance coverage gaps', () => {
    const policy = (over: Partial<InsuranceInfo> = {}): InsuranceInfo =>
        ({ id: 'i1', name: 'Cover', propertyId: 'p1', renewalDate: '', status: 'Active', ...over } as InsuranceInfo);

    it('flags a currently-lapsed policy', () => {
        const p = prop();
        const ins = [policy({ startDate: '2024-06-13', endDate: '2025-06-13' })]; // ended >1yr ago
        const gap = detectPropertyGaps(p, ins, TODAY).find(g => g.source === 'insurance')!;
        expect(gap).toBeTruthy();
        expect(gap.message).toMatch(/lapsed/i);
    });

    it('flags a gap between two coverage periods', () => {
        const p = prop();
        const ins = [policy({
            startDate: '2026-03-13', endDate: '2027-03-13',
            history: [{ id: 'h', periodStart: '2024-06-13', periodEnd: '2025-06-13', provider: 'X', archivedAt: '2025-06-13T00:00:00Z' }], // 9-month gap after
        })];
        const gap = detectPropertyGaps(p, ins, TODAY).find(g => g.source === 'insurance')!;
        expect(gap).toBeTruthy();
        expect(gap.around).toContain('2025-06-13');
    });

    it('no gap for continuous, current coverage', () => {
        const p = prop();
        const ins = [policy({
            startDate: '2026-06-13', endDate: '2027-06-13',
            history: [{ id: 'h', periodStart: '2025-06-13', periodEnd: '2026-06-13', provider: 'X', archivedAt: '2026-06-13T00:00:00Z' }],
        })];
        expect(detectPropertyGaps(p, ins, TODAY).find(g => g.source === 'insurance')).toBeUndefined();
    });
});

describe('rent gaps', () => {
    const rent = (date: string): FinancialTransaction => ({ id: date, date, description: 'Rent', amount: 2000, type: 'income', category: 'Rent' });
    it('flags a missing month within a monthly rent run', () => {
        const p = prop({
            financials: { transactions: [rent('2026-01-05'), rent('2026-02-05'), rent('2026-04-05'), rent('2026-05-05')] },
        });
        // March is missing between Feb and Apr.
        const gap = detectPropertyGaps(p, [], TODAY).find(g => g.source === 'rent')!;
        expect(gap).toBeTruthy();
        expect(gap.around.some(d => d.startsWith('2026-03'))).toBe(true);
    });
    it('does not flag the current unfilled month (only within the recorded span)', () => {
        const p = prop({
            financials: { transactions: [rent('2026-06-05'), rent('2026-07-05'), rent('2026-08-05')] },
        });
        // Sept (today) not yet recorded — must NOT be flagged.
        expect(detectPropertyGaps(p, [], TODAY).find(g => g.source === 'rent')).toBeUndefined();
    });
});

describe('disposed property', () => {
    it('reports no gaps once sold', () => {
        const p = withCouncil([ct('2026-02-05')], { billingFrequencyMonths: 3, disposal: { date: '2026-03-01' } as any });
        expect(detectPropertyGaps(p, [], TODAY)).toHaveLength(0);
    });
});
