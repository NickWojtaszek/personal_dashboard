
import React, { useMemo } from 'react';
import { useTranslations } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

// A simple side-by-side diff view.
const generateDiff = (original: string, corrected: string, t: (key: string) => string): React.ReactNode => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-sm">
            <div>
                <h4 className="font-sans font-semibold text-red-300 mb-2 border-b border-red-400/30 pb-1">{t('correctionModal.original')}</h4>
                <div className="bg-red-500/10 p-3 rounded-md max-h-[65vh] overflow-y-auto">
                    <p className="whitespace-pre-wrap ">{original}</p>
                </div>
            </div>
            <div>
                <h4 className="font-sans font-semibold text-green-300 mb-2 border-b border-green-400/30 pb-1">{t('correctionModal.suggested')}</h4>
                <div className="bg-green-500/10 p-3 rounded-md max-h-[65vh] overflow-y-auto">
                    <p className="whitespace-pre-wrap">{corrected}</p>
                </div>
            </div>
        </div>
    );
};

interface CorrectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: (correctedText: string) => void;
  originalText: string;
  correctedText: string;
}

const CorrectionModal: React.FC<CorrectionModalProps> = ({ isOpen, onClose, onAccept, originalText, correctedText }) => {
  const { t } = useTranslations();
  const { currentTheme } = useTheme();
  if (!isOpen) return null;

  const diffResult = useMemo(() => generateDiff(originalText, correctedText, t), [originalText, correctedText, t]);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] flex flex-col animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">{t('correctionModal.title')}</h2>
          <p className="text-sm text-gray-400">{t('correctionModal.description')}</p>
        </div>
        <div className="p-6 overflow-y-auto text-gray-300">
            {diffResult}
        </div>
        <div className="p-4 border-t border-gray-700 bg-gray-800/50 flex justify-end space-x-3">
            <button type="button" onClick={onClose} style={{ backgroundColor: currentTheme.colors.buttonSecondary, color: currentTheme.colors.textPrimary }} className="px-4 py-2 rounded-md font-semibold transition-colors" onMouseEnter={(e) => e.currentTarget.style.backgroundColor = currentTheme.colors.bgHover} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = currentTheme.colors.buttonSecondary}>{t('correctionModal.reject')}</button>
            <button type="button" onClick={() => onAccept(correctedText)} style={{ backgroundColor: currentTheme.colors.accentSuccess, color: '#fff' }} className="px-4 py-2 rounded-md font-semibold transition-colors" onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'} onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}>{t('correctionModal.accept')}</button>
        </div>
      </div>
    </div>
  );
};

export default CorrectionModal;
