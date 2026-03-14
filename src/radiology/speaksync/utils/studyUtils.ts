import type { Study } from '../types';
import { useMemo } from 'react';

/**
 * Utility function to calculate statistics for today and this month from a list of studies.
 * @param studies An array of Study objects.
 * @returns An object with today's and this month's study and point counts.
 */
export const calculateStudyStats = (studies: Study[]) => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const month = now.getMonth();
    const year = now.getFullYear();

    let studiesToday = 0;
    let pointsToday = 0;
    let studiesThisMonth = 0;
    let pointsThisMonth = 0;

    for (const study of studies) {
        const studyDate = new Date(study.date);
        if (study.date.startsWith(todayStr)) {
            studiesToday++;
            pointsToday += study.points;
        }
        if (studyDate.getMonth() === month && studyDate.getFullYear() === year) {
            studiesThisMonth++;
            pointsThisMonth += study.points;
        }
    }

    return { studiesToday, pointsToday, studiesThisMonth, pointsThisMonth };
};


export const useUtils = () => {
    return useMemo(() => ({
        calculateStudyStats,
    }), []);
};
