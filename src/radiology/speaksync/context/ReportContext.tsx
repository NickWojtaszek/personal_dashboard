import React, { createContext, useContext, useState } from 'react';
import { useStorage } from '../hooks/useStorage';
import type { Report, VerificationRecord, ReportContextType, ReportEntry, AccountingProcessing, AccountingStatus, InternalNote } from '../types';

const ReportContext = createContext<ReportContextType | undefined>(undefined);

interface ReportData {
  reports: Report[];
  verifications: VerificationRecord[];
  accounting: AccountingProcessing[];
}

const initialReportData: ReportData = {
  reports: [],
  verifications: [],
  accounting: []
};

export const ReportProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [reportData, setReportData, reportsLoading] = useStorage<ReportData>(
    'speaksync_reports',
    initialReportData,
    'reports_data',
    'data'
  );

  // Extract individual arrays for backward compatibility
  const reports = reportData.reports;
  const verificationRecords = reportData.verifications;
  const accountingProcessing = reportData.accounting;

  // Helper to update reports array
  const setReports = (newReports: Report[]) => {
    setReportData(prev => ({ ...prev, reports: newReports }));
  };

  // Helper to update verifications array
  const setVerificationRecords = (newVerifications: VerificationRecord[]) => {
    setReportData(prev => ({ ...prev, verifications: newVerifications }));
  };

  // Helper to update accounting array
  const setAccountingProcessing = (newAccounting: AccountingProcessing[]) => {
    setReportData(prev => ({ ...prev, accounting: newAccounting }));
  };

  // Generate content hash for entries to detect exact duplicates
  const generateContentHash = (numerBadania: string, opis: string, dataWykonania: string, kwota: number): string => {
    const content = `${numerBadania}|${opis}|${dataWykonania}|${kwota}`;
    // Use TextEncoder for proper UTF-8 encoding to handle Polish characters
    const encoder = new TextEncoder();
    const bytes = encoder.encode(content);
    let hash = '';
    for (let i = 0; i < Math.min(16, bytes.length); i++) {
      hash += bytes[i].toString(16).padStart(2, '0');
    }
    return hash || 'default';
  };

  // Add hashes to entries
  const enrichEntries = (entries: ReportEntry[]): ReportEntry[] => {
    return entries.map(entry => ({
      ...entry,
      contentHash: generateContentHash(entry.numerBadania, entry.opis, entry.dataWykonania, entry.kwota)
    }));
  };

  // Check for duplicate study numbers across ALL submitted reports (including same user)
  const getDuplicateStudyNumbers = (entries: ReportEntry[], userId: string): string[] => {
    // Ensure reports is always an array before filtering
    const validReports = Array.isArray(reports) ? reports : [];
    // Check ALL submitted reports to catch all duplicates
    const submittedReports = validReports.filter(r => r && r.status === 'submitted');
    const submittedNumbers = new Set<string>();

    submittedReports.forEach(report => {
      if (report.entries && Array.isArray(report.entries)) {
        report.entries.forEach(entry => {
          submittedNumbers.add(entry.numerBadania);
        });
      }
    });

    return entries
      .map(e => e.numerBadania)
      .filter(num => submittedNumbers.has(num));
  };

  // Find conflicting reports for duplicates - checks ALL submitted reports (including same user)
  const findDuplicateReports = (entries: ReportEntry[], userId: string): Report['duplicateStudyNumbers'] => {
    const duplicates: Report['duplicateStudyNumbers'] = [];
    // Ensure reports is always an array before filtering
    const validReports = Array.isArray(reports) ? reports : [];
    // Check ALL submitted reports (removed userId filter to catch all duplicates)
    const submittedReports = validReports.filter(r => r && r.status === 'submitted');

    entries.forEach(entry => {
      submittedReports.forEach(report => {
        if (report.entries && Array.isArray(report.entries)) {
          const conflictingEntry = report.entries.find(e => e.numerBadania === entry.numerBadania);
          if (conflictingEntry) {
            duplicates.push({
              numerBadania: entry.numerBadania,
              existingReportId: report.id,
              existingUserId: report.userId,
              existingUserEmail: report.userEmail,
            });
          }
        }
      });
    });

    return duplicates.length > 0 ? duplicates : undefined;
  };

  const submitReport = (report: Report) => {
    // Enrich entries with content hashes
    const enrichedReport = {
      ...report,
      entries: enrichEntries(report.entries),
      submittedAt: new Date().toISOString(),
      status: 'submitted' as const,
      duplicateStudyNumbers: findDuplicateReports(report.entries, report.userId)
    };

    // Ensure reports is an array before spreading
    const validReports = Array.isArray(reports) ? reports : [];
    setReports([...validReports, enrichedReport]);
  };

  const updateReportStatus = (reportId: string, status: 'draft' | 'submitted' | 'rejected') => {
    // Ensure reports is an array before mapping
    const validReports = Array.isArray(reports) ? reports : [];
    setReports(validReports.map(r => 
      r && r.id === reportId 
        ? { ...r, status, submittedAt: status === 'submitted' ? new Date().toISOString() : r.submittedAt }
        : r
    ));
  };

  const verifyReport = (reportId: string, verification: VerificationRecord) => {
    // Ensure verificationRecords is an array before spreading
    const validVerifications = Array.isArray(verificationRecords) ? verificationRecords : [];
    setVerificationRecords([...validVerifications, verification]);
    
    // Update report status based on verification
    const validReports = Array.isArray(reports) ? reports : [];
    setReports(validReports.map(r =>
      r && r.id === reportId
        ? r
        : r
    ));
  };

  const getReportsByUser = (userId: string): Report[] => {
    // Ensure reports is always an array before filtering
    const validReports = Array.isArray(reports) ? reports : [];
    return validReports.filter(r => r && r.userId === userId);
  };

  const getSubmittedReports = (): Report[] => {
    // Ensure reports is always an array before filtering
    const validReports = Array.isArray(reports) ? reports : [];
    return validReports.filter(r => r && r.status === 'submitted');
  };

  const getVerificationRecord = (reportId: string): VerificationRecord | undefined => {
    // Ensure verificationRecords is always an array before finding
    const validVerifications = Array.isArray(verificationRecords) ? verificationRecords : [];
    return validVerifications.find(v => v && v.reportId === reportId);
  };

  // Accounting methods
  const getAccountingRecord = (reportId: string): AccountingProcessing | undefined => {
    const validAccounting = Array.isArray(accountingProcessing) ? accountingProcessing : [];
    return validAccounting.find(a => a && a.reportId === reportId);
  };

  const createAccountingRecord = (reportId: string) => {
    const existingRecord = getAccountingRecord(reportId);
    if (existingRecord) return; // Already exists

    const newRecord: AccountingProcessing = {
      id: `accounting_${reportId}_${Date.now()}`,
      reportId,
      status: 'received',
      statusHistory: [{
        status: 'received',
        changedBy: 'system',
        changedAt: new Date().toISOString()
      }],
      internalNotes: [],
      createdAt: new Date().toISOString()
    };

    const validAccounting = Array.isArray(accountingProcessing) ? accountingProcessing : [];
    setAccountingProcessing([...validAccounting, newRecord]);
  };

  const updateAccountingStatus = (reportId: string, newStatus: AccountingStatus, userId: string) => {
    const validAccounting = Array.isArray(accountingProcessing) ? accountingProcessing : [];
    
    setAccountingProcessing(validAccounting.map(a => {
      if (a && a.reportId === reportId) {
        const updatedRecord: AccountingProcessing = {
          ...a,
          status: newStatus,
          statusHistory: [
            ...a.statusHistory,
            {
              status: newStatus,
              changedBy: userId,
              changedAt: new Date().toISOString()
            }
          ],
          ...(newStatus === 'sent_to_bank' && { dateSentToBank: new Date().toISOString() })
        };
        return updatedRecord;
      }
      return a;
    }));
  };

  const addInternalNote = (reportId: string, content: string, userId: string) => {
    const validAccounting = Array.isArray(accountingProcessing) ? accountingProcessing : [];
    
    setAccountingProcessing(validAccounting.map(a => {
      if (a && a.reportId === reportId) {
        const newNote: InternalNote = {
          id: `note_${Date.now()}`,
          author: userId,
          content,
          createdAt: new Date().toISOString()
        };
        return {
          ...a,
          internalNotes: [...a.internalNotes, newNote]
        };
      }
      return a;
    }));
  };

  const deleteInternalNote = (reportId: string, noteId: string) => {
    const validAccounting = Array.isArray(accountingProcessing) ? accountingProcessing : [];
    
    setAccountingProcessing(validAccounting.map(a => {
      if (a && a.reportId === reportId) {
        return {
          ...a,
          internalNotes: a.internalNotes.filter(n => n.id !== noteId)
        };
      }
      return a;
    }));
  };

  const getApprovedReportsForAccounting = (): Report[] => {
    const validReports = Array.isArray(reports) ? reports : [];
    return validReports.filter(r => {
      if (!r || r.status !== 'submitted') return false;
      const verification = getVerificationRecord(r.id);
      return verification && verification.status === 'approved';
    });
  };

  const value: ReportContextType = {
    reports,
    verificationRecords,
    accountingProcessing,
    submitReport,
    updateReportStatus,
    verifyReport,
    getDuplicateStudyNumbers,
    getReportsByUser,
    getSubmittedReports,
    getVerificationRecord,
    getAccountingRecord,
    createAccountingRecord,
    updateAccountingStatus,
    addInternalNote,
    getApprovedReportsForAccounting,
    deleteInternalNote
  };

  return (
    <ReportContext.Provider value={value}>
      {children}
    </ReportContext.Provider>
  );
};

export const useReport = (): ReportContextType => {
  const context = useContext(ReportContext);
  if (!context) {
    throw new Error('useReport must be used within ReportProvider');
  }
  return context;
};
