import { describe, it, expect } from 'vitest';
import type { PropertyValuation } from '../types';
import { deriveCapRate, sortValuations, valueChangePct } from './valuation';

const v = (over: Partial<PropertyValuation>): PropertyValuation => ({ id: 'x', date: '2026-01-01', ...over });

describe('deriveCapRate', () => {
    it('uses the explicit cap rate when given', () => {
        expect(deriveCapRate(v({ value: 800000, rentPerWeek: 600, capRate: 4.2 }))).toBe(4.2);
    });
    it('derives gross yield from weekly rent annualised over value', () => {
        // 600/wk × 52 = 31,200 on 800,000 = 3.9%
        expect(deriveCapRate(v({ value: 800000, rentPerWeek: 600 }))!).toBeCloseTo(3.9, 2);
    });
    it('returns null without value or rent', () => {
        expect(deriveCapRate(v({ value: 800000 }))).toBeNull();
        expect(deriveCapRate(v({ rentPerWeek: 600 }))).toBeNull();
    });
});

describe('valueChangePct', () => {
    it('is the first→last percentage move', () => {
        const list = [v({ date: '2025-01-01', value: 800000 }), v({ date: '2026-01-01', value: 860000 })];
        expect(valueChangePct(list)!).toBeCloseTo(7.5, 2);
    });
    it('respects chronological order regardless of input order', () => {
        const list = [v({ date: '2026-01-01', value: 860000 }), v({ date: '2025-01-01', value: 800000 })];
        expect(valueChangePct(list)!).toBeCloseTo(7.5, 2);
    });
    it('needs at least two valued snapshots', () => {
        expect(valueChangePct([v({ value: 800000 })])).toBeNull();
        expect(valueChangePct([v({ value: 800000 }), v({ rentPerWeek: 600 })])).toBeNull();
    });
});

describe('sortValuations', () => {
    it('sorts oldest to newest', () => {
        const list = [v({ id: 'b', date: '2026-06-01' }), v({ id: 'a', date: '2025-06-01' })];
        expect(sortValuations(list).map(x => x.id)).toEqual(['a', 'b']);
    });
});
