
import type { Language } from './context/LanguageContext';

export interface StyleExample {
  id: string;
  raw: string;
  final: string;
}

export interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  grammars?: any;
  
  start(): void;
  stop(): void;
  abort(): void;

  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
}

export interface SpeechRecognitionStatic {
  new (): ISpeechRecognition;
}

export interface SpeechRecognitionErrorEvent extends Event {
  error: 'no-speech' | 'audio-capture' | 'not-allowed' | 'network' | 'aborted' | 'language-not-supported' | 'service-not-allowed' | 'bad-grammar';
  message: string;
}

export interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

export type CustomCommand = {
  id: string;
  spoken: string;
  replacement: string;
};

export type StudyType = string;
export type Scenario = string;

export interface Template {
  id: string;
  title: string;
  content: string;
  studyType: StudyType;
  scenario: Scenario;
}

export interface AppData {
  templates: Template[];
  studyTypes: StudyType[];
  scenarios: Record<StudyType, Scenario[]>;
}

export interface AIPromptConfig {
  fluency: number;
  summarization: number;
  oncologyDetail: number;
  conclusionDetail: number;
  useRECIST: boolean;
  useTNM: boolean;
}

export type OrganCategory =
  | 'Liver' | 'Brain' | 'Lung' | 'Heart' | 'Kidney' | 'Spine'
  | 'Abdomen' | 'Chest' | 'Pelvis' | 'Extremities' | 'Vascular'
  | 'Breast' | 'Head-Neck' | 'MSK' | 'Neuro' | 'Cardiac'
  | 'GI' | 'GU' | 'Oncology' | 'Other';

export interface GrammarError {
  id: string;
  originalText: string;
  suggestion: string;
  explanation: string;
}


export interface RadiologyCode {
  code: string;
  fullCode: string;
  points: number;
  desc: string;
  category: string;
}

export interface Study {
  id: number;
  code: string;
  patientId: string;
  points: number;
  desc: string;
  date: string;
}

export interface GeneratedReport {
  id: string;
  generatedAt: string;
  periodYear: number;
  periodMonth: number;
  totalAmount: number;
  studyCount: number;
}

export interface PersonalInfo {
    fullName: string;
    pesel: string;
    addressStreet: string;
    addressCity: string;
    addressProvince: string;
    email: string;
    phone: string;
    taxOffice: string;
    bankAccount: string;
    contractNumber: string;
    department: string;
    specialty: string;
    licenseNumber: string;
    signatureImage: string;
}

export interface ColorSettings {
  voice: string;
  pasted: string;
  dragged: string;
}

export interface HotkeysConfig {
  toggleRecord: string;
  triggerAI: string;
  toggleLayout: string;
}

export type LayoutDensity = 'compact' | 'comfortable' | 'spacious';

export type PlanStatus = 'none' | 'half' | 'full';

export interface PlannedDay {
    date: string;
    status: PlanStatus;
}

export interface TemplateData {
  appData: { [key in Language]: AppData };
}

export interface StudyData {
  studies: Study[];
  personalInfo: Partial<PersonalInfo>;
  radiologyCodes: RadiologyCode[];
  generatedReports: GeneratedReport[];
  plannedDays: Record<string, PlanStatus>;
}

export interface SettingsData {
  customCommands: CustomCommand[];
  colorSettings: ColorSettings;
  hotkeys: HotkeysConfig;
  aiPromptConfig: { [key in Language]: AIPromptConfig };
  layoutDensity: LayoutDensity;
  styleExamples: StyleExample[];
  aiSettings: AISettings;
}

export type UserProfile = TemplateData & StudyData & SettingsData;

export interface AuthData {
  users: any[];
  currentUser: any | null;
}

// Report Submission System
export interface ReportEntry {
  numerBadania: string;
  opis: string;
  dataWykonania: string;
  kwota: number;
  contentHash?: string; // Hash to detect exact duplicates
}

export type ReportStatus = 'draft' | 'submitted' | 'rejected';
export type VerificationStatus = 'pending' | 'approved' | 'rejected';

export interface Report {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  year: number;
  month: number;
  entries: ReportEntry[];
  personalInfo?: Partial<PersonalInfo>; // Personal info for displaying reports
  reportDate?: string; // ISO date string for the report month
  totalAmount?: number; // Total amount of the report
  status: ReportStatus;
  createdAt: string;
  submittedAt?: string;
  isPartialMonth: boolean; // Warning if submitted before month ends
  duplicateStudyNumbers?: {
    numerBadania: string;
    existingReportId: string;
    existingUserId: string;
    existingUserEmail: string;
  }[];
}

export interface VerificationRecord {
  id: string;
  reportId: string;
  verifierId: string;
  verifierEmail: string;
  status: VerificationStatus;
  comments: string;
  createdAt: string;
  verifiedAt?: string;
}

// Accounting Processing Types
export type AccountingStatus = 'received' | 'processed' | 'sent_to_bank';

export interface AccountingStatusChange {
  status: AccountingStatus;
  changedBy: string; // email
  changedAt: string; // ISO date
}

export interface InternalNote {
  id: string;
  author: string; // email
  content: string;
  createdAt: string; // ISO date
}

export interface AccountingProcessing {
  id: string;
  reportId: string;
  status: AccountingStatus;
  statusHistory: AccountingStatusChange[];
  internalNotes: InternalNote[];
  dateSentToBank?: string; // ISO date
  createdAt: string;
}

export interface ReportContextType {
  reports: Report[];
  verificationRecords: VerificationRecord[];
  accountingProcessing: AccountingProcessing[];
  submitReport: (report: Report) => void;
  updateReportStatus: (reportId: string, status: ReportStatus) => void;
  verifyReport: (reportId: string, verification: VerificationRecord) => void;
  getDuplicateStudyNumbers: (entries: ReportEntry[], userId: string) => ReportEntry['numerBadania'][];
  getReportsByUser: (userId: string) => Report[];
  getSubmittedReports: () => Report[];
  getVerificationRecord: (reportId: string) => VerificationRecord | undefined;
  // Accounting methods
  getAccountingRecord: (reportId: string) => AccountingProcessing | undefined;
  createAccountingRecord: (reportId: string) => void;
  updateAccountingStatus: (reportId: string, newStatus: AccountingStatus, userId: string) => void;
  addInternalNote: (reportId: string, content: string, userId: string) => void;
  getApprovedReportsForAccounting: () => Report[];
  deleteInternalNote: (reportId: string, noteId: string) => void;
}

// AI Provider Types
export type AIProviderType = 'gemini' | 'openai' | 'anthropic' | 'local';

export interface AIProviderConfig {
    id: string;
    name: string;
    type: AIProviderType;
    apiKey: string;
    model: string;
    endpoint?: string;
    enabled: boolean;
}

export interface AISettings {
    providers: AIProviderConfig[];
    defaultProvider: string;
    promptConfig: AIPromptConfig;
}


declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionStatic;
    webkitSpeechRecognition: SpeechRecognitionStatic;
    SpeechGrammarList: any;
    webkitSpeechGrammarList: any;
    webkitAudioContext: typeof AudioContext;
  }
  interface CaretPosition {
    readonly offsetNode: Node;
    readonly offset: number;
  }
  interface Document {
    caretPositionFromPoint(x: number, y: number): CaretPosition | null;
    caretRangeFromPoint(x: number, y: number): Range | null;
  }
  interface Range {
    expand?(unit: 'word' | 'sentence' | 'character' | 'line'): void;
  }
}
