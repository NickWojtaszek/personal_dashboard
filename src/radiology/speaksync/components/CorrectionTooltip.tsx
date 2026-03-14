
import React, { useState, useEffect, useRef } from 'react';
import { useTranslations } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { PencilIcon, CheckIcon, XCircleIcon } from './Icons';

interface CorrectionTooltipProps {
    target: { top: number; left: number; range: Range };
    onClose: () => void;
    onSave: (spoken: string, replacement: string) => void;
}

const CorrectionTooltip: React.FC<CorrectionTooltipProps> = ({ target, onClose, onSave }) => {
    const { t } = useTranslations();
    const { currentTheme } = useTheme();
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [isEditing, setIsEditing] = useState(false);
    
    const initialText = target.range.toString();
    const [replacementText, setReplacementText] = useState(initialText);

    // Close tooltip if clicked outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    const handleStartEditing = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsEditing(true);
    };

    const handleSave = (e: React.MouseEvent) => {
        e.preventDefault();
        if (initialText.trim() && replacementText.trim()) {
            onSave(initialText.trim(), replacementText.trim());
        }
    };
    
    const handleCancel = (e: React.MouseEvent) => {
        e.preventDefault();
        onClose();
    };

    return (
        <div
            ref={tooltipRef}
            className="correction-tooltip animate-fade-in"
            style={{ top: target.top, left: target.left }}
            onMouseDown={(e) => e.stopPropagation()} // Prevent clicks inside from closing it immediately
            onContextMenu={(e) => e.preventDefault()} // Prevent showing another context menu
        >
            {isEditing ? (
                <>
                    <input
                        type="text"
                        value={replacementText}
                        onChange={(e) => setReplacementText(e.target.value)}
                        className="p-1 rounded-md text-sm focus:outline-none focus:ring-1"
                        style={{ backgroundColor: currentTheme.colors.bgPrimary, borderColor: currentTheme.colors.borderColor, borderWidth: '1px', color: currentTheme.colors.textPrimary }}
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                onSave(initialText.trim(), replacementText.trim());
                            }
                            if (e.key === 'Escape') {
                                onClose();
                            }
                        }}
                    />
                    <button onClick={handleSave} className="p-1.5 bg-green-600 hover:bg-green-700 text-white rounded-md" title={t('editor.saveCommand')}>
                        <CheckIcon />
                    </button>
                    <button onClick={handleCancel} className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md" title={t('templateModal.cancel')}>
                        <XCircleIcon />
                    </button>
                </>
            ) : (
                <button
                    onClick={handleStartEditing}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-semibold"
                    title={t('editor.correctTranscription')}
                >
                    <PencilIcon className="h-4 w-4" />
                    {t('editor.correctTranscription')}
                </button>
            )}
        </div>
    );
};

export default CorrectionTooltip;
