import React, { useState, useEffect, useRef } from 'react';
import { useTranslations } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { SpinnerIcon, CheckIcon } from './Icons';
import { enhanceReport } from '../services/aiService';

interface AIReportRefinementModalProps {
  isOpen: boolean;
  originalText: string;
  onComplete: (data: {
    originalReport: string;
    aiImprovedReport: string;
    finalUserReport: string;
  }) => void;
  onCancel: () => void;
  templateId?: string;
  templateHeader?: string;
}

type ModalStep = 'processing' | 'review';

const AIReportRefinementModal: React.FC<AIReportRefinementModalProps> = ({
  isOpen,
  originalText,
  onComplete,
  onCancel,
  templateId,
  templateHeader
}) => {
  const { t, language } = useTranslations();
  const { currentTheme } = useTheme();
  const { aiPromptConfig, styleExamples } = useSettings();

  const [step, setStep] = useState<ModalStep>('processing');
  const [aiImprovedText, setAiImprovedText] = useState('');
  const [editedText, setEditedText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(14);
  const [copied, setCopied] = useState(false);

  const editableRef = useRef<HTMLDivElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('processing');
      setAiImprovedText('');
      setEditedText('');
      setError(null);
      processAIEnhancement();
    }
  }, [isOpen, originalText]);

  // AI Enhancement
  const processAIEnhancement = async () => {
    try {
      setError(null);
      const enhanced = await enhanceReport(originalText, aiPromptConfig, language, styleExamples);

      if (!enhanced || enhanced.trim() === originalText.trim()) {
        setError('AI returned no improvements');
        return;
      }

      setAiImprovedText(enhanced.trim());
      setEditedText(enhanced.trim());
      setStep('review');
    } catch (err) {
      console.error('AI enhancement error:', err);
      setError(err instanceof Error ? err.message : 'Failed to enhance report');
    }
  };

  // Initialize contentEditable on first load or step change
  useEffect(() => {
    if (editableRef.current && step === 'review' && !editableRef.current.textContent) {
      editableRef.current.textContent = editedText;
    }
  }, [step]);

  const handleEditableChange = () => {
    if (editableRef.current) {
      setEditedText(editableRef.current.textContent || '');
    }
  };

  const handleApprove = () => {
    onComplete({
      originalReport: originalText,
      aiImprovedReport: aiImprovedText,
      finalUserReport: editedText,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] flex flex-col animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">
            {step === 'processing' && 'AI Report Enhancement'}
            {step === 'review' && 'Review & Edit AI Suggestion'}
          </h2>
          <p className="text-sm text-gray-400">
            {step === 'processing' && 'Processing your report with AI...'}
            {step === 'review' && 'Review the AI-improved version. You can edit it before approving.'}
          </p>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto p-6">
          {/* Step 1: Processing */}
          {step === 'processing' && (
            <div className="flex flex-col items-center justify-center h-full space-y-6">
              {error ? (
                <>
                  <div className="text-red-400 text-center">
                    <p className="text-lg font-semibold mb-2">Error</p>
                    <p>{error}</p>
                  </div>
                  <button
                    onClick={onCancel}
                    className="px-6 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-md transition-colors"
                  >
                    Close
                  </button>
                </>
              ) : (
                <>
                  <SpinnerIcon className="h-16 w-16 text-blue-400" />
                  <p className="text-lg text-gray-300">Enhancing your report with AI...</p>
                  <p className="text-sm text-gray-500">This may take a few seconds</p>
                </>
              )}
            </div>
          )}

          {/* Step 2: Review & Edit */}
          {step === 'review' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Original */}
              <div>
                <h4 className="font-semibold text-red-300 mb-2 border-b border-red-400/30 pb-1 flex items-center gap-2">
                  Original Report
                </h4>
                <div className="bg-red-500/10 p-4 rounded-md max-h-[60vh] overflow-y-auto border border-red-500/20">
                  <p className="whitespace-pre-wrap text-sm font-mono text-gray-300">
                    {originalText}
                  </p>
                </div>
              </div>

              {/* AI Improved (Editable) */}
              <div>
                <div className="flex items-center justify-between mb-2 border-b border-green-400/30 pb-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-green-300">
                      AI Improved (Editable)
                    </h4>
                    <span className="text-xs text-gray-400 font-normal">Click to edit</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Text size controls */}
                    <button
                      onClick={() => setFontSize(prev => Math.max(10, prev - 2))}
                      className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                      title="Decrease text size"
                    >
                      A-
                    </button>
                    <span className="text-xs text-gray-400 px-1">{fontSize}px</span>
                    <button
                      onClick={() => setFontSize(prev => Math.min(24, prev + 2))}
                      className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                      title="Increase text size"
                    >
                      A+
                    </button>
                    {/* Copy button */}
                    <button
                      onClick={() => {
                        const text = editableRef.current?.innerText || '';
                        navigator.clipboard.writeText(text);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="ml-2 px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors flex items-center gap-1"
                      title="Copy to clipboard"
                    >
                      {copied ? (
                        <>
                          <CheckIcon className="h-3 w-3" />
                          Copied
                        </>
                      ) : (
                        <>
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <div
                  ref={editableRef}
                  contentEditable
                  onInput={handleEditableChange}
                  className="bg-green-500/10 p-4 rounded-md max-h-[60vh] overflow-y-auto border border-green-500/20 whitespace-pre-wrap text-keyboard focus:outline-none focus:ring-2 focus:ring-green-500"
                  style={{ minHeight: '200px', fontSize: `${fontSize}px` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 bg-gray-800/50 flex justify-end space-x-3">
          {step === 'review' && (
            <>
              <button
                onClick={onCancel}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-md font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-semibold transition-colors"
              >
                Approve
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIReportRefinementModal;
