import type { PropertyValuation } from '../types';

/**
 * Gross rental yield (%) for a valuation. Uses the explicit capRate if set,
 * otherwise derives it from weekly rent annualised over the value. Returns null
 * when it can't be computed (no value, or no rent to annualise).
 */
export function deriveCapRate(v: Pick<PropertyValuation, 'value' | 'rentPerWeek' | 'capRate'>): number | null {
    if (typeof v.capRate === 'number') return v.capRate;
    if (v.value && v.value > 0 && v.rentPerWeek && v.rentPerWeek > 0) {
        return (v.rentPerWeek * 52) / v.value * 100;
    }
    return null;
}

/** Valuations sorted oldest → newest (stable for charting a trend line). */
export function sortValuations(valuations: PropertyValuation[]): PropertyValuation[] {
    return [...valuations].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
}

/** Percentage change between the first and last recorded value, or null. */
export function valueChangePct(valuations: PropertyValuation[]): number | null {
    const withValue = sortValuations(valuations).filter(v => typeof v.value === 'number' && v.value! > 0);
    if (withValue.length < 2) return null;
    const first = withValue[0].value!;
    const last = withValue[withValue.length - 1].value!;
    return (last - first) / first * 100;
}
