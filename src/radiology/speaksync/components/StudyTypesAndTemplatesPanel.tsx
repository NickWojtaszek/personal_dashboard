
import React, { useState, useRef, useMemo } from 'react';
import type { StudyType, Template } from '../types';
import { DragHandleIcon, PencilIcon, TrashIcon, ChevronDownIcon, DuplicateIcon, SearchIcon, XCircleIcon, PlusIcon } from './Icons';
import { useTranslations } from '../context/LanguageContext';
import { useTemplate } from '../context/TemplateContext';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';

interface StudyTypesAndTemplatesPanelProps {
  onSelectTemplate: (template: Template) => void;
  onPreviewTemplate: (template: Template) => void;
}

const StudyTypesAndTemplatesPanel: React.FC<StudyTypesAndTemplatesPanelProps> = ({ onSelectTemplate, onPreviewTemplate }) => {
  const { 
      templates, studyTypes, addStudyType, updateStudyType, 
      deleteStudyType, reorderStudyTypes, cloneTemplate, deleteTemplate, reorderTemplates
  } = useTemplate();
  const { templateModal: { setEditingTemplate, setIsOpen: setIsModalOpen }, setConfirmationState, closeConfirmation } = useApp();
  const { currentTheme } = useTheme();
  
  const [expandedStudyType, setExpandedStudyType] = useState<StudyType | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);
  const [newStudyTypeName, setNewStudyTypeName] = useState('');
  const [editingName, setEditingName] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const { t } = useTranslations();
  const [searchQuery, setSearchQuery] = useState('');

  const dragStudyTypeIndex = useRef<number | null>(null);
  const dragOverStudyTypeIndex = useRef<number | null>(null);
  const dragTemplateId = useRef<string | null>(null);

  const templatesToDisplay = useMemo(() => {
    if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return templates.filter(t => t.title.toLowerCase().includes(query) || t.content.toLowerCase().includes(query));
    }
    return templates;
  }, [templates, searchQuery]);
  
  const displayStudyTypes = useMemo(() => {
      const allTypes = new Set(studyTypes);
      // Ensure study types for visible templates are shown, even if not in the user's explicit list (e.g. system templates)
      templatesToDisplay.forEach(t => allTypes.add(t.studyType));
      
      const sortedUserTypes = [...studyTypes];
      const systemOnlyTypes = Array.from(allTypes).filter(type => !studyTypes.includes(type));
      
      // Filter out types that have no templates if a search is active
      const combinedTypes = [...sortedUserTypes, ...systemOnlyTypes];
      if (searchQuery.trim()) {
          return combinedTypes.filter(st => templatesToDisplay.some(t => t.studyType === st));
      }
      return combinedTypes;
  }, [studyTypes, templatesToDisplay, searchQuery]);


  const handleToggleEditMode = () => setEditMode(!editMode);
  const handleToggleReorderMode = () => setReorderMode(!reorderMode);

  const handleAddStudyTypeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addStudyType(newStudyTypeName);
    setNewStudyTypeName('');
  };
  
  const handleEditStudyTypeSubmit = (e: React.FormEvent, index: number) => {
    e.preventDefault();
    updateStudyType(index, editingName);
    setEditingIndex(null);
    setEditingName('');
  };

  const handleStudyTypeDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    dragStudyTypeIndex.current = index;
    e.dataTransfer.effectAllowed = 'move';
  };
  
  const handleStudyTypeDragEnd = () => {
    if (dragStudyTypeIndex.current !== null && dragOverStudyTypeIndex.current !== null) {
        reorderStudyTypes(dragStudyTypeIndex.current, dragOverStudyTypeIndex.current);
    }
    dragStudyTypeIndex.current = null;
    dragOverStudyTypeIndex.current = null;
  };

  const handleTemplateDragStart = (e: React.DragEvent<HTMLDivElement>, template: Template) => {
    e.stopPropagation();
    dragTemplateId.current = template.id;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleTemplateDrop = (e: React.DragEvent<HTMLDivElement>, targetTemplateId: string) => {
    e.stopPropagation();
    if (dragTemplateId.current && dragTemplateId.current !== targetTemplateId) {
      reorderTemplates(dragTemplateId.current, targetTemplateId);
    }
    dragTemplateId.current = null;
    e.currentTarget.classList.remove('border-blue-500', 'border-2');
  };

  const handleEditTemplate = (e: React.MouseEvent, template: Template) => {
    e.stopPropagation();
    setEditingTemplate(template);
    setIsModalOpen(true);
  };

  const handleCloneTemplate = (e: React.MouseEvent, template: Template) => {
    e.stopPropagation();
    cloneTemplate(template);
    setExpandedStudyType(template.studyType);
  };

  const handleActionClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  const handleDeleteTemplate = (e: React.MouseEvent, template: Template) => {
    e.stopPropagation();
    setConfirmationState({
      isOpen: true,
      title: t('templates.deleteConfirm'),
      message: `Are you sure you want to delete the template "${template.title}"? This action cannot be undone.`,
      onConfirm: () => {
        deleteTemplate(template.id);
        closeConfirmation();
      }
    });
  };

  const renderTemplateItem = (template: Template) => (
    <div
      key={template.id}
      onClick={() => onPreviewTemplate(template)}
      onDoubleClick={() => onSelectTemplate(template)}
      draggable={!editMode}
      onDragStart={(e) => !editMode && handleTemplateDragStart(e, template)}
      onDrop={(e) => !editMode && handleTemplateDrop(e, template.id)}
      onDragOver={(e) => !editMode && e.preventDefault()}
      onDragEnter={(e) => !editMode && e.currentTarget.classList.add('border-blue-500', 'border-2')}
      onDragLeave={(e) => !editMode && e.currentTarget.classList.remove('border-blue-500', 'border-2')}
      className="group rounded-lg p-3 transition-all flex items-center gap-3 cursor-pointer"
      style={{ backgroundColor: currentTheme.colors.bgPrimary, borderColor: currentTheme.colors.borderColor, borderWidth: '1px' }}
    >
      {!editMode && <DragHandleIcon className="flex-shrink-0 h-5 w-5" style={{ color: currentTheme.colors.textSecondary }} />}
      <div className="flex-grow min-w-0">
          <h4 className="font-semibold group-hover:text-blue-300 truncate" style={{ color: currentTheme.colors.textPrimary }}>{template.title}</h4>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: currentTheme.colors.accentSuccess, backgroundColor: `${currentTheme.colors.accentSuccess}30` }}>{t(`scenarios.${template.scenario}`, template.scenario || t('templates.general'))}</span>
          </div>
      </div>
      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={(e) => handleEditTemplate(e, template)} className="p-1.5 rounded transition-all template-btn-icon" title={t('templates.edit')} style={{ color: currentTheme.colors.textSecondary }}><PencilIcon /></button>
          <button onClick={(e) => handleCloneTemplate(e, template)} className="p-1.5 rounded transition-all template-btn-icon" title={t('templates.clone')} style={{ color: currentTheme.colors.textSecondary }}><DuplicateIcon /></button>
          <button onClick={(e) => handleDeleteTemplate(e, template)} className="p-1.5 rounded transition-all template-btn-icon" title={t('templates.delete')} style={{ color: currentTheme.colors.textSecondary }}><TrashIcon /></button>
      </div>
    </div>
  );

  const renderStudyTypeAccordionItem = (st: StudyType) => {
    // If searching, force expand. Otherwise check state.
    const isExpanded = searchQuery.trim() ? true : expandedStudyType === st;
    const templatesForType = templatesToDisplay.filter(t => t.studyType === st);
    const count = templatesForType.length;
    const title = t(`studyTypes.${st}`, st);

    if (count === 0 && !searchQuery.trim()) return null;

    return (
      <div key={st} className="bg-gray-800 rounded-lg border border-gray-700/50 overflow-hidden">
        <button onClick={() => setExpandedStudyType(isExpanded && !searchQuery.trim() ? null : st)} className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-700/30 transition-colors">
          <span className="font-semibold text-white">{title}</span>
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 text-xs rounded-full bg-gray-700 text-gray-300">{count}</span>
            <ChevronDownIcon className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </div>
        </button>
        {isExpanded && (
          <div className="p-2 border-t border-gray-700/50">
            {templatesForType.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {templatesForType.map(renderTemplateItem)}
                </div>
            ) : (
                <p className="text-center text-gray-500 py-4 text-sm">{t('templates.noTemplates')}</p>
            )}
          </div>
        )}
      </div>
    );
  };
  
  const renderEditView = () => (
    <>
      {studyTypes.map((st, index) => (
        <div key={st} className="mb-2">
          {editingIndex === index ? (
            <form onSubmit={(e) => handleEditStudyTypeSubmit(e, index)} className="flex items-center gap-2">
              <input type="text" value={editingName} onChange={(e) => setEditingName(e.target.value)} className="flex-grow p-2 bg-gray-900 border border-blue-500 rounded-md text-sm" autoFocus />
              <button type="submit" className="p-2 bg-green-600/50 rounded-md text-sm">{t('studyTypes.save')}</button>
            </form>
          ) : (
            <div className="flex items-center justify-between p-3 rounded-md bg-gray-700/50">
              <span className="font-medium">{t(`studyTypes.${st}`, st)}</span>
              <div className="flex gap-2">
                <button onClick={() => { setEditingIndex(index); setEditingName(st); }} className="p-1.5 text-blue-300 hover:bg-gray-600 rounded"><PencilIcon /></button>
                <button onClick={() => deleteStudyType(index)} className="p-1.5 text-red-400 hover:bg-gray-600 rounded"><TrashIcon /></button>
              </div>
            </div>
          )}
        </div>
      ))}
      <form onSubmit={handleAddStudyTypeSubmit} className="mt-4 p-2 border-t border-gray-700">
          <input type="text" value={newStudyTypeName} onChange={(e) => setNewStudyTypeName(e.target.value)} placeholder={t('studyTypes.addNew')} className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md text-sm mb-2" />
          <button type="submit" className="w-full p-2 bg-blue-600/50 rounded-md hover:bg-blue-600">{t('studyTypes.add')}</button>
      </form>
    </>
  );

  const renderReorderView = () => (
     studyTypes.map((st, index) => (
        <div 
          key={st}
          draggable
          onDragStart={(e) => handleStudyTypeDragStart(e, index)}
          onDragEnter={() => dragOverStudyTypeIndex.current = index}
          onDragEnd={handleStudyTypeDragEnd}
          onDragOver={(e) => e.preventDefault()}
          className="flex items-center p-3 rounded-md bg-gray-700/50 mb-1 cursor-move"
        >
          <DragHandleIcon className="h-5 w-5 text-gray-400 mr-3" />
          <span className="font-medium flex-grow">{t(`studyTypes.${st}`, st)}</span>
        </div>
      ))
  );

  return (
    <div className="rounded-lg flex flex-col h-full" style={{ backgroundColor: currentTheme.colors.bgSecondary, borderColor: currentTheme.colors.borderColor, borderWidth: '1px' }}>
      <div className="p-4" style={{ borderBottomColor: currentTheme.colors.borderColor, borderBottomWidth: '1px' }}>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-bold" style={{ color: currentTheme.colors.textPrimary }}>{t('templates.title')}</h2>
             <div className="flex gap-2">
                <button onClick={handleToggleEditMode} className={`p-2 rounded-full transition-colors ${editMode ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`} title={t('studyTypes.edit')}><PencilIcon className="h-5 w-5" /></button>
                <button onClick={handleToggleReorderMode} className={`p-2 rounded-full transition-colors ${reorderMode ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`} title={t('studyTypes.reorder')}><DragHandleIcon className="h-5 w-5" /></button>
            </div>
          </div>
          
          <div className="relative mb-4">
            <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('templates.searchPlaceholder')}
                className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-md text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
            {searchQuery && (
                <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-300"
                >
                    <XCircleIcon className="h-4 w-4" />
                </button>
            )}
          </div>

      </div>
      <div className="p-2 overflow-y-auto flex-grow">
        {editMode ? renderEditView() : reorderMode ? renderReorderView() : (
          <div className="space-y-2 h-full">
            {templatesToDisplay.length === 0 && !searchQuery ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-4" style={{ color: currentTheme.colors.textMuted }}>
                    <div className="p-4 rounded-full mb-4" style={{ backgroundColor: currentTheme.colors.bgPrimary }}>
                        <DuplicateIcon className="h-8 w-8" style={{ color: currentTheme.colors.textSecondary }} />
                    </div>
                    <p className="mb-4 text-sm">{t('templates.noTemplatesDesc')}</p>
                    <button 
                        onClick={() => {
                            setEditingTemplate(null);
                            setIsModalOpen(true);
                        }} 
                        className="flex items-center gap-2 px-4 py-2 rounded-md transition-colors"
                        style={{ backgroundColor: `${currentTheme.colors.accentPrimary}30`, color: currentTheme.colors.accentPrimary, borderColor: currentTheme.colors.accentPrimary, borderWidth: '1px' }}
                    >
                        <PlusIcon className="h-4 w-4" />
                        {t('app.addTemplate')}
                    </button>
                </div>
            ) : (
                displayStudyTypes.map(st => renderStudyTypeAccordionItem(st))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudyTypesAndTemplatesPanel;
