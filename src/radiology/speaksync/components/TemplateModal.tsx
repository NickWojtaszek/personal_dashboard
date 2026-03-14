import React, { useState, useEffect } from 'react';
import type { Template, StudyType, Scenario } from '../types';
import { useTranslations } from '../context/LanguageContext';
import { useTemplate } from '../context/TemplateContext';
import { useApp } from '../context/AppContext';

const TemplateModal: React.FC = () => {
  const { t } = useTranslations();
  const { isOpen, onClose, editingTemplate } = useApp().templateModal;
  const { saveTemplate, studyTypes, scenarios } = useTemplate();

  const [title, setTitle] = useState('');
  const [studyType, setStudyType] = useState<StudyType>('');
  const [scenario, setScenario] = useState<Scenario>('');
  const [content, setContent] = useState('');
  const [availableScenarios, setAvailableScenarios] = useState<Scenario[]>([]);

  useEffect(() => {
    if (editingTemplate) {
      setTitle(editingTemplate.title);
      setStudyType(editingTemplate.studyType);
      setScenario(editingTemplate.scenario);
      setContent(editingTemplate.content);
    } else {
      setTitle('');
      setStudyType(templateData.studyTypes[0] || '');
      setScenario('');
      setContent('');
    }
  }, [editingTemplate, isOpen]);
  
  const templateData = { studyTypes, scenarios };

  useEffect(() => {
    if (studyType && templateData.scenarios[studyType]) {
      setAvailableScenarios(templateData.scenarios[studyType]);
    } else {
      setAvailableScenarios([]);
    }
    if (studyType && !templateData.scenarios[studyType]?.includes(scenario)) {
        setScenario('');
    }
  }, [studyType, templateData.scenarios, scenario]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !studyType) {
      alert(t('templateModal.requiredFields'));
      return;
    }
    saveTemplate({
      id: editingTemplate?.id,
      title,
      studyType,
      scenario: scenario || 'General',
      content,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">{editingTemplate ? t('templateModal.editTitle') : t('templateModal.addTitle')}</h2>
        </div>
        <form onSubmit={handleSave} className="flex-grow overflow-y-auto">
          <div className="p-6 space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1">{t('templateModal.templateTitle')}</label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="studyType" className="block text-sm font-medium text-gray-300 mb-1">{t('templateModal.studyType')}</label>
                    <select
                        id="studyType"
                        value={studyType}
                        onChange={e => setStudyType(e.target.value)}
                        className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    >
                        <option value="" disabled>{t('templateModal.selectStudyType')}</option>
                        {templateData.studyTypes.map(st => <option key={st} value={st}>{t(`studyTypes.${st}`, st)}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="scenario" className="block text-sm font-medium text-gray-300 mb-1">{t('templateModal.clinicalScenario')}</label>
                    <select
                        id="scenario"
                        value={scenario}
                        onChange={e => setScenario(e.target.value)}
                        className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={availableScenarios.length === 0}
                    >
                         <option value="">{availableScenarios.length === 0 ? t('templateModal.noScenarios') : t('templateModal.selectScenario')}</option>
                         {availableScenarios.map(sc => <option key={sc} value={sc}>{t(`scenarios.${sc}`, sc)}</option>)}
                    </select>
                </div>
            </div>
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-300 mb-1">{t('templateModal.templateContent')}</label>
              <textarea
                id="content"
                value={content}
                onChange={e => setContent(e.target.value)}
                className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                rows={12}
                placeholder={t('templateModal.templateContentPlaceholder')}
              />
            </div>
          </div>
          <div className="p-4 border-t border-gray-700 bg-gray-800/50 flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md text-white font-semibold transition-colors">{t('templateModal.cancel')}</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white font-semibold transition-colors">{editingTemplate ? t('templateModal.saveChanges') : t('templateModal.addTemplate')}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TemplateModal;