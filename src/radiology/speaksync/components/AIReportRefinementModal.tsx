import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { SpinnerIcon, CheckIcon } from './Icons';
import { enhanceReport, checkGrammar, splitDirectives } from '../services/aiService';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { applyGrammarHighlighting, removeGrammarHighlighting } from '../utils/domUtils';
import GrammarTooltip from './GrammarTooltip';
import type { GrammarError } from '../types';

const FONT_SIZE_KEY = 'ai-refinement-font-size';
const loadFontSize = (): number => {
  try {
    const saved = parseInt(localStorage.getItem(FONT_SIZE_KEY) || '', 10);
    if (!isNaN(saved) && saved >= 10 && saved <= 24) return saved;
  } catch { /* ignore */ }
  return 16; // default bumped +2 from the old 14 — this is the signing view
};

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
  const { t, language, supportedLanguages } = useTranslations();
  const { currentTheme } = useTheme();
  const { aiPromptConfig, styleExamples } = useSettings();

  const [step, setStep] = useState<ModalStep>('processing');
  const [aiImprovedText, setAiImprovedText] = useState('');
  const [editedText, setEditedText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fontSize, setFontSizeState] = useState(loadFontSize);
  const [copied, setCopied] = useState(false);
  // Single corrected view is the default — the original is a toggle away.
  const [isExpanded, setIsExpanded] = useState(true);
  const [isRerunning, setIsRerunning] = useState(false);
  const [appliedDirectives, setAppliedDirectives] = useState<string[]>([]);
  const [grammarErrors, setGrammarErrors] = useState<GrammarError[]>([]);
  const [activeError, setActiveError] = useState<{ error: GrammarError; element: HTMLElement } | null>(null);
  const [isCheckingGrammar, setIsCheckingGrammar] = useState(false);
  const [grammarResult, setGrammarResult] = useState<number | null>(null);

  const setFontSize = (updater: (prev: number) => number) => {
    setFontSizeState(prev => {
      const next = updater(prev);
      try { localStorage.setItem(FONT_SIZE_KEY, String(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const editableRef = useRef<HTMLDivElement>(null);

  // Insert transcribed dictation at cursor (or append) in the editable div
  const onDictationFinalized = useCallback((transcript: string) => {
    if (!editableRef.current || !transcript.trim()) return;
    const el = editableRef.current;
    const trimmed = transcript.trim();
    const sel = window.getSelection();
    const hasSelectionInsideEl = sel && sel.rangeCount > 0 && el.contains(sel.anchorNode);

    if (hasSelectionInsideEl) {
      const range = sel!.getRangeAt(0);
      range.deleteContents();
      const node = document.createTextNode((range.startOffset > 0 ? ' ' : '') + trimmed + ' ');
      range.insertNode(node);
      range.setStartAfter(node);
      range.setEndAfter(node);
      sel!.removeAllRanges();
      sel!.addRange(range);
    } else {
      const current = el.textContent || '';
      el.textContent = current + (current && !current.endsWith(' ') ? ' ' : '') + trimmed + ' ';
    }
    setEditedText(el.textContent || '');
  }, []);

  const { isListening, interimText, toggleListen, isSupported: isDictationSupported } = useSpeechRecognition({
    onTranscriptFinalized: onDictationFinalized,
    lang: supportedLanguages[language].speechCode,
  });

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('processing');
      setAiImprovedText('');
      setEditedText('');
      setError(null);
      setIsExpanded(true);
      setIsRerunning(false);
      setAppliedDirectives([]);
      setGrammarErrors([]);
      setActiveError(null);
      setGrammarResult(null);
      processAIEnhancement();
    }
  }, [isOpen, originalText]);

  // Re-run AI on the current edited text (second pass). New #directives added
  // during editing are picked up here too.
  const handleRerunAI = async () => {
    if (!editedText.trim() || isRerunning) return;
    setIsRerunning(true);
    setError(null);
    try {
      const { body, directives } = splitDirectives(editedText);
      if (directives.length > 0) setAppliedDirectives(prev => [...prev, ...directives]);
      const enhanced = await enhanceReport(body, aiPromptConfig, language, styleExamples, directives);
      if (enhanced && enhanced.trim()) {
        const result = enhanced.trim();
        setAiImprovedText(result);
        setEditedText(result);
        if (editableRef.current) editableRef.current.textContent = result;
        setGrammarErrors([]);
        setActiveError(null);
      } else {
        setError('AI returned no improvements');
      }
    } catch (err) {
      console.error('AI re-run error:', err);
      setError(err instanceof Error ? err.message : 'Failed to re-run AI');
    } finally {
      setIsRerunning(false);
    }
  };

  // AI Enhancement — #directives in the dictation ("#policz RECIST") are
  // stripped from the body and executed as explicit instructions.
  const processAIEnhancement = async () => {
    try {
      setError(null);
      const { body, directives } = splitDirectives(originalText);
      setAppliedDirectives(directives);
      const enhanced = await enhanceReport(body, aiPromptConfig, language, styleExamples, directives);

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

  // In-modal grammar check: highlights issues in the corrected view; click a
  // highlight to see and accept the suggestion.
  const handleGrammarCheck = async () => {
    const current = editableRef.current?.textContent || '';
    if (!current.trim() || isCheckingGrammar) return;
    removeGrammarHighlighting(editableRef.current);
    setGrammarErrors([]);
    setActiveError(null);
    setIsCheckingGrammar(true);
    try {
      const errors = await checkGrammar(current);
      const withIds = errors.map(e => ({ ...e, id: crypto.randomUUID() }));
      if (withIds.length > 0) {
        setGrammarErrors(withIds);
        applyGrammarHighlighting(editableRef.current, withIds);
      } else {
        setError(null);
      }
      setGrammarResult(withIds.length);
    } catch (err) {
      console.error('Grammar check error:', err);
      setError(err instanceof Error ? err.message : 'Grammar check failed');
    } finally {
      setIsCheckingGrammar(false);
    }
  };

  // Click-to-fix on highlighted grammar errors
  useEffect(() => {
    const el = editableRef.current;
    if (!el) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('grammar-error')) {
        const err = grammarErrors.find(g => g.id === target.dataset.errorId);
        if (err) setActiveError({ error: err, element: target });
      } else {
        setActiveError(null);
      }
    };
    el.addEventListener('click', handleClick);
    return () => el.removeEventListener('click', handleClick);
  }, [grammarErrors, step]);

  // Initialize contentEditable on first load or step change
  useEffect(() => {
    if (editableRef.current && step === 'review' && !editableRef.current.textContent) {
      editableRef.current.textContent = editedText;
    }
  }, [step]);

  const handleEditableChange = () => {
    if (editableRef.current) {
      setEditedText(editableRef.current.textContent || '');
      if (grammarErrors.length > 0) {
        // Content changed — highlights are stale
        removeGrammarHighlighting(editableRef.current);
        setGrammarErrors([]);
        setActiveError(null);
        setGrammarResult(null);
      }
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
            <div className={isExpanded ? 'grid grid-cols-1 gap-6' : 'grid grid-cols-1 md:grid-cols-2 gap-6'}>
              {/* Original */}
              {!isExpanded && (
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
              )}

              {/* AI Improved (Editable) */}
              <div>
                <div className="flex items-center justify-between mb-2 border-b border-green-400/30 pb-1 gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-green-300">
                      AI Improved (Editable)
                    </h4>
                    <span className="text-xs text-gray-400 font-normal">Click to edit</span>
                    {isListening && (
                      <span className="text-xs text-red-300 font-normal animate-pulse">
                        ● Listening{interimText ? `: ${interimText.slice(0, 30)}…` : '…'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {/* Expand/collapse */}
                    <button
                      onClick={() => setIsExpanded(prev => !prev)}
                      className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                      title={isExpanded ? 'Show original' : 'Hide original (full width)'}
                    >
                      {isExpanded ? '⇲ Split' : '⇱ Full'}
                    </button>
                    {/* Dictation */}
                    {isDictationSupported && (
                      <button
                        onClick={toggleListen}
                        className={`px-2 py-1 text-xs rounded transition-colors flex items-center gap-1 ${isListening ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
                        title={isListening ? 'Stop dictation' : 'Start dictation (inserts at cursor)'}
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 1.5a3 3 0 0 0-3 3v7.5a3 3 0 1 0 6 0V4.5a3 3 0 0 0-3-3z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5v1.5a7.5 7.5 0 1 1-15 0v-1.5M12 19.5v3" />
                        </svg>
                        {isListening ? 'Stop' : 'Dictate'}
                      </button>
                    )}
                    {/* Grammar check */}
                    <button
                      onClick={handleGrammarCheck}
                      disabled={isCheckingGrammar || !editedText.trim()}
                      className={`px-2 py-1 text-xs rounded transition-colors flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed ${grammarErrors.length > 0 ? 'bg-red-600/70 hover:bg-red-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
                      title={t('editor.grammar.check', 'Grammar check')}
                    >
                      {isCheckingGrammar ? <SpinnerIcon className="h-3 w-3" /> : 'Aa✓'}
                      {t('editor.grammar.check', 'Grammar')}
                      {grammarResult !== null && !isCheckingGrammar && (
                        <span className={grammarResult > 0 ? 'font-bold' : 'text-green-300'}>
                          {grammarResult > 0 ? grammarResult : '✓'}
                        </span>
                      )}
                    </button>
                    {/* Re-run AI */}
                    <button
                      onClick={handleRerunAI}
                      disabled={isRerunning || !editedText.trim()}
                      className="px-2 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Re-run AI on current edited text (second pass)"
                    >
                      {isRerunning ? <SpinnerIcon className="h-3 w-3" /> : (
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
                        </svg>
                      )}
                      {isRerunning ? 'Running…' : 'Re-run AI'}
                    </button>
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
                {appliedDirectives.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {appliedDirectives.map((d, i) => (
                      <span key={i} className="px-2 py-0.5 text-xs rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30" title="Directive executed by the AI — verify the result below">
                        ⚡ {d}
                      </span>
                    ))}
                  </div>
                )}
                <div
                  ref={editableRef}
                  contentEditable
                  onInput={handleEditableChange}
                  className="bg-green-500/10 p-4 rounded-md max-h-[60vh] overflow-y-auto border border-green-500/20 whitespace-pre-wrap text-keyboard focus:outline-none focus:ring-2 focus:ring-green-500"
                  style={{ minHeight: '200px', fontSize: `${fontSize}px` }}
                />
                {activeError && (
                  <GrammarTooltip
                    activeError={activeError}
                    onClose={() => setActiveError(null)}
                    onAccept={(element, suggestion) => {
                      element.textContent = suggestion;
                      element.classList.remove('grammar-error');
                      setGrammarErrors(prev => prev.filter(e => e.id !== activeError.error.id));
                      setActiveError(null);
                      setEditedText(editableRef.current?.textContent || '');
                    }}
                  />
                )}
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
