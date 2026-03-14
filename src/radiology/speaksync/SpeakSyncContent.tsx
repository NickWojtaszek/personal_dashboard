import React, { useEffect } from 'react';
import { useApp } from './context/AppContext';
import ErrorBoundary from './components/ErrorBoundary';
import MainPage from './pages/MainPage';
import SettingsPage from './pages/SettingsPage';
import AIConfigurationPage from './pages/AIConfigurationPage';
import type { MainTab } from './pages/MainPage';
import type { SpeakSyncView } from './SpeakSyncWrapper';

interface SpeakSyncContentProps {
    hideHeader?: boolean;
    activeTab?: MainTab;
    onTabChange?: (tab: MainTab) => void;
    viewOverride?: SpeakSyncView;
    onViewChange?: (view: SpeakSyncView) => void;
}

/**
 * SpeakSync internal view router.
 */
const SpeakSyncContent: React.FC<SpeakSyncContentProps> = ({ hideHeader, activeTab, onTabChange, viewOverride, onViewChange }) => {
    const { view, setView } = useApp();

    // Sync external view override with internal AppContext view
    useEffect(() => {
        if (viewOverride && viewOverride !== view) {
            setView(viewOverride as any);
        }
    }, [viewOverride]);

    // Notify parent when internal view changes
    useEffect(() => {
        if (onViewChange && view !== viewOverride) {
            onViewChange(view as SpeakSyncView);
        }
    }, [view]);

    switch (view) {
        case 'settings':
            return (
                <ErrorBoundary resetKeys={[view]}>
                    <SettingsPage embedded={hideHeader} />
                </ErrorBoundary>
            );
        case 'aiconfig':
            return (
                <ErrorBoundary resetKeys={[view]}>
                    <AIConfigurationPage />
                </ErrorBoundary>
            );
        case 'main':
        default:
            return (
                <ErrorBoundary resetKeys={[view]}>
                    <MainPage hideHeader={hideHeader} activeTabOverride={activeTab} onTabChange={onTabChange} />
                </ErrorBoundary>
            );
    }
};

export default SpeakSyncContent;
