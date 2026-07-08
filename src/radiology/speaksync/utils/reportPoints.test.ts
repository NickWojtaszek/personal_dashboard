import { describe, it, expect } from 'vitest';
import type { Study, RadiologyCode } from '../types';
import { buildReportData, pointsForStudy } from './reportPoints';

/**
 * Regression test for the "sum = old rate" bug.
 *
 * `Study.points` is a denormalized snapshot taken when the study was created.
 * After the price list is edited, that snapshot is stale. The report sum must be
 * computed from the CURRENT price list, so `Liczba × aktualna stawka = suma` and
 * `RAZEM = 42 311,6`.
 *
 * This test seeds each study with the OLD rate as its stale `study.points`
 * snapshot and the NEW rate in the price list. The old aggregation (which read
 * `study.points`) produced count × old-rate and would fail here; the fixed
 * aggregation reads the current price list and passes.
 */

// kod, Liczba, nowa stawka (wiążąca), stara stawka (zamrożona w study.points), suma oczekiwana
const ROWS = [
    { code: '088', count: 129, newRate: 176.7, oldRate: 167.6, expectedSum: 22794.3 },
    { code: '073', count: 70, newRate: 183.3, oldRate: 174.3, expectedSum: 12831.0 },
    { code: '117', count: 22, newRate: 210.6, oldRate: 200.2, expectedSum: 4633.2 },
    { code: '095', count: 10, newRate: 119.5, oldRate: 113.6, expectedSum: 1195.0 },
    { code: '027', count: 6, newRate: 131.0, oldRate: 124.6, expectedSum: 786.0 },
    { code: '070', count: 1, newRate: 71.7, oldRate: 68.2, expectedSum: 71.7 },
];

// Sum of the per-row expected sums above: 22794.3 + 12831.0 + 4633.2 + 1195.0
// + 786.0 + 71.7 = 42311.2. (The prompt quoted 42311.6, a ~0.4 arithmetic slip;
// the row figures themselves are consistent and sum to 42311.2.)
const EXPECTED_TOTAL = 42311.2;

// Current price list carries the NEW (binding) rate.
const codes: RadiologyCode[] = ROWS.map(r => ({
    code: r.code,
    fullCode: `5.03.00.00000${r.code}`,
    points: r.newRate,
    desc: `Badanie ${r.code}`,
    category: 'test',
}));

// Studies carry the OLD rate in their stale `study.points` snapshot.
let nextId = 1;
const studies: Study[] = ROWS.flatMap(r =>
    Array.from({ length: r.count }, () => ({
        id: nextId++,
        code: r.code,
        patientId: `P${nextId}`,
        points: r.oldRate, // stale snapshot — must be ignored
        desc: `Badanie ${r.code}`,
        date: '2026-06-15T10:00:00.000Z',
    }))
);

describe('buildReportData — sum uses the current price list', () => {
    const report = buildReportData(studies, codes);

    it.each(ROWS)('kod $code: Liczba × aktualna stawka = suma', ({ code, count, expectedSum }) => {
        const group = report.groupedByCode.find(g => g.code.code === code)!;
        expect(group.count).toBe(count);
        expect(group.totalPoints).toBeCloseTo(expectedSum, 1);
        // displayed per-unit rate and the sum must agree on the same rate
        expect(group.totalPoints).toBeCloseTo(group.count * group.code.points, 1);
    });

    it('RAZEM = 42 311,2', () => {
        expect(report.totalPoints).toBeCloseTo(EXPECTED_TOTAL, 1);
        expect(report.totalAmount).toBeCloseTo(EXPECTED_TOTAL, 1);
    });

    it('ignores the stale study.points snapshot (old RAZEM would be 40 177,6)', () => {
        const staleTotal = studies.reduce((s, st) => s + st.points, 0);
        expect(staleTotal).toBeCloseTo(40177.6, 1);
        expect(report.totalPoints).not.toBeCloseTo(staleTotal, 1);
    });
});

describe('pointsForStudy', () => {
    it('returns the current price-list rate, not the snapshot', () => {
        const study: Study = { id: 1, code: '088', patientId: 'P1', points: 167.6, desc: '', date: '' };
        expect(pointsForStudy(study, codes)).toBe(176.7);
    });

    it('falls back to the stored snapshot when the code was removed', () => {
        const study: Study = { id: 1, code: 'GONE', patientId: 'P1', points: 99.9, desc: '', date: '' };
        expect(pointsForStudy(study, codes)).toBe(99.9);
    });
});
