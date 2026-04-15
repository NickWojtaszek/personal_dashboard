import React, { useState } from 'react';
import { TrashIcon } from '../Icons';

interface DeleteConfirmButtonProps {
    onConfirm: () => void;
    label?: string;
    confirmPrompt?: string;
}

/**
 * Two-stage delete button: first click shows "Delete?" with Yes/No buttons.
 * Used by Insurance, Vehicle, and Contract detail pages.
 */
const DeleteConfirmButton: React.FC<DeleteConfirmButtonProps> = ({
    onConfirm,
    label = 'Delete',
    confirmPrompt = 'Delete?',
}) => {
    const [confirming, setConfirming] = useState(false);

    if (confirming) {
        return (
            <div className="flex items-center gap-1.5">
                <span className="text-xs text-red-600 dark:text-red-400">{confirmPrompt}</span>
                <button
                    onClick={() => { onConfirm(); setConfirming(false); }}
                    className="px-2 py-1 text-xs font-medium rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                    Yes
                </button>
                <button
                    onClick={() => setConfirming(false)}
                    className="px-2 py-1 text-xs font-medium rounded bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-gray-200 hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
                >
                    No
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={() => setConfirming(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
            <TrashIcon /> {label}
        </button>
    );
};

export default DeleteConfirmButton;
