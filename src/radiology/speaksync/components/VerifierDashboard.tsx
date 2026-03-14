import React, { useState } from 'react';
import { useTranslations } from '../context/LanguageContext';
import { usePINAuth } from '../context/PINAuthContext';
import { useTheme } from '../context/ThemeContext';
import { useReport } from '../context/ReportContext';
import { CheckIcon, XIcon, AlertIcon, ChevronDownIcon } from '../components/Icons';
import type { Report, VerificationRecord, Study, RadiologyCode } from '../types';
import Specification from './studyManager/report/Specification';
import Invoice from './studyManager/report/Invoice';
import Summary from './studyManager/report/Summary';
import type { ReportData } from './studyManager/ReportGenerator';
import { initialRadiologyCodes } from '../data/radiologyCodes';
import AccountingSubmissionModal from './AccountingSubmissionModal';

const VerifierDashboard: React.FC = () => {
  const { t } = useTranslations();
  const { currentUser } = usePINAuth();
  const { currentTheme } = useTheme();
  const { getSubmittedReports, verifyReport, getVerificationRecord, verificationRecords, createAccountingRecord, getAccountingRecord } = useReport();

  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  const [selectedReportForReview, setSelectedReportForReview] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'specification' | 'invoice' | 'summary'>('specification');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [reviewComments, setReviewComments] = useState('');
  const [isAccountingModalOpen, setIsAccountingModalOpen] = useState(false);
  const [selectedReportForAccounting, setSelectedReportForAccounting] = useState<Report | null>(null);

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // Re-filter when verification records change
  const submittedReports = (getSubmittedReports() || []).filter(r => r && r.entries && Array.isArray(r.entries));
  
  // Get available years from reports
  const availableYears = React.useMemo(() => {
    const years = new Set<number>();
    submittedReports.forEach(report => {
      years.add(report.year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [submittedReports]);

  // Get available months for selected year
  const availableMonths = React.useMemo(() => {
    const months = new Set<number>();
    submittedReports.forEach(report => {
      if (report.year === selectedYear) {
        months.add(report.month - 1);
      }
    });
    return Array.from(months).sort((a, b) => a - b);
  }, [submittedReports, selectedYear]);

  // Filter reports by status, year, and month
  const filteredReports = submittedReports.filter(report => {
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'pending' && (!getVerificationRecord(report.id) || getVerificationRecord(report.id)?.status === 'pending')) ||
      (filterStatus === 'approved' && getVerificationRecord(report.id)?.status === 'approved') ||
      (filterStatus === 'rejected' && getVerificationRecord(report.id)?.status === 'rejected');
    const matchesYear = report.year === selectedYear;
    const matchesMonth = (report.month - 1) === selectedMonth;
    return matchesStatus && matchesYear && matchesMonth;
  });

  const pendingReports = filteredReports.filter(r => !getVerificationRecord(r.id) || getVerificationRecord(r.id)?.status === 'pending');
  const approvedReports = filteredReports.filter(r => getVerificationRecord(r.id)?.status === 'approved');
  const rejectedReports = filteredReports.filter(r => getVerificationRecord(r.id)?.status === 'rejected');

  const handleApproveReport = (report: Report) => {
    if (!currentUser) return;

    const verification: VerificationRecord = {
      id: `verification_${report.id}_${Date.now()}`,
      reportId: report.id,
      verifierId: currentUser.id,
      verifierEmail: currentUser.email || '',
      status: 'approved',
      comments: reviewComments,
      createdAt: new Date().toISOString(),
      verifiedAt: new Date().toISOString(),
    };

    verifyReport(report.id, verification);
    setReviewComments('');
    setSelectedReportForReview(null);
  };

  const handleRejectReport = (report: Report) => {
    if (!currentUser) return;

    if (!reviewComments.trim()) {
      alert(t('report.rejectionCommentRequired'));
      return;
    }

    const verification: VerificationRecord = {
      id: `verification_${report.id}_${Date.now()}`,
      reportId: report.id,
      verifierId: currentUser.id,
      verifierEmail: currentUser.email || '',
      status: 'rejected',
      comments: reviewComments,
      createdAt: new Date().toISOString(),
      verifiedAt: new Date().toISOString(),
    };

    verifyReport(report.id, verification);
    setReviewComments('');
    setSelectedReportForReview(null);
  };

  const handleSendToAccounting = (report: Report) => {
    if (!currentUser || !report) return;
    setSelectedReportForAccounting(report);
    setIsAccountingModalOpen(true);
  };

  const handleConfirmAccountingSubmission = () => {
    if (!currentUser || !selectedReportForAccounting) {
      setIsAccountingModalOpen(false);
      return;
    }

    const report = selectedReportForAccounting;

    // Create accounting record with 'received' status
    createAccountingRecord(report.id);

    // Log the submission (in a real app, this would be sent to a backend)
    console.log('Created accounting record for report:', report.id);
  };

  const handleCancelAccountingSubmission = () => {
    setIsAccountingModalOpen(false);
    setSelectedReportForAccounting(null);
  };

  const ReportListItem: React.FC<{ report: Report; status: 'pending' | 'approved' | 'rejected' }> = ({ report, status }) => {
    if (!report || !report.entries || !Array.isArray(report.entries)) {
      return null;
    }

    const isExpanded = expandedReportId === report.id;
    const hasDuplicates = (report.duplicateStudyNumbers?.length ?? 0) > 0;
    const hasCrossUserFraud = report.duplicateStudyNumbers?.some(dup => dup.isCrossUserFraud) ?? false;
    const totalAmount = report.totalAmount || report.entries.reduce((sum, e) => sum + (e?.kwota || 0), 0);
    const reportDate = report.reportDate ? new Date(report.reportDate) : new Date(report.year, report.month - 1);
    const accountingRecord = getAccountingRecord(report.id);
    const accountingStatus = accountingRecord?.status;
    
    // Convert entries back to Study format for document display
    const studies: Study[] = report.entries.map((entry, idx) => ({
      id: idx,
      code: entry.kodNFZ || entry.numerBadania || '', // Fallback for old reports
      patientId: entry.numerBadania || '',
      points: entry.kwota || 0,
      desc: entry.opis || '',
      date: entry.dataWykonania || ''
    }));

    // Build groupedByCode from studies with actual code data
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
        code: codeData || { code, fullCode: code, points: 0, desc: '', category: '' } as RadiologyCode,
        count: (data as { count: number; totalPoints: number }).count,
        totalPoints: (data as { count: number; totalPoints: number }).totalPoints
      };
    }).sort((a, b) => b.count - a.count);
    
    // Build report data for displaying the documents
    const reportData: ReportData = {
      studies,
      totalPoints: totalAmount,
      totalAmount: totalAmount,
      groupedByCode
    };

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
                {hasDuplicates && (
                  <span className={`text-xs px-2 py-1 rounded flex items-center gap-1 font-semibold ${
                    hasCrossUserFraud
                      ? 'bg-red-700 text-white border border-red-400 animate-pulse'
                      : 'bg-yellow-900/50 text-yellow-300'
                  }`}>
                    <AlertIcon className="h-3 w-3" />
                    {hasCrossUserFraud ? '🚨 FRAUD ALERT' : 'Duplicate'}
                  </span>
                )}
              </div>
              <p className="text-sm" style={{ color: currentTheme.colors.textSecondary }}>
                {report.userEmail}
              </p>
            </div>

            {/* Status Badges */}
            <div className="text-right flex flex-col gap-1 items-end">
              {status === 'pending' && (
                <span className="inline-block px-3 py-1 bg-yellow-900/50 text-yellow-300 rounded-full text-xs font-semibold">
                  {t('report.pending')}
                </span>
              )}
              {status === 'approved' && (
                <span className="inline-block px-3 py-1 bg-green-900/50 text-green-300 rounded-full text-xs font-semibold">
                  {t('report.verified')}
                </span>
              )}
              {status === 'rejected' && (
                <span className="inline-block px-3 py-1 bg-red-900/50 text-red-300 rounded-full text-xs font-semibold">
                  {t('report.rejected')}
                </span>
              )}
              {/* Accounting Status Badge */}
              {accountingStatus && (
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                  accountingStatus === 'received' ? 'bg-blue-900/50 text-blue-300' :
                  accountingStatus === 'processed' ? 'bg-blue-900/50 text-blue-300' :
                  'bg-cyan-900/50 text-cyan-300'
                }`}>
                  {accountingStatus === 'received' && '📥 Received'}
                  {accountingStatus === 'processed' && '⚙️ Processed'}
                  {accountingStatus === 'sent_to_bank' && '🏦 Sent to Bank'}
                </span>
              )}
            </div>
          </div>

          <ChevronDownIcon
            className={`h-5 w-5 ml-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            style={{ color: currentTheme.colors.textSecondary }}
          />
        </button>

        {/* Expanded Content - Display the three documents */}
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

            {/* Duplicate Studies Info */}
            {hasDuplicates && (
              <div className="p-4 bg-red-900/20 border-2 border-red-600 rounded-lg space-y-3">
                {/* Check if there are cross-user frauds */}
                {report.duplicateStudyNumbers?.some(dup => dup.isCrossUserFraud) && (
                  <div className="p-3 bg-red-700/30 border-2 border-red-500 rounded-md">
                    <h4 className="font-bold text-red-100 mb-2 flex items-center gap-2 text-base">
                      <AlertIcon className="h-5 w-5" />
                      🚨 POTENTIAL FRAUD DETECTED - CROSS-USER DUPLICATES
                    </h4>
                    <p className="text-red-200 text-sm mb-2">
                      The following study numbers have been submitted by DIFFERENT users. This requires immediate investigation:
                    </p>
                    <div className="space-y-2">
                      {report.duplicateStudyNumbers
                        ?.filter(dup => dup.isCrossUserFraud)
                        .map((dup, idx) => (
                          <div key={idx} className="p-2 bg-red-900/40 rounded border border-red-400">
                            <p className="text-red-100 font-semibold">
                              Study Number: <span className="font-mono">{dup.numerBadania}</span>
                            </p>
                            <p className="text-red-200 text-sm">
                              Previously submitted by: <span className="font-mono">{dup.existingUserEmail}</span>
                            </p>
                            <p className="text-red-200 text-sm">
                              Report ID: <span className="font-mono text-xs">{dup.existingReportId}</span>
                            </p>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Same-user duplicates */}
                {report.duplicateStudyNumbers?.some(dup => !dup.isCrossUserFraud) && (
                  <div className="p-3 bg-yellow-900/30 border border-yellow-600 rounded-md">
                    <h4 className="font-semibold text-yellow-200 mb-2 flex items-center gap-2">
                      <AlertIcon className="h-4 w-4" />
                      Same User - Duplicate Submission
                    </h4>
                    <p className="text-yellow-200 text-sm mb-2">
                      The user has previously submitted these study numbers in another report:
                    </p>
                    <div className="space-y-1">
                      {report.duplicateStudyNumbers
                        ?.filter(dup => !dup.isCrossUserFraud)
                        .map((dup, idx) => (
                          <p key={idx} className="text-yellow-100 text-sm">
                            • Study Number: <span className="font-mono">{dup.numerBadania}</span> (Report: {dup.existingReportId.split('_').slice(-1)[0]})
                          </p>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Verification Actions (for pending reports) */}
            {status === 'pending' && selectedReportForReview === report.id && (
              <div className="p-4 bg-blue-900/20 border border-blue-600 rounded-lg space-y-3">
                <textarea
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  placeholder={t('report.verificationCommentsPlaceholder')}
                  style={{
                    backgroundColor: currentTheme.colors.bgTertiary,
                    color: currentTheme.colors.textPrimary,
                    borderColor: currentTheme.colors.borderColor
                  }}
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                />

                <div className="flex gap-2">
                  <button
                    onClick={() => handleApproveReport(report)}
                    className="flex-1 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckIcon className="h-4 w-4" />
                    {t('report.approveButton')}
                  </button>
                  <button
                    onClick={() => handleRejectReport(report)}
                    className="flex-1 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <XIcon className="h-4 w-4" />
                    {t('report.rejectButton')}
                  </button>
                  <button
                    onClick={() => setSelectedReportForReview(null)}
                    style={{ backgroundColor: currentTheme.colors.bgTertiary }}
                    className="flex-1 py-2 rounded-lg font-semibold hover:opacity-80 transition-opacity"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </div>
            )}

            {status === 'pending' && selectedReportForReview !== report.id && (
              <button
                onClick={() => setSelectedReportForReview(report.id)}
                style={{ backgroundColor: currentTheme.colors.buttonPrimary }}
                className="w-full py-2 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
              >
                {t('report.reviewButton')}
              </button>
            )}

            {/* Show verification details for approved/rejected reports */}
            {(status === 'approved' || status === 'rejected') && getVerificationRecord(report.id) && (
              <div style={{ backgroundColor: currentTheme.colors.bgTertiary }} className="p-3 rounded-lg border border-gray-700">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-xs font-semibold" style={{ color: currentTheme.colors.textSecondary }}>
                    {t('report.verifiedBy')}: {getVerificationRecord(report.id)?.verifierEmail}
                  </p>
                  <p className="text-xs" style={{ color: currentTheme.colors.textSecondary }}>
                    {new Date(getVerificationRecord(report.id)?.verifiedAt || '').toLocaleDateString()}
                  </p>
                </div>
                {getVerificationRecord(report.id)?.comments && (
                  <div>
                    <p className="text-xs font-semibold" style={{ color: currentTheme.colors.textSecondary }}>
                      {t('report.comments')}:
                    </p>
                    <p style={{ color: currentTheme.colors.textSecondary }}>
                      {getVerificationRecord(report.id)?.comments}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Accounting Information for reports sent to accounting */}
            {accountingRecord && (
              <div style={{ backgroundColor: currentTheme.colors.bgTertiary }} className="p-3 rounded-lg border border-blue-700">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-sm font-semibold text-blue-300">
                    {t('report.accountingStatus') || 'Accounting Status'}
                  </p>
                  <span className={`text-xs px-2 py-1 rounded ${
                    accountingStatus === 'received' ? 'bg-blue-900/50 text-blue-300' :
                    accountingStatus === 'processed' ? 'bg-blue-900/50 text-blue-300' :
                    'bg-cyan-900/50 text-cyan-300'
                  }`}>
                    {accountingStatus === 'received' && 'Received'}
                    {accountingStatus === 'processed' && 'Processed'}
                    {accountingStatus === 'sent_to_bank' && 'Sent to Bank'}
                  </span>
                </div>
                <p className="text-xs" style={{ color: currentTheme.colors.textSecondary }}>
                  {t('report.submittedToAccounting') || 'Submitted to accounting on'}: {new Date(accountingRecord.createdAt).toLocaleDateString()}
                </p>
                {accountingRecord.dateSentToBank && (
                  <p className="text-xs mt-1" style={{ color: currentTheme.colors.textSecondary }}>
                    {t('report.sentToBankOn') || 'Sent to bank on'}: {new Date(accountingRecord.dateSentToBank).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}

            {/* Send to Accounting Button for approved reports (only if not already sent) */}
            {status === 'approved' && !accountingRecord && (
              <button
                onClick={() => handleSendToAccounting(report)}
                className="w-full py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <CheckIcon className="h-4 w-4" />
                {t('report.sendToAccounting') || 'Send to Accounting'}
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <main className="flex-1 overflow-auto p-6" style={{ backgroundColor: currentTheme.colors.bgSecondary }}>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8" style={{ color: currentTheme.colors.textPrimary }}>
          {t('report.verifierDashboardTitle')}
        </h1>

        {/* Three-Column Filter Section */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
          {/* Column 1: Status Filter */}
          <div>
            <label className="text-xs font-semibold block mb-2 uppercase tracking-wide" style={{ color: currentTheme.colors.textSecondary }}>
              {t('report.status') || 'Status'}
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
              <option value="pending">{t('report.pending')}</option>
              <option value="approved">{t('report.verified')}</option>
              <option value="rejected">{t('report.rejected')}</option>
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
                const monthsInYear = submittedReports
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

        {/* Reports List */}
        {filteredReports.length === 0 ? (
          <div
            style={{ backgroundColor: currentTheme.colors.bgTertiary }}
            className="p-8 rounded-lg text-center border border-gray-700"
          >
            <p style={{ color: currentTheme.colors.textSecondary }}>
              {t('report.noPendingReports')}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReports.map(report => {
              const reportStatus = getVerificationRecord(report.id)?.status || 'pending';
              return <ReportListItem key={report.id} report={report} status={reportStatus as 'pending' | 'approved' | 'rejected'} />;
            })}
          </div>
        )}
      </div>

      {/* Accounting Submission Modal */}
      {selectedReportForAccounting && (
        <AccountingSubmissionModal
          isOpen={isAccountingModalOpen}
          reportUserName={selectedReportForAccounting.userName}
          month={selectedReportForAccounting.month}
          year={selectedReportForAccounting.year}
          studyCount={selectedReportForAccounting.entries.length}
          totalAmount={selectedReportForAccounting.totalAmount || selectedReportForAccounting.entries.reduce((sum, e) => sum + (e?.kwota || 0), 0)}
          onConfirm={handleConfirmAccountingSubmission}
          onCancel={handleCancelAccountingSubmission}
        />
      )}
    </main>
  );
};

export default VerifierDashboard;
