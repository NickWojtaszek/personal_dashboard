import React, { useState, useMemo } from 'react';
import { CogIcon, PlusIcon, VerticalSplitIcon, HorizontalSplitIcon, ChevronRightIcon, ChevronLeftIcon, XCircleIcon } from '../components/Icons';
import StudyTypesAndTemplatesPanel from '../components/StudyTypesAndTemplatesPanel';
import EditorPanel from '../components/EditorPanel';
import TemplateModal from '../components/TemplateModal';
import ConfirmationModal from '../components/ConfirmationModal';
import PlannerView from '../components/planner/PlannerView';
import ReportGenerator from '../components/studyManager/ReportGenerator';
import ReportSubmissionPage from '../pages/ReportSubmissionPage';

import ViewContainer from '../components/ViewContainer';

import { useTranslations } from '../context/LanguageContext';
import { useApp } from '../context/AppContext';
import { useSettings } from '../context/SettingsContext';
import { useStudy } from '../context/StudyContext';
import { useTheme } from '../context/ThemeContext';
import { useThemeStyles } from '../hooks/useThemeStyles';
import type { Template, RadiologyCode } from '../types';

type MainTab = 'editor' | 'planner' | 'codes' | 'reports';

export type { MainTab };

const MainPage: React.FC<{ hideHeader?: boolean; activeTabOverride?: MainTab; onTabChange?: (tab: MainTab) => void }> = ({ hideHeader, activeTabOverride, onTabChange }) => {
    const { t } = useTranslations();
    const { setView, confirmationState, setConfirmationState, closeConfirmation, templateModal } = useApp();
    const { layoutDensity } = useSettings();
    const { radiologyCodes, setRadiologyCodes, studies, personalInfo, setPersonalInfo, generatedReports, addGeneratedReport, deleteGeneratedReport } = useStudy();
    const themeStyles = useThemeStyles();
    const { currentTheme } = useTheme();

    const availableTabs: MainTab[] = ['editor', 'planner', 'codes', 'reports'];

    const [internalTab, setInternalTab] = useState<MainTab>('editor');
    const activeTab = activeTabOverride ?? internalTab;
    const setActiveTab = onTabChange ?? setInternalTab;
    const [text, setText] = useState<string>('');
    const [comparisonText, setComparisonText] = useState<string>('');
    const [loadedTemplate, setLoadedTemplate] = useState<Template | null>(null);
    const [layoutMode, setLayoutMode] = useState<'normal' | 'split-vertical' | 'split-horizontal'>('normal');
    const [mainLayout, setMainLayout] = useState<'columns' | 'rows'>('columns');
    const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
    const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null);
    const [remoteAudioStream, setRemoteAudioStream] = useState<MediaStream | null>(null);
    const [previewTemplateTitle, setPreviewTemplateTitle] = useState<string>('');
    const [codesEditingCode, setCodesEditingCode] = useState<RadiologyCode | null>(null);
    const [codesFormData, setCodesFormData] = useState<RadiologyCode | null>(null);

    const hasText = useMemo(() => text.replace(/<[^>]*>?/gm, '').trim().length > 0, [text]);
    const hasUnsavedChanges = useMemo(() => {
        return text.replace(/<[^>]*>?/gm, '').trim().length > 0;
    }, [text]);

    const handleSelectTemplate = (template: Template) => {
        const loadTemplate = () => {
            setText(`<span class="text-template">${template.content}</span>`);
            setLoadedTemplate(template);
            if (activeTab !== 'editor') setActiveTab('editor');
        };

        if (hasUnsavedChanges) {
            setConfirmationState({
                isOpen: true,
                title: 'Load Template?',
                message: 'You have unsaved content in the editor. Loading this template will replace it. Continue?',
                onConfirm: () => {
                    loadTemplate();
                    closeConfirmation();
                }
            });
        } else {
            loadTemplate();
        }
    };

    const handlePreviewTemplate = (template: Template) => {
        if (previewTemplateId === template.id && layoutMode !== 'normal') {
            setComparisonText('');
            setLayoutMode('normal');
            setPreviewTemplateId(null);
            setPreviewTemplateTitle('');
        } else {
            setComparisonText(template.content);
            setPreviewTemplateId(template.id);
            setPreviewTemplateTitle(template.title);
            if (layoutMode === 'normal') {
                setLayoutMode('split-vertical');
            }
        }
    };

    const handleClearEditor = () => {
        if (hasUnsavedChanges) {
            setConfirmationState({
                isOpen: true,
                title: 'Clear Editor?',
                message: 'You have unsaved content in the editor. Are you sure you want to clear it?',
                onConfirm: () => {
                    setText('');
                    setLoadedTemplate(null);
                    closeConfirmation();
                }
            });
        } else {
            setText('');
            setLoadedTemplate(null);
        }
    };

    const handleTabChange = (newTab: MainTab) => {
        if (activeTab === 'editor' && newTab !== 'editor' && hasUnsavedChanges) {
            setConfirmationState({
                isOpen: true,
                title: 'Unsaved Changes',
                message: 'You have unsaved content in the editor. Are you sure you want to leave this tab?',
                onConfirm: () => {
                    setActiveTab(newTab);
                    closeConfirmation();
                }
            });
        } else {
            setActiveTab(newTab);
        }
    };

    const handleOpenModal = () => {
        templateModal.setEditingTemplate(null);
        templateModal.setIsOpen(true);
    };

    const handleCycleLayoutMode = () => {
        setLayoutMode(prev => {
            if (prev === 'normal') return 'split-vertical';
            if (prev === 'split-vertical') return 'split-horizontal';
            return 'normal';
        });
    };

    const mainGridClasses = useMemo(() => {
        if (isPanelCollapsed) {
            return 'grid-cols-1';
        }
        return mainLayout === 'columns'
            ? `grid-rows-[2fr_1fr] lg:grid-rows-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]`
            : 'grid-rows-[2fr_1fr]';
    }, [mainLayout, isPanelCollapsed]);

    const gapClass = layoutDensity === 'compact' ? 'gap-2' : 'gap-4';

    const renderContent = () => {
        switch (activeTab) {
            case 'planner':
                return (
                    <div className="relative w-full h-full">
                        <PlannerView />
                    </div>
                );
            case 'codes':
                return (
                    <ViewContainer
                        leftLabel="codes-main"
                        rightLabel="codes-right"
                        rightPanel={
                            codesEditingCode && codesFormData ? (
                                <div className="flex flex-col gap-4">
                                    <h3 className="text-lg font-bold text-white">Edit Code</h3>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Code</label>
                                        <input
                                            type="text"
                                            value={codesFormData.code}
                                            onChange={(e) => setCodesFormData({...codesFormData, code: e.target.value})}
                                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Full Code</label>
                                        <input
                                            type="text"
                                            value={codesFormData.fullCode}
                                            onChange={(e) => setCodesFormData({...codesFormData, fullCode: e.target.value})}
                                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Points</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={codesFormData.points}
                                            onChange={(e) => setCodesFormData({...codesFormData, points: parseFloat(e.target.value)})}
                                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                                        <textarea
                                            value={codesFormData.desc}
                                            onChange={(e) => setCodesFormData({...codesFormData, desc: e.target.value})}
                                            rows={3}
                                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
                                        <input
                                            type="text"
                                            value={codesFormData.category}
                                            onChange={(e) => setCodesFormData({...codesFormData, category: e.target.value})}
                                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div className="flex gap-2 pt-4">
                                        <button
                                            onClick={() => {
                                                if (!codesFormData.code || !codesFormData.desc) {
                                                    alert('Code and Description are required');
                                                    return;
                                                }
                                                const updated = radiologyCodes.map(c =>
                                                    c.code === codesEditingCode.code ? codesFormData : c
                                                );
                                                setRadiologyCodes(updated);
                                                setCodesEditingCode(null);
                                                setCodesFormData(null);
                                            }}
                                            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded transition-colors"
                                        >
                                            Save
                                        </button>
                                        <button
                                            onClick={() => {
                                                setCodesEditingCode(null);
                                                setCodesFormData(null);
                                            }}
                                            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : null
                        }
                    >
                        <div className="p-4 h-full overflow-auto flex flex-col">
                            <h2 className="text-2xl font-bold text-white mb-4">{t('studyManager.codesDictionaryTitle')}</h2>
                            <table className="w-full text-left">
                                <thead className="bg-gray-900/80 sticky top-0">
                                    <tr>
                                        <th className="p-3 text-sm font-semibold text-gray-300">{t('studyManager.table.code')}</th>
                                        <th className="p-3 text-sm font-semibold text-gray-300">Full Code</th>
                                        <th className="p-3 text-sm font-semibold text-gray-300">{t('studyManager.table.points')}</th>
                                        <th className="p-3 text-sm font-semibold text-gray-300">{t('studyManager.table.category')}</th>
                                        <th className="p-3 text-sm font-semibold text-gray-300 w-16">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {radiologyCodes.map(c => (
                                        <tr key={c.code} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                                            <td className="p-3 font-mono text-blue-300 font-bold">{c.code}</td>
                                            <td className="p-3 text-gray-300 text-sm">{c.fullCode}</td>
                                            <td className="p-3 text-gray-300">{c.points.toFixed(1)}</td>
                                            <td className="p-3 text-gray-400 text-sm">{c.category}</td>
                                            <td className="p-3">
                                                <button
                                                    onClick={() => {
                                                        setCodesEditingCode(c);
                                                        setCodesFormData({...c});
                                                    }}
                                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
                                                >
                                                    Edit
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </ViewContainer>
                );
            case 'reports':
                return <ReportSubmissionPage />;
            case 'editor':
            default:
                return (
                    <div className={`relative flex-grow min-h-0 grid ${gapClass} ${mainGridClasses} h-full ${hideHeader ? 'p-4' : ''}`}>
                        <div className="relative h-full min-h-0 min-w-0">
                            <EditorPanel
                                text={text}
                                setText={setText}
                                onClear={handleClearEditor}
                                loadedTemplate={loadedTemplate}
                                layoutMode={layoutMode}
                                setLayoutMode={setLayoutMode}
                                comparisonText={comparisonText}
                                setComparisonText={setComparisonText}
                                comparisonTitle={previewTemplateTitle}
                                remoteAudioStream={remoteAudioStream}
                            />
                        </div>
                        <div className={`relative ${isPanelCollapsed ? 'hidden' : ''} h-full min-h-0 min-w-0`}>
                            <StudyTypesAndTemplatesPanel
                                onSelectTemplate={handleSelectTemplate}
                                onPreviewTemplate={handlePreviewTemplate}
                            />
                        </div>
                        <button
                            onClick={handleOpenModal}
                            style={{ backgroundColor: currentTheme.colors.buttonPrimary }} className="fixed bottom-8 right-8 w-16 h-16 text-white rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 focus:outline-none z-20" onMouseEnter={(e) => e.currentTarget.style.backgroundColor = currentTheme.colors.buttonPrimaryHover} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = currentTheme.colors.buttonPrimary}
                            aria-label={t('app.addTemplate')}
                        >
                            <PlusIcon />
                        </button>
                    </div>
                );
        }
    };

    return (
        <>
            <main
              className={`w-full flex flex-col font-sans ${hideHeader ? '' : 'h-full overflow-hidden'}`}
              style={hideHeader ? undefined : themeStyles.mainBg}
            >
                {!hideHeader && (
                <header
                  className="flex-shrink-0 flex items-center px-4 py-2 border-b z-10"
                  style={{
                    backgroundColor: themeStyles.header.backgroundColor,
                    borderBottomColor: themeStyles.header.borderBottomColor,
                    borderBottomWidth: '1px',
                  }}
                >
                    {/* Navigation Tabs */}
                    <nav
                      className="flex items-center gap-1 p-1 rounded-lg"
                      style={{ backgroundColor: themeStyles.nav.backgroundColor }}
                    >
                        {availableTabs.map(tab => (
                            <button
                                key={tab}
                                onClick={() => handleTabChange(tab)}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                                    activeTab === tab
                                    ? null
                                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                                }`}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        ))}
                    </nav>

                    <div className="flex-grow"></div>

                    <div className="flex items-center gap-2">
                        {activeTab === 'editor' && (
                            <>
                                <button onClick={handleCycleLayoutMode} title={t('main.toggleLayout')} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors">
                                    {layoutMode === 'normal' ? <VerticalSplitIcon className="h-5 w-5" /> : (layoutMode === 'split-vertical' ? <HorizontalSplitIcon className="h-5 w-5" /> : <XCircleIcon className="h-5 w-5" />)}
                                </button>
                                <button onClick={() => setIsPanelCollapsed(!isPanelCollapsed)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors">
                                    {isPanelCollapsed ? <ChevronLeftIcon className="h-5 w-5" /> : <ChevronRightIcon className="h-5 w-5" />}
                                </button>
                            </>
                        )}
                        <button onClick={() => setView('settings')} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors" aria-label={t('settings.title')}>
                            <CogIcon className="h-5 w-5" />
                        </button>
                    </div>
                </header>
                )}

                <div className={`${hideHeader ? 'min-h-[600px]' : 'flex-grow min-h-0'} overflow-hidden relative ${hideHeader ? '' : 'p-4'}`}>
                    {renderContent()}
                </div>
            </main>

            {/* Global Modals */}
            <TemplateModal />
            <ConfirmationModal
                isOpen={confirmationState.isOpen}
                title={confirmationState.title}
                message={confirmationState.message}
                onConfirm={confirmationState.onConfirm}
                onClose={closeConfirmation}
            />
        </>
    );
};

export default MainPage;
