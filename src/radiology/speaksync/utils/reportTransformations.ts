import type { ReportEntry, Study, RadiologyCode } from '../types';

/**
 * Converts report entries to study format for display in report views
 * @param entries - Array of report entries to convert
 * @param radiologyCodes - Available radiology codes for lookup
 * @returns Object containing studies array and grouped data by code
 */
export function convertEntriesToReportData(
  entries: ReportEntry[],
  radiologyCodes: RadiologyCode[]
) {
  // Convert entries to Study format
  const studies: Study[] = entries.map((e, index) => ({
    id: index,
    code: (e as any).kodNFZ || e.numerBadania, // Fallback for old reports without kodNFZ
    patientId: e.numerBadania,
    desc: e.opis,
    date: e.dataWykonania,
    points: e.kwota
  }));

  // Group entries by NFZ code
  const grouped = entries.reduce((acc, e) => {
    const code = (e as any).kodNFZ || e.numerBadania; // Fallback for old reports
    if (!acc[code]) {
      acc[code] = { count: 0, totalPoints: 0 };
    }
    acc[code].count++;
    acc[code].totalPoints += e.kwota || 0;
    return acc;
  }, {} as Record<string, { count: number; totalPoints: number }>);

  // Create grouped by code array with full code details
  const groupedByCode = Object.entries(grouped).map(([code, data]) => ({
    code: radiologyCodes.find(c => c.code === code) || {
      code,
      fullCode: code,
      points: 0,
      desc: '',
      category: ''
    },
    count: data.count,
    totalPoints: data.totalPoints
  })).sort((a, b) => b.count - a.count);

  return { studies, groupedByCode };
}
