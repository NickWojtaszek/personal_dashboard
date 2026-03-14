import React, { useState } from 'react';
import SpeakSyncWrapper from '../radiology/speaksync/SpeakSyncWrapper';
import type { MainTab } from '../radiology/speaksync/SpeakSyncWrapper';
import type { SpeakSyncView } from '../radiology/speaksync/SpeakSyncWrapper';
import Button from './ui/Button';

const TAB_OPTIONS: { value: MainTab; label: string }[] = [
    { value: 'editor', label: 'Editor' },
    { value: 'planner', label: 'Planner' },
    { value: 'codes', label: 'Codes' },
    { value: 'reports', label: 'Reports' },
];

interface DictationPageProps {
    theme: 'light' | 'dark';
}

const DictationPage: React.FC<DictationPageProps> = ({ theme }) => {
    const [activeTab, setActiveTab] = useState<MainTab>('editor');
    const [view, setView] = useState<SpeakSyncView>('main');

    const handleSettingsClick = () => {
        setView(view === 'settings' ? 'main' : 'settings');
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                        {view === 'settings' ? 'Dictation Settings' : 'Voice Dictation'}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
                        {view === 'settings'
                            ? 'Configure speech recognition, AI providers, and display preferences.'
                            : 'Radiology report editor with speech-to-text and AI enhancement.'}
                    </p>
                </div>
                <div className="flex items-center gap-2 self-start">
                    {view === 'main' && (
                        <div className="p-1 bg-slate-100 dark:bg-slate-700/50 rounded-lg flex items-center gap-1">
                            {TAB_OPTIONS.map(opt => (
                                <Button
                                    key={opt.value}
                                    variant={activeTab === opt.value ? 'primary' : 'ghost'}
                                    size="sm"
                                    onClick={() => setActiveTab(opt.value)}
                                >
                                    {opt.label}
                                </Button>
                            ))}
                        </div>
                    )}
                    <button
                        onClick={handleSettingsClick}
                        className={`p-2 rounded-lg transition-colors ${
                            view === 'settings'
                                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                        aria-label="Settings"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Content card */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                <SpeakSyncWrapper
                    theme={theme}
                    hideHeader
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    viewOverride={view}
                    onViewChange={setView}
                />
            </div>
        </div>
    );
};

export default DictationPage;
