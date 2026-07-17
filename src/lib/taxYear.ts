import type { PropertyCountry } from '../types';

/**
 * Per-country tax / financial year boundaries.
 *
 * The year is identified by its START calendar year: e.g. the AU FY running
 * 1 Jul 2024 – 30 Jun 2025 is startYear 2024. Boundaries are compared as
 * 'MM-DD' strings so mid-month cutoffs (UK's 6 April) are handled correctly —
 * month-only bucketing would put 1–5 April in the wrong year.
 */

interface TaxYearDef {
    /** Inclusive start of the year as 'MM-DD'. null = calendar year (Jan 1 – Dec 31). */
    cutoff: string | null;
    /** Label style: 'split' → "FY 2024/25", 'calendar' → "Tax year 2024". */
    style: 'split' | 'calendar';
    prefix: string;
}

const DEFS: Record<PropertyCountry, TaxYearDef> = {
    AU: { cutoff: '07-01', style: 'split', prefix: 'FY' },
    NZ: { cutoff: '04-01', style: 'split', prefix: 'FY' },
    UK: { cutoff: '04-06', style: 'split', prefix: 'Tax year' },
    US: { cutoff: null, style: 'calendar', prefix: 'Tax year' },
    PL: { cutoff: null, style: 'calendar', prefix: 'Tax year' },
};

const DEFAULT_COUNTRY: PropertyCountry = 'AU';

function def(country?: PropertyCountry): TaxYearDef {
    return DEFS[country || DEFAULT_COUNTRY] || DEFS[DEFAULT_COUNTRY];
}

/** Add years to a 'YYYY-MM-DD' date string without any Date/timezone involvement. */
function addYears(dateStr: string, n: number): string {
    const [y, rest] = [dateStr.slice(0, 4), dateStr.slice(4)];
    return `${Number(y) + n}${rest}`;
}

/** Which tax year (by start calendar year) a 'YYYY-MM-DD' date falls in. null if unparseable. */
export function taxYearForDate(country: PropertyCountry | undefined, dateStr: string): number | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr || '');
    if (!m) return null;
    const year = Number(m[1]);
    const { cutoff } = def(country);
    if (!cutoff) return year; // calendar year
    const monthDay = `${m[2]}-${m[3]}`;
    return monthDay >= cutoff ? year : year - 1;
}

/** Inclusive [start, end] of a tax year as 'YYYY-MM-DD' strings. */
export function taxYearRange(country: PropertyCountry | undefined, startYear: number): { start: string; end: string } {
    const { cutoff } = def(country);
    if (!cutoff) return { start: `${startYear}-01-01`, end: `${startYear}-12-31` };
    const start = `${startYear}-${cutoff}`;
    // End is the day before the next year's cutoff — derived by string, DST-safe.
    const nextStart = addYears(start, 1);
    const end = dayBefore(nextStart);
    return { start, end };
}

/** 'YYYY-MM-DD' one day earlier. Local Date is fine here (no tz text round-trip). */
function dayBefore(dateStr: string): string {
    const [y, mo, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, mo - 1, d);
    dt.setDate(dt.getDate() - 1);
    const yy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
}

/** Human label, e.g. "FY 2024/25" (AU/NZ/UK) or "Tax year 2024" (US/PL). */
export function taxYearLabel(country: PropertyCountry | undefined, startYear: number): string {
    const { style, prefix } = def(country);
    return style === 'calendar'
        ? `${prefix} ${startYear}`
        : `${prefix} ${startYear}/${((startYear + 1) % 100).toString().padStart(2, '0')}`;
}

/** Is a date within a given tax year? Undated items are excluded. */
export function inTaxYear(country: PropertyCountry | undefined, startYear: number, dateStr?: string): boolean {
    if (!dateStr) return false;
    const { start, end } = taxYearRange(country, startYear);
    return dateStr >= start && dateStr <= end;
}

/** Distinct tax-year start years present in a list of date strings, newest first. */
export function availableTaxYears(country: PropertyCountry | undefined, dates: (string | undefined)[]): number[] {
    const years = new Set<number>();
    for (const d of dates) {
        if (!d) continue;
        const fy = taxYearForDate(country, d);
        if (fy !== null) years.add(fy);
    }
    return Array.from(years).sort((a, b) => b - a);
}
