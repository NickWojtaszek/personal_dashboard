import React, { useState } from 'react';
import { useTranslations } from '../context/LanguageContext';
import { usePINAuth } from '../context/PINAuthContext';
import { useTheme } from '../context/ThemeContext';
import { useReport } from '../context/ReportContext';
import { ChevronDownIcon, AlertIcon } from '../components/Icons';
import { safeFormatCurrency } from '../utils/formatters';
import type { Report, AccountingProcessing } from '../types';
import Specification from './studyManager/report/Specification';
import Invoice from './studyManager/report/Invoice';
import Summary from './studyManager/report/Summary';
import type { ReportData } from './studyManager/ReportGenerator';
import { initialRadiologyCodes } from '../data/radiologyCodes';

const AccountingDashboard: React.FC = () => {
  const { t } = useTranslations();
  const { currentUser } = usePINAuth();
  const { currentTheme } = useTheme();
  const { verificationRecords, getApprovedReportsForAccounting, getAccountingRecord, createAccountingRecord, updateAccountingStatus, addInternalNote, deleteInternalNote } = useReport();

  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'specification' | 'invoice' | 'summary'>('specification');
  const [filterUser, setFilterUser] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'received' | 'processed' | 'sent_to_bank'>('all');
  const [noteInput, setNoteInput] = useState<Record<string, string>>({});
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [isUserFilterExpanded, setIsUserFilterExpanded] = useState(false);

  const approvedReports = getApprovedReportsForAccounting() || [];

  // Ensure all reports have accounting records
  React.useEffect(() => {
    approvedReports.forEach(report => {
      const existing = getAccountingRecord(report.id);
      if (!existing) {
        createAccountingRecord(report.id);
      }
    });
  }, [approvedReports, verificationRecords]);

  // Get available years from reports
  const availableYears = React.useMemo(() => {
    const years = new Set<number>();
    approvedReports.forEach(report => {
      years.add(report.year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [approvedReports]);

  // Get available months for selected year
  const availableMonths = React.useMemo(() => {
    const months = new Set<number>();
    approvedReports.forEach(report => {
      if (report.year === selectedYear) {
        months.add(report.month - 1); // Convert 1-based to 0-based
      }
    });
    return Array.from(months).sort((a, b) => a - b);
  }, [approvedReports, selectedYear]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const filteredReports = approvedReports.filter(report => {
    const accounting = getAccountingRecord(report.id);
    const matchesUser = !filterUser || report.userName.toLowerCase().includes(filterUser.toLowerCase());
    const matchesStatus = filterStatus === 'all' || accounting?.status === filterStatus;
    const matchesYear = report.year === selectedYear;
    const matchesMonth = (report.month - 1) === selectedMonth; // Convert to 0-based
    return matchesUser && matchesStatus && matchesYear && matchesMonth;
  });

  const handleStatusChange = (reportId: string, newStatus: 'received' | 'processed' | 'sent_to_bank') => {
    if (!currentUser) return;
    updateAccountingStatus(reportId, newStatus, currentUser.email || '');
  };

  const handleAddNote = (reportId: string) => {
    if (!currentUser || !noteInput[reportId]?.trim()) return;
    addInternalNote(reportId, noteInput[reportId], currentUser.email || '');
    setNoteInput({ ...noteInput, [reportId]: '' });
  };

  const handleDeleteNote = (reportId: string, noteId: string) => {
    deleteInternalNote(reportId, noteId);
  };

  const ReportListItem: React.FC<{ report: Report }> = ({ report }) => {
    const accounting = getAccountingRecord(report.id);
    const isExpanded = expandedReportId === report.id;

    if (!report || !report.entries || !Array.isArray(report.entries)) {
      return null;
    }

    const totalAmount = report.totalAmount || report.entries.reduce((sum, e) => sum + (e?.kwota || 0), 0);
    const reportDate = report.reportDate ? new Date(report.reportDate) : new Date(report.year, report.month - 1);

    // Convert entries to Study format
    const studies = report.entries.map((entry, idx) => ({
      id: idx,
      code: entry.kodNFZ || entry.numerBadania || '', // Fallback for old reports
      patientId: entry.numerBadania || '',
      points: entry.kwota || 0,
      desc: entry.opis || '',
      date: entry.dataWykonania || ''
    }));

    const grouped = studies.reduce((acc, study) => {
      if (!acc[study.code]) {
        acc[study.code] = { count: 0, totalPoints: 0 };
      }
      acc[study.code].count++;
      acc[study.code].totalPoints += study.points;
      return acc;
    }, {} as Record<string, { count: number; totalPoints: number }>);

    const groupedByCode = Object.entries(grouped).map(([code, data]) => {
      const codeData = initialRadiologyCodes.find(c => c.code === code);
      return {
        code: codeData || { code, fullCode: code, points: 0, desc: '', category: '' },
        count: (data as { count: number; totalPoints: number }).count,
        totalPoints: (data as { count: number; totalPoints: number }).totalPoints
      };
    }).sort((a, b) => b.count - a.count);

    const reportData: ReportData = {
      studies,
      totalPoints: totalAmount,
      totalAmount: totalAmount,
      groupedByCode
    };

    const statusColor = {
      received: 'yellow',
      processed: 'blue',
      sent_to_bank: 'green'
    } as const;

    return (
      <div
        key={report.id}
        style={{ backgroundColor: currentTheme.colors.bgTertiary, borderColor: currentTheme.colors.borderColor, borderWidth: '1px' }}
        className="rounded-lg overflow-hidden mb-4"
      >
        <button
          onClick={() => setExpandedReportId(isExpanded ? null : report.id)}
          className="w-full flex items-center justify-between p-4 hover:opacity-80 transition-opacity"
        >
          <div className="flex items-start gap-4 flex-1">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold" style={{ color: currentTheme.colors.textPrimary }}>
                  {report.userName}
                </h3>
                <span className="text-xs px-2 py-1 bg-blue-900/50 text-blue-300 rounded">
                  {report.month}/{report.year}
                </span>
                <span
                  className={`text-xs px-2 py-1 rounded font-semibold`}
                  style={{
                    backgroundColor: `${statusColor[accounting?.status || 'received']}900/50`,
                    color: `${statusColor[accounting?.status || 'received']}300`
                  }}
                >
                  {accounting?.status?.replace('_', ' ').toUpperCase() || 'RECEIVED'}
                </span>
              </div>
              <p className="text-sm" style={{ color: currentTheme.colors.textSecondary }}>
                {report.userEmail}
              </p>
              <p className="text-sm font-semibold" style={{ color: currentTheme.colors.textPrimary }}>
                {safeFormatCurrency(totalAmount)}
              </p>
            </div>
          </div>

          <ChevronDownIcon
            className={`h-5 w-5 ml-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            style={{ color: currentTheme.colors.textSecondary }}
          />
        </button>

        {isExpanded && (
          <div style={{ backgroundColor: currentTheme.colors.bgSecondary, maxHeight: '80vh', overflowY: 'auto' }} className="border-t border-gray-700 p-4 space-y-4">
            {/* View Tabs */}
            <div className="flex gap-2 border-b border-gray-700">
              {(['specification', 'invoice', 'summary'] as const).map(view => (
                <button
                  key={view}
                  onClick={() => setActiveView(view)}
                  className="px-3 py-2 text-sm font-semibold rounded-t-md transition-colors"
                  style={{
                    backgroundColor: activeView === view ? currentTheme.colors.buttonPrimary : 'transparent',
                    color: activeView === view ? '#fff' : currentTheme.colors.textSecondary
                  }}
                >
                  {t(`studyManager.reports.${view}`)}
                </button>
              ))}
            </div>

            {/* Document Display */}
            <div className="p-4 bg-white text-black rounded-lg overflow-auto" style={{ height: '500px' }}>
              {activeView === 'specification' && (
                <Specification reportData={reportData} personalInfo={report.personalInfo || {}} reportDate={reportDate} />
              )}
              {activeView === 'invoice' && (
                <Invoice reportData={reportData} personalInfo={report.personalInfo || {}} reportDate={reportDate} />
              )}
              {activeView === 'summary' && (
                <Summary reportData={reportData} reportDate={reportDate} />
              )}
            </div>

            {/* Status Update Controls */}
            <div style={{ backgroundColor: currentTheme.colors.bgTertiary }} className="p-4 rounded-lg border border-gray-700">
              <h4 className="font-semibold mb-3" style={{ color: currentTheme.colors.textPrimary }}>
                {t('accounting.statusUpdate') || 'Update Status'}
              </h4>
              <div className="flex gap-2 flex-wrap">
                {(['received', 'processed', 'sent_to_bank'] as const).map(status => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(report.id, status)}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors text-sm ${
                      accounting?.status === status
                        ? `bg-${statusColor[status]}-600 text-white`
                        : `bg-${statusColor[status]}-900/30 text-${statusColor[status]}-300 hover:opacity-80`
                    }`}
                  >
                    {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
                  </button>
                ))}
              </div>

              {/* Status History */}
              <div className="mt-4">
                <p className="text-xs font-semibold" style={{ color: currentTheme.colors.textSecondary }}>
                  {t('accounting.statusHistory') || 'Status History'}
                </p>
                <div className="space-y-1 mt-2">
                  {accounting?.statusHistory.map((change, idx) => (
                    <p key={idx} className="text-xs" style={{ color: currentTheme.colors.textSecondary }}>
                      {new Date(change.changedAt).toLocaleDateString()} - {change.status.toUpperCase()}
                      {change.changedBy !== 'system' && ` (by ${change.changedBy})`}
                    </p>
                  ))}
                </div>
              </div>
            </div>

            {/* Internal Notes */}
            <div style={{ backgroundColor: currentTheme.colors.bgTertiary }} className="p-4 rounded-lg border border-gray-700">
              <h4 className="font-semibold mb-3" style={{ color: currentTheme.colors.textPrimary }}>
                {t('accounting.internalNotes') || 'Internal Notes'}
              </h4>

              {/* Existing Notes */}
              {accounting && accounting.internalNotes.length > 0 && (
                <div className="space-y-2 mb-4">
                  {accounting.internalNotes.map(note => (
                    <div key={note.id} style={{ backgroundColor: currentTheme.colors.bgSecondary }} className="p-3 rounded border border-gray-700">
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-xs font-semibold" style={{ color: currentTheme.colors.textSecondary }}>
                          {note.author}
                        </p>
                        <button
                          onClick={() => handleDeleteNote(report.id, note.id)}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          Delete
                        </button>
                      </div>
                      <p className="text-sm" style={{ color: currentTheme.colors.textPrimary }}>
                        {note.content}
                      </p>
                      <p className="text-xs" style={{ color: currentTheme.colors.textSecondary }}>
                        {new Date(note.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Note */}
              <div className="space-y-2">
                <textarea
                  value={noteInput[report.id] || ''}
                  onChange={(e) => setNoteInput({ ...noteInput, [report.id]: e.target.value })}
                  placeholder={t('accounting.addNotePlaceholder') || 'Add internal note...'}
                  style={{
                    backgroundColor: currentTheme.colors.bgSecondary,
                    color: currentTheme.colors.textPrimary,
                    borderColor: currentTheme.colors.borderColor
                  }}
                  className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                  rows={2}
                />
                <button
                  onClick={() => handleAddNote(report.id)}
                  className="w-full py-1 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors text-sm"
                >
                  {t('common.add') || 'Add Note'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <main className="flex-1 overflow-auto p-6" style={{ backgroundColor: currentTheme.colors.bgSecondary }}>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8" style={{ color: currentTheme.colors.textPrimary }}>
          {t('accounting.dashboard') || 'Accounting Dashboard'}
        </h1>

        {/* Three-Column Filter Section */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
          {/* Column 1: Status Filter */}
          <div>
            <label className="text-xs font-semibold block mb-2 uppercase tracking-wide" style={{ color: currentTheme.colors.textSecondary }}>
              {t('accounting.status') || 'Status'}
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              style={{
                backgroundColor: currentTheme.colors.bgTertiary,
                color: currentTheme.colors.textPrimary,
                borderColor: currentTheme.colors.borderColor
              }}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">All</option>
              <option value="received">Received</option>
              <option value="processed">Processed</option>
              <option value="sent_to_bank">Sent to Bank</option>
            </select>
          </div>

          {/* Column 2: Year Selector */}
          <div>
            <label className="text-xs font-semibold block mb-2 uppercase tracking-wide" style={{ color: currentTheme.colors.textSecondary }}>
              {t('common.year') || 'Year'}
            </label>
            <select
              value={selectedYear}
              onChange={(e) => {
                const year = parseInt(e.target.value);
                setSelectedYear(year);
                // Reset month to first available month of the year
                const monthsInYear = approvedReports
                  .filter(r => r.year === year)
                  .map(r => r.month - 1);
                if (monthsInYear.length > 0) {
                  setSelectedMonth(Math.min(...monthsInYear));
                }
              }}
              style={{
                backgroundColor: currentTheme.colors.bgTertiary,
                color: currentTheme.colors.textPrimary,
                borderColor: currentTheme.colors.borderColor
              }}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {/* Column 3-4: Month Tabs */}
          <div className="lg:col-span-2">
            <label className="text-xs font-semibold block mb-2 uppercase tracking-wide" style={{ color: currentTheme.colors.textSecondary }}>
              {t('common.month') || 'Month'} ({filteredReports.length})
            </label>
            <div className="flex gap-1 flex-nowrap overflow-x-auto pb-1">
              {monthNames.map((month, idx) => {
                const hasReports = availableMonths.includes(idx);
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedMonth(idx)}
                    disabled={!hasReports}
                    className={`px-2 py-2 rounded-lg font-semibold transition-colors text-xs whitespace-nowrap flex-shrink-0 ${
                      selectedMonth === idx
                        ? 'bg-blue-600 text-white'
                        : hasReports
                        ? 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                        : 'bg-gray-900/50 text-gray-600 cursor-not-allowed'
                    }`}
                  >
                    {month.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Collapsible User Filter */}
        <div className="mb-6">
          <button
            onClick={() => setIsUserFilterExpanded(!isUserFilterExpanded)}
            className="w-full flex items-center justify-between p-3 rounded-lg transition-colors"
            style={{
              backgroundColor: currentTheme.colors.bgTertiary,
              color: currentTheme.colors.textPrimary
            }}
          >
            <span className="text-sm font-semibold">{t('common.userName') || 'User Name Filter'}</span>
            <ChevronDownIcon
              className={`h-4 w-4 transition-transform ${isUserFilterExpanded ? 'rotate-180' : ''}`}
              style={{ color: currentTheme.colors.textSecondary }}
            />
          </button>
          {isUserFilterExpanded && (
            <div className="p-3 mt-2" style={{ backgroundColor: currentTheme.colors.bgTertiary }}>
              <input
                type="text"
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
                placeholder={t('common.search') || 'Search by user name...'}
                style={{
                  backgroundColor: currentTheme.colors.bgSecondary,
                  color: currentTheme.colors.textPrimary,
                  borderColor: currentTheme.colors.borderColor
                }}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        {/* Reports List */}
        {filteredReports.length === 0 ? (
          <div
            style={{ backgroundColor: currentTheme.colors.bgTertiary }}
            className="p-8 rounded-lg text-center border border-gray-700"
          >
            <p style={{ color: currentTheme.colors.textSecondary }}>
              {t('accounting.noReports') || 'No approved reports available'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReports.map(report => (
              <ReportListItem key={report.id} report={report} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

export default AccountingDashboard;
