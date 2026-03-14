export type ProgressStatus = 'green' | 'yellow' | 'orange' | 'red' | 'expired';

export interface PolicyProgress {
    percentage: number;
    daysRemaining: number;
    totalDays: number;
    status: ProgressStatus;
}

export function getPolicyProgress(startDate?: string, endDate?: string): PolicyProgress | null {
    if (!startDate || !endDate) return null;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();

    // Strip time components for clean day math
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);

    const totalMs = end.getTime() - start.getTime();
    if (totalMs <= 0) return null;

    const elapsedMs = now.getTime() - start.getTime();
    const totalDays = Math.round(totalMs / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, Math.round((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    const percentage = Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100));

    let status: ProgressStatus;
    if (daysRemaining <= 0) status = 'expired';
    else if (daysRemaining <= 30) status = 'red';
    else if (daysRemaining <= 60) status = 'orange';
    else if (daysRemaining <= 90) status = 'yellow';
    else status = 'green';

    return { percentage, daysRemaining, totalDays, status };
}

export interface MonthSegment {
    label: string;         // e.g. "Jan 25"
    elapsed: boolean;
    current: boolean;
    color: string;         // tailwind bg class
}

export function getPolicyMonthSegments(startDate?: string, endDate?: string): MonthSegment[] | null {
    if (!startDate || !endDate) return null;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);

    if (end.getTime() <= start.getTime()) return null;

    // Build month boundaries
    const segments: MonthSegment[] = [];
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);

    // Move cursor to include the start month
    while (cursor <= endMonth) {
        segments.push({
            label: cursor.toLocaleString('en-GB', { month: 'short', year: '2-digit' }),
            elapsed: false,
            current: false,
            color: '',
        });
        cursor.setMonth(cursor.getMonth() + 1);
    }

    const totalMonths = segments.length;
    if (totalMonths === 0) return null;

    const nowMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startMonth = new Date(start.getFullYear(), start.getMonth(), 1);

    // Color each segment based on how close it is to the end
    // Last 1 month = red, 2-3 = orange, 4-6 = yellow, rest = green
    for (let i = 0; i < totalMonths; i++) {
        const monthsFromEnd = totalMonths - 1 - i;
        let color: string;
        if (monthsFromEnd <= 0) color = 'bg-red-500';
        else if (monthsFromEnd <= 2) color = 'bg-orange-500';
        else if (monthsFromEnd <= 5) color = 'bg-yellow-500';
        else color = 'bg-green-500';

        // How many months elapsed from start
        const monthOffset = i;
        const segmentDate = new Date(startMonth);
        segmentDate.setMonth(segmentDate.getMonth() + monthOffset);

        const isElapsed = segmentDate < nowMonth;
        const isCurrent = segmentDate.getFullYear() === nowMonth.getFullYear() && segmentDate.getMonth() === nowMonth.getMonth();

        segments[i].elapsed = isElapsed || isCurrent;
        segments[i].current = isCurrent;
        segments[i].color = color;
    }

    // If expired, mark all as elapsed
    if (now > end) {
        segments.forEach(s => { s.elapsed = true; s.current = false; });
    }

    return segments;
}

export function annualizePremium(amount?: number, frequency?: string): number | null {
    if (typeof amount !== 'number') return null;
    if (frequency === 'Monthly') return amount * 12;
    if (frequency === 'Annually') return amount;
    return amount; // 'Other' - return raw
}
