import React, { useState, useEffect, useRef } from 'react';

interface EditableNameProps {
    value: string;
    onSave: (newValue: string) => void;
    className?: string;
}

/**
 * Click-to-rename inline editor. Shows as an h1 by default; clicking
 * switches to an input. Enter saves, Escape cancels, blur also saves.
 * Used by Insurance, Vehicle, and Contract detail pages.
 */
const EditableName: React.FC<EditableNameProps> = ({
    value,
    onSave,
    className = 'text-2xl font-bold text-slate-900 dark:text-white',
}) => {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(value);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editing]);

    const startEdit = () => {
        setDraft(value);
        setEditing(true);
    };

    const commit = () => {
        const trimmed = draft.trim();
        if (trimmed && trimmed !== value) onSave(trimmed);
        setEditing(false);
    };

    if (editing) {
        return (
            <input
                ref={inputRef}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={e => {
                    if (e.key === 'Enter') e.currentTarget.blur();
                    if (e.key === 'Escape') setEditing(false);
                }}
                className={`${className} bg-transparent border-b-2 border-brand-primary outline-none px-0`}
            />
        );
    }

    return (
        <h1
            className={`${className} cursor-pointer hover:text-brand-primary transition-colors`}
            onClick={startEdit}
            title="Click to rename"
        >
            {value}
        </h1>
    );
};

export default EditableName;
