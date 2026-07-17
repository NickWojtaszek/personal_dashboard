import { describe, it, expect } from 'vitest';
import { parseLocalDate, toLocalISO, addMonths, daysUntil, todayLocal } from './dates';

describe('addMonths — month-end clamping', () => {
    // The bug this guards: d.setMonth(d.getMonth() + 3) on 2026-08-31 overflows to
    // 2026-12-01, because November has only 30 days. Quarterly council rates dated
    // at month-end hit this every cycle.
    it('clamps 31 Aug + 3 months to 30 Nov (not 1 Dec)', () => {
        expect(addMonths('2026-08-31', 3)).toBe('2026-11-30');
    });

    it('clamps 31 Jan + 1 month to 28 Feb in a common year', () => {
        expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    });

    it('clamps 31 Jan + 1 month to 29 Feb in a leap year', () => {
        expect(addMonths('2028-01-31', 1)).toBe('2028-02-29');
    });

    it('clamps 31 Aug + 6 months to 28 Feb across a year boundary', () => {
        expect(addMonths('2026-08-31', 6)).toBe('2027-02-28');
    });

    it('leaves a safe day-of-month untouched', () => {
        expect(addMonths('2026-08-15', 3)).toBe('2026-11-15');
    });

    it('rolls the year over correctly', () => {
        expect(addMonths('2026-11-15', 3)).toBe('2027-02-15');
    });

    it('handles the Sunshine Coast 6-month cycle', () => {
        expect(addMonths('2026-07-17', 6)).toBe('2027-01-17');
    });

    it('handles the Brisbane 3-month cycle', () => {
        expect(addMonths('2026-07-17', 3)).toBe('2026-10-17');
    });

    it('supports negative months', () => {
        expect(addMonths('2026-03-31', -1)).toBe('2026-02-28');
    });

    it('returns empty string for an unparseable date', () => {
        expect(addMonths('not-a-date', 3)).toBe('');
    });
});

describe('parseLocalDate — local, not UTC', () => {
    it('parses to LOCAL midnight, so the calendar day never shifts', () => {
        const d = parseLocalDate('2026-08-31')!;
        // The whole point: these are local getters. new Date('2026-08-31') would be
        // UTC midnight and could report 30 Aug in a UTC- timezone.
        expect(d.getFullYear()).toBe(2026);
        expect(d.getMonth()).toBe(7); // August
        expect(d.getDate()).toBe(31);
        expect(d.getHours()).toBe(0);
    });

    it('round-trips through toLocalISO unchanged', () => {
        for (const s of ['2026-01-01', '2026-02-28', '2026-08-31', '2026-12-31']) {
            expect(toLocalISO(parseLocalDate(s)!)).toBe(s);
        }
    });

    it('rejects impossible dates instead of silently rolling over', () => {
        expect(parseLocalDate('2026-02-31')).toBeNull();
        expect(parseLocalDate('2026-13-01')).toBeNull();
    });

    it('returns null for junk', () => {
        expect(parseLocalDate('')).toBeNull();
        expect(parseLocalDate('nope')).toBeNull();
    });
});

describe('daysUntil', () => {
    it('returns 0 for today — due today must not read as overdue', () => {
        expect(daysUntil(toLocalISO(todayLocal()))).toBe(0);
    });

    it('is positive for the future and negative for the past', () => {
        const t = todayLocal();
        const plus10 = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 10);
        const minus10 = new Date(t.getFullYear(), t.getMonth(), t.getDate() - 10);
        expect(daysUntil(toLocalISO(plus10))).toBe(10);
        expect(daysUntil(toLocalISO(minus10))).toBe(-10);
    });

    it('returns null for an unparseable date', () => {
        expect(daysUntil('nope')).toBeNull();
    });
});
