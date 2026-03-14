
import React, { createContext, useContext, useCallback, useEffect } from 'react';
import type { Study, PersonalInfo, RadiologyCode, GeneratedReport, StudyData, PlanStatus } from '../types';
import { initialRadiologyCodes } from '../data/radiologyCodes';
import { useStorage } from '../hooks/useStorage';
import { useApp } from './AppContext';
import { useTranslations } from './LanguageContext';

interface StudyContextType {
    studies: Study[];
    setStudies: (studies: Study[]) => void;
    addStudy: (code: string, patientId: string, date?: string) => boolean;
    deleteStudy: (studyId: number) => void;
    personalInfo: Partial<PersonalInfo>;
    setPersonalInfo: (info: Partial<PersonalInfo>) => void;
    radiologyCodes: RadiologyCode[];
    setRadiologyCodes: (codes: RadiologyCode[]) => void;
    generatedReports: GeneratedReport[];
    addGeneratedReport: (reportData: Omit<GeneratedReport, 'id' | 'generatedAt'>) => void;
    deleteGeneratedReport: (reportId: string) => void;
    importStudyData: (data: Partial<StudyData>, onSuccess?: () => void) => void;
    exportStudyData: () => StudyData;
    plannedDays: Record<string, PlanStatus>;
    togglePlannedDay: (date: string) => void;
}

const StudyContext = createContext<StudyContextType | undefined>(undefined);

const initialStudyData: StudyData = {
    studies: [],
    personalInfo: {},
    radiologyCodes: initialRadiologyCodes,
    generatedReports: [],
    plannedDays: {}
};

export const StudyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { setConfirmationState, closeConfirmation } = useApp();
    const { t } = useTranslations();
    const [data, setData, studiesLoading] = useStorage<StudyData>(
        'speaksync_studies',
        initialStudyData,
        'studies',
        'data'
    );

    // Sync missing hardcoded codes to ensure updates in data/radiologyCodes.ts are visible 
    // even if local storage already has a codes list.
    useEffect(() => {
        const currentCodes = data.radiologyCodes || [];
        const missingCodes = initialRadiologyCodes.filter(
            ic => !currentCodes.some(cc => cc.code === ic.code)
        );
        
        if (missingCodes.length > 0) {
            setData(prev => ({
                ...prev,
                radiologyCodes: [...prev.radiologyCodes, ...missingCodes]
            }));
        }
    }, [data.radiologyCodes, setData]);

    const setStudies = (newStudies: Study[]) => {
        setData(prev => ({ ...prev, studies: newStudies }));
    };

    const setPersonalInfo = (newInfo: Partial<PersonalInfo>) => {
        setData(prev => ({ ...prev, personalInfo: newInfo }));
    };

    const setRadiologyCodes = (newCodes: RadiologyCode[]) => {
        setData(prev => ({ ...prev, radiologyCodes: newCodes }));
    };
    
    const setGeneratedReports = (newReports: GeneratedReport[]) => {
        setData(prev => ({...prev, generatedReports: newReports}));
    };

    const addStudy = (code: string, patientId: string, dateStr?: string): boolean => {
        const codeData = data.radiologyCodes.find(c => c.code === code);
        if (!codeData) return false;

        const newStudy: Study = {
            id: Date.now(), 
            code, 
            patientId,
            points: codeData.points, 
            desc: codeData.desc,
            date: dateStr ? new Date(dateStr).toISOString() : new Date().toISOString()
        };
        setStudies([newStudy, ...data.studies]);
        return true;
    };
    
    const deleteStudy = (studyId: number) => {
        setConfirmationState({
            isOpen: true,
            title: t('studyManager.deleteStudyTitle') || 'Delete Study',
            message: t('studyManager.deleteStudyConfirm'),
            onConfirm: () => {
                setStudies(data.studies.filter(s => s.id !== studyId));
                closeConfirmation();
            }
        });
    };

    const addGeneratedReport = (reportData: Omit<GeneratedReport, 'id' | 'generatedAt'>) => {
        const newReport: GeneratedReport = {
            ...reportData,
            id: crypto.randomUUID(),
            generatedAt: new Date().toISOString(),
        };
        setGeneratedReports([newReport, ...data.generatedReports]);
    };
    
    const deleteGeneratedReport = (reportId: string) => {
        setConfirmationState({
            isOpen: true,
            title: t('confirmModal.title'),
            message: t('studyManager.reports.deleteReportConfirm'),
            onConfirm: () => {
                setGeneratedReports(data.generatedReports.filter(r => r.id !== reportId));
                closeConfirmation();
            }
        });
    };

    const importStudyData = useCallback((newData: Partial<StudyData>, onSuccess?: () => void) => {
        setConfirmationState({
            isOpen: true,
            title: t('settings.dataManagement.confirmImportTitle'),
            message: t('settings.dataManagement.confirmImportMessage'),
            onConfirm: () => {
                // Merge imported data with defaults to handle missing fields
                // This ensures backwards compatibility with older export files
                const mergedData: StudyData = {
                    studies: Array.isArray(newData.studies) ? newData.studies : initialStudyData.studies,
                    personalInfo: newData.personalInfo ?? initialStudyData.personalInfo,
                    radiologyCodes: Array.isArray(newData.radiologyCodes) ? newData.radiologyCodes : initialStudyData.radiologyCodes,
                    generatedReports: Array.isArray(newData.generatedReports) ? newData.generatedReports : initialStudyData.generatedReports,
                    plannedDays: newData.plannedDays ?? initialStudyData.plannedDays,
                };
                setData(mergedData);
                closeConfirmation();
                onSuccess?.();
            }
        });
    }, [setData, setConfirmationState, closeConfirmation, t]);

    const exportStudyData = useCallback(() => {
        return data;
    }, [data]);

    const togglePlannedDay = useCallback((date: string) => {
        setData(prev => {
            const currentStatus = prev.plannedDays[date] || 'none';
            let newStatus: PlanStatus = 'none';
            if (currentStatus === 'none') newStatus = 'half';
            else if (currentStatus === 'half') newStatus = 'full';
            else newStatus = 'none';

            return {
                ...prev,
                plannedDays: {
                    ...prev.plannedDays,
                    [date]: newStatus
                }
            };
        });
    }, [setData]);

    const value: StudyContextType = {
        studies: data.studies,
        setStudies,
        addStudy,
        deleteStudy,
        personalInfo: data.personalInfo,
        setPersonalInfo,
        radiologyCodes: data.radiologyCodes,
        setRadiologyCodes,
        generatedReports: data.generatedReports,
        addGeneratedReport,
        deleteGeneratedReport,
        importStudyData,
        exportStudyData,
        plannedDays: data.plannedDays || {},
        togglePlannedDay
    };

    return <StudyContext.Provider value={value}>{children}</StudyContext.Provider>;
};

export const useStudy = (): StudyContextType => {
    const context = useContext(StudyContext);
    if (context === undefined) {
        throw new Error('useStudy must be used within a StudyProvider');
    }
    return context;
};
