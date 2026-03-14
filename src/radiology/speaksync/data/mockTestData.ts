import type { Report, VerificationRecord, Study } from '../types';

// Mock studies for User 1 (admin@speaksync.com)
export const mockStudiesUser1: Study[] = [
  {
    id: 1,
    code: 'CT-2024-001',
    patientId: 'P001',
    points: 100,
    desc: 'CT Head - Trauma evaluation',
    date: '2024-12-05T10:30:00Z'
  },
  {
    id: 2,
    code: 'CT-2024-002',
    patientId: 'P002',
    points: 120,
    desc: 'CT Chest - Pneumonia follow-up',
    date: '2024-12-06T14:15:00Z'
  },
  {
    id: 3,
    code: 'MR-2024-010',
    patientId: 'P003',
    points: 150,
    desc: 'MR Brain - Suspected stroke',
    date: '2024-12-08T09:00:00Z'
  },
  {
    id: 4,
    code: 'CT-2024-003',
    patientId: 'P004',
    points: 110,
    desc: 'CT Abdomen - Acute abdomen assessment',
    date: '2024-12-10T16:45:00Z'
  },
  {
    id: 5,
    code: 'US-2024-050',
    patientId: 'P005',
    points: 80,
    desc: 'Ultrasound - Thyroid evaluation',
    date: '2024-12-12T11:20:00Z'
  },
  {
    id: 6,
    code: 'CT-2024-004',
    patientId: 'P006',
    points: 130,
    desc: 'CT Spine - Lower back pain',
    date: '2024-12-15T13:30:00Z'
  },
  {
    id: 7,
    code: 'MR-2024-011',
    patientId: 'P007',
    points: 160,
    desc: 'MR Knee - ACL injury assessment',
    date: '2024-12-17T10:00:00Z'
  },
  {
    id: 8,
    code: 'CT-2024-005',
    patientId: 'P008',
    points: 125,
    desc: 'CT Pelvis - Trauma imaging',
    date: '2024-12-20T15:15:00Z'
  }
];

// Mock studies for User 2 (verifier@speaksync.com)
// Mix of unique and duplicate study numbers for testing
export const mockStudiesUser2: Study[] = [
  {
    id: 101,
    code: 'CT-2024-001', // DUPLICATE with User1
    patientId: 'P101',
    points: 100,
    desc: 'CT Head - Different patient, same number',
    date: '2024-12-05T11:00:00Z'
  },
  {
    id: 102,
    code: 'XR-2024-020',
    patientId: 'P102',
    points: 70,
    desc: 'Chest X-Ray - Routine screening',
    date: '2024-12-07T08:30:00Z'
  },
  {
    id: 103,
    code: 'CT-2024-006',
    patientId: 'P103',
    points: 115,
    desc: 'CT Thorax - Nodule follow-up',
    date: '2024-12-09T12:45:00Z'
  },
  {
    id: 104,
    code: 'MR-2024-012',
    patientId: 'P104',
    points: 155,
    desc: 'MR Shoulder - Rotator cuff tear',
    date: '2024-12-11T14:00:00Z'
  },
  {
    id: 105,
    code: 'US-2024-051',
    patientId: 'P105',
    points: 85,
    desc: 'Ultrasound - Carotid screening',
    date: '2024-12-13T09:15:00Z'
  },
  {
    id: 106,
    code: 'CT-2024-007',
    patientId: 'P106',
    points: 135,
    desc: 'CT Liver - Portal hypertension',
    date: '2024-12-16T10:30:00Z'
  },
  {
    id: 107,
    code: 'MR-2024-013',
    patientId: 'P107',
    points: 165,
    desc: 'MR Prostate - Cancer screening',
    date: '2024-12-18T11:00:00Z'
  }
];

// Mock reports for User 1 - Clean submission (no duplicates)
export const mockReportUser1: Report = {
  id: 'report_admin_2024_12_1704067200000',
  userId: 'admin@speaksync.com',
  userName: 'Dr. Admin User',
  userEmail: 'admin@speaksync.com',
  year: 2024,
  month: 12,
  entries: [
    {
      numerBadania: 'CT-2024-001',
      opis: 'CT Head - Trauma evaluation',
      dataWykonania: '2024-12-05T10:30:00Z',
      kwota: 1000,
      contentHash: 'aGVhZC10cmF'
    },
    {
      numerBadania: 'CT-2024-002',
      opis: 'CT Chest - Pneumonia follow-up',
      dataWykonania: '2024-12-06T14:15:00Z',
      kwota: 1200,
      contentHash: 'Y2hlc3QtcGxv'
    },
    {
      numerBadania: 'MR-2024-010',
      opis: 'MR Brain - Suspected stroke',
      dataWykonania: '2024-12-08T09:00:00Z',
      kwota: 1500,
      contentHash: 'YnJhaW4tc3Ro'
    },
    {
      numerBadania: 'CT-2024-003',
      opis: 'CT Abdomen - Acute abdomen assessment',
      dataWykonania: '2024-12-10T16:45:00Z',
      kwota: 1100,
      contentHash: 'YWJkb21lbi1h'
    },
    {
      numerBadania: 'US-2024-050',
      opis: 'Ultrasound - Thyroid evaluation',
      dataWykonania: '2024-12-12T11:20:00Z',
      kwota: 800,
      contentHash: 'dGh5cm9pZC1l'
    },
    {
      numerBadania: 'CT-2024-004',
      opis: 'CT Spine - Lower back pain',
      dataWykonania: '2024-12-15T13:30:00Z',
      kwota: 1300,
      contentHash: 'c3BpbmUtbG93'
    },
    {
      numerBadania: 'MR-2024-011',
      opis: 'MR Knee - ACL injury assessment',
      dataWykonania: '2024-12-17T10:00:00Z',
      kwota: 1600,
      contentHash: 'a25lZS1hY2w='
    },
    {
      numerBadania: 'CT-2024-005',
      opis: 'CT Pelvis - Trauma imaging',
      dataWykonania: '2024-12-20T15:15:00Z',
      kwota: 1250,
      contentHash: 'cGVsdmlzLXRy'
    }
  ],
  status: 'submitted',
  createdAt: '2024-12-01T08:00:00Z',
  submittedAt: '2024-12-21T09:00:00Z',
  isPartialMonth: false
};

// Mock reports for User 2 - Has duplicate study number CT-2024-001
export const mockReportUser2WithDuplicate: Report = {
  id: 'report_verifier_2024_12_1704153600000',
  userId: 'verifier@speaksync.com',
  userName: 'Dr. Verifier User',
  userEmail: 'verifier@speaksync.com',
  year: 2024,
  month: 12,
  entries: [
    {
      numerBadania: 'CT-2024-001', // DUPLICATE!
      opis: 'CT Head - Different patient, same number',
      dataWykonania: '2024-12-05T11:00:00Z',
      kwota: 1000,
      contentHash: 'ZGlmZmVyZW50'
    },
    {
      numerBadania: 'XR-2024-020',
      opis: 'Chest X-Ray - Routine screening',
      dataWykonania: '2024-12-07T08:30:00Z',
      kwota: 700,
      contentHash: 'Y2hlc3QteHJh'
    },
    {
      numerBadania: 'CT-2024-006',
      opis: 'CT Thorax - Nodule follow-up',
      dataWykonania: '2024-12-09T12:45:00Z',
      kwota: 1150,
      contentHash: 'dGhvcmF4LW5v'
    },
    {
      numerBadania: 'MR-2024-012',
      opis: 'MR Shoulder - Rotator cuff tear',
      dataWykonania: '2024-12-11T14:00:00Z',
      kwota: 1550,
      contentHash: 'c2hvdWxkZXIt'
    },
    {
      numerBadania: 'US-2024-051',
      opis: 'Ultrasound - Carotid screening',
      dataWykonania: '2024-12-13T09:15:00Z',
      kwota: 850,
      contentHash: 'Y2Fyb3RpZC1z'
    },
    {
      numerBadania: 'CT-2024-007',
      opis: 'CT Liver - Portal hypertension',
      dataWykonania: '2024-12-16T10:30:00Z',
      kwota: 1350,
      contentHash: 'bGl2ZXItcG9y'
    },
    {
      numerBadania: 'MR-2024-013',
      opis: 'MR Prostate - Cancer screening',
      dataWykonania: '2024-12-18T11:00:00Z',
      kwota: 1650,
      contentHash: 'cHJvc3RhdGUt'
    }
  ],
  status: 'submitted',
  createdAt: '2024-12-02T10:00:00Z',
  submittedAt: '2024-12-22T14:30:00Z',
  isPartialMonth: false,
  duplicateStudyNumbers: [
    {
      numerBadania: 'CT-2024-001',
      existingReportId: 'report_admin_2024_12_1704067200000',
      existingUserId: 'admin@speaksync.com',
      existingUserEmail: 'admin@speaksync.com'
    }
  ]
};

// Mock verification record - User 1's report approved
export const mockVerificationApproved: VerificationRecord = {
  id: 'verification_report_admin_2024_12_1704067200000_1704240000000',
  reportId: 'report_admin_2024_12_1704067200000',
  verifierId: 'verifier@speaksync.com',
  verifierEmail: 'verifier@speaksync.com',
  status: 'approved',
  comments: 'All entries verified. Amounts match submitted studies. No issues found.',
  createdAt: '2024-12-23T10:00:00Z',
  verifiedAt: '2024-12-23T10:15:00Z'
};

// Mock verification record - User 2's report rejected due to duplicate
export const mockVerificationRejected: VerificationRecord = {
  id: 'verification_report_verifier_2024_12_1704153600000_1704326400000',
  reportId: 'report_verifier_2024_12_1704153600000',
  verifierId: 'accounting@speaksync.com',
  verifierEmail: 'accounting@speaksync.com',
  status: 'rejected',
  comments: 'Study number CT-2024-001 conflicts with report from admin@speaksync.com submitted on 2024-12-21. Cannot approve duplicate billing. Please correct and resubmit.',
  createdAt: '2024-12-23T11:00:00Z',
  verifiedAt: '2024-12-23T11:30:00Z'
};

// Utility function to initialize mock data
export const initializeMockTestData = () => {
  const mockReports: Report[] = [mockReportUser1, mockReportUser2WithDuplicate];
  const mockVerifications: VerificationRecord[] = [mockVerificationApproved, mockVerificationRejected];

  // Store in localStorage for testing
  localStorage.setItem('speaksync_reports_test', JSON.stringify(mockReports));
  localStorage.setItem('speaksync_verifications_test', JSON.stringify(mockVerifications));

  console.log('✅ Mock test data initialized');
  console.log('Reports:', mockReports);
  console.log('Verifications:', mockVerifications);

  return { mockReports, mockVerifications };
};

// Export summary for console reference
export const mockDataSummary = `
╔════════════════════════════════════════════════════════════════╗
║          MOCK TEST DATA SUMMARY                                ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║ USER 1: Admin (admin@speaksync.com)                           ║
║ ├─ 8 studies in December 2024                                 ║
║ ├─ Report submitted: 2024-12-21                               ║
║ ├─ Total amount: 9,750 PLN                                    ║
║ └─ Status: APPROVED ✅                                         ║
║                                                                ║
║ USER 2: Verifier (verifier@speaksync.com)                     ║
║ ├─ 7 studies in December 2024                                 ║
║ ├─ Report submitted: 2024-12-22                               ║
║ ├─ Total amount: 8,850 PLN                                    ║
║ ├─ DUPLICATE DETECTED: CT-2024-001                            ║
║ └─ Status: REJECTED ❌ (conflicts with User 1)                ║
║                                                                ║
║ KEY TESTING SCENARIOS:                                         ║
║ ✓ User 1 report: Clean approval workflow                       ║
║ ✓ User 2 report: Duplicate detection & conflict reporting      ║
║ ✓ Verifier can see both reports with duplicate flags           ║
║ ✓ User 2 blocked from submitting due to duplicates             ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
`;
