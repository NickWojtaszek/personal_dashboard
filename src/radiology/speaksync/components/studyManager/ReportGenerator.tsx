import React, { useState, useMemo } from 'react';
import type { Study, PersonalInfo, RadiologyCode, GeneratedReport } from '../../types';
import { useTranslations } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import PersonalInfoForm from './report/PersonalInfoForm';
import Specification from './report/Specification';
import Invoice from './report/Invoice';
import Summary from './report/Summary';
import { TrashIcon } from '../Icons';

interface ReportGeneratorProps {
    studies: Study[];
    personalInfo: Partial<PersonalInfo>;
    onPersonalInfoChange: (info: Partial<PersonalInfo>) => void;
    codes: RadiologyCode[];
    generatedReports: GeneratedReport[];
    onAddGeneratedReport: (reportData: Omit<GeneratedReport, 'id' | 'generatedAt'>) => void;
    onDeleteGeneratedReport: (reportId: string) => void;
}

type ReportView = 'specification' | 'invoice' | 'summary';

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

const ReportGenerator: React.FC<ReportGeneratorProps> = ({ studies, personalInfo, onPersonalInfoChange, codes, generatedReports, onAddGeneratedReport, onDeleteGeneratedReport }) => {
    const { t } = useTranslations();
    const { currentTheme } = useTheme();
    const prevMonth = new Date();
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    const [date, setDate] = useState({ year: prevMonth.getFullYear(), month: prevMonth.getMonth() });
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [activeView, setActiveView] = useState<ReportView>('specification');

    const handleGenerate = () => {
        const filteredStudies = studies.filter(s => {
            const studyDate = new Date(s.date);
            return studyDate.getFullYear() === date.year && studyDate.getMonth() === date.month;
        });

        // Allow reports with 0 studies per institutional requirement
        const totalPoints = filteredStudies.reduce((sum, s) => sum + s.points, 0);
        const totalAmount = totalPoints;
        
        const grouped = filteredStudies.reduce((acc, study) => {
            if (!acc[study.code]) {
                acc[study.code] = { count: 0, totalPoints: 0 };
            }
            acc[study.code].count++;
            acc[study.code].totalPoints += study.points;
            return acc;
        }, {} as Record<string, { count: number; totalPoints: number }>);
        
        const groupedByCode = Object.entries(grouped).map(([code, data]) => ({
            code: codes.find(c => c.code === code)!,
            count: (data as { count: number; totalPoints: number }).count,
            totalPoints: (data as { count: number; totalPoints: number }).totalPoints
        })).sort((a,b) => b.count - a.count);

        const newReportData = {
            studies: filteredStudies,
            totalPoints,
            totalAmount,
            groupedByCode,
        };

        setReportData(newReportData);
        onAddGeneratedReport({
            periodYear: date.year,
            periodMonth: date.month,
            totalAmount: newReportData.totalAmount,
            studyCount: newReportData.studies.length
        });
    };

    const handlePrint = () => {
        // Get the printable content
        const printContent = document.querySelector('.printable-area');
        if (!printContent) {
            console.error('Print failed: .printable-area element not found');
            alert('Cannot print: Report content not found. Please try generating the report again.');
            return;
        }

        // Create a new window
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (!printWindow) return;

        // Write HTML to the new window
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Print</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 20px;
                        background: white;
                        color: black;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                    }
                    table, th, td {
                        border: 1px solid black;
                    }
                    th, td {
                        padding: 8px;
                        text-align: left;
                    }
                    @media print {
                        body { margin: 0; }
                    }
                </style>
            </head>
            <body>
                ${printContent.innerHTML}
            </body>
            </html>
        `);
        printWindow.document.close();

        // Wait for content to load, then print
        printWindow.onload = () => {
            printWindow.print();
            // Close window after printing (optional)
            setTimeout(() => printWindow.close(), 100);
        };
    };

    const handleExportCsv = () => {
        if (!reportData) return;
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += `Kod;Opis;Ilosc;Punkty/szt;Suma Punktow\n`;
        reportData.groupedByCode.forEach(group => {
            csvContent += `${group.code.code};"${group.code.desc}";${group.count};${group.code.points.toFixed(1)};${group.totalPoints.toFixed(1)}\n`;
        });
        csvContent += `\nRazem;;${reportData.studies.length};;${reportData.totalPoints.toFixed(1)}\n`;

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `raport_${date.year}-${date.month + 1}_${new Date().toISOString().replace(/[:.]/g, '').slice(0, 15)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const years = useMemo(() => {
        const currentYear = new Date().getFullYear();
        return Array.from({ length: 5 }, (_, i) => currentYear - i);
    }, []);

    const months = useMemo(() => {
        return Array.from({ length: 12 }, (_, i) => ({
            value: i,
            label: new Date(0, i).toLocaleString(t('langName') === 'Polski' ? 'pl' : 'en-US', { month: 'long' })
        }));
    }, [t]);

    return (
        <div className="space-y-6">
            <PersonalInfoForm personalInfo={personalInfo} onSave={onPersonalInfoChange} />

            <div className="rounded-lg p-4" style={{ backgroundColor: currentTheme.colors.bgSecondary, borderColor: currentTheme.colors.borderColor, borderWidth: '1px' }}>
                <h2 className="text-xl font-bold mb-4" style={{ color: currentTheme.colors.textPrimary }}>{t('studyManager.reports.title')}</h2>
                
                {/* Three-column filter layout */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
                    {/* Column 1: Year */}
                    <div>
                        <label className="text-xs font-semibold block mb-2 uppercase tracking-wide" style={{ color: currentTheme.colors.textSecondary }}>
                            {t('common.year')}
                        </label>
                        <select
                            value={date.year}
                            onChange={e => setDate({ ...date, year: parseInt(e.target.value) })}
                            style={{
                                backgroundColor: currentTheme.colors.bgTertiary,
                                color: currentTheme.colors.textPrimary,
                                borderColor: currentTheme.colors.borderColor
                            }}
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                            {years.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>

                    {/* Column 2-3: Month tabs */}
                    <div className="lg:col-span-2">
                        <label className="text-xs font-semibold block mb-2 uppercase tracking-wide" style={{ color: currentTheme.colors.textSecondary }}>
                            {t('common.month')}
                        </label>
                        <div className="flex gap-1 flex-nowrap overflow-x-auto pb-1">
                            {months.map(m => (
                                <button
                                    key={m.value}
                                    onClick={() => setDate({ ...date, month: m.value })}
                                    className={`px-2 py-2 rounded-lg font-semibold transition-colors text-xs whitespace-nowrap flex-shrink-0 ${
                                        date.month === m.value
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                                    }`}
                                >
                                    {m.label.slice(0, 3)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Column 4: Generate button */}
                    <div className="flex items-end">
                        <button 
                            onClick={handleGenerate} 
                            className="w-full px-3 py-2 rounded-lg font-semibold transition-colors text-sm"
                            style={{ backgroundColor: currentTheme.colors.buttonPrimary, color: '#fff' }}
                        >
                            {t('studyManager.reports.generate')}
                        </button>
                    </div>
                </div>

                {/* Secondary action buttons */}
                {reportData && (
                    <div className="flex gap-2 mb-4">
                        <button onClick={handlePrint} className="px-4 py-2 rounded-md font-semibold text-sm transition-colors" style={{ backgroundColor: currentTheme.colors.accentPrimary, color: '#fff' }}>
                            {t('studyManager.reports.print')}
                        </button>
                        <button onClick={handleExportCsv} className="px-4 py-2 rounded-md font-semibold text-sm transition-colors" style={{ backgroundColor: currentTheme.colors.accentSuccess, color: '#fff' }}>
                            {t('studyManager.reports.exportCsv')}
                        </button>
                    </div>
                )}
            </div>

            {reportData && (
                <div className="rounded-lg" style={{ backgroundColor: currentTheme.colors.bgSecondary, borderColor: currentTheme.colors.borderColor, borderWidth: '1px' }}>
                    <div className="p-2 flex items-center gap-1" style={{ borderBottomColor: currentTheme.colors.borderColor, borderBottomWidth: '1px' }}>
                        {(['specification', 'invoice', 'summary'] as ReportView[]).map(view => (
                            <button
                                key={view}
                                onClick={() => setActiveView(view)}
                                className="px-3 py-1.5 text-sm font-semibold rounded-md transition-colors"
                                style={{ 
                                    backgroundColor: activeView === view ? currentTheme.colors.buttonPrimary : 'transparent',
                                    color: activeView === view ? '#fff' : currentTheme.colors.textSecondary
                                }}
                            >
                                {t(`studyManager.reports.${view}`)}
                            </button>
                        ))}
                    </div>
                    <div className="p-6 printable-area bg-white text-black">
                        {activeView === 'specification' && <Specification reportData={reportData} personalInfo={personalInfo} reportDate={new Date(date.year, date.month)} />}
                        {activeView === 'invoice' && <Invoice reportData={reportData} personalInfo={personalInfo} reportDate={new Date(date.year, date.month)} />}
                        {activeView === 'summary' && <Summary reportData={reportData} reportDate={new Date(date.year, date.month)} />}
                    </div>
                </div>
            )}
            
            <div className="rounded-lg p-4" style={{ backgroundColor: currentTheme.colors.bgSecondary, borderColor: currentTheme.colors.borderColor, borderWidth: '1px' }}>
                 <h2 className="text-xl font-bold mb-4" style={{ color: currentTheme.colors.textPrimary }}>{t('studyManager.reports.historyTitle')}</h2>
                 {generatedReports.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                           <thead className="text-sm" style={{ backgroundColor: currentTheme.colors.bgPrimary, color: currentTheme.colors.textSecondary }}>
                                <tr>
                                    <th className="p-3 font-semibold">{t('studyManager.table.period')}</th>
                                    <th className="p-3 font-semibold">{t('studyManager.table.studyCount')}</th>
                                    <th className="p-3 font-semibold">{t('studyManager.table.amount')}</th>
                                    <th className="p-3 font-semibold">{t('studyManager.table.generatedAt')}</th>
                                    <th className="p-3 font-semibold"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {generatedReports.map(report => (
                                    <tr key={report.id} className="last:border-b-0 transition-colors" style={{ borderBottomColor: currentTheme.colors.borderColor, borderBottomWidth: '1px', color: currentTheme.colors.textPrimary }}>
                                        <td className="p-3">{new Date(report.periodYear, report.periodMonth).toLocaleString(t('langName') === 'Polski' ? 'pl' : 'en-US', { month: 'long', year: 'numeric' })}</td>
                                        <td className="p-3">{report.studyCount}</td>
                                        <td className="p-3">{report.totalAmount.toFixed(2)}</td>
                                        <td className="p-3 text-sm" style={{ color: currentTheme.colors.textSecondary }}>{new Date(report.generatedAt).toLocaleString()}</td>
                                        <td className="p-3 text-right">
                                            <button onClick={() => onDeleteGeneratedReport(report.id)} className="p-2 rounded-full transition-colors" style={{ color: '#ef4444' }}>
                                                <TrashIcon className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                 ) : (
                    <p className="text-center py-4" style={{ color: currentTheme.colors.textMuted }}>{t('studyManager.reports.noHistory')}</p>
                 )}
            </div>
        </div>
    );
};

export default ReportGenerator;