import type { PropertyCountry } from '../types';

/**
 * Subtle country color coding for at-a-glance regional identification.
 * Used as left border accents on cards and detail page headers.
 */

// Border colors (left accent stripe on cards)
const COUNTRY_BORDER: Record<PropertyCountry, string> = {
    AU: 'border-l-emerald-400 dark:border-l-emerald-500',
    UK: 'border-l-blue-400 dark:border-l-blue-500',
    PL: 'border-l-rose-400 dark:border-l-rose-500',
    NZ: 'border-l-teal-400 dark:border-l-teal-500',
    US: 'border-l-indigo-400 dark:border-l-indigo-500',
};

// Subtle background tint for detail page headers
const COUNTRY_BG: Record<PropertyCountry, string> = {
    AU: 'bg-emerald-50/50 dark:bg-emerald-950/20',
    UK: 'bg-blue-50/50 dark:bg-blue-950/20',
    PL: 'bg-rose-50/50 dark:bg-rose-950/20',
    NZ: 'bg-teal-50/50 dark:bg-teal-950/20',
    US: 'bg-indigo-50/50 dark:bg-indigo-950/20',
};

// Small dot/badge color
const COUNTRY_DOT: Record<PropertyCountry, string> = {
    AU: 'bg-emerald-400',
    UK: 'bg-blue-400',
    PL: 'bg-rose-400',
    NZ: 'bg-teal-400',
    US: 'bg-indigo-400',
};

const COUNTRY_FLAG: Record<PropertyCountry, string> = {
    AU: '\u{1F1E6}\u{1F1FA}',
    UK: '\u{1F1EC}\u{1F1E7}',
    PL: '\u{1F1F5}\u{1F1F1}',
    NZ: '\u{1F1F3}\u{1F1FF}',
    US: '\u{1F1FA}\u{1F1F8}',
};

export function getCountryBorder(country?: PropertyCountry): string {
    if (!country) return '';
    return `border-l-4 ${COUNTRY_BORDER[country] || ''}`;
}

export function getCountryBg(country?: PropertyCountry): string {
    if (!country) return '';
    return COUNTRY_BG[country] || '';
}

export function getCountryDot(country?: PropertyCountry): string {
    if (!country) return '';
    return COUNTRY_DOT[country] || '';
}

export function getCountryFlag(country?: PropertyCountry): string {
    if (!country) return '';
    return COUNTRY_FLAG[country] || '';
}

/** Map currency codes to countries */
export function currencyToCountry(currency?: string): PropertyCountry | undefined {
    if (!currency) return undefined;
    const map: Record<string, PropertyCountry> = {
        AUD: 'AU', GBP: 'UK', PLN: 'PL', NZD: 'NZ', USD: 'US',
    };
    return map[currency.toUpperCase()];
}
