/**
 * Shared color utility for sync rule category tags.
 * Known categories get fixed colors; custom categories get deterministic colors from a palette.
 */

const KNOWN_COLORS: Record<string, { pill: string; active: string }> = {
    statements: {
        pill: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
        active: 'bg-green-600 text-white',
    },
    agent: {
        pill: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
        active: 'bg-blue-600 text-white',
    },
    strata: {
        pill: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
        active: 'bg-purple-600 text-white',
    },
    council: {
        pill: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
        active: 'bg-orange-600 text-white',
    },
    other: {
        pill: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
        active: 'bg-slate-600 text-white',
    },
};

// Palette for custom categories (deterministic by hash)
const CUSTOM_PALETTE: { pill: string; active: string }[] = [
    { pill: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300', active: 'bg-rose-600 text-white' },
    { pill: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300', active: 'bg-cyan-600 text-white' },
    { pill: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300', active: 'bg-amber-600 text-white' },
    { pill: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300', active: 'bg-indigo-600 text-white' },
    { pill: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300', active: 'bg-teal-600 text-white' },
    { pill: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300', active: 'bg-pink-600 text-white' },
    { pill: 'bg-lime-100 dark:bg-lime-900/30 text-lime-700 dark:text-lime-300', active: 'bg-lime-600 text-white' },
    { pill: 'bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-700 dark:text-fuchsia-300', active: 'bg-fuchsia-600 text-white' },
];

function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}

/** Get pill color classes for a category tag. */
export function getCategoryPillColor(category: string): string {
    const known = KNOWN_COLORS[category.toLowerCase()];
    if (known) return known.pill;
    return CUSTOM_PALETTE[hashString(category) % CUSTOM_PALETTE.length].pill;
}

/** Get active (selected) color classes for a category tag. */
export function getCategoryActiveColor(category: string): string {
    const known = KNOWN_COLORS[category.toLowerCase()];
    if (known) return known.active;
    return CUSTOM_PALETTE[hashString(category) % CUSTOM_PALETTE.length].active;
}

/** Unselected pill style. */
export const CATEGORY_UNSELECTED = 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600';

/** Empty/no-tag style. */
export const CATEGORY_EMPTY = 'bg-slate-50 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500';
