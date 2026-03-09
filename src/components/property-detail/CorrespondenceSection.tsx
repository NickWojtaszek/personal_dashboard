import React, { useState, useEffect } from 'react';
import type { PropertyInfo, CorrespondenceItem } from '../../types';
import { EnvelopeIcon, EditIcon, SaveIcon, TrashIcon, PlusIcon, ChevronRightIcon } from './Icons';
import { v4 as uuidv4 } from 'uuid';

interface CorrespondenceSectionProps {
    property: PropertyInfo;
    isEditing: boolean;
    onSetEditing: () => void;
    onSave: (property: PropertyInfo) => void;
    onCancel: () => void;
}

const CorrespondenceSection: React.FC<CorrespondenceSectionProps> = ({ property, isEditing, onSetEditing, onSave, onCancel }) => {
    const [editedCorrespondence, setEditedCorrespondence] = useState<CorrespondenceItem[]>([]);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        if (isEditing) {
            setEditedCorrespondence(JSON.parse(JSON.stringify(property.correspondence || [])));
        }
    }, [property, isEditing]);

    const handleSave = () => {
        onSave({ ...property, correspondence: editedCorrespondence });
    };

    const handleItemChange = (id: string, field: keyof Omit<CorrespondenceItem, 'id'>, value: string) => {
        setEditedCorrespondence(prev =>
            prev.map(item => item.id === id ? { ...item, [field]: value } : item)
        );
    };

    const addItem = () => {
        const newItem: CorrespondenceItem = {
            id: uuidv4(),
            date: new Date().toISOString().split('T')[0],
            from: '',
            to: '',
            subject: '',
            body: ''
        };
        setEditedCorrespondence(prev => [newItem, ...prev]);
    };

    const removeItem = (id: string) => {
        setEditedCorrespondence(prev => prev.filter(item => item.id !== id));
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return 'No Date';
        return new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    const inputClasses = "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition";
    const textareaClasses = `${inputClasses} font-mono`;

    if (isEditing) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-brand-primary/50 dark:border-brand-secondary/50">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold flex items-center gap-3"><EnvelopeIcon /> Editing Correspondence</h2>
                    <button onClick={addItem} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-sm font-semibold text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-colors">
                        <PlusIcon />
                        New Item
                    </button>
                </div>
                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                    {editedCorrespondence.length > 0 ? editedCorrespondence.map(item => (
                        <div key={item.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg space-y-3 relative">
                            <button type="button" onClick={() => removeItem(item.id)} className="absolute top-2 right-2 p-2 text-red-500 hover:text-red-700"><TrashIcon /></button>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <input type="date" value={item.date} onChange={e => handleItemChange(item.id, 'date', e.target.value)} className={inputClasses} />
                                <input type="text" placeholder="From" value={item.from} onChange={e => handleItemChange(item.id, 'from', e.target.value)} className={inputClasses} />
                                <input type="text" placeholder="To" value={item.to || ''} onChange={e => handleItemChange(item.id, 'to', e.target.value)} className={inputClasses} />
                            </div>
                            <input type="text" placeholder="Subject" value={item.subject} onChange={e => handleItemChange(item.id, 'subject', e.target.value)} className={inputClasses} />
                            <textarea placeholder="Body" value={item.body} onChange={e => handleItemChange(item.id, 'body', e.target.value)} rows={5} className={textareaClasses} />
                        </div>
                    )) : (
                         <p className="text-sm text-slate-500 dark:text-gray-400 text-center py-8">No correspondence items. Click 'New Item' to add one.</p>
                    )}
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                    <button onClick={onCancel} className="px-4 py-2 rounded-lg bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">Cancel</button>
                    <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-primary text-white font-semibold hover:bg-opacity-90 transition-colors">
                        <SaveIcon />
                        Save Correspondence
                    </button>
                </div>
            </div>
        );
    }

    const correspondence = (property.correspondence || []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-3"><EnvelopeIcon /> Correspondence</h2>
                <button
                    onClick={onSetEditing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/50 text-sm font-semibold text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                    <EditIcon />
                    <span>Edit</span>
                </button>
            </div>
            <div className="p-6 space-y-2">
                {correspondence.length > 0 ? correspondence.map(item => {
                    const isExpanded = expandedId === item.id;
                    return (
                        <div key={item.id} className="border border-slate-200 dark:border-slate-700 rounded-lg">
                            <button
                                onClick={() => setExpandedId(isExpanded ? null : item.id)}
                                className="w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex justify-between items-center"
                                aria-expanded={isExpanded}
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline">
                                        <p className="text-sm font-semibold text-slate-800 dark:text-gray-200 truncate">{item.from}</p>
                                        <p className="text-xs text-slate-500 dark:text-gray-400 ml-4 flex-shrink-0">{formatDate(item.date)}</p>
                                    </div>
                                    <p className="text-sm text-slate-600 dark:text-gray-300 truncate mt-1">{item.subject}</p>
                                </div>
                                <ChevronRightIcon className={`w-5 h-5 ml-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                            </button>
                            {isExpanded && (
                                <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                                    <p className="text-xs text-slate-500 dark:text-gray-400">To: {item.to || 'N/A'}</p>
                                    <div className="mt-4 text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap font-mono bg-slate-50 dark:bg-slate-900/50 p-4 rounded-md">{item.body}</div>
                                </div>
                            )}
                        </div>
                    );
                }) : (
                    <p className="text-sm text-slate-500 dark:text-gray-400 text-center py-8">No correspondence has been added for this property yet.</p>
                )}
            </div>
        </div>
    );
};

export default CorrespondenceSection;