import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import type { AppData, Template, StudyType, Scenario, TemplateData } from '../types';
import { initialStudyTypes, initialScenarios } from '../data/templateData';
import { systemTemplates } from '../data/systemTemplates';
import { useStorage } from '../hooks/useStorage';
import { useTranslations } from './LanguageContext';
import { useApp } from './AppContext';

interface TemplateContextType {
    templates: Template[];
    studyTypes: StudyType[];
    scenarios: Record<StudyType, Scenario[]>;
    currentStudyFilter: StudyType | null;
    currentScenarioFilter: Scenario | null;
    filteredTemplates: Template[];
    availableScenarios: Scenario[];
    handleSelectStudyType: (studyType: StudyType | null) => void;
    handleSelectScenario: (scenario: Scenario | null) => void;
    saveTemplate: (template: Omit<Template, 'id'> & { id?: string }) => void;
    cloneTemplate: (template: Template) => void;
    deleteTemplate: (templateId: string) => void;
    addStudyType: (name: string) => void;
    updateStudyType: (index: number, newName: string) => void;
    deleteStudyType: (index: number) => void;
    reorderStudyTypes: (fromIndex: number, toIndex: number) => void;
    addScenario: (name: string) => void;
    updateScenario: (index: number, newName: string) => void;
    deleteScenario: (index: number) => void;
    reorderTemplates: (fromId: string, toId: string) => void;
    clearTemplateData: () => void;
    importTemplates: (newTemplates: Template[]) => number;
    importTexterTemplates: (data: any) => number;
    exportTemplates: () => string;
}

const TemplateContext = createContext<TemplateContextType | undefined>(undefined);

const initialTemplateData: TemplateData = {
    appData: {
        pl: { templates: [], studyTypes: initialStudyTypes, scenarios: initialScenarios },
        en: { templates: [], studyTypes: initialStudyTypes, scenarios: initialScenarios },
        de: { templates: [], studyTypes: initialStudyTypes, scenarios: initialScenarios },
    }
};

export const TemplateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { language, t } = useTranslations();
    const { setConfirmationState, closeConfirmation } = useApp();
    const [data, setData, templatesLoading] = useStorage<TemplateData>(
        'speaksync_templates',
        initialTemplateData,
        'templates',
        'data'
    );
    
    const [currentStudyFilter, setCurrentStudyFilter] = useState<StudyType | null>(null);
    const [currentScenarioFilter, setCurrentScenarioFilter] = useState<Scenario | null>(null);

    const appData = useMemo(() => data.appData[language] || initialTemplateData.appData[language], [data, language]);

    const updateAppData = (newAppData: AppData) => {
        setData(prevData => ({
            ...prevData,
            appData: { ...prevData.appData, [language]: newAppData }
        }));
    };

    // Seed system templates on first load (when no templates exist for this language)
    useEffect(() => {
        if (!templatesLoading && appData.templates.length === 0 && systemTemplates.length > 0) {
            updateAppData({ ...appData, templates: systemTemplates });
        }
    }, [templatesLoading, language]);

    const templates = appData.templates;
    
    // Derived Data
    const filteredTemplates = useMemo(() => templates.filter(t => {
        if (currentStudyFilter && t.studyType !== currentStudyFilter) return false;
        if (currentScenarioFilter && t.scenario !== currentScenarioFilter) return false;
        return true;
    }), [templates, currentStudyFilter, currentScenarioFilter]);
    
    const availableScenarios = useMemo(() => currentStudyFilter ? (appData.scenarios[currentStudyFilter] || []) : [], [appData.scenarios, currentStudyFilter]);

    // Handlers
    const handleSelectStudyType = (studyType: StudyType | null) => {
        setCurrentStudyFilter(studyType);
        setCurrentScenarioFilter(null);
    };
    
    const handleSelectScenario = (scenario: Scenario | null) => {
        setCurrentScenarioFilter(scenario);
    };

    const saveTemplate = (template: Omit<Template, 'id'> & { id?: string }) => {
        const allTemplates = appData.templates || [];
        const newTemplates = [...allTemplates];
        if (template.id) {
            const index = newTemplates.findIndex(t => t.id === template.id);
            if (index > -1) {
                newTemplates[index] = { ...template, id: template.id };
            }
        } else {
            newTemplates.push({ ...template, id: crypto.randomUUID() });
        }
        updateAppData({ ...appData, templates: newTemplates });
    };

    const cloneTemplate = (template: Template) => {
        const clonedTemplate: Template = {
            ...template,
            id: crypto.randomUUID(),
            title: `${template.title} (${t('templates.copy', 'Copy')})`,
        };
        updateAppData({...appData, templates: [...appData.templates, clonedTemplate]});
    };

    const deleteTemplate = (templateId: string) => {
        const template = appData.templates.find(t => t.id === templateId);
        if (!template) return;

        setConfirmationState({
            isOpen: true,
            title: t('confirmModal.title'),
            message: t('templates.deleteConfirm', { title: template.title }),
            onConfirm: () => {
                updateAppData({...appData, templates: appData.templates.filter(t => t.id !== templateId)});
                closeConfirmation();
            }
        });
    };

    const addStudyType = (newStudyType: string) => {
        if (!newStudyType.trim() || appData.studyTypes.includes(newStudyType.trim())) return;
        updateAppData({
            ...appData,
            studyTypes: [...appData.studyTypes, newStudyType.trim()],
            scenarios: { ...appData.scenarios, [newStudyType.trim()]: [] }
        });
    };

    const updateStudyType = (index: number, newName: string) => {
        if (!newName.trim()) return;
        const oldName = appData.studyTypes[index];
        if (oldName === newName.trim()) return;

        const newStudyTypes = [...appData.studyTypes];
        newStudyTypes[index] = newName.trim();

        const newScenarios = { ...appData.scenarios };
        if (newScenarios[oldName]) {
            newScenarios[newName.trim()] = newScenarios[oldName];
            delete newScenarios[oldName];
        }

        const newTemplates = appData.templates.map(t => 
            t.studyType === oldName ? { ...t, studyType: newName.trim() } : t
        );
        
        if (currentStudyFilter === oldName) setCurrentStudyFilter(newName.trim());
        updateAppData({ studyTypes: newStudyTypes, scenarios: newScenarios, templates: newTemplates });
    };

    const deleteStudyType = (index: number) => {
        const studyTypeToDelete = appData.studyTypes[index];
        setConfirmationState({
            isOpen: true,
            title: t('confirmModal.title'),
            message: t('studyTypes.deleteConfirm', { name: studyTypeToDelete }),
            onConfirm: () => {
                const newStudyTypes = appData.studyTypes.filter((_, i) => i !== index);
                const newScenarios = { ...appData.scenarios };
                delete newScenarios[studyTypeToDelete];
                const newTemplates = appData.templates.filter(t => t.studyType !== studyTypeToDelete);
                
                if (currentStudyFilter === studyTypeToDelete) {
                    setCurrentStudyFilter(null);
                    setCurrentScenarioFilter(null);
                }
                updateAppData({ studyTypes: newStudyTypes, scenarios: newScenarios, templates: newTemplates });
                closeConfirmation();
            }
        });
    };

    const reorderStudyTypes = (fromIndex: number, toIndex: number) => {
        const newStudyTypes = [...appData.studyTypes];
        const [movedItem] = newStudyTypes.splice(fromIndex, 1);
        newStudyTypes.splice(toIndex, 0, movedItem);
        updateAppData({ ...appData, studyTypes: newStudyTypes });
    };

    const addScenario = (newScenario: string) => {
        if (!currentStudyFilter || !newScenario.trim() || appData.scenarios[currentStudyFilter]?.includes(newScenario.trim())) return;
        updateAppData({
            ...appData,
            scenarios: {
                ...appData.scenarios,
                [currentStudyFilter]: [...(appData.scenarios[currentStudyFilter] || []), newScenario.trim()]
            }
        });
    };

    const updateScenario = (index: number, newName: string) => {
        if (!currentStudyFilter || !newName.trim()) return;
        const oldName = appData.scenarios[currentStudyFilter][index];
        if (oldName === newName.trim()) return;

        const newScenariosForStudy = [...appData.scenarios[currentStudyFilter]];
        newScenariosForStudy[index] = newName.trim();
        
        const newTemplates = appData.templates.map(t =>
            (t.studyType === currentStudyFilter && t.scenario === oldName) ? { ...t, scenario: newName.trim() } : t
        );

        if (currentScenarioFilter === oldName) setCurrentScenarioFilter(newName.trim());
        updateAppData({
            ...appData,
            scenarios: { ...appData.scenarios, [currentStudyFilter]: newScenariosForStudy },
            templates: newTemplates
        });
    };

    const deleteScenario = (index: number) => {
        if (!currentStudyFilter) return;
        const scenarioToDelete = appData.scenarios[currentStudyFilter][index];
        setConfirmationState({
            isOpen: true,
            title: t('confirmModal.title'),
            message: t('templates.deleteScenarioConfirm', { name: scenarioToDelete }),
            onConfirm: () => {
                const newScenariosForStudy = appData.scenarios[currentStudyFilter].filter((_, i) => i !== index);
                const newTemplates = appData.templates.filter(t => !(t.studyType === currentStudyFilter && t.scenario === scenarioToDelete));

                if (currentScenarioFilter === scenarioToDelete) setCurrentScenarioFilter(null);
                updateAppData({
                    ...appData,
                    scenarios: { ...appData.scenarios, [currentStudyFilter]: newScenariosForStudy },
                    templates: newTemplates
                });
                closeConfirmation();
            }
        });
    };

    const reorderTemplates = (fromId: string, toId: string) => {
        const userTemplates = appData.templates || [];
        const templatesCopy = [...userTemplates];
        const fromIndex = templatesCopy.findIndex(t => t.id === fromId);
        const toIndex = templatesCopy.findIndex(t => t.id === toId);
        
        if (fromIndex === -1 || toIndex === -1) return;
        
        const [movedItem] = templatesCopy.splice(fromIndex, 1);
        templatesCopy.splice(toIndex, 0, movedItem);
        updateAppData({ ...appData, templates: templatesCopy });
    };

    const clearTemplateData = () => {
        const newScenarios = { ...appData.scenarios };
        Object.keys(newScenarios).forEach(key => {
            newScenarios[key as StudyType] = [];
        });
        updateAppData({ ...appData, templates: [], scenarios: newScenarios });
    };
    
    const importTemplates = useCallback((parsedTemplates: (Omit<Template, 'id'>)[]) => {
        const userTemplates = appData.templates || [];
        const existingTemplateTitles = new Set(userTemplates.map(t => t.title.toLowerCase()));
        
        const newTemplates = parsedTemplates
            .filter(t => !existingTemplateTitles.has(t.title.toLowerCase()))
            .map(t => ({ ...t, id: crypto.randomUUID() }));

        if (newTemplates.length > 0) {
            updateAppData({ ...appData, templates: [...userTemplates, ...newTemplates] });
        }
        return newTemplates.length;
    }, [appData, updateAppData]);

    const importTexterTemplates = useCallback((data: any) => {
        const userTemplates = appData.templates || [];
        const groups: { name: string; uuid: string }[] = data.groups || [];
        const combos: { name: string; snippet: string; group: string; }[] = data.combos || [];

        const groupMap = new Map(groups.map(g => [g.uuid, g.name]));
        let newStudyTypes: StudyType[] = [...appData.studyTypes];
        let newScenarios: Record<StudyType, Scenario[]> = {...appData.scenarios};
        
        for (const group of groups) {
            if (!newStudyTypes.includes(group.name)) {
                newStudyTypes.push(group.name);
                newScenarios[group.name] = [];
            }
        }

        const existingTemplateTitles = new Set(userTemplates.map(t => t.title.toLowerCase()));
        const nonMedicalKeywords = ['vpn', 'login', 'password', 'clininet'];

        const newTemplates: Template[] = combos
            .filter(combo => {
                const nameLower = combo.name.toLowerCase();
                const snippetLower = combo.snippet.toLowerCase();
                if (nonMedicalKeywords.some(keyword => nameLower.includes(keyword) || snippetLower.includes(keyword))) return false;
                if (combo.snippet.length < 20 && !combo.snippet.includes(' ')) return false;
                return !existingTemplateTitles.has(nameLower);
            })
            .map(combo => ({
                id: crypto.randomUUID(),
                title: combo.name,
                content: combo.snippet,
                studyType: groupMap.get(combo.group) || 'Uncategorized',
                scenario: 'General',
            }));

        if (newTemplates.length > 0) {
            updateAppData({ templates: [...userTemplates, ...newTemplates], studyTypes: newStudyTypes, scenarios: newScenarios });
        }
        return newTemplates.length;
    }, [appData, updateAppData]);

    const exportTemplates = () => {
        const userTemplates = appData.templates || [];
        return userTemplates.map(template => {
            return [
                '---TEMPLATE_START---', `title: ${template.title}`, `studyType: ${template.studyType}`,
                `scenario: ${template.scenario}`, '---CONTENT_START---', template.content, '---TEMPLATE_END---'
            ].join('\n');
        }).join('\n\n');
    };

    const value: TemplateContextType = {
        templates,
        studyTypes: appData.studyTypes,
        scenarios: appData.scenarios,
        currentStudyFilter,
        currentScenarioFilter,
        filteredTemplates,
        availableScenarios,
        handleSelectStudyType,
        handleSelectScenario,
        saveTemplate,
        cloneTemplate,
        deleteTemplate,
        addStudyType,
        updateStudyType,
        deleteStudyType,
        reorderStudyTypes,
        addScenario,
        updateScenario,
        deleteScenario,
        reorderTemplates,
        clearTemplateData,
        importTemplates,
        importTexterTemplates,
        exportTemplates,
    };

    return <TemplateContext.Provider value={value}>{children}</TemplateContext.Provider>;
};

export const useTemplate = (): TemplateContextType => {
    const context = useContext(TemplateContext);
    if (context === undefined) {
        throw new Error('useTemplate must be used within a TemplateProvider');
    }
    return context;
};