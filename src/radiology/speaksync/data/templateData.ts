import type { StudyType, Scenario } from '../types';

export const initialStudyTypes: StudyType[] = ['CT Head', 'CT Abdomen', 'CT Chest', 'MR Brain', 'MR Spine', 'Ultrasound'];

export const initialScenarios: Record<StudyType, Scenario[]> = {
    'CT Head': ['Headache', 'Trauma', 'Stroke', 'Seizure'],
    'CT Abdomen': ['Abdominal Pain', 'Trauma', 'Mass', 'Bowel Obstruction'],
    'CT Chest': ['Chest Pain', 'SOB', 'Trauma', 'Mass'],
    'MR Brain': ['Headache', 'Seizure', 'Memory Loss', 'Vertigo'],
    'MR Spine': ['Back Pain', 'Radiculopathy', 'Trauma', 'Weakness'],
    'Ultrasound': ['RUQ Pain', 'Pregnancy', 'DVT', 'Renal']
};
