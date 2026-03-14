import React, { useState, useMemo } from 'react';
import { useTranslations } from '../context/LanguageContext';
import { usePINAuth } from '../context/PINAuthContext';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { useReport } from '../context/ReportContext';
import { useStudy } from '../context/StudyContext';
import { ArrowLeftIcon, CheckIcon } from '../components/Icons';
import PersonalInfoForm from '../components/studyManager/report/PersonalInfoForm';
import Specification from '../components/studyManager/report/Specification';
import Invoice from '../components/studyManager/report/Invoice';
import Summary from '../components/studyManager/report/Summary';
import SubmissionProgressModal from '../components/SubmissionProgressModal';
import ViewContainer from '../components/ViewContainer';
import type { Report, RadiologyCode } from '../types';
import { convertEntriesToReportData } from '../utils/reportTransformations';

interface ReportSubmissionPageInternalProps {
  renderPersonalInfo: () => React.ReactNode;
  renderReportHistory: () => React.ReactNode;
}

interface ReportData {
  studies: any[];
  totalPoints: number;
  totalAmount: number;
  groupedByCode: {
    code: RadiologyCode;
    count: number;
    totalPoints: number;
  }[];
}

type ReportView = 'specification' | 'invoice' | 'summary';

const ReportSubmissionPage: React.FC = () => {
  const { t } = useTranslations();
  const { currentUser } = usePINAuth();
  const { setView, setConfirmationState, closeConfirmation } = useApp();
  const { currentTheme } = useTheme();
  const { submitReport, getReportsByUser, getVerificationRecord, getAccountingRecord, getDuplicateStudyNumbers } = useReport();
  const studyContext = useStudy();
  
  if (!studyContext) {
    return <div style={{ color: currentTheme.colors.textPrimary }}>Loading...</div>;
  }

  const { studies: contextStudies = [], personalInfo = {}, radiologyCodes: codes = [], setPersonalInfo } = studyContext;

  // Ensure we have valid state for studies
  const validStudies = Array.isArray(contextStudies) ? contextStudies : [];
  const validCodes = Array.isArray(codes) ? codes : [];

  const prevMonth = new Date();
  prevMonth.setMonth(prevMonth.getMonth() - 1);
  const [selectedYear, setSelectedYear] = useState(prevMonth.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(prevMonth.getMonth());
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [activeView, setActiveView] = useState<ReportView>('specification');
  const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);
  const [selectedSubmittedReport, setSelectedSubmittedReport] = useState<Report | null>(null);

  // Get user's submitted reports
  const userReports = currentUser ? (getReportsByUser(currentUser.id) || []) : [];

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: monthNames[i]
  }));

  const yearOptions = Array.from({ length: 3 }, (_, i) => ({
    value: new Date().getFullYear() - i,
    label: String(new Date().getFullYear() - i)
  }));

  // Filter studies by selected month/year
  const filteredStudies = useMemo(() => {
    return validStudies.filter(s => {
      const studyDate = new Date(s.date);
      return studyDate.getFullYear() === selectedYear && studyDate.getMonth() === selectedMonth;
    });
  }, [validStudies, selectedYear, selectedMonth]);

  const handleGenerate = () => {
    // Allow generation even with 0 studies
    const totalPoints = filteredStudies.reduce((sum, s) => sum + (s.points || 0), 0);
    const totalAmount = totalPoints; // Amount in PLN
    
    const grouped = filteredStudies.reduce((acc, study) => {
      if (!acc[study.code]) {
        acc[study.code] = { count: 0, totalPoints: 0 };
      }
      acc[study.code].count++;
      acc[study.code].totalPoints += study.points || 0;
      return acc;
    }, {} as Record<string, { count: number; totalPoints: number }>);
    
    const groupedByCode = Object.entries(grouped).map(([code, data]) => ({
      code: validCodes.find(c => c.code === code)!,
      count: (data as { count: number; totalPoints: number }).count,
      totalPoints: (data as { count: number; totalPoints: number }).totalPoints
    })).sort((a, b) => b.count - a.count);

    setReportData({
      studies: filteredStudies,
      totalPoints,
      totalAmount,
      groupedByCode,
    });

    // Switch to specification view
    setActiveView('specification');
  };

  const handleSubmit = () => {
    // Check for duplicate study numbers before submission
    if (currentUser && reportData && reportData.studies.length > 0) {
      const entries = reportData.studies.map(study => ({
        kodNFZ: study.code || '',
        numerBadania: study.patientId || '',
        opis: study.desc || '',
        dataWykonania: study.date || '',
        kwota: (study.points || 0),
      }));

      const duplicateNumbers = getDuplicateStudyNumbers(entries, currentUser.id);

      if (duplicateNumbers.length > 0) {
        setConfirmationState({
          isOpen: true,
          title: t('report.duplicateWarningTitle') || 'Duplicate Study Numbers',
          message: `${t('report.duplicateWarning') || 'WARNING: The following study numbers already exist in the system'}:\n\n${duplicateNumbers.join(', ')}\n\n${t('report.duplicateProceed') || 'This may indicate duplicate submission or potential fraud. Do you want to proceed?'}`,
          onConfirm: () => {
            setIsSubmissionModalOpen(true);
            closeConfirmation();
          }
        });
        return;
      }
    }

    setIsSubmissionModalOpen(true);
  };

  const handleConfirmSubmission = async () => {
    if (!currentUser || !reportData) {
      alert('Missing data');
      setIsSubmissionModalOpen(false);
      return;
    }

    if (!personalInfo?.fullName) {
      alert(t('report.errorPersonalInfo') || 'Please complete your personal information first');
      setIsSubmissionModalOpen(false);
      return;
    }

    try {
      // Create report in the new Report format for verification workflow
      const report: Report = {
        id: `report_${currentUser.id}_${selectedYear}_${selectedMonth + 1}_${Date.now()}`,
        userId: currentUser.id,
        userName: personalInfo.fullName || currentUser.name || '',
        userEmail: currentUser.email || '',
        year: selectedYear,
        month: selectedMonth + 1,
        entries: reportData.studies.map(study => ({
          kodNFZ: study.code || '',
          numerBadania: study.patientId || '',
          opis: study.desc || '',
          dataWykonania: study.date || '',
          kwota: (study.points || 0),
        })),
        personalInfo: personalInfo,
        reportDate: new Date(selectedYear, selectedMonth).toISOString(),
        totalAmount: reportData.totalAmount,
        status: 'submitted',
        createdAt: new Date().toISOString(),
        submittedAt: new Date().toISOString(),
        isPartialMonth: false,
      };

      submitReport(report);
      // Don't clear reportData here - wait for modal to close
    } catch (error) {
      console.error('Error submitting report:', error);
      alert(t('report.submissionError') || 'Error submitting report');
      setIsSubmissionModalOpen(false);
    }
  };

  const handleCancelSubmission = () => {
    setIsSubmissionModalOpen(false);
    // Only clear reportData if submission was successful
    // Check if the report was added to the list
    if (reportData && currentUser) {
      const latestReports = getReportsByUser(currentUser.id) || [];
      const wasSubmitted = latestReports.some(r =>
        r.year === selectedYear && r.month === selectedMonth + 1
      );
      if (wasSubmitted) {
        setReportData(null);
      }
    }
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

  const handleClearSelection = () => {
    setSelectedSubmittedReport(null);
    setReportData(null);
  };

  const rightPanelContent = (
    <div className="flex flex-col gap-6 h-full overflow-auto">
      {/* Personal Info Form */}
      <PersonalInfoForm 
        personalInfo={personalInfo}
        onSave={setPersonalInfo}
      />

      {/* Submitted Reports List */}
      <div className="rounded-lg overflow-hidden flex flex-col" style={{ backgroundColor: currentTheme.colors.bgSecondary, borderColor: currentTheme.colors.borderColor, borderWidth: '1px' }}>
        <div className="p-4 border-b" style={{ borderBottomColor: currentTheme.colors.borderColor, borderBottomWidth: '1px' }}>
          <h2 className="text-lg font-bold" style={{ color: currentTheme.colors.textPrimary }}>
            {t('report.history')} ({userReports.length})
          </h2>
        </div>
        
        <div className="p-4 overflow-y-auto flex-1">
          {userReports.length === 0 ? (
            <p style={{ color: currentTheme.colors.textSecondary }} className="text-sm text-center py-4">
              {t('report.noSubmittedReports')}
            </p>
          ) : (
            <div className="space-y-2">
              {userReports.map(report => {
                const verification = getVerificationRecord(report.id);
                const accountingRecord = getAccountingRecord(report.id);
                const isSelected = selectedSubmittedReport?.id === report.id;
                const statusColor =
                  verification?.status === 'approved' ? 'text-green-400' :
                  verification?.status === 'rejected' ? 'text-red-400' :
                  'text-yellow-400';

                return (
                  <button
                    key={report.id}
                    onClick={() => setSelectedSubmittedReport(report)}
                    style={{
                      backgroundColor: isSelected ? currentTheme.colors.bgTertiary : 'transparent',
                      borderColor: isSelected ? currentTheme.colors.borderColor : 'transparent',
                      borderWidth: '1px'
                    }}
                    className="w-full text-left p-3 rounded hover:opacity-80 transition-opacity"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold" style={{ color: currentTheme.colors.textPrimary }}>
                        {report.month}/{report.year}
                      </span>
                      <div className="flex flex-col gap-1 items-end">
                        <span className={`text-xs font-semibold ${statusColor}`}>
                          {verification?.status === 'approved' && '✓ ' + t('report.verified')}
                          {verification?.status === 'rejected' && '✗ ' + t('report.rejected')}
                          {!verification && '⏳ ' + t('report.pending')}
                        </span>
                        {accountingRecord && (
                          <span className={`text-xs font-semibold ${
                            accountingRecord.status === 'received' ? 'text-blue-400' :
                            accountingRecord.status === 'processed' ? 'text-blue-400' :
                            'text-cyan-400'
                          }`}>
                            {accountingRecord.status === 'received' && '📥 Received'}
                            {accountingRecord.status === 'processed' && '⚙️ Processed'}
                            {accountingRecord.status === 'sent_to_bank' && '🏦 Sent to Bank'}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs mt-1" style={{ color: currentTheme.colors.textSecondary }}>
                      {report.entries.length} {t('report.entries')} • {report.entries.reduce((sum, e) => sum + e.kwota, 0).toFixed(2)} PLN
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {selectedSubmittedReport && (
          <div className="p-4 border-t" style={{ borderTopColor: currentTheme.colors.borderColor, borderTopWidth: '1px' }}>
            <button
              onClick={handleClearSelection}
              style={{ 
                backgroundColor: currentTheme.colors.bgTertiary, 
                borderColor: currentTheme.colors.borderColor,
                color: currentTheme.colors.textPrimary
              }}
              className="w-full py-2 border rounded-lg font-semibold hover:opacity-90 transition-opacity text-sm"
            >
              {t('common.cancel')}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <ViewContainer
      rightPanel={rightPanelContent}
      leftLabel="reports-main"
      rightLabel="reports-right"
    >
      <div className="p-4 h-full overflow-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => {
              if (selectedSubmittedReport) {
                handleClearSelection();
              } else {
                setView('main');
              }
            }}
            className="p-2 rounded-lg hover:opacity-70"
            style={{ color: currentTheme.colors.textSecondary }}
          >
            <ArrowLeftIcon className="h-6 w-6" />
          </button>
          <h1 className="text-3xl font-bold" style={{ color: currentTheme.colors.textPrimary }}>
            {selectedSubmittedReport ? `${selectedSubmittedReport.month}/${selectedSubmittedReport.year}` : t('report.title')}
          </h1>
        </div>

        {/* View: Submitted Report */}
        {selectedSubmittedReport && (() => {
          // Transform report entries to study format (computed once, reused for all views)
          const { studies, groupedByCode } = convertEntriesToReportData(
            selectedSubmittedReport.entries,
            codes
          );

          const transformedReportData = {
            studies,
            totalPoints: selectedSubmittedReport.totalAmount,
            totalAmount: selectedSubmittedReport.totalAmount,
            groupedByCode
          };

          return (
          <div>
            {/* View Tabs */}
            <div className="flex gap-2 mb-6 border-b border-gray-700">
              <button
                onClick={() => setActiveView('specification')}
                className={`px-4 py-3 font-semibold border-b-2 transition-colors ${
                  activeView === 'specification'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-400'
                }`}
              >
                {t('studyManager.reports.specification')}
              </button>
              <button
                onClick={() => setActiveView('invoice')}
                className={`px-4 py-3 font-semibold border-b-2 transition-colors ${
                  activeView === 'invoice'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-400'
                }`}
              >
                {t('studyManager.reports.invoice')}
              </button>
              <button
                onClick={() => setActiveView('summary')}
                className={`px-4 py-3 font-semibold border-b-2 transition-colors ${
                  activeView === 'summary'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-400'
                }`}
              >
                {t('studyManager.reports.summary')}
              </button>
            </div>

            {/* Report Content */}
            <div
              style={{ backgroundColor: currentTheme.colors.bgTertiary }}
              className="border border-gray-700 rounded-lg mb-6"
            >
              <div className="printable-area p-6 bg-white text-black">
                {activeView === 'specification' && (
                  <Specification
                    reportData={transformedReportData}
                    personalInfo={selectedSubmittedReport.personalInfo}
                    date={{ year: selectedSubmittedReport.year, month: selectedSubmittedReport.month - 1 }}
                  />
                )}
                {activeView === 'invoice' && (
                  <Invoice
                    reportData={transformedReportData}
                    personalInfo={selectedSubmittedReport.personalInfo}
                    date={{ year: selectedSubmittedReport.year, month: selectedSubmittedReport.month - 1 }}
                  />
                )}
                {activeView === 'summary' && (
                  <Summary
                    reportData={transformedReportData}
                    personalInfo={selectedSubmittedReport.personalInfo}
                    date={{ year: selectedSubmittedReport.year, month: selectedSubmittedReport.month - 1 }}
                  />
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handlePrint}
                style={{ 
                  backgroundColor: currentTheme.colors.bgTertiary, 
                  borderColor: currentTheme.colors.borderColor,
                  color: currentTheme.colors.textPrimary
                }}
                className="flex-1 py-3 border rounded-lg font-semibold hover:opacity-90 transition-opacity"
              >
                🖨️ {t('common.print')}
              </button>
              <button
                onClick={handleClearSelection}
                style={{ 
                  backgroundColor: currentTheme.colors.bgTertiary, 
                  borderColor: currentTheme.colors.borderColor,
                  color: currentTheme.colors.textPrimary
                }}
                className="flex-1 py-3 border rounded-lg font-semibold hover:opacity-90 transition-opacity"
              >
                {t('common.back')}
              </button>
            </div>
          </div>
          );
        })()}

        {/* View: New Report Generation */}
        {!selectedSubmittedReport && (
          <div>
            {!reportData && (
              <div
                style={{ backgroundColor: currentTheme.colors.bgSecondary, borderColor: currentTheme.colors.borderColor, borderWidth: '1px' }}
                className="rounded-lg p-4 mb-6"
              >
                <h2 className="text-xl font-bold mb-4" style={{ color: currentTheme.colors.textPrimary }}>
                  {t('report.selectPeriod')}
                </h2>
                
                {/* Three-column filter layout */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
                  {/* Column 1: Year */}
                  <div>
                    <label className="text-xs font-semibold block mb-2 uppercase tracking-wide" style={{ color: currentTheme.colors.textSecondary }}>
                      {t('common.year')}
                    </label>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      style={{
                        backgroundColor: currentTheme.colors.bgTertiary,
                        color: currentTheme.colors.textPrimary,
                        borderColor: currentTheme.colors.borderColor
                      }}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      {yearOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Column 2-3: Month tabs */}
                  <div className="lg:col-span-2">
                    <label className="text-xs font-semibold block mb-2 uppercase tracking-wide" style={{ color: currentTheme.colors.textSecondary }}>
                      {t('common.month')}
                    </label>
                    <div className="flex gap-1 flex-nowrap overflow-x-auto pb-1">
                      {monthOptions.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setSelectedMonth(opt.value)}
                          className={`px-2 py-2 rounded-lg font-semibold transition-colors text-xs whitespace-nowrap flex-shrink-0 ${
                            selectedMonth === opt.value
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                          }`}
                        >
                          {opt.label.slice(0, 3)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Column 4: Generate button */}
                  <div className="flex items-end">
                    <button
                      onClick={handleGenerate}
                      style={{ backgroundColor: currentTheme.colors.buttonPrimary }}
                      className="w-full py-2 rounded-lg font-semibold text-white flex items-center justify-center gap-2 hover:opacity-90 transition-opacity text-sm"
                    >
                      <CheckIcon className="h-4 w-4" />
                      {t('studyManager.reports.generate')}
                    </button>
                  </div>
                </div>

                {filteredStudies.length === 0 && (
                  <p className="text-sm mt-2" style={{ color: currentTheme.colors.textSecondary }}>
                    {t('report.noEntriesForPeriod')}
                  </p>
                )}
              </div>
            )}

            {/* Report Views */}
            {reportData && (
              <div>
                {/* View Tabs */}
                <div className="flex gap-2 mb-6 border-b border-gray-700">
                  <button
                    onClick={() => setActiveView('specification')}
                    className={`px-4 py-3 font-semibold border-b-2 transition-colors ${
                      activeView === 'specification'
                        ? 'border-blue-500 text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-400'
                    }`}
                  >
                    {t('studyManager.reports.specification')}
                  </button>
                  <button
                    onClick={() => setActiveView('invoice')}
                    className={`px-4 py-3 font-semibold border-b-2 transition-colors ${
                      activeView === 'invoice'
                        ? 'border-blue-500 text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-400'
                    }`}
                  >
                    {t('studyManager.reports.invoice')}
                  </button>
                  <button
                    onClick={() => setActiveView('summary')}
                    className={`px-4 py-3 font-semibold border-b-2 transition-colors ${
                      activeView === 'summary'
                        ? 'border-blue-500 text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-400'
                    }`}
                  >
                    {t('studyManager.reports.summary')}
                  </button>
                </div>

                {/* Report Content */}
                <div
                  style={{ backgroundColor: currentTheme.colors.bgTertiary }}
                  className="border border-gray-700 rounded-lg mb-6"
                >
                  <div className="printable-area p-6 bg-white text-black">
                    {activeView === 'specification' && (
                      <Specification
                        reportData={reportData}
                        personalInfo={personalInfo}
                        reportDate={new Date(selectedYear, selectedMonth)}
                      />
                    )}
                    {activeView === 'invoice' && (
                      <Invoice
                        reportData={reportData}
                        personalInfo={personalInfo}
                        reportDate={new Date(selectedYear, selectedMonth)}
                      />
                    )}
                    {activeView === 'summary' && (
                      <Summary
                        reportData={reportData}
                        reportDate={new Date(selectedYear, selectedMonth)}
                      />
                    )}
                  </div>
                </div>
                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handlePrint}
                    style={{ 
                      backgroundColor: currentTheme.colors.bgTertiary, 
                      borderColor: currentTheme.colors.borderColor,
                      color: currentTheme.colors.textPrimary
                    }}
                    className="flex-1 py-3 border rounded-lg font-semibold hover:opacity-90 transition-opacity"
                  >
                    🖨️ {t('common.print')}
                  </button>
                  <button
                    onClick={handleSubmit}
                    style={{ backgroundColor: currentTheme.colors.buttonPrimary }}
                    className="flex-1 py-3 rounded-lg font-semibold text-white flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                  >
                    <CheckIcon className="h-5 w-5" />
                    {t('report.submitButton')}
                  </button>
                  <button
                    onClick={() => setReportData(null)}
                    style={{ 
                      backgroundColor: currentTheme.colors.bgTertiary, 
                      borderColor: currentTheme.colors.borderColor,
                      color: currentTheme.colors.textPrimary
                    }}
                    className="flex-1 py-3 border rounded-lg font-semibold hover:opacity-90 transition-opacity"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Submission Progress Modal */}
      {reportData && (
        <SubmissionProgressModal
          isOpen={isSubmissionModalOpen}
          month={`${monthNames[selectedMonth]} ${selectedYear}`}
          studyCount={reportData.studies.length}
          totalAmount={reportData.totalAmount}
          onConfirm={handleConfirmSubmission}
          onCancel={handleCancelSubmission}
        />
      )}
    </ViewContainer>
  );
};

export default ReportSubmissionPage;


