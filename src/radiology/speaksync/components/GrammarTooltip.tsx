import React, { useRef, useEffect } from 'react';
import { useTranslations } from '../context/LanguageContext';
import type { GrammarError } from '../types';

interface GrammarTooltipProps {
    activeError: { error: GrammarError, element: HTMLElement };
    onClose: () => void;
    onAccept: (element: HTMLElement, suggestion: string) => void;
}

const GrammarTooltip: React.FC<GrammarTooltipProps> = ({ activeError, onClose, onAccept }) => {
    const { t } = useTranslations();
    const tooltipRef = useRef<HTMLDivElement>(null);

    const { error, element } = activeError;
    const rect = element.getBoundingClientRect();
    
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

    const handleAccept = () => {
        onAccept(element, error.suggestion);
    };
    
    return (
        <div
            ref={tooltipRef}
            className="absolute z-50 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl p-3 animate-fade-in"
            style={{
                top: `${rect.bottom + window.scrollY + 8}px`,
                left: `${rect.left + window.scrollX}px`,
            }}
            onMouseDown={(e) => e.stopPropagation()}
        >
            <p className="text-xs text-gray-400 mb-2">{error.explanation}</p>
            <div 
                onClick={handleAccept}
                className="w-full text-left p-2 rounded-md bg-green-600/20 hover:bg-green-600/40 cursor-pointer"
            >
                <p className="text-sm text-green-300">{error.suggestion}</p>
            </div>
        </div>
    );
};

export default GrammarTooltip;