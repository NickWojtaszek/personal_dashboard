import React, { useState } from 'react';
import RadiologyTemplatesPage from '../components/RadiologyTemplatesPage';
import SpeakSyncWrapper from './speaksync/SpeakSyncWrapper';

type SubTab = 'dictation' | 'templates';

interface RadiologyPageProps {
    theme: 'light' | 'dark';
}

const MicIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
    </svg>
);

const TemplateIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
);

const RadiologyPage: React.FC<RadiologyPageProps> = ({ theme }) => {
    const [subTab, setSubTab] = useState<SubTab>('dictation');

    return (
        <div className="h-full flex flex-col">
            {/* Sub-tab navigation */}
            <div className="flex items-center gap-4 mb-4">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Radiology</h1>
                <div className="p-1 bg-slate-100 dark:bg-slate-700/50 rounded-lg flex items-center gap-1">
                    <button
                        onClick={() => setSubTab('dictation')}
                        className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                            subTab === 'dictation'
                                ? 'bg-brand-primary text-white shadow'
                                : 'text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                    >
                        <MicIcon /> Voice Dictation
                    </button>
                    <button
                        onClick={() => setSubTab('templates')}
                        className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                            subTab === 'templates'
                                ? 'bg-brand-primary text-white shadow'
                                : 'text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                    >
                        <TemplateIcon /> Quick Templates
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-grow min-h-0">
                {subTab === 'dictation' ? (
                    <SpeakSyncWrapper theme={theme} />
                ) : (
                    <RadiologyTemplatesPage />
                )}
            </div>
        </div>
    );
};

export default RadiologyPage;
