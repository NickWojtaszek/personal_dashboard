import { describe, it, expect } from 'vitest';
import { taxYearForDate, taxYearRange, taxYearLabel, inTaxYear, availableTaxYears } from './taxYear';

describe('taxYearRange', () => {
    it('AU: 1 Jul – 30 Jun', () => {
        expect(taxYearRange('AU', 2024)).toEqual({ start: '2024-07-01', end: '2025-06-30' });
    });
    it('UK: 6 Apr – 5 Apr', () => {
        expect(taxYearRange('UK', 2024)).toEqual({ start: '2024-04-06', end: '2025-04-05' });
    });
    it('NZ: 1 Apr – 31 Mar', () => {
        expect(taxYearRange('NZ', 2024)).toEqual({ start: '2024-04-01', end: '2025-03-31' });
    });
    it('US/PL: calendar year', () => {
        expect(taxYearRange('US', 2024)).toEqual({ start: '2024-01-01', end: '2024-12-31' });
        expect(taxYearRange('PL', 2024)).toEqual({ start: '2024-01-01', end: '2024-12-31' });
    });
    it('defaults to AU when country is missing', () => {
        expect(taxYearRange(undefined, 2024)).toEqual({ start: '2024-07-01', end: '2025-06-30' });
    });
});

describe('taxYearForDate', () => {
    it('AU buckets Jan–Jun into the prior FY', () => {
        expect(taxYearForDate('AU', '2025-06-30')).toBe(2024);
        expect(taxYearForDate('AU', '2025-07-01')).toBe(2025);
    });
    it('UK 6-April boundary: 5 Apr is prior year, 6 Apr is new year', () => {
        // The whole reason boundaries are compared as MM-DD, not by month.
        expect(taxYearForDate('UK', '2025-04-05')).toBe(2024);
        expect(taxYearForDate('UK', '2025-04-06')).toBe(2025);
        expect(taxYearForDate('UK', '2025-04-01')).toBe(2024); // early April still prior year
    });
    it('calendar countries use the plain year', () => {
        expect(taxYearForDate('US', '2024-01-01')).toBe(2024);
        expect(taxYearForDate('PL', '2024-12-31')).toBe(2024);
    });
    it('returns null for junk', () => {
        expect(taxYearForDate('AU', 'nope')).toBeNull();
    });
});

describe('inTaxYear', () => {
    it('includes the boundary days and excludes just outside', () => {
        expect(inTaxYear('UK', 2024, '2024-04-06')).toBe(true);
        expect(inTaxYear('UK', 2024, '2025-04-05')).toBe(true);
        expect(inTaxYear('UK', 2024, '2024-04-05')).toBe(false);
        expect(inTaxYear('UK', 2024, '2025-04-06')).toBe(false);
    });
    it('excludes undated items', () => {
        expect(inTaxYear('AU', 2024, undefined)).toBe(false);
    });
});

describe('taxYearLabel', () => {
    it('splits for AU/NZ/UK, plain for US/PL', () => {
        expect(taxYearLabel('AU', 2024)).toBe('FY 2024/25');
        expect(taxYearLabel('UK', 2024)).toBe('Tax year 2024/25');
        expect(taxYearLabel('US', 2024)).toBe('Tax year 2024');
    });
    it('zero-pads the second year', () => {
        expect(taxYearLabel('AU', 2009)).toBe('FY 2009/10');
        expect(taxYearLabel('AU', 1999)).toBe('FY 1999/00');
    });
});

describe('availableTaxYears', () => {
    it('collects distinct AU FYs newest first', () => {
        const dates = ['2024-08-01', '2025-02-15', '2025-09-01', undefined, 'bad'];
        // Aug 2024 → 2024, Feb 2025 → 2024, Sep 2025 → 2025
        expect(availableTaxYears('AU', dates)).toEqual([2025, 2024]);
    });
});
