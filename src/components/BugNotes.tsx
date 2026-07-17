import React, { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { loadItem, saveItem } from '../lib/storage';
import type { Page } from '../types';

/**
 * Floating "sticky note" bug tracker. Available on every page so you can jot
 * down bugs to fix later while using the app. Each note is tagged with the
 * page it was logged on. Persists through the shared storage layer
 * (localStorage + Supabase) under its own key, independent of App's state.
 */

const STORAGE_KEY = 'launcher-bug-notes';

interface BugNote {
    id: string;
    text: string;
    page: Page;
    createdAt: string;
    done: boolean;
}

/** Human-readable labels — mirrors the nav in Header.tsx. */
const PAGE_LABELS: Record<Page, string> = {
    general: 'General',
    launcher: 'Apps',
    claude: 'Claude',
    properties: 'Properties',
    insurance: 'Insurance',
    invoices: 'Invoices',
    vehicles: 'Rego',
    contracts: 'Contracts',
    fees: 'Fees',
    correspondence: 'Email',
    documents: 'Documents',
    radiology: 'Radiology',
    dictation: 'Dictation',
};

interface BugNotesProps {
    page: Page;
}

const BugNotes: React.FC<BugNotesProps> = ({ page }) => {
    const [notes, setNotes] = useState<BugNote[]>([]);
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState('');
    const [showDone, setShowDone] = useState(false);
    const loadedRef = useRef(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Load once on mount
    useEffect(() => {
        loadItem<BugNote[]>(STORAGE_KEY, []).then((loaded) => {
            setNotes(Array.isArray(loaded) ? loaded : []);
            loadedRef.current = true;
        }).catch(() => {
            loadedRef.current = true;
        });
    }, []);

    // Persist on change (after initial load)
    useEffect(() => {
        if (!loadedRef.current) return;
        saveItem(STORAGE_KEY, notes).catch((e) => {
            console.warn('Failed to save bug notes:', e);
        });
    }, [notes]);

    // Focus the textarea when the panel opens
    useEffect(() => {
        if (open) textareaRef.current?.focus();
    }, [open]);

    const addNote = useCallback(() => {
        const text = draft.trim();
        if (!text) return;
        setNotes(prev => [
            { id: uuidv4(), text, page, createdAt: new Date().toISOString(), done: false },
            ...prev,
        ]);
        setDraft('');
    }, [draft, page]);

    const toggleDone = useCallback((id: string) => {
        setNotes(prev => prev.map(n => n.id === id ? { ...n, done: !n.done } : n));
    }, []);

    const deleteNote = useCallback((id: string) => {
        setNotes(prev => prev.filter(n => n.id !== id));
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Cmd/Ctrl+Enter to add quickly
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            addNote();
        }
    };

    const openCount = notes.filter(n => !n.done).length;
    const visibleNotes = showDone ? notes : notes.filter(n => !n.done);

    return (
        <>
            {/* Floating toggle button */}
            <button
                onClick={() => setOpen(o => !o)}
                className="fixed bottom-5 right-5 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-amber-400 hover:bg-amber-300 text-amber-950 shadow-lg shadow-amber-500/30 transition-colors"
                aria-label="Bug notes"
                title="Bug notes — jot down bugs to fix later"
            >
                {/* Bug icon */}
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m8 2 1.88 1.88M14.12 3.88 16 2M9 7.13v-1a3.003 3.003 0 1 1 6 0v1" />
                    <path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6zM12 20v-9M6.53 9C4.6 8.8 3 7.1 3 5M6 13H2M3 21c0-2.1 1.7-3.9 3.8-4M20.97 5c0 2.1-1.6 3.8-3.5 4M22 13h-4M17.2 17c2.1.1 3.8 1.9 3.8 4" />
                </svg>
                {openCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 flex items-center justify-center rounded-full bg-red-600 text-white text-xs font-bold">
                        {openCount}
                    </span>
                )}
            </button>

            {/* Sticky note panel */}
            {open && (
                <div className="fixed bottom-24 right-5 z-50 w-80 max-w-[calc(100vw-2.5rem)] flex flex-col rounded-lg bg-amber-100 dark:bg-amber-200 text-amber-950 shadow-2xl shadow-black/30 border border-amber-300/60">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-amber-300/70">
                        <div>
                            <h2 className="text-sm font-bold leading-none">Bugs to fix</h2>
                            <p className="text-[11px] text-amber-800/80 mt-1 leading-none">
                                On <span className="font-semibold">{PAGE_LABELS[page]}</span>
                            </p>
                        </div>
                        <button
                            onClick={() => setOpen(false)}
                            className="text-amber-800 hover:text-amber-950 font-bold text-lg leading-none px-1"
                            aria-label="Close"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Composer */}
                    <div className="p-3 border-b border-amber-300/70">
                        <textarea
                            ref={textareaRef}
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={handleKeyDown}
                            rows={2}
                            placeholder="Describe the bug…"
                            className="w-full resize-none rounded-md bg-amber-50 border border-amber-300 px-2 py-1.5 text-sm placeholder-amber-700/50 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                        />
                        <div className="flex items-center justify-between mt-2">
                            <span className="text-[11px] text-amber-800/70">⌘/Ctrl + Enter</span>
                            <button
                                onClick={addNote}
                                disabled={!draft.trim()}
                                className="px-3 py-1 rounded-md bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-amber-950 text-sm font-semibold transition-colors"
                            >
                                Add
                            </button>
                        </div>
                    </div>

                    {/* List */}
                    <div className="max-h-72 overflow-y-auto p-2 space-y-1.5">
                        {visibleNotes.length === 0 ? (
                            <p className="text-center text-xs text-amber-800/70 py-6">
                                {notes.length === 0 ? 'No bugs logged yet.' : 'No open bugs. 🎉'}
                            </p>
                        ) : (
                            visibleNotes.map(note => (
                                <div
                                    key={note.id}
                                    className="group flex items-start gap-2 rounded-md bg-amber-50/70 px-2 py-1.5 border border-amber-200"
                                >
                                    <input
                                        type="checkbox"
                                        checked={note.done}
                                        onChange={() => toggleDone(note.id)}
                                        className="mt-0.5 accent-amber-600 cursor-pointer"
                                        aria-label="Mark fixed"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm break-words ${note.done ? 'line-through text-amber-800/50' : ''}`}>
                                            {note.text}
                                        </p>
                                        <span className="inline-block mt-0.5 text-[10px] font-semibold uppercase tracking-wide bg-amber-300/70 text-amber-900 rounded px-1 py-0.5">
                                            {PAGE_LABELS[note.page] ?? note.page}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => deleteNote(note.id)}
                                        className="opacity-0 group-hover:opacity-100 text-amber-700 hover:text-red-600 transition-opacity text-sm font-bold px-1"
                                        aria-label="Delete"
                                        title="Delete"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    {notes.some(n => n.done) && (
                        <div className="px-3 py-2 border-t border-amber-300/70">
                            <button
                                onClick={() => setShowDone(s => !s)}
                                className="text-[11px] text-amber-800 hover:text-amber-950 font-medium"
                            >
                                {showDone ? 'Hide fixed' : `Show fixed (${notes.filter(n => n.done).length})`}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </>
    );
};

export default BugNotes;
