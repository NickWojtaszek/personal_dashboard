/**
 * Test Data Loader - Load mock data into localStorage for testing
 * Usage: Call loadTestData() in browser console or integrate into dev menu
 */

import { mockStudiesUser1, mockStudiesUser2, mockReportUser1, mockReportUser2WithDuplicate, mockVerificationApproved, mockVerificationRejected, mockDataSummary } from '../data/mockTestData';
import { grudzienStudies } from '../data/grudzienStudies';

export const loadTestData = () => {
  try {
    // For User 1 (admin@speaksync.com) - Store December 2025 data with studies array
    const user1StudyData = {
      studies: grudzienStudies,
      personalInfo: {
        fullName: 'Mikołaj Wojtaszek',
        department: 'II ZRK',
        specialization: 'Radiologia',
        licenseNumber: 'LIC-001'
      },
      radiologyCodes: [],
      generatedReports: [],
      plannedDays: {}
    };
    localStorage.setItem('speaksync_studies_admin@speaksync.com', JSON.stringify(user1StudyData));
    
    // For User 2 (verifier@speaksync.com) - Store as StudyData object with studies array
    const user2StudyData = {
      studies: mockStudiesUser2,
      personalInfo: {
        fullName: 'Dr. Verifier User',
        specialization: 'Radiology',
        licenseNumber: 'LIC-002'
      },
      radiologyCodes: [],
      generatedReports: [],
      plannedDays: {}
    };
    localStorage.setItem('speaksync_studies_verifier@speaksync.com', JSON.stringify(user2StudyData));

    // Reports (shared across app) - Load mock reports
    localStorage.setItem('speaksync_reports', JSON.stringify([mockReportUser1, mockReportUser2WithDuplicate]));

    // Verifications (shared across app) - Load mock verifications
    localStorage.setItem('speaksync_verifications', JSON.stringify([mockVerificationApproved, mockVerificationRejected]));

    // Accounting Records (shared across app) - Initialize with approved report record
    const mockAccountingRecords = [
      {
        id: 'accounting_report_admin_2024_12_1704067200000',
        reportId: 'report_admin_2024_12_1704067200000',
        status: 'received',
        statusHistory: [
          {
            status: 'received',
            changedBy: 'accounting@speaksync.com',
            changedAt: '2024-12-23T10:30:00Z'
          }
        ],
        internalNotes: [],
        createdAt: '2024-12-23T10:30:00Z'
      }
    ];
    localStorage.setItem('speaksync_accounting', JSON.stringify(mockAccountingRecords));

    console.log('✅ Test data loaded successfully!');
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║          MOCK TEST DATA SUMMARY                                ║');
    console.log('╠════════════════════════════════════════════════════════════════╣');
    console.log('║                                                                ║');
    console.log('║ VERIFICATION & ACCOUNTING                                      ║');
    console.log('║ ├─ 1 Approved Report (admin report from Dec 2024)             ║');
    console.log('║ ├─ 1 Rejected Report (verifier report - duplicate)            ║');
    console.log('║ ├─ 1 Accounting Record (status: received)                     ║');
    console.log('║ └─ Ready for accounting role testing                          ║');
    console.log('║                                                                ║');
    console.log('║ USER 1: Admin (admin@speaksync.com)                           ║');
    console.log('║ ├─ 106 studies from December 2025 (Grudzień)                   ║');
    console.log('║ ├─ Name: Mikołaj Wojtaszek                                    ║');
    console.log('║ ├─ Department: II ZRK                                         ║');
    console.log('║ └─ Total points: 11,310 PLN                                   ║');
    console.log('║                                                                ║');
    console.log('║ USER 2: Verifier (verifier@speaksync.com)                     ║');
    console.log('║ ├─ 7 studies in December 2024 (test data)                      ║');
    console.log('║ └─ Total points: 8,850 PLN                                    ║');
    console.log('║                                                                ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log('\n📝 Next steps:');
    console.log('1. Log in with: admin@speaksync.com (click "Admin" test button)');
    console.log('2. Go to "reports" tab → "Generate" tab');
    console.log('3. Select December 2025 and click "Generate Report"');
    console.log('4. View Specification, Invoice, and Summary tabs');
    console.log('5. Click Print or Submit to test the workflow');

    return true;
  } catch (error) {
    console.error('❌ Error loading test data:', error);
    return false;
  }
};

export const clearTestData = () => {
  try {
    localStorage.removeItem('speaksync_studies_admin@speaksync.com');
    localStorage.removeItem('speaksync_studies_verifier@speaksync.com');
    
    // Clear only our mock reports/verifications, keep others if any
    const reports = JSON.parse(localStorage.getItem('speaksync_reports') || '[]');
    const verifications = JSON.parse(localStorage.getItem('speaksync_verifications') || '[]');
    const accounting = JSON.parse(localStorage.getItem('speaksync_accounting') || '[]');
    
    const filteredReports = reports.filter(
      (r: any) => !['report_admin_2024_12_1704067200000', 'report_verifier_2024_12_1704153600000'].includes(r.id)
    );
    const filteredVerifications = verifications.filter(
      (v: any) => !['verification_report_admin_2024_12_1704067200000_1704240000000', 'verification_report_verifier_2024_12_1704153600000_1704326400000'].includes(v.id)
    );
    const filteredAccounting = accounting.filter(
      (a: any) => a.id !== 'accounting_report_admin_2024_12_1704067200000'
    );

    localStorage.setItem('speaksync_reports', JSON.stringify(filteredReports));
    localStorage.setItem('speaksync_verifications', JSON.stringify(filteredVerifications));
    localStorage.setItem('speaksync_accounting', JSON.stringify(filteredAccounting));

    console.log('✅ Test data cleared');
    return true;
  } catch (error) {
    console.error('❌ Error clearing test data:', error);
    return false;
  }
};

// Make available globally for console access
if (typeof window !== 'undefined') {
  (window as any).speaksyncTestUtils = {
    loadTestData,
    clearTestData,
    mockDataSummary
  };
}
