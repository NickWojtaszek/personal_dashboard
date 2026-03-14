import React from 'react';
import { ThemeBridgeProvider } from './context/ThemeBridgeProvider';
import { GlobalThemeStyles } from './components/GlobalThemeStyles';
import { LanguageProvider } from './context/LanguageContext';
import { AppContextProvider } from './context/AppContext';
import { SettingsProvider } from './context/SettingsContext';
import { TemplateProvider } from './context/TemplateContext';
import { StudyProvider } from './context/StudyContext';
import { ReportProvider } from './context/ReportContext';
import ErrorBoundary from './components/ErrorBoundary';
import SpeakSyncContent from './SpeakSyncContent';
import type { MainTab } from './pages/MainPage';

export type { MainTab };

export type SpeakSyncView = 'main' | 'settings' | 'aiconfig';

interface SpeakSyncWrapperProps {
    theme: 'light' | 'dark';
    hideHeader?: boolean;
    activeTab?: MainTab;
    onTabChange?: (tab: MainTab) => void;
    viewOverride?: SpeakSyncView;
    onViewChange?: (view: SpeakSyncView) => void;
}

const SpeakSyncWrapper: React.FC<SpeakSyncWrapperProps> = ({ theme, hideHeader, activeTab, onTabChange, viewOverride, onViewChange }) => {
    return (
        <ErrorBoundary>
            <ThemeBridgeProvider theme={theme}>
                <GlobalThemeStyles>
                    <div className={`speaksync-root ${hideHeader ? '' : 'h-full'}`}>
                        <LanguageProvider>
                            <AppContextProvider>
                                <SettingsProvider>
                                    <TemplateProvider>
                                        <StudyProvider>
                                            <ReportProvider>
                                                <SpeakSyncContent hideHeader={hideHeader} activeTab={activeTab} onTabChange={onTabChange} viewOverride={viewOverride} onViewChange={onViewChange} />
                                            </ReportProvider>
                                        </StudyProvider>
                                    </TemplateProvider>
                                </SettingsProvider>
                            </AppContextProvider>
                        </LanguageProvider>
                    </div>
                </GlobalThemeStyles>
            </ThemeBridgeProvider>
        </ErrorBoundary>
    );
};

export default SpeakSyncWrapper;
