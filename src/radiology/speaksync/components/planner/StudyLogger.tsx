
import React, { useState, useMemo } from 'react';
import { useStudy } from '../../context/StudyContext';
import { useTranslations } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { PlusIcon, TrashIcon } from '../Icons';

interface StudyLoggerProps {
    selectedDate: Date;
}

const StudyLogger: React.FC<StudyLoggerProps> = ({ selectedDate }) => {
    const { t } = useTranslations();
    const { currentTheme } = useTheme();
    const { studies, addStudy, deleteStudy, radiologyCodes } = useStudy();
    const [code, setCode] = useState('');
    const [patientId, setPatientId] = useState('');
    const [lastPatientId, setLastPatientId] = useState(''); // To auto-increment or persist context if needed

    const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;

    const studiesForDay = useMemo(() => {
        return studies
            .filter(s => s.date.startsWith(dateStr))
            .sort((a, b) => b.id - a.id); // Newest first
    }, [studies, dateStr]);

    const pointsForDay = useMemo(() => studiesForDay.reduce((sum, s) => sum + s.points, 0), [studiesForDay]);

    const frequentCodes = useMemo(() => {
        const frequency: Record<string, number> = {};
        studies.forEach(s => { frequency[s.code] = (frequency[s.code] || 0) + 1 });
        return Object.entries(frequency).sort((a, b) => b[1] - a[1]).slice(0, 5).map(e => e[0]);
    }, [studies]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const success = addStudy(code, patientId || lastPatientId, dateStr);
        if (success) {
            setLastPatientId(patientId);
            setPatientId('');
            setCode('');
        } else {
            alert(t('editor.quickEntry.unknownCode'));
        }
    };

    return (
        <div className="flex flex-col h-full" style={{ backgroundColor: currentTheme.colors.bgPrimary }}>
            <div className="p-4" style={{ borderBottomColor: currentTheme.colors.borderColor, borderBottomWidth: '1px' }}>
                <h3 className="text-lg font-bold mb-1" style={{ color: currentTheme.colors.textPrimary }}>
                    {selectedDate.toLocaleDateString(t('langName') === 'Polski' ? 'pl' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
                <div className="text-sm font-mono" style={{ color: currentTheme.colors.accentPrimary }}>
                    {pointsForDay.toFixed(1)} pts / {studiesForDay.length} studies
                </div>
            </div>

            <div className="p-4" style={{ borderBottomColor: currentTheme.colors.borderColor, borderBottomWidth: '1px', backgroundColor: `${currentTheme.colors.bgSecondary}80` }}>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={code}
                            onChange={e => setCode(e.target.value)}
                            placeholder={t('editor.quickEntry.studyCode')}
                            className="w-20 p-2 rounded text-center font-mono focus:ring-2 outline-none"
                            style={{ backgroundColor: currentTheme.colors.bgPrimary, borderColor: currentTheme.colors.borderColor, borderWidth: '1px', color: currentTheme.colors.textPrimary }}
                            maxLength={3}
                            autoFocus
                        />
                        <input
                            type="text"
                            value={patientId}
                            onChange={e => setPatientId(e.target.value)}
                            placeholder={t('editor.quickEntry.patientId')}
                            className="flex-grow p-2 rounded focus:ring-2 outline-none"
                            style={{ backgroundColor: currentTheme.colors.bgPrimary, borderColor: currentTheme.colors.borderColor, borderWidth: '1px', color: currentTheme.colors.textPrimary }}
                        />
                        <button type="submit" className="p-2 text-white rounded" style={{ backgroundColor: currentTheme.colors.buttonPrimary }}>
                            <PlusIcon className="h-6 w-6"/>
                        </button>
                    </div>
                    
                    {frequentCodes.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {frequentCodes.map(c => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setCode(c)}
                                    className="px-2 py-1 text-xs rounded font-mono transition-colors"
                                    style={{ backgroundColor: currentTheme.colors.bgTertiary, color: currentTheme.colors.textSecondary, borderColor: currentTheme.colors.borderColor, borderWidth: '1px' }}
                                >
                                    {c}
                                </button>
                            ))}
                        </div>
                    )}
                </form>
            </div>

            <div className="flex-grow overflow-y-auto p-2 space-y-2">
                {studiesForDay.map(study => (
                    <div key={study.id} className="flex items-center justify-between p-3 rounded transition-colors group" style={{ backgroundColor: `${currentTheme.colors.bgSecondary}50`, borderColor: currentTheme.colors.borderColor, borderWidth: '1px' }}>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-mono font-bold" style={{ color: currentTheme.colors.accentPrimary }}>{study.code}</span>
                                <span className="text-sm" style={{ color: currentTheme.colors.textSecondary }}>| {study.patientId}</span>
                            </div>
                            <div className="text-xs truncate max-w-[200px]" style={{ color: currentTheme.colors.textMuted }}>{study.desc}</div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold" style={{ color: currentTheme.colors.textSecondary }}>{study.points.toFixed(1)}</span>
                            <button 
                                onClick={() => deleteStudy(study.id)}
                                className="text-red-400 opacity-0 group-hover:opacity-100 p-1 rounded transition-all"
                            >
                                <TrashIcon className="h-4 w-4"/>
                            </button>
                        </div>
                    </div>
                ))}
                {studiesForDay.length === 0 && (
                    <div className="text-center py-10 italic" style={{ color: currentTheme.colors.textMuted }}>
                        {t('studyManager.noStudies')}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudyLogger;
