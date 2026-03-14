import React, { useState } from 'react';
import { useTranslations } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useReport } from '../context/ReportContext';
import { usePINAuth } from '../context/PINAuthContext';
import { ChevronDownIcon } from './Icons';
import { safeFormatNumber, safeFormatCurrency } from '../utils/formatters';

interface ReportSummary {
  period: string;
  totalReports: number;
  totalAmount: number;
  byUser: Array<{
    name: string;
    email: string;
    count: number;
    totalAmount: number;
  }>;
  byCode: Array<{
    code: string;
    description: string;
    count: number;
    totalAmount: number;
  }>;
  detailedReports: Array<{
    reportId: string;
    userName: string;
    userEmail: string;
    month: number;
    year: number;
    amount: number;
    status: string;
  }>;
}

type DateRangeType = 'month' | 'year' | 'custom';
type ViewMode = 'summary' | 'byUser' | 'byCode' | 'detailed';

const FinancialReportGenerator: React.FC = () => {
  const { t } = useTranslations();
  const { currentTheme } = useTheme();
  const { currentUser } = usePINAuth();
  const { verificationRecords, getApprovedReportsForAccounting, getAccountingRecord } = useReport();

  const [dateRange, setDateRange] = useState<DateRangeType>('month');
  const prevMonth = new Date();
  prevMonth.setMonth(prevMonth.getMonth() - 1);
  const [selectedMonth, setSelectedMonth] = useState(prevMonth.getMonth());
  const [selectedYear, setSelectedYear] = useState(prevMonth.getFullYear());
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [viewModes, setViewModes] = useState<ViewMode[]>(['summary', 'byUser', 'byCode']);
  const [generatedReport, setGeneratedReport] = useState<ReportSummary | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Recalculate when verification records change
  const approvedReports = React.useMemo(() => {
    return getApprovedReportsForAccounting() || [];
  }, [verificationRecords]);

  const generateReport = () => {
    let startDate: Date;
    let endDate: Date;

    if (dateRange === 'month') {
      startDate = new Date(selectedYear, selectedMonth, 1);
      endDate = new Date(selectedYear, selectedMonth + 1, 0);
    } else if (dateRange === 'year') {
      startDate = new Date(selectedYear, 0, 1);
      endDate = new Date(selectedYear, 11, 31);
    } else {
      startDate = new Date(customStartDate);
      endDate = new Date(customEndDate);
    }

    const filteredReports = approvedReports.filter(report => {
      const reportDate = report.reportDate ? new Date(report.reportDate) : new Date(report.year, report.month - 1);
      return reportDate >= startDate && reportDate <= endDate;
    });

    // Build by user
    const userMap: Record<string, { name: string; email: string; count: number; totalAmount: number }> = {};
    filteredReports.forEach(report => {
      const amount = report.totalAmount || report.entries.reduce((sum, e) => sum + (e?.kwota || 0), 0);
      if (!userMap[report.userId]) {
        userMap[report.userId] = {
          name: report.userName || 'Unknown User',
          email: report.userEmail || 'unknown@email.com',
          count: 0,
          totalAmount: 0
        };
      }
      userMap[report.userId].count++;
      userMap[report.userId].totalAmount += amount;
    });

    // Build by code
    const codeMap: Record<string, { code: string; description: string; count: number; totalAmount: number }> = {};
    filteredReports.forEach(report => {
      const amount = report.totalAmount || report.entries.reduce((sum, e) => sum + (e?.kwota || 0), 0);
      report.entries.forEach(entry => {
        const code = entry.numerBadania || 'Unknown';
        if (!codeMap[code]) {
          codeMap[code] = {
            code,
            description: entry.opis || '',
            count: 0,
            totalAmount: 0
          };
        }
        codeMap[code].count++;
        codeMap[code].totalAmount += (entry.kwota || 0);
      });
    });

    const totalAmount = filteredReports.reduce((sum, r) => sum + (r.totalAmount || r.entries.reduce((s, e) => s + (e?.kwota || 0), 0)), 0);

    const report: ReportSummary = {
      period: dateRange === 'custom' ? `${customStartDate} - ${customEndDate}` : (dateRange === 'month' ? `${selectedMonth + 1}/${selectedYear}` : selectedYear.toString()),
      totalReports: filteredReports.length,
      totalAmount,
      byUser: Object.values(userMap).sort((a, b) => b.totalAmount - a.totalAmount),
      byCode: Object.values(codeMap).sort((a, b) => b.count - a.count),
      detailedReports: filteredReports.map(r => ({
        reportId: r.id,
        userName: r.userName || 'Unknown User',
        userEmail: r.userEmail || 'unknown@email.com',
        month: r.month,
        year: r.year,
        amount: r.totalAmount || r.entries.reduce((sum, e) => sum + (e?.kwota || 0), 0),
        status: getAccountingRecord(r.id)?.status || 'unknown'
      }))
    };

    setGeneratedReport(report);
  };

  const exportToCSV = () => {
    if (!generatedReport) return;

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += `Financial Report - Period: ${generatedReport.period}\n`;
    csvContent += `Generated: ${new Date().toLocaleString()}\n`;
    csvContent += `Total Reports: ${generatedReport.totalReports}\n`;
    csvContent += `Total Amount: ${safeFormatCurrency(generatedReport.totalAmount)}\n\n`;

    if (viewModes.includes('summary')) {
      csvContent += 'SUMMARY\n';
      csvContent += `Total Reports,${generatedReport.totalReports}\n`;
      csvContent += `Total Amount,${safeFormatNumber(generatedReport.totalAmount)}\n\n`;
    }

    if (viewModes.includes('byUser')) {
      csvContent += 'BY USER\n';
      csvContent += 'Name,Email,Count,Total Amount\n';
      generatedReport.byUser.forEach(user => {
        csvContent += `"${user.name}","${user.email}",${user.count},${safeFormatNumber(user.totalAmount)}\n`;
      });
      csvContent += '\n';
    }

    if (viewModes.includes('byCode')) {
      csvContent += 'BY CODE\n';
      csvContent += 'Code,Description,Count,Total Amount\n';
      generatedReport.byCode.forEach(code => {
        csvContent += `"${code.code}","${code.description}",${code.count},${safeFormatNumber(code.totalAmount)}\n`;
      });
      csvContent += '\n';
    }

    if (viewModes.includes('detailed')) {
      csvContent += 'DETAILED REPORTS\n';
      csvContent += 'User,Email,Month,Year,Amount,Status\n';
      generatedReport.detailedReports.forEach(r => {
        csvContent += `"${r.userName}","${r.userEmail}",${r.month},${r.year},${safeFormatNumber(r.amount)},${r.status}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `financial-report-${new Date().toISOString().replace(/[:.]/g, '').slice(0, 15)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: new Date(2025, i).toLocaleString('pl-PL', { month: 'long' })
  }));

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div style={{ backgroundColor: currentTheme.colors.bgTertiary }} className="rounded-lg border border-gray-700 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:opacity-80 transition-opacity"
      >
        <h3 className="text-lg font-semibold" style={{ color: currentTheme.colors.textPrimary }}>
          📊 {t('accounting.financialReports') || 'Financial Reports'}
        </h3>
        <ChevronDownIcon
          className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          style={{ color: currentTheme.colors.textSecondary }}
        />
      </button>

      {isExpanded && (
        <div style={{ backgroundColor: currentTheme.colors.bgSecondary }} className="border-t border-gray-700 p-4 space-y-4">
          {/* Date Range Selection */}
          <div>
            <label className="text-sm font-semibold" style={{ color: currentTheme.colors.textSecondary }}>
              {t('accounting.dateRange') || 'Date Range'}
            </label>
            <div className="flex gap-2 mt-2">
              {(['month', 'year', 'custom'] as const).map(range => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-3 py-2 rounded text-sm font-semibold transition-colors ${
                    dateRange === range
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {range === 'month' ? 'Month' : range === 'year' ? 'Year' : 'Custom'}
                </button>
              ))}
            </div>
          </div>

          {/* Month/Year Selection */}
          {dateRange !== 'custom' && (
            <div className="grid grid-cols-2 gap-4">
              {dateRange === 'month' && (
                <div>
                  <label className="text-sm font-semibold" style={{ color: currentTheme.colors.textSecondary }}>
                    {t('common.month') || 'Month'}
                  </label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    style={{
                      backgroundColor: currentTheme.colors.bgTertiary,
                      color: currentTheme.colors.textPrimary,
                      borderColor: currentTheme.colors.borderColor
                    }}
                    className="w-full mt-2 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {months.map(m => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="text-sm font-semibold" style={{ color: currentTheme.colors.textSecondary }}>
                  {t('common.year') || 'Year'}
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  style={{
                    backgroundColor: currentTheme.colors.bgTertiary,
                    color: currentTheme.colors.textPrimary,
                    borderColor: currentTheme.colors.borderColor
                  }}
                  className="w-full mt-2 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {years.map(y => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Custom Date Range */}
          {dateRange === 'custom' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold" style={{ color: currentTheme.colors.textSecondary }}>
                  {t('common.startDate') || 'Start Date'}
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  style={{
                    backgroundColor: currentTheme.colors.bgTertiary,
                    color: currentTheme.colors.textPrimary,
                    borderColor: currentTheme.colors.borderColor
                  }}
                  className="w-full mt-2 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm font-semibold" style={{ color: currentTheme.colors.textSecondary }}>
                  {t('common.endDate') || 'End Date'}
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  style={{
                    backgroundColor: currentTheme.colors.bgTertiary,
                    color: currentTheme.colors.textPrimary,
                    borderColor: currentTheme.colors.borderColor
                  }}
                  className="w-full mt-2 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* View Modes */}
          <div>
            <label className="text-sm font-semibold" style={{ color: currentTheme.colors.textSecondary }}>
              {t('accounting.views') || 'Report Views'}
            </label>
            <div className="flex gap-2 mt-2 flex-wrap">
              {(['summary', 'byUser', 'byCode', 'detailed'] as const).map(mode => (
                <label key={mode} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={viewModes.includes(mode)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setViewModes([...viewModes, mode]);
                      } else {
                        setViewModes(viewModes.filter(m => m !== mode));
                      }
                    }}
                    className="rounded"
                  />
                  <span className="text-sm" style={{ color: currentTheme.colors.textPrimary }}>
                    {mode === 'summary' ? 'Summary' : mode === 'byUser' ? 'By User' : mode === 'byCode' ? 'By Code' : 'Detailed'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={generateReport}
            className="w-full py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            {t('accounting.generateReport') || 'Generate Report'}
          </button>

          {/* Generated Report */}
          {generatedReport && (
            <div className="space-y-4 mt-4">
              {/* Header */}
              <div style={{ backgroundColor: currentTheme.colors.bgTertiary }} className="p-3 rounded border border-gray-700">
                <p className="text-sm font-semibold" style={{ color: currentTheme.colors.textSecondary }}>
                  Period: {generatedReport.period}
                </p>
                <p className="text-sm" style={{ color: currentTheme.colors.textSecondary }}>
                  Total Reports: {generatedReport.totalReports}
                </p>
                <p className="text-lg font-bold" style={{ color: currentTheme.colors.textPrimary }}>
                  Total Amount: {safeFormatCurrency(generatedReport.totalAmount)}
                </p>
              </div>

              {/* Summary View */}
              {viewModes.includes('summary') && (
                <div>
                  <h4 className="font-semibold mb-2" style={{ color: currentTheme.colors.textPrimary }}>
                    Summary
                  </h4>
                  <div style={{ backgroundColor: currentTheme.colors.bgTertiary }} className="p-3 rounded border border-gray-700 text-sm space-y-1">
                    <p>Total Reports: {generatedReport.totalReports}</p>
                    <p className="font-semibold">Total Amount: {safeFormatCurrency(generatedReport.totalAmount)}</p>
                  </div>
                </div>
              )}

              {/* By User View */}
              {viewModes.includes('byUser') && (
                <div>
                  <h4 className="font-semibold mb-2" style={{ color: currentTheme.colors.textPrimary }}>
                    By User
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead style={{ backgroundColor: currentTheme.colors.bgTertiary }}>
                        <tr>
                          <th className="border border-gray-700 px-2 py-1 text-left">Name</th>
                          <th className="border border-gray-700 px-2 py-1 text-center">Count</th>
                          <th className="border border-gray-700 px-2 py-1 text-right">Amount (PLN)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {generatedReport.byUser.map(user => (
                          <tr key={user.email}>
                            <td className="border border-gray-700 px-2 py-1">{user.name}</td>
                            <td className="border border-gray-700 px-2 py-1 text-center">{user.count}</td>
                            <td className="border border-gray-700 px-2 py-1 text-right">{safeFormatNumber(user.totalAmount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* By Code View */}
              {viewModes.includes('byCode') && (
                <div>
                  <h4 className="font-semibold mb-2" style={{ color: currentTheme.colors.textPrimary }}>
                    By Code
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead style={{ backgroundColor: currentTheme.colors.bgTertiary }}>
                        <tr>
                          <th className="border border-gray-700 px-2 py-1 text-left">Code</th>
                          <th className="border border-gray-700 px-2 py-1 text-center">Count</th>
                          <th className="border border-gray-700 px-2 py-1 text-right">Amount (PLN)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {generatedReport.byCode.map(code => (
                          <tr key={code.code}>
                            <td className="border border-gray-700 px-2 py-1">{code.code}</td>
                            <td className="border border-gray-700 px-2 py-1 text-center">{code.count}</td>
                            <td className="border border-gray-700 px-2 py-1 text-right">{safeFormatNumber(code.totalAmount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Detailed View */}
              {viewModes.includes('detailed') && (
                <div>
                  <h4 className="font-semibold mb-2" style={{ color: currentTheme.colors.textPrimary }}>
                    Detailed Reports
                  </h4>
                  <div className="overflow-x-auto max-h-96 overflow-y-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead style={{ backgroundColor: currentTheme.colors.bgTertiary }}>
                        <tr>
                          <th className="border border-gray-700 px-2 py-1 text-left">User</th>
                          <th className="border border-gray-700 px-2 py-1 text-center">Month/Year</th>
                          <th className="border border-gray-700 px-2 py-1 text-right">Amount (PLN)</th>
                          <th className="border border-gray-700 px-2 py-1 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {generatedReport.detailedReports.map(report => (
                          <tr key={report.reportId}>
                            <td className="border border-gray-700 px-2 py-1">{report.userName}</td>
                            <td className="border border-gray-700 px-2 py-1 text-center">{report.month}/{report.year}</td>
                            <td className="border border-gray-700 px-2 py-1 text-right">{safeFormatNumber(report.amount)}</td>
                            <td className="border border-gray-700 px-2 py-1 text-center text-xs">{report.status.toUpperCase()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Export Button */}
              <button
                onClick={exportToCSV}
                className="w-full py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors text-sm"
              >
                📥 Export to CSV
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FinancialReportGenerator;
