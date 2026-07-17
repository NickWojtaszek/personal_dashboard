/**
 * Date helpers for date-only values ('YYYY-MM-DD').
 *
 * Why this exists: `new Date('2026-08-31')` parses as **UTC midnight**, while
 * `new Date(y, m, d)`, `.getFullYear()` etc. work in **local** time. Mixing the two
 * shifts dates by a day in UTC+ timezones (UK/PL/AU all qualify for part of the
 * year). Every helper here stays in local time end-to-end.
 *
 * Rule: never call `new Date(str)` or `.toISOString()` on a date-only value.
 * Use `parseLocalDate` / `toLocalISO` instead.
 */

/** Parse 'YYYY-MM-DD' as LOCAL midnight (not UTC). Returns null if unparseable. */
export function parseLocalDate(dateStr: string): Date | null {
    if (!dateStr) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
    if (!m) return null;
    const [, y, mo, d] = m;
    const date = new Date(Number(y), Number(mo) - 1, Number(d));
    // Reject impossible dates that JS would silently roll over (e.g. 2026-02-31).
    if (date.getFullYear() !== Number(y) || date.getMonth() !== Number(mo) - 1 || date.getDate() !== Number(d)) {
        return null;
    }
    date.setHours(0, 0, 0, 0);
    return date;
}

/** Format a Date as 'YYYY-MM-DD' using its LOCAL components (never .toISOString()). */
export function toLocalISO(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/** Today at local midnight. */
export function todayLocal(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}

/**
 * Whole days from today until `dateStr` (local). Negative = overdue, 0 = due today.
 * Returns null if the date is unparseable.
 */
export function daysUntil(dateStr: string): number | null {
    const target = parseLocalDate(dateStr);
    if (!target) return null;
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    // Both operands are local midnight, so the difference is a whole number of days
    // except across a DST boundary — round to absorb the ±1h shift.
    return Math.round((target.getTime() - todayLocal().getTime()) / MS_PER_DAY);
}

/**
 * Add `months` to a 'YYYY-MM-DD' date, clamping to the target month's last day.
 *
 * Plain `d.setMonth(d.getMonth() + n)` overflows: 2026-08-31 + 3 months lands on
 * 2026-12-01 (November has 30 days, so the 31st spills into December). Quarterly
 * bills dated at month-end hit this every cycle. Here it clamps to 2026-11-30.
 *
 * Returns '' if the input is unparseable.
 */
export function addMonths(dateStr: string, months: number): string {
    const date = parseLocalDate(dateStr);
    if (!date) return '';
    const day = date.getDate();
    // Land on the 1st before shifting so the month arithmetic can never overflow,
    // then clamp the day to whatever the target month actually has.
    const shifted = new Date(date.getFullYear(), date.getMonth() + months, 1);
    const lastDayOfTargetMonth = new Date(shifted.getFullYear(), shifted.getMonth() + 1, 0).getDate();
    shifted.setDate(Math.min(day, lastDayOfTargetMonth));
    return toLocalISO(shifted);
}
