/**
 * Shared formatting and status utilities used across entity pages
 * (Insurance, Vehicle, Contract, Invoice, Property).
 */

const CURRENCY_SYMBOLS: Record<string, string> = {
    GBP: '£', AUD: '$', USD: '$', NZD: '$', PLN: 'zł', EUR: '€',
};

export function currencySymbol(currency?: string): string {
    if (!currency) return '';
    return CURRENCY_SYMBOLS[currency.toUpperCase()] || currency;
}

export function formatCurrency(amount?: number, currency?: string, options?: { decimals?: number }): string {
    if (amount == null || isNaN(amount)) return '—';
    const decimals = options?.decimals ?? 0;
    const sym = currencySymbol(currency);
    const formatted = amount.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
    return sym ? `${sym}${formatted}` : formatted;
}

export function formatDate(iso?: string, locale = 'en-GB'): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(locale);
}

/** Days until a given ISO date. Negative if in the past. */
export function daysUntil(iso?: string): number | null {
    if (!iso) return null;
    const target = new Date(iso);
    if (isNaN(target.getTime())) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/** Percentage progress between two dates (0-100). */
export function periodProgress(startIso?: string, endIso?: string): number | null {
    if (!startIso || !endIso) return null;
    const start = new Date(startIso).getTime();
    const end = new Date(endIso).getTime();
    if (isNaN(start) || isNaN(end) || end <= start) return null;
    const now = Date.now();
    const pct = ((now - start) / (end - start)) * 100;
    return Math.max(0, Math.min(100, pct));
}

/** Shared status color classes. Used by Insurance, Vehicle, Contract pages. */
export function getStatusColor(status?: string): string {
    switch (status) {
        case 'Active':
        case 'Current':
        case 'Paid':
            return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
        case 'Expired':
        case 'Overdue':
            return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
        case 'Pending':
        case 'Due':
            return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
        case 'Archived':
            return 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
        default:
            return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
    }
}
