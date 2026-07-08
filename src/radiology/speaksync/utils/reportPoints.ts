import type { Study, RadiologyCode } from '../types';

/**
 * Single source of truth for a study's point value.
 *
 * `Study.points` is a denormalized snapshot copied from the price list at the
 * moment the study was created (see StudyContext.addStudy). Once the price list
 * (`radiologyCodes`) is edited, that snapshot is stale. Aggregations must always
 * derive the rate from the CURRENT price list so the "Suma punktów" column reads
 * the same rate as the displayed "Punkty/szt" column.
 *
 * Fallback to the stored snapshot only if the code no longer exists in the price
 * list (e.g. it was deleted after the study was recorded).
 */
export const pointsForStudy = (study: Study, codes: RadiologyCode[]): number => {
    const code = codes.find(c => c.code === study.code);
    return code ? code.points : study.points;
};

export interface ReportData {
    studies: Study[];
    totalPoints: number;
    totalAmount: number;
    groupedByCode: {
        code: RadiologyCode;
        count: number;
        totalPoints: number;
    }[];
}

/**
 * Build the report aggregation from studies + the CURRENT price list.
 *
 * Both the per-group `totalPoints` and the grand `totalPoints`/`totalAmount` are
 * derived from `pointsForStudy`, i.e. the live price list — never from the stale
 * `study.points` snapshot. This guarantees the sum column and the per-unit column
 * are always computed from the same rate at full price-list precision.
 */
export const buildReportData = (studies: Study[], codes: RadiologyCode[]): ReportData => {
    const totalPoints = studies.reduce((sum, s) => sum + pointsForStudy(s, codes), 0);

    const grouped = studies.reduce((acc, study) => {
        if (!acc[study.code]) {
            acc[study.code] = { count: 0, totalPoints: 0 };
        }
        acc[study.code].count++;
        acc[study.code].totalPoints += pointsForStudy(study, codes);
        return acc;
    }, {} as Record<string, { count: number; totalPoints: number }>);

    const groupedByCode = Object.entries(grouped).map(([code, data]) => ({
        code: codes.find(c => c.code === code)!,
        count: data.count,
        totalPoints: data.totalPoints,
    })).sort((a, b) => b.count - a.count);

    return { studies, totalPoints, totalAmount: totalPoints, groupedByCode };
};
