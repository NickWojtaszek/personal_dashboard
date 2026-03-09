
import React, { useState, useEffect } from 'react';
import type { PropertyInfo } from '../../types';
import { StickyNoteIcon, EditIcon, SaveIcon } from './Icons';

interface NotesSectionProps {
    property: PropertyInfo;
    isEditing: boolean;
    onSetEditing: () => void;
    onSave: (property: PropertyInfo) => void;
    onCancel: () => void;
}

const NotesSection: React.FC<NotesSectionProps> = ({ property, isEditing, onSetEditing, onSave, onCancel }) => {
    const [editedNotes, setEditedNotes] = useState(property.notes || '');

    useEffect(() => {
        if (isEditing) {
            setEditedNotes(property.notes || '');
        }
    }, [property, isEditing]);

    const handleSave = () => {
        onSave({ ...property, notes: editedNotes });
    };

    if (isEditing) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-brand-primary/50 dark:border-brand-secondary/50">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold flex items-center gap-3"><StickyNoteIcon /> Editing Notes & Memos</h2>
                </div>
                <div className="p-6">
                    <textarea
                        value={editedNotes}
                        onChange={(e) => setEditedNotes(e.target.value)}
                        rows={8}
                        className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition"
                        placeholder="Add any relevant notes here..."
                    />
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                    <button onClick={onCancel} className="px-4 py-2 rounded-lg bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">Cancel</button>
                    <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-primary text-white font-semibold hover:bg-opacity-90 transition-colors">
                        <SaveIcon />
                        Save Notes
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-3"><StickyNoteIcon /> Notes & Memos</h2>
                <button
                    onClick={onSetEditing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/50 text-sm font-semibold text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                    <EditIcon />
                    <span>Edit</span>
                </button>
            </div>
            <div className="p-6">
                {property.notes ? (
                    <div className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap prose prose-sm dark:prose-invert max-w-none">{property.notes}</div>
                ) : (
                    <p className="text-sm text-slate-500 dark:text-gray-400">No notes have been added for this property yet.</p>
                )}
            </div>
        </div>
    );
};

export default NotesSection;
