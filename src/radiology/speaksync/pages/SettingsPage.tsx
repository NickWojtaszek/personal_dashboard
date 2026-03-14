import React, { useState, useRef, useEffect } from 'react';
import type { CustomCommand, AIPromptConfig, ColorSettings, LayoutDensity } from '../types';
import { TrashIcon, ArrowLeftIcon, ImportIcon, UploadIcon, ChevronDownIcon, SparklesIcon, BrainIcon } from '../components/Icons';
import { radiologyTerms } from '../data/radiologyTerms';
import { useTranslations } from '../context/LanguageContext';
import { useApp } from '../context/AppContext';
import { useSettings } from '../context/SettingsContext';
import { useTemplate } from '../context/TemplateContext';
import { useStudy } from '../context/StudyContext';
import { useTheme } from '../context/ThemeContext';
import StyleTrainingManager from '../components/StyleTrainingManager';
import ConfirmationModal from '../components/ConfirmationModal';

const Slider: React.FC<{
  label: string;
  value: number;
  onChange: (value: number) => void;
  descriptions: string[];
  min?: number;
  max?: number;
}> = ({ label, value, onChange, descriptions, min = 1, max = 5 }) => {
  const description = descriptions[value - min] || '';
  return (
    <div>
      <label className="block text-lg font-medium text-gray-200 mb-2">{label}</label>
      <div className="flex items-center gap-4">
        <span className="text-sm font-mono text-gray-400">{min}</span>
        <input
          type="range"
          min={min}
          max={max}
          step="1"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer custom-slider"
        />
        <span className="text-sm font-mono text-gray-400">{max}</span>
      </div>
      <div className="text-xs text-gray-400 mt-2 bg-gray-900/50 p-3 rounded-md min-h-[50px] flex items-center">{description}</div>
    </div>
  );
};

const ToggleSwitch: React.FC<{
    label: string;
    description: string;
    enabled: boolean;
    onChange: () => void;
}> = ({ label, description, enabled, onChange }) => {
  const { currentTheme } = useTheme();
  return (
    <div
      onClick={onChange}
      className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg cursor-pointer hover:bg-gray-700/50"
    >
      <div className="flex-grow mr-4">
        <h4 className="font-semibold text-gray-100">{label}</h4>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <div
        role="switch"
        aria-checked={enabled}
        className="relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out"
        style={{ backgroundColor: enabled ? currentTheme.colors.buttonPrimary : currentTheme.colors.bgTertiary }}
      >
        <span
          className={`${enabled ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out`}
        />
      </div>
    </div>
  );
};


const SettingsPage: React.FC<{ embedded?: boolean }> = ({ embedded }) => {
  const { setView, setConfirmationState, closeConfirmation, confirmationState } = useApp();
  const { currentTheme } = useTheme();
  const {
      customCommands, setCustomCommands, aiPromptConfig, setAiPromptConfig, colorSettings, setColorSettings,
      layoutDensity, setLayoutDensity, hotkeys, setHotkeys
  } = useSettings();
  const {
      clearTemplateData, importTemplates, importTexterTemplates, exportTemplates
  } = useTemplate();
  const {
      exportStudyData, importStudyData
  } = useStudy();

  const [message, setMessage] = useState<string>('');
  const [isAiConfigOpen, setIsAiConfigOpen] = useState(true);
  const vocabFileInputRef = useRef<HTMLInputElement>(null);
  const templateFileInputRef = useRef<HTMLInputElement>(null);
  const texterTemplateFileInputRef = useRef<HTMLInputElement>(null);
  const plannerDataFileInputRef = useRef<HTMLInputElement>(null);
  const { t, language, setLanguage, supportedLanguages } = useTranslations();
  
  useEffect(() => {
    document.documentElement.style.setProperty('--voice-color', colorSettings.voice);
    document.documentElement.style.setProperty('--pasted-color', colorSettings.pasted);
    document.documentElement.style.setProperty('--dragged-color', colorSettings.dragged || '#fde047');
  }, [colorSettings]);

  const handleAddCommand = () => {
    setCustomCommands([...customCommands, { id: crypto.randomUUID(), spoken: '', replacement: '' }]);
  };

  const handleUpdateCommand = (id: string, field: 'spoken' | 'replacement', value: string) => {
    setCustomCommands(customCommands.map(cmd => cmd.id === id ? { ...cmd, [field]: value } : cmd));
  };
  
  const handleDeleteCommand = (id: string) => {
    setCustomCommands(customCommands.filter(cmd => cmd.id !== id));
  };

  const handlePromptConfigChange = (field: keyof AIPromptConfig, value: number | boolean) => {
    setAiPromptConfig({ ...aiPromptConfig, [field]: value });
  };
  
  const showMessage = (text: string, duration: number = 4000) => {
    setMessage(text);
    setTimeout(() => setMessage(''), duration);
  };

  const handleImportRadiologyTerms = () => {
    const newCommands = radiologyTerms
      .filter(term => !customCommands.some(cmd => cmd.replacement.toLowerCase() === term.toLowerCase()))
      .map(term => ({
        id: crypto.randomUUID(),
        spoken: term.toLowerCase(),
        replacement: term,
      }));

    if (newCommands.length > 0) {
      setCustomCommands([...customCommands, ...newCommands]);
      showMessage(t('settings.importSuccess', {count: newCommands.length}));
    } else {
      showMessage(t('settings.importNoNew'));
    }
  };

  const handleVocabFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;
      const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
      const uniqueNewTerms = [...new Set(lines)];
      const existingReplacements = new Set(customCommands.map(cmd => cmd.replacement.toLowerCase()));
      const commandsToAdd = uniqueNewTerms
        .filter(term => !existingReplacements.has(term.toLowerCase()))
        .map(term => ({ id: crypto.randomUUID(), spoken: term.toLowerCase(), replacement: term }));
      
      if(commandsToAdd.length > 0) {
        setCustomCommands([...customCommands, ...commandsToAdd]);
        showMessage(t('settings.importFromFileSuccess', {count: commandsToAdd.length}));
      } else {
        showMessage(t('settings.importFromFileNoNew'));
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleExportToFile = () => {
    if (customCommands.length === 0) { showMessage(t('settings.exportNoTerms')); return; }
    const content = customCommands.map(cmd => cmd.replacement).join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vocabulary-${language}.txt`;
    document.body.appendChild(link);
    link.click();
    URL.revokeObjectURL(url);
    link.remove();
    showMessage(t('settings.exportSuccess'));
  };

  const handleTemplateFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const text = e.target?.result as string;
            if (!text) throw new Error("File is empty");
            const templatesRaw = text.split('---TEMPLATE_START---').filter(t => t.trim());
            const parsedTemplates = templatesRaw.map(raw => {
                const parts = raw.split('---CONTENT_START---');
                if (parts.length !== 2) return null;
                const [metaRaw, contentRaw] = parts;
                const content = contentRaw.split('---TEMPLATE_END---')[0].trim();
                const meta: { [key: string]: string } = {};
                metaRaw.trim().split('\n').forEach(line => {
                    const [key, ...valueParts] = line.split(':');
                    if (key && valueParts.length > 0) meta[key.trim()] = valueParts.join(':').trim();
                });
                if (meta.title && meta.studyType) return { title: meta.title, studyType: meta.studyType, scenario: meta.scenario || 'General', content };
                return null;
            }).filter(Boolean);

            const count = importTemplates(parsedTemplates as any);
            showMessage(count > 0 ? t('settings.importTemplatesSuccess', { count }) : t('settings.importTemplatesNoNew'));
        } catch (error) { showMessage(t('settings.importTemplatesError')); }
    };
    reader.readAsText(file);
    event.target.value = '';
  };
  
  const handleTexterTemplateFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const text = e.target?.result as string;
            if (!text) throw new Error("File is empty");
            const data = JSON.parse(text);
            const count = importTexterTemplates(data);
            showMessage(count > 0 ? t('settings.importTemplatesSuccess', { count }) : t('settings.importTemplatesNoNew'));
        } catch (error) { showMessage(t('settings.importTemplatesError')); }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleExportTemplates = () => {
      const content = exportTemplates();
      if (!content) { showMessage(t('settings.exportNoTemplates')); return; }
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `templates-${language}.txt`;
      link.click();
      URL.revokeObjectURL(url);
      showMessage(t('settings.exportTemplatesSuccess'));
  };

  const handleExportPlannerData = () => {
    const data = exportStudyData();
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
    link.download = `planner-data-${timestamp}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showMessage('Planner data exported successfully!');
  };

  const handleImportPlannerData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = JSON.parse(e.target?.result as string);
        importStudyData(jsonData, () => {
          showMessage(t('settings.dataManagement.importSuccess'));
        });
      } catch (error) {
        showMessage(t('settings.dataManagement.importError'));
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleRequestClearData = () => {
    setConfirmationState({
        isOpen: true,
        title: t('settings.dangerZone.confirmTitle'),
        message: t('settings.dangerZone.confirmMessage', { lang: supportedLanguages[language].name }),
        onConfirm: () => {
            clearTemplateData();
            setCustomCommands([]);
            closeConfirmation();
        }
    });
  };

  const handleBack = () => {
    setView('main');
    closeConfirmation();
  };

  const densities: LayoutDensity[] = ['compact', 'comfortable', 'spacious'];

  // Re-used HotkeyInput component
  const HotkeyInput: React.FC<{
    label: string;
    value: string;
    onChange: (value: string) => void;
  }> = ({ label, value, onChange }) => {
    const [recording, setRecording] = useState(false);
    const { t } = useTranslations();
    const buttonRef = useRef<HTMLButtonElement>(null);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Tab') {
            setRecording(false);
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        const key = e.key;
        
        if (key === 'Escape') {
            setRecording(false);
            buttonRef.current?.blur();
            return;
        }

        if (key === 'Backspace' || key === 'Delete') {
            onChange('');
            setRecording(false);
            buttonRef.current?.blur();
            return;
        }
        
        // Ignore single modifier key presses
        if (['Control', 'Shift', 'Alt', 'Meta'].includes(key)) return;

        // Block Function keys (F1-F12) as per requirement
        if (/^F\d+$/.test(key)) {
            alert(t('settings.hotkeys.functionKeysBlocked'));
            setRecording(false);
            return;
        }

        const modifiers = [];
        if (e.ctrlKey) modifiers.push('Ctrl');
        if (e.altKey) modifiers.push('Alt');
        if (e.shiftKey) modifiers.push('Shift');
        if (e.metaKey) modifiers.push('Meta');

        if (modifiers.length === 0 && key.length === 1 && /[a-z0-9]/i.test(key)) {
             // Block single letter/number keys to prevent typing conflicts
             alert(t('settings.hotkeys.modifierRequired'));
             return;
        }

        let keyLabel = key;
        if (key === ' ') keyLabel = 'Space';
        
        const combo = [...modifiers, keyLabel.toUpperCase()].join('+');
        onChange(combo);
        setRecording(false);
        buttonRef.current?.blur();
    };

    return (
        <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-700/50 hover:border-gray-600 transition-colors">
            <span className="text-gray-300 font-medium">{label}</span>
            <div className="flex items-center gap-2">
                {value && (
                    <button
                        onClick={() => onChange('')}
                        className="p-2 text-gray-500 hover:text-red-400 transition-colors rounded-full hover:bg-gray-700/50"
                        title={t('settings.hotkeys.clear')}
                    >
                        <TrashIcon className="h-4 w-4" />
                    </button>
                )}
                <button
                    ref={buttonRef}
                    onClick={() => setRecording(true)}
                    onBlur={() => setRecording(false)}
                    onKeyDown={recording ? handleKeyDown : undefined}
                    className={`px-4 py-2 min-w-[120px] text-center rounded-md border text-sm font-mono transition-all duration-200 ${
                        recording 
                        ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_10px_rgba(147,51,234,0.5)] scale-105' 
                        : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:border-gray-500'
                    }`}
                >
                    {recording ? t('settings.hotkeys.recording') : value || t('settings.hotkeys.notSet')}
                </button>
            </div>
        </div>
    );
  };

  return (
    <main className={`text-gray-200 h-full overflow-auto p-4 font-sans ${embedded ? '' : 'bg-gray-900'}`}>
      <div className={`w-full pb-12 ${embedded ? '' : 'max-w-4xl mx-auto'}`}>
        {!embedded && (
        <header className="flex items-center mb-6">
          <button onClick={handleBack} className="mr-4 p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors" aria-label={t('settings.back')}>
            <ArrowLeftIcon />
          </button>
          <div className="flex-grow">
            <h1 className="text-3xl font-bold text-white">{t('settings.title')}</h1>
          </div>
        </header>
        )}

        <div className="space-y-8">
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <h2 className="text-xl font-semibold mb-2 text-gray-100">{t('settings.languageTitle')}</h2>
               <div className="flex gap-2">
                {Object.entries(supportedLanguages).map(([langCode, langData]) => (
                    <button
                        key={langCode}
                        onClick={() => setLanguage(langCode as any)}
                        style={{
                          backgroundColor: language === langCode ? currentTheme.colors.buttonPrimary : currentTheme.colors.bgTertiary,
                          color: language === langCode ? '#fff' : currentTheme.colors.textSecondary
                        }}
                        className="px-4 py-2 text-sm font-semibold rounded-md transition-colors"
                    >{(langData as any).name}</button>
                ))}
              </div>
            </div>

            {/* Layout Density */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <h2 className="text-xl font-semibold mb-2 text-gray-100">{t('settings.layoutDensityTitle')}</h2>
              <p className="text-xs text-gray-500 mb-4">{t('settings.layoutDensityDesc')}</p>
              <div className="flex gap-2">
                {densities.map((d) => (
                    <button
                        key={d}
                        onClick={() => setLayoutDensity(d)}
                        style={{
                          backgroundColor: layoutDensity === d ? currentTheme.colors.buttonPrimary : currentTheme.colors.bgTertiary,
                          color: layoutDensity === d ? '#fff' : currentTheme.colors.textSecondary
                        }}
                        className="px-4 py-2 text-sm font-semibold rounded-md transition-colors"
                    >
                        {t(`settings.density.${d}`)}
                    </button>
                ))}
              </div>
            </div>

            {/* Keyboard Shortcuts */}
            {(
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                <h2 className="text-xl font-semibold mb-2 text-gray-100">{t('settings.hotkeysTitle')}</h2>
                <p className="text-xs text-gray-500 mb-4">{t('settings.hotkeysDesc')}</p>
                <div className="space-y-3">
                    <HotkeyInput 
                        label={t('settings.hotkeys.toggleRecord')} 
                        value={hotkeys.toggleRecord} 
                        onChange={(val) => setHotkeys({...hotkeys, toggleRecord: val})} 
                    />
                    <HotkeyInput 
                        label={t('settings.hotkeys.triggerAI')} 
                        value={hotkeys.triggerAI} 
                        onChange={(val) => setHotkeys({...hotkeys, triggerAI: val})} 
                    />
                    <HotkeyInput 
                        label={t('settings.hotkeys.toggleLayout')} 
                        value={hotkeys.toggleLayout} 
                        onChange={(val) => setHotkeys({...hotkeys, toggleLayout: val})} 
                    />
                </div>
            </div>
            )}

            {(
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg">
                <button onClick={() => setIsAiConfigOpen(!isAiConfigOpen)} className="w-full flex justify-between items-center p-4 text-left">
                    <div className="flex items-center gap-3">
                        <SparklesIcon className="h-6 w-6 text-blue-400"/>
                        <div>
                            <h2 className="text-xl font-semibold text-gray-100">{t('settings.aiConfigTitle')}</h2>
                            <p className="text-xs text-gray-500">{t('settings.aiConfigDesc')}</p>
                        </div>
                    </div>
                    <ChevronDownIcon className={`transform transition-transform ${isAiConfigOpen ? 'rotate-180' : ''}`} />
                </button>
                {isAiConfigOpen && (
                    <div className="p-6 border-t border-gray-700 space-y-8">
                        {/* AI Provider Management Button */}
                        <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold text-blue-300 mb-1">AI Model Configuration</h3>
                                    <p className="text-sm text-gray-400">
                                        Configure AI providers (Google Gemini, OpenAI, Anthropic) and manage your API keys
                                    </p>
                                </div>
                                <button
                                    onClick={() => setView('aiconfig')}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors whitespace-nowrap"
                                >
                                    Manage AI Providers
                                </button>
                            </div>
                        </div>

                        <Slider label={t('settings.fluencyTitle')} value={aiPromptConfig.fluency} onChange={(v) => handlePromptConfigChange('fluency', v)} descriptions={[ t('settings.fluency.1'), t('settings.fluency.2'), t('settings.fluency.3'), t('settings.fluency.4'), t('settings.fluency.5') ]} />
                        <Slider label={t('settings.summarizationTitle')} value={aiPromptConfig.summarization} onChange={(v) => handlePromptConfigChange('summarization', v)} descriptions={[ t('settings.summarization.1'), t('settings.summarization.2'), t('settings.summarization.3'), t('settings.summarization.4'), t('settings.summarization.5') ]} />
                        <Slider label={t('settings.oncologyDetailTitle')} value={aiPromptConfig.oncologyDetail} onChange={(v) => handlePromptConfigChange('oncologyDetail', v)} descriptions={[ t('settings.oncologyDetail.1'), t('settings.oncologyDetail.2'), t('settings.oncologyDetail.3'), t('settings.oncologyDetail.4'), t('settings.oncologyDetail.5') ]} />
                        <Slider label={t('settings.conclusionDetailTitle')} value={aiPromptConfig.conclusionDetail} onChange={(v) => handlePromptConfigChange('conclusionDetail', v)} descriptions={[ t('settings.conclusionDetail.1'), t('settings.conclusionDetail.2'), t('settings.conclusionDetail.3') ]} min={1} max={3} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <ToggleSwitch label={t('settings.recistAnalysis')} description={t('settings.recistAnalysisDesc')} enabled={aiPromptConfig.useRECIST} onChange={() => handlePromptConfigChange('useRECIST', !aiPromptConfig.useRECIST)} />
                            <ToggleSwitch label={t('settings.tnmClassification')} description={t('settings.tnmClassificationDesc')} enabled={aiPromptConfig.useTNM} onChange={() => handlePromptConfigChange('useTNM', !aiPromptConfig.useTNM)} />
                        </div>

                        {/* AI Style Learning Management */}
                        <div className="mt-8 border-t border-gray-700 pt-6">
                            <StyleTrainingManager />
                        </div>
                    </div>
                )}
            </div>
            )}

            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <h2 className="text-xl font-semibold mb-2 text-gray-100">{t('settings.editorAppearanceTitle')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                  <div className="flex items-center justify-between"><label htmlFor="voice-color" className="text-gray-300">{t('settings.voiceColorLabel')}</label><input type="color" id="voice-color" value={colorSettings.voice} onChange={e => setColorSettings({...colorSettings, voice: e.target.value})} className="w-10 h-10 bg-transparent border-none cursor-pointer" /></div>
                  <div className="flex items-center justify-between"><label htmlFor="pasted-color" className="text-gray-300">{t('settings.pastedColorLabel')}</label><input type="color" id="pasted-color" value={colorSettings.pasted} onChange={e => setColorSettings({...colorSettings, pasted: e.target.value})} className="w-10 h-10 bg-transparent border-none cursor-pointer" /></div>
                  <div className="flex items-center justify-between"><label htmlFor="dragged-color" className="text-gray-300">{t('settings.draggedColorLabel')}</label><input type="color" id="dragged-color" value={colorSettings.dragged || '#fde047'} onChange={e => setColorSettings({...colorSettings, dragged: e.target.value})} className="w-10 h-10 bg-transparent border-none cursor-pointer" /></div>
              </div>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <h2 className="text-xl font-semibold mb-2 text-gray-100">{t('settings.dataManagementTitle')}</h2>
              <div className="space-y-4">
                <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700"><h3 className="font-semibold text-blue-300 mb-3">{t('settings.templateManagement')}</h3><div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><button onClick={() => texterTemplateFileInputRef.current?.click()} className="w-full flex items-center justify-center p-2 bg-blue-600/20 text-blue-300 border border-blue-500/50 rounded-md hover:bg-blue-600/30 transition-colors"><ImportIcon />{t('settings.importTemplatesJson')}</button><button onClick={() => templateFileInputRef.current?.click()} className="w-full flex items-center justify-center p-2 bg-blue-600/20 text-blue-300 border border-blue-500/50 rounded-md hover:bg-blue-600/30 transition-colors"><ImportIcon />{t('settings.importTemplatesTxt')}</button><button onClick={handleExportTemplates} className="w-full flex items-center justify-center p-2 bg-blue-600/20 text-blue-300 border border-blue-500/50 rounded-md hover:bg-blue-600/30 transition-colors"><UploadIcon />{t('settings.exportTemplatesTxt')}</button></div></div>
                <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700"><h3 className="font-semibold text-green-300 mb-3">{t('settings.vocabularyManagement')}</h3><div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><button onClick={handleImportRadiologyTerms} className="w-full flex items-center justify-center p-2 bg-green-600/20 text-green-300 border border-green-500/50 rounded-md hover:bg-green-600/30 transition-colors"><ImportIcon />{t('settings.importRadiology')}</button><button onClick={() => vocabFileInputRef.current?.click()} className="w-full flex items-center justify-center p-2 bg-green-600/20 text-green-300 border border-green-500/50 rounded-md hover:bg-green-600/30 transition-colors"><ImportIcon />{t('settings.importFromFile')}</button><button onClick={handleExportToFile} className="w-full flex items-center justify-center p-2 bg-green-600/20 text-green-300 border border-green-500/50 rounded-md hover:bg-green-600/30 transition-colors"><UploadIcon />{t('settings.exportToFile')}</button></div></div>
                <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                  <h3 className="font-semibold text-yellow-300 mb-3">Planner Data (Developer)</h3>
                  <p className="text-xs text-gray-400 mb-3">Backup your studies and planned days during testing</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button onClick={() => plannerDataFileInputRef.current?.click()} className="w-full flex items-center justify-center p-2 bg-yellow-600/20 text-yellow-300 border border-yellow-500/50 rounded-md hover:bg-yellow-600/30 transition-colors">
                      <ImportIcon />
                      Import Planner Data
                    </button>
                    <button onClick={handleExportPlannerData} className="w-full flex items-center justify-center p-2 bg-yellow-600/20 text-yellow-300 border border-yellow-500/50 rounded-md hover:bg-yellow-600/30 transition-colors">
                      <UploadIcon />
                      Export Planner Data
                    </button>
                  </div>
                </div>
              </div>
              <input type="file" ref={vocabFileInputRef} onChange={handleVocabFileChange} accept=".txt" className="hidden" />
              <input type="file" ref={templateFileInputRef} onChange={handleTemplateFileChange} accept=".txt" className="hidden" />
              <input type="file" ref={texterTemplateFileInputRef} onChange={handleTexterTemplateFileChange} accept=".json" className="hidden" />
              <input type="file" ref={plannerDataFileInputRef} onChange={handleImportPlannerData} accept=".json" className="hidden" />
              {message && <p className="text-sm text-green-400 mt-4 text-center animate-fade-in">{message}</p>}
            </div>

            <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4">
                <h3 className="text-xl font-semibold mb-2 text-red-300">{t('settings.dangerZone.title')}</h3>
                <p className="text-xs text-red-400 mb-4">{t('settings.dangerZone.description')}</p>
                <button onClick={handleRequestClearData} className="w-full flex items-center justify-center gap-2 p-2 bg-red-600/80 text-white border border-red-500 rounded-md hover:bg-red-700 transition-colors font-semibold"><TrashIcon className="h-5 w-5" />{t('settings.dangerZone.clearButton')}</button>
            </div>

            {(
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <h2 className="text-xl font-semibold mb-2 text-gray-100">{t('settings.customCommandsTitle')}</h2>
              <div className="space-y-2">
                {customCommands.map((cmd) => (<div key={cmd.id} className="flex items-center gap-2"><input type="text" value={cmd.spoken} onChange={(e) => handleUpdateCommand(cmd.id, 'spoken', e.target.value)} placeholder={t('settings.spokenCommandPlaceholder')} className="flex-1 p-2 bg-gray-900 border border-gray-600 rounded-md text-sm" /><input type="text" value={cmd.replacement} onChange={(e) => handleUpdateCommand(cmd.id, 'replacement', e.target.value)} placeholder={t('settings.replacementTextPlaceholder')} className="flex-1 p-2 bg-gray-900 border border-gray-600 rounded-md text-sm" /><button onClick={() => handleDeleteCommand(cmd.id)} className="p-2 text-red-400 hover:bg-red-500/20 rounded-full transition-colors"><TrashIcon className="h-5 w-5" /></button></div>))}
              </div>
              <button onClick={handleAddCommand} className="mt-4 text-blue-300 text-sm font-semibold hover:text-blue-200">{t('settings.addCommand')}</button>
            </div>
            )}
        </div>
      </div>
      <ConfirmationModal
        isOpen={confirmationState.isOpen}
        title={confirmationState.title}
        message={confirmationState.message}
        onConfirm={confirmationState.onConfirm}
        onClose={closeConfirmation}
      />
    </main>
  );
};

export default SettingsPage;