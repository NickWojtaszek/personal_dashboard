import { describe, it, expect } from 'vitest';
import type { PropertyInfo, CouncilTax } from '../../types';
import { parseAllDueDates, buildCostLineItems } from './dateUtils';

/**
 * Council rates on the general overview.
 *
 * Before this, parseAllDueDates emitted no leaseholdCharges dates at all — council
 * rates existed in the data and were silently invisible on the dashboard.
 *
 * includeOverdue: true throughout, so assertions don't depend on the real "today".
 */

const rates = (over: Partial<CouncilTax> & { id: string }): CouncilTax => ({
    year: 2026, amountDue: 500, amountPaid: 0, dueDate: '2026-07-17', ...over,
});

const property = (over: Partial<PropertyInfo>): PropertyInfo => ({
    id: 'p1', name: 'Hillview', location: 'Sunshine Coast', url: '', country: 'AU', ...over,
} as PropertyInfo);

const withRates = (list: CouncilTax[], over: Partial<PropertyInfo> = {}) =>
    property({ operations: { leaseholdCharges: { councilTax: list } }, ...over });

const councilRates = (props: PropertyInfo[]) =>
    parseAllDueDates(props, [], [], [], true).filter(d => d.subType === 'Council Rates Due');

describe('parseAllDueDates — council rates reach the overview', () => {
    it('emits an outstanding notice with its due date', () => {
        const items = councilRates([withRates([rates({ id: 'r1', dueDate: '2026-08-31', amountDue: 812.4 })])]);
        expect(items).toHaveLength(1);
        expect(items[0].date).toBe('2026-08-31');
        expect(items[0].amount).toBe(812.4);
        expect(items[0].recordId).toBe('r1');
        expect(items[0].isPredicted).toBeFalsy();
    });

    it('reports AU rates in AUD, not GBP', () => {
        const items = councilRates([withRates([rates({ id: 'r1' })])]);
        expect(items[0].currency).toBe('AUD');
    });

    it('still reports a UK property in GBP', () => {
        const items = councilRates([withRates([rates({ id: 'r1' })], { country: 'UK' })]);
        expect(items[0].currency).toBe('GBP');
    });

    it('drops a dismissed (archived) notice from the overview', () => {
        const items = councilRates([
            withRates([rates({ id: 'r1', archivedAt: '2026-07-18T10:00:00.000Z' })]),
        ]);
        // No billingFrequencyMonths set, so nothing is projected either.
        expect(items).toHaveLength(0);
    });

    it('ignores rates paid by the tenant', () => {
        const items = councilRates([withRates([rates({ id: 'r1', paidByTenant: true })])]);
        expect(items).toHaveLength(0);
    });
});

describe('parseAllDueDates — predicted next notice', () => {
    it('projects the Sunshine Coast 6-month cycle once the bill is dismissed', () => {
        const items = councilRates([
            withRates(
                [rates({ id: 'r1', dueDate: '2026-07-17', archivedAt: '2026-07-17T10:00:00.000Z' })],
                { billingFrequencyMonths: 6 },
            ),
        ]);
        expect(items).toHaveLength(1);
        expect(items[0].date).toBe('2027-01-17');
        expect(items[0].isPredicted).toBe(true);
        expect(items[0].recordId).toBeUndefined(); // nothing real to dismiss yet
    });

    it('projects the Brisbane 3-month cycle', () => {
        const items = councilRates([
            withRates(
                [rates({ id: 'r1', dueDate: '2026-07-17', archivedAt: '2026-07-17T10:00:00.000Z' })],
                { billingFrequencyMonths: 3, name: 'Brisbane flat' },
            ),
        ]);
        expect(items[0].date).toBe('2026-10-17');
    });

    it('clamps a month-end projection instead of overflowing into the next month', () => {
        const items = councilRates([
            withRates(
                [rates({ id: 'r1', dueDate: '2026-08-31', archivedAt: '2026-09-01T10:00:00.000Z' })],
                { billingFrequencyMonths: 3 },
            ),
        ]);
        expect(items[0].date).toBe('2026-11-30'); // naive setMonth would say 2026-12-01
    });

    it('projects from the latest notice, which `year` alone cannot identify', () => {
        // Four quarterly notices, all year 2026 — sorting by year is ambiguous.
        const quarters = ['2026-01-15', '2026-04-15', '2026-07-15', '2026-10-15'].map((d, i) =>
            rates({ id: `r${i}`, dueDate: d, archivedAt: '2026-10-16T10:00:00.000Z' }),
        );
        const items = councilRates([withRates(quarters, { billingFrequencyMonths: 3 })]);
        expect(items).toHaveLength(1);
        expect(items[0].date).toBe('2027-01-15'); // from Oct 15, the latest
    });

    it('predicts nothing when the billing frequency is unknown', () => {
        const items = councilRates([
            withRates([rates({ id: 'r1', archivedAt: '2026-07-18T10:00:00.000Z' })]),
        ]);
        expect(items).toHaveLength(0);
    });

    it('shows the real notice, not a projection, while one is outstanding', () => {
        const items = councilRates([
            withRates(
                [
                    rates({ id: 'old', dueDate: '2026-01-17', archivedAt: '2026-01-18T10:00:00.000Z' }),
                    rates({ id: 'new', dueDate: '2026-07-17' }),
                ],
                { billingFrequencyMonths: 6 },
            ),
        ]);
        expect(items).toHaveLength(1);
        expect(items[0].date).toBe('2026-07-17');
        expect(items[0].isPredicted).toBeFalsy();
    });
});

describe('buildCostLineItems — periodic rates', () => {
    const rateLine = (p: PropertyInfo) =>
        buildCostLineItems([], [], [p]).find(i => i.name.includes('Council Rates'))!;

    it('spreads a quarterly notice over 3 months, not 12', () => {
        const line = rateLine(withRates([rates({ id: 'r1', amountDue: 600 })], { billingFrequencyMonths: 3 }));
        expect(line.monthlyAmount).toBe(200); // 600/3 — the old /12 said 50
        expect(line.currency).toBe('AUD');
        expect(line.rawFrequency).toContain('3 months');
    });

    it('spreads a 6-monthly notice over 6 months', () => {
        const line = rateLine(withRates([rates({ id: 'r1', amountDue: 600 })], { billingFrequencyMonths: 6 }));
        expect(line.monthlyAmount).toBe(100);
    });

    it('falls back to annual when no frequency is set', () => {
        const line = rateLine(withRates([rates({ id: 'r1', amountDue: 600 })]));
        expect(line.monthlyAmount).toBe(50);
        expect(line.rawFrequency).toContain('year');
    });
});
