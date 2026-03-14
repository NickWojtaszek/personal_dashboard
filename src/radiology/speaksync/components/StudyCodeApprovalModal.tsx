import React from 'react';
import { useTranslations } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { CheckIcon, XCircleIcon } from './Icons';
import type { RadiologyCode } from '../types';

interface StudyCodeApprovalModalProps {
  isOpen: boolean;
  extractedCode: string | null;
  codeData: RadiologyCode | null;
  studyDate: string; // ISO date string
  onApprove: (code: string, date: string) => void;
  onSkip: () => void;
}

const StudyCodeApprovalModal: React.FC<StudyCodeApprovalModalProps> = ({
  isOpen,
  extractedCode,
  codeData,
  studyDate,
  onApprove,
  onSkip
}) => {
  const { t } = useTranslations();
  const { currentTheme } = useTheme();

  if (!isOpen) return null;

  const hasCode = extractedCode && codeData;
  const displayDate = new Date(studyDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div
        className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-md flex flex-col animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white mb-2">
            Study Code Detected
          </h2>
          <p className="text-sm text-gray-400">
            Add this study to your planner for tracking and billing
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {hasCode ? (
            <>
              {/* Success indicator */}
              <div className="flex items-start gap-4 bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <div className="flex-shrink-0">
                  <CheckIcon className="h-8 w-8 text-green-400" />
                </div>
                <div className="flex-grow">
                  <p className="text-sm font-medium text-green-300 mb-1">Code Extracted</p>
                  <p className="text-2xl font-bold text-white font-mono">{extractedCode}</p>
                </div>
              </div>

              {/* Code details */}
              <div className="bg-gray-900/50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-sm text-gray-400">Full Code:</span>
                  <span className="text-sm font-semibold text-white text-right">{codeData.fullCode}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm text-gray-400">Description:</span>
                  <span className="text-sm text-gray-300 text-right max-w-xs">{codeData.desc}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm text-gray-400">Category:</span>
                  <span className="text-sm text-gray-300">{codeData.category}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm text-gray-400">Points:</span>
                  <span className="text-lg font-bold text-blue-400">{codeData.points.toFixed(1)}</span>
                </div>
                <div className="flex justify-between items-start pt-2 border-t border-gray-700">
                  <span className="text-sm text-gray-400">Study Date:</span>
                  <span className="text-sm text-white">{displayDate}</span>
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <p className="text-xs text-blue-300">
                  This study will be added to your planner on {displayDate}. You can review and edit it in the Planner tab.
                </p>
              </div>
            </>
          ) : (
            <>
              {/* No code found */}
              <div className="flex items-start gap-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <div className="flex-shrink-0">
                  <XCircleIcon className="h-8 w-8 text-yellow-400" />
                </div>
                <div className="flex-grow">
                  <p className="text-sm font-medium text-yellow-300 mb-1">No Code Detected</p>
                  <p className="text-sm text-gray-400">
                    Could not extract a study code from the template header. You can manually add this study in the Planner tab.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 bg-gray-800/50 flex justify-end space-x-3">
          <button
            onClick={onSkip}
            className="px-6 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-md font-semibold transition-colors"
          >
            {hasCode ? 'Skip' : 'Close'}
          </button>
          {hasCode && (
            <button
              onClick={() => onApprove(extractedCode, studyDate)}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-semibold transition-colors"
            >
              Add to Planner
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudyCodeApprovalModal;
