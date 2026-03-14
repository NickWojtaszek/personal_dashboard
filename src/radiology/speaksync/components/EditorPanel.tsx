
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { CopyIcon, CheckIcon, TrashIcon, SparklesIcon, SpinnerIcon, StarIcon, PencilIcon, MagnifyingGlassPlusIcon, MagnifyingGlassMinusIcon, VerticalSplitIcon, HorizontalSplitIcon, PasteIcon, StopIcon, MicrophoneIcon, SmallMicrophoneIcon, CheckBadgeIcon, XCircleIcon, DocumentTextIcon, BrainIcon } from './Icons';
import type { Template, GrammarError } from '../types';
import CorrectionTooltip from './CorrectionTooltip';
import { useTranslations } from '../context/LanguageContext';
import CorrectionModal from './CorrectionModal';
import AIReportRefinementModal from './AIReportRefinementModal';
import StudyCodeApprovalModal from './StudyCodeApprovalModal';
import { useApp } from '../context/AppContext';
import { useSettings } from '../context/SettingsContext';
import { useStudy } from '../context/StudyContext';

import { useTemplate } from '../context/TemplateContext';
import { extractAndValidateStudyCode } from '../utils/studyCodeExtractor';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { enhanceReport, correctSelection as correctSelectionWithAI, checkGrammar } from '../services/aiService';
import GrammarTooltip from './GrammarTooltip';
import { useTheme } from '../context/ThemeContext';
import { applyGrammarHighlighting, removeGrammarHighlighting, getPlainText, insertHtmlAtCursor } from '../utils/domUtils';
import { medicalPostProcess } from '../utils/medicalFormatter';
import { radiologyTerms } from '../data/radiologyTerms';

// New component for the selection toolbar
interface SelectionToolbarProps {
    top: number;
    left: number;
    onCorrect: () => void;
    isCorrecting: boolean;
}

const SelectionToolbar: React.FC<SelectionToolbarProps> = ({ top, left, onCorrect, isCorrecting }) => {
    const { t } = useTranslations();
    const { currentTheme } = useTheme();
    
    return (
        <div
            className="absolute z-20 flex items-center gap-1 p-1 rounded-lg shadow-lg animate-fade-in"
            style={{ 
                top: `${top}px`, 
                left: `${left}px`,
                transform: 'translateX(-50%)',
                backgroundColor: currentTheme.colors.bgSecondary,
                borderColor: currentTheme.colors.borderColor,
                borderWidth: '1px'
            }}
            onMouseDown={(e) => e.preventDefault()}
        >
            <button
                onClick={onCorrect}
                disabled={isCorrecting}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:bg-blue-800 disabled:cursor-wait"
                title={t('editor.correctSelection')}
            >
                {isCorrecting ? (
                    <SpinnerIcon className="h-4 w-4" />
                ) : (
                    <SparklesIcon className="h-4 w-4" />
                )}
                <span>{t('editor.correctSelection')}</span>
            </button>
        </div>
    );
};


interface EditorPanelProps {
  text: string;
  setText: React.Dispatch<React.SetStateAction<string>>;
  onClear: () => void;
  loadedTemplate: Template | null;
  layoutMode: 'normal' | 'split-vertical' | 'split-horizontal';
  setLayoutMode: React.Dispatch<React.SetStateAction<'normal' | 'split-vertical' | 'split-horizontal'>>;
  comparisonText: string;
  setComparisonText: React.Dispatch<React.SetStateAction<string>>;
  comparisonTitle?: string;
  remoteAudioStream?: MediaStream | null;
}

const EditorPanel: React.FC<EditorPanelProps> = ({ 
    text, 
    setText, 
    onClear, 
    loadedTemplate, 
    layoutMode, 
    setLayoutMode,
    comparisonText,
    setComparisonText,
    comparisonTitle,
    remoteAudioStream
}) => {
  const { t, language, supportedLanguages } = useTranslations();
  const { currentTheme } = useTheme();
  const { customCommands, addOrUpdateCustomCommand, aiPromptConfig, layoutDensity, hotkeys, styleExamples, addStyleExample, isStyleTrainingLimitReached } = useSettings();
  const { studies, addStudy, radiologyCodes } = useStudy();
  const { currentStudyFilter } = useTemplate();

  const [copied, setCopied] = useState<boolean>(false);
  const [isCorrectionMode, setIsCorrectionMode] = useState<boolean>(false);
  
  // Initialize microphone source from localStorage
  const [microphoneSource, setMicrophoneSourceState] = useState<'local' | 'remote'>(() => {
    try {
      const saved = localStorage.getItem('microphoneSource');
      return (saved === 'remote' ? 'remote' : 'local') as 'local' | 'remote';
    } catch {
      return 'local';
    }
  });

  // Custom setter that also saves to localStorage
  const setMicrophoneSource = (value: 'local' | 'remote' | ((prev: 'local' | 'remote') => 'local' | 'remote')) => {
    setMicrophoneSourceState((prev) => {
      const newValue = typeof value === 'function' ? value(prev) : value;
      try {
        localStorage.setItem('microphoneSource', newValue);
      } catch (e) {
        console.warn('Failed to save microphone source preference:', e);
      }
      return newValue;
    });
  };

  const [localRemoteAudioStream, setLocalRemoteAudioStream] = useState<MediaStream | null>(remoteAudioStream || null);

  // Sync remote audio stream from prop
  useEffect(() => {
    setLocalRemoteAudioStream(remoteAudioStream || null);
  }, [remoteAudioStream]);
  
  const [isProcessingAI, setIsProcessingAI] = useState<boolean>(false);
  const [aiResult, setAiResult] = useState<{ original: string; corrected: string } | null>(null);
  const [showAiResultModal, setShowAiResultModal] = useState<boolean>(false);
  const [showRefinementModal, setShowRefinementModal] = useState<boolean>(false);
  const [refinementOriginalText, setRefinementOriginalText] = useState<string>('');
  const [showCodeApprovalModal, setShowCodeApprovalModal] = useState<boolean>(false);
  const [extractedCodeData, setExtractedCodeData] = useState<{ code: string; codeData: any } | null>(null);
  // Track raw text for AI training
  const [lastRawText, setLastRawText] = useState<string>('');
  const [showTrainSuccess, setShowTrainSuccess] = useState(false);

  const [correctionTarget, setCorrectionTarget] = useState<{top: number; left: number; range: Range} | null>(null);
  
  const [fontSize, setFontSize] = useState<number>(16);
  const MIN_FONT_SIZE = 12;
  const MAX_FONT_SIZE = 28;
  
  const [comparisonCopied, setComparisonCopied] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');

  const [toolbarState, setToolbarState] = useState<{ top: number; left: number; visible: boolean } | null>(null);
  const [isCorrectingSelection, setIsCorrectingSelection] = useState(false);

  const [isCheckingGrammar, setIsCheckingGrammar] = useState(false);
  const [grammarErrors, setGrammarErrors] = useState<GrammarError[]>([]);
  const [activeError, setActiveError] = useState<{ error: GrammarError, element: HTMLElement } | null>(null);
  const [isSpellCheckOn, setIsSpellCheckOn] = useState(true);

  // Refs for Drag and Drop (Cut and Paste behavior)
  const isInternalDrag = useRef<boolean>(false);
  const draggedRangeRef = useRef<Range | null>(null);

  const increaseFontSize = () => setFontSize(s => Math.min(MAX_FONT_SIZE, s + 2));
  const decreaseFontSize = () => setFontSize(s => Math.max(MIN_FONT_SIZE, s - 2));

  const editorRef = useRef<HTMLDivElement>(null);
  const lastHtmlRef = useRef<string>(text);
  
  // Calculate Stats
  const today = new Date();
  
  const monthStats = useMemo(() => {
        const year = today.getFullYear();
        const month = today.getMonth();
        const monthStudies = studies.filter(s => {
            const d = new Date(s.date);
            return d.getFullYear() === year && d.getMonth() === month;
        });
        
        return {
            count: monthStudies.length,
            points: monthStudies.reduce((sum, s) => sum + s.points, 0)
        };
    }, [studies]);

    const dayStats = useMemo(() => {
        const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const dayStudies = studies.filter(s => s.date.startsWith(dateStr));
        
        return {
            count: dayStudies.length,
            points: dayStudies.reduce((sum, s) => sum + s.points, 0)
        };
    }, [studies]);

  // Audio feedback for start/stop recording
  const playFeedbackSound = (type: 'start' | 'stop') => {
      try {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          if (!AudioContext) return;
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          if (type === 'start') {
              osc.frequency.setValueAtTime(600, ctx.currentTime);
              osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
          } else {
              osc.frequency.setValueAtTime(600, ctx.currentTime);
              osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.1);
          }
          
          gain.gain.setValueAtTime(0.1, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
          
          osc.start();
          osc.stop(ctx.currentTime + 0.15);
      } catch (e) {
          // Ignore audio errors
      }
  };

  const onTranscriptFinalized = useCallback((transcript: string) => {
    const punctuationCommands = supportedLanguages[language].punctuationCommands;
    const allCommands = [...punctuationCommands, ...customCommands];
    
    // We lowercase for matching, but keep original for insertion
    let processed = ` ${transcript.trim()} `; 
    let processedLower = processed.toLowerCase();

     allCommands.forEach(cmd => {
        const spokenLower = ` ${cmd.spoken.toLowerCase()} `;
        if (processedLower.includes(spokenLower)) {
            const regex = new RegExp(` ${cmd.spoken} `, 'gi');
            processed = processed.replace(regex, `${cmd.replacement} `);
            processedLower = processed.toLowerCase(); // Update for subsequent checks
        }
    });
    
    processed = processed.replace(/\s+([.,?!):])/g, '$1').trim();
    
    // Apply medical specific corrections using the new utility
    processed = medicalPostProcess(processed, supportedLanguages[language].speechCode);

    // Apply automatic formatting
    const editor = editorRef.current;
    let context = { isFirstContent: true, followsSentenceEnd: false };
    if (editor) {
        const existingText = editor.innerText.trim();
        context.isFirstContent = existingText.length === 0;
        if (!context.isFirstContent) {
            const lastChar = existingText.slice(-1);
            context.followsSentenceEnd = ".?!".includes(lastChar);
        }
    }
    processed = applySimpleCorrectionsToText(processed, context);

    if (processed) {
        const htmlToInsert = `<span class="text-voice">${processed}</span>`;
        if (editorRef.current) {
            editorRef.current.focus();
            insertHtmlAtCursor(htmlToInsert);
            // Manually update text state to include voice input
            editorRef.current.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        }
    }
  }, [language, customCommands, supportedLanguages]);

  // Use radiologyTerms for grammar injection
  const { isListening, interimText, error, toggleListen, isAlwaysOn, setIsAlwaysOn, isSupported } = useSpeechRecognition({
    onTranscriptFinalized,
    lang: supportedLanguages[language].speechCode,
    vocabulary: radiologyTerms,
    remoteAudioStream: microphoneSource === 'remote' ? localRemoteAudioStream : undefined
  });

  const handleToggleListen = useCallback(() => {
    if (!isSupported) {
        alert(t('editor.micError'));
        return;
    }
    // Play feedback sound based on target state (if currently listening, we are stopping)
    playFeedbackSound(isListening ? 'stop' : 'start');
    toggleListen();
  }, [isSupported, toggleListen, isListening, t]);
  
  const applySimpleCorrectionsToText = (text: string, context: { isFirstContent: boolean, followsSentenceEnd: boolean }): string => {
    let processed = text.trim();
    if (!processed) return '';
    
    // Auto-capitalize first letter if needed
    if (context.isFirstContent || context.followsSentenceEnd) {
        processed = processed.charAt(0).toUpperCase() + processed.slice(1);
    }
    
    return processed;
  };

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const html = e.currentTarget.innerHTML;
    // Update ref BEFORE state to prevent the useEffect loop
    lastHtmlRef.current = html;
    setText(html);
    
    if(grammarErrors.length > 0) {
      removeGrammarHighlighting(editorRef.current);
      setGrammarErrors([]);
    }
  };
  
  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isCorrectionMode || !editorRef.current) return;
      e.preventDefault();
      
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
          let range = selection.getRangeAt(0);
          
          if (range.collapsed) {
              const { x, y } = e.nativeEvent;
              let tempRange: Range | null = null;
              if (document.caretRangeFromPoint) {
                 tempRange = document.caretRangeFromPoint(x, y);
              } else if (document.caretPositionFromPoint) {
                 const pos = document.caretPositionFromPoint(x,y);
                 if (pos) {
                    tempRange = document.createRange();
                    tempRange.setStart(pos.offsetNode, pos.offset);
                 }
              }
              if (tempRange && tempRange.expand) {
                  tempRange.expand('word');
                  range = tempRange;
                  selection.removeAllRanges();
                  selection.addRange(range);
              }
          }
          
          if (!range.collapsed) {
            const rect = range.getBoundingClientRect();
            setCorrectionTarget({ top: rect.bottom + 5, left: rect.left, range });
          }
      }
  };

  // Synchronize text state with contentEditable content, preventing cursor jumps
  useEffect(() => {
    const editor = editorRef.current;
    if (editor && text !== lastHtmlRef.current) {
        editor.innerHTML = text;
        lastHtmlRef.current = text;
    }
  }, [text]);

  // New hook to manage toolbar visibility
  useEffect(() => {
        const handleSelectionChange = () => {
            const selection = window.getSelection();
            const editor = editorRef.current;

            if (!selection || !editor || selection.isCollapsed || !editor.contains(selection.anchorNode)) {
                if (toolbarState?.visible) {
                    setToolbarState({ ...toolbarState, visible: false });
                }
                return;
            }

            const range = selection.getRangeAt(0);
            const editorRect = editor.getBoundingClientRect();
            const selectionRect = range.getBoundingClientRect();
            
            setToolbarState({
                top: selectionRect.top - editorRect.top - 45, // Position above selection
                left: selectionRect.left - editorRect.left + selectionRect.width / 2,
                visible: true
            });
        };

        const handleInteraction = () => setTimeout(handleSelectionChange, 1);
        
        document.addEventListener('mouseup', handleInteraction);
        document.addEventListener('keyup', handleInteraction);
        
        return () => {
            document.removeEventListener('mouseup', handleInteraction);
            document.removeEventListener('keyup', handleInteraction);
        };
    }, [toolbarState]);

  const handleCopy = () => {
    const textToCopy = getPlainText(editorRef.current);
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleEnhanceWithAI = useCallback(async () => {
    const currentText = getPlainText(editorRef.current);
    if (!currentText || isProcessingAI) return;

    // Store current state as raw input for potential training
    setLastRawText(currentText);

    removeGrammarHighlighting(editorRef.current);
    setGrammarErrors([]);

    // Open the new AI Refinement Modal
    setRefinementOriginalText(currentText);
    setShowRefinementModal(true);
  }, [isProcessingAI]);

  const handleAcceptAICorrection = (correctedText: string) => {
    setText(correctedText.replace(/\n/g, '<br>'));
    setShowAiResultModal(false);
    setAiResult(null);
  };

  const handleRefinementComplete = (data: {
    originalReport: string;
    aiImprovedReport: string;
    finalUserReport: string;
  }) => {
    // Update the editor with the final approved text
    setText(data.finalUserReport.replace(/\n/g, '<br>'));
    setToastMessage('Report enhanced successfully!');
    setTimeout(() => setToastMessage(''), 3000);

    // Close refinement modal
    setShowRefinementModal(false);
    setRefinementOriginalText('');
  };

  const handleRefinementCancel = () => {
    setShowRefinementModal(false);
    setRefinementOriginalText('');
  };

  const handleCodeApprove = (code: string, date: string) => {
    // Add study to planner using the extracted code
    console.log('📋 Adding study to planner:', { code, date });
    const success = addStudy(code, '', date);
    console.log('✅ Study add result:', success);

    if (success) {
      setShowCodeApprovalModal(false);
      setExtractedCodeData(null);
      setToastMessage(`Study ${code} added to planner for ${new Date(date).toLocaleDateString()}!`);
      setTimeout(() => setToastMessage(''), 3000);
    } else {
      console.error('❌ Failed to add study - code not found in radiology codes');
      alert(`Failed to add study to planner. Code "${code}" not found in radiology codes database.`);
    }
  };

  const handleCodeSkip = () => {
    setShowCodeApprovalModal(false);
    setExtractedCodeData(null);
    setToastMessage('Report completed!');
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleTrainAI = () => {
    const currentText = getPlainText(editorRef.current);
    if (!lastRawText || !currentText || lastRawText === currentText) return;

    if (isStyleTrainingLimitReached) {
      setToastMessage('⚠️ Training limit reached (20/20). Compact examples in Settings to continue.');
      setTimeout(() => setToastMessage(''), 5000);
      return;
    }

    addStyleExample(lastRawText, currentText);
    setToastMessage(t('editor.trained', 'AI learned your style!'));
    setTimeout(() => setToastMessage(''), 3000);
    setLastRawText(''); // Reset after learning
  };

  const handleCorrectSelection = async () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const selectedText = selection.toString();
    setIsCorrectingSelection(true);
    
    try {
        const correctedText = await correctSelectionWithAI(selectedText);
        if (correctedText && correctedText !== selectedText) {
            const htmlToInsert = `<span class="text-pasted">${correctedText}</span>`;
            insertHtmlAtCursor(htmlToInsert);
            editorRef.current?.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        }
    } catch (err) {
        console.error("Selection correction failed:", err);
        alert(t('editor.aiError'));
    } finally {
        setIsCorrectingSelection(false);
        if (toolbarState) setToolbarState({ ...toolbarState, visible: false });
        window.getSelection()?.collapseToEnd();
    }
  };

  const handlePasteToComparison = async () => {
    try {
        const clipboardText = await navigator.clipboard.readText();
        setComparisonText(clipboardText);
    } catch (err) {
        console.error('Failed to read clipboard contents: ', err);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
        const clipboardText = await navigator.clipboard.readText();
        if (clipboardText && editorRef.current) {
            editorRef.current.focus();
            const processedText = applySimpleCorrectionsToText(clipboardText, { 
                isFirstContent: getPlainText(editorRef.current).length === 0, 
                // A bit naive, but safe default
                followsSentenceEnd: false 
            });
            const htmlToInsert = `<span class="text-pasted">${processedText.replace(/\n/g, '<br>')}</span>`;
            insertHtmlAtCursor(htmlToInsert);
            editorRef.current.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        }
    } catch (err) {
        console.error('Failed to read clipboard contents: ', err);
    }
  };

  const handleCopyComparison = () => {
    if (!comparisonText) return;
    navigator.clipboard.writeText(comparisonText);
    setComparisonCopied(true);
    setTimeout(() => setComparisonCopied(false), 2000);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const textToPaste = e.clipboardData.getData('text/plain');
    if (textToPaste) {
        const processedText = applySimpleCorrectionsToText(textToPaste, { isFirstContent: true, followsSentenceEnd: false });
        const span = document.createElement('span');
        span.className = 'text-pasted';
        span.textContent = processedText;
        insertHtmlAtCursor(span.outerHTML);
        editorRef.current?.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    }
  };
  
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
      isInternalDrag.current = true;
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
          draggedRangeRef.current = selection.getRangeAt(0).cloneRange();
      }
      e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
      isInternalDrag.current = false;
      draggedRangeRef.current = null;
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.dataTransfer.getData('text/plain');
    if (text) {
        let range: Range | null = null;
        if (document.caretRangeFromPoint) {
            range = document.caretRangeFromPoint(e.clientX, e.clientY);
        } else if (document.caretPositionFromPoint) {
            const pos = document.caretPositionFromPoint(e.clientX, e.clientY);
            if (pos) {
                range = document.createRange();
                range.setStart(pos.offsetNode, pos.offset);
                range.collapse(true);
            }
        }
        
        if (range) {
            // Check if dropping inside the dragged range (invalid move)
            if (isInternalDrag.current && draggedRangeRef.current) {
                 if (draggedRangeRef.current.isPointInRange(range.startContainer, range.startOffset)) {
                     // Dropping inside itself, cancel
                     handleDragEnd();
                     return; 
                 }
            }

            const sel = window.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(range);
            
            const html = `<span class="text-dragged">${text.replace(/\n/g, '<br>')}</span>`;
            insertHtmlAtCursor(html);
            
            // Delete original content if internal move (simulate cut-paste)
            if (isInternalDrag.current && draggedRangeRef.current) {
                try {
                    draggedRangeRef.current.deleteContents();
                } catch (err) {
                    console.error("Failed to delete original text on drag-move", err);
                }
            }
            
            editorRef.current?.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        }
    }
    handleDragEnd();
  };
  
  const handleApplyCorrection = (spoken: string, replacement: string, range: Range) => {
    addOrUpdateCustomCommand({ spoken, replacement });

    if (editorRef.current) {
        editorRef.current.focus();
        const sel = window.getSelection();
        if (sel) {
            sel.removeAllRanges();
            sel.addRange(range);
            
            const span = document.createElement('span');
            span.className = 'text-pasted'; // Re-use 'pasted' style for manual edits
            span.textContent = replacement;
            insertHtmlAtCursor(span.outerHTML);

            editorRef.current.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        }
    }

    setToastMessage(t('editor.commandSaved', { spoken, replacement }));
    setTimeout(() => setToastMessage(''), 4000);
    setCorrectionTarget(null);
  };

  const handleGrammarCheck = async () => {
    const currentText = getPlainText(editorRef.current);
    if (!currentText || isCheckingGrammar) return;

    removeGrammarHighlighting(editorRef.current);
    setGrammarErrors([]);
    setIsCheckingGrammar(true);

    try {
        const errors = await checkGrammar(currentText);
        const errorsWithIds = errors.map(e => ({ ...e, id: crypto.randomUUID() }));
        if (errorsWithIds.length > 0) {
            setGrammarErrors(errorsWithIds);
            applyGrammarHighlighting(editorRef.current, errorsWithIds);
        } else {
            setToastMessage(t('editor.grammar.noErrors'));
            setTimeout(() => setToastMessage(''), 3000);
        }
    } catch (err) {
        console.error(err);
        alert(t('editor.aiError'));
    } finally {
        setIsCheckingGrammar(false);
    }
  };

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const handleClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('grammar-error')) {
            const errorId = target.dataset.errorId;
            const error = grammarErrors.find(err => err.id === errorId);
            if (error) {
                setActiveError({ error, element: target });
            }
        } else {
            setActiveError(null);
        }
    };
    
    editor.addEventListener('click', handleClick);
    return () => editor.removeEventListener('click', handleClick);
  }, [grammarErrors]);

  // Global Hotkey Listener
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
        // Ignore if focus is in an input or textarea (except the editor contenteditable div)
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || (target.isContentEditable && target !== editorRef.current)) {
            return;
        }

        const modifiers = [];
        if (e.ctrlKey) modifiers.push('Ctrl');
        if (e.altKey) modifiers.push('Alt');
        if (e.shiftKey) modifiers.push('Shift');
        if (e.metaKey) modifiers.push('Meta');
        
        let key = e.key;
        if (key === ' ') key = 'Space';
        
        const combo = [...modifiers, key.toUpperCase()].join('+');

        if (hotkeys.toggleRecord && combo === hotkeys.toggleRecord.toUpperCase()) {
            e.preventDefault();
            handleToggleListen();
        } else if (hotkeys.triggerAI && combo === hotkeys.triggerAI.toUpperCase()) {
            e.preventDefault();
            handleEnhanceWithAI();
        } else if (hotkeys.toggleLayout && combo === hotkeys.toggleLayout.toUpperCase()) {
            e.preventDefault();
            setLayoutMode(prev => {
                if (prev === 'normal') return 'split-vertical';
                if (prev === 'split-vertical') return 'split-horizontal';
                return 'normal';
            });
        }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [hotkeys, handleToggleListen, handleEnhanceWithAI, setLayoutMode]);

  const hasText = getPlainText(editorRef.current).length > 0;
  const isSplitView = layoutMode !== 'normal';

  const getGridClass = () => {
    switch (layoutMode) {
      case 'split-vertical':
        return 'grid-cols-1 lg:grid-cols-2 gap-px bg-gray-700';
      case 'split-horizontal':
        return 'grid-rows-2 gap-px bg-gray-700';
      default:
        return 'grid-cols-1';
    }
  };

  const densityPadding = layoutDensity === 'compact' ? 'p-1' : (layoutDensity === 'spacious' ? 'p-3' : 'p-2');
  const buttonPadding = layoutDensity === 'compact' ? 'p-1.5' : (layoutDensity === 'spacious' ? 'p-3' : 'p-2');
  const iconSize = layoutDensity === 'compact' ? 'h-4 w-4' : (layoutDensity === 'spacious' ? 'h-6 w-6' : 'h-5 w-5');
  const micIconSize = layoutDensity === 'compact' ? 'h-5 w-5' : (layoutDensity === 'spacious' ? 'h-8 w-8' : 'h-6 w-6');

  return (
    <div className="relative flex flex-col h-full rounded-lg overflow-hidden" style={{ backgroundColor: currentTheme.colors.bgSecondary, borderColor: currentTheme.colors.borderColor, borderWidth: '1px' }}>
      {showAiResultModal && aiResult && (
        <CorrectionModal
            isOpen={showAiResultModal}
            onClose={() => setShowAiResultModal(false)}
            originalText={aiResult.original}
            correctedText={aiResult.corrected}
            onAccept={handleAcceptAICorrection}
        />
      )}
      <AIReportRefinementModal
        isOpen={showRefinementModal}
        originalText={refinementOriginalText}
        onComplete={handleRefinementComplete}
        onCancel={handleRefinementCancel}
        templateId={loadedTemplate?.id}
        templateHeader={loadedTemplate?.title}
      />
      <StudyCodeApprovalModal
        isOpen={showCodeApprovalModal}
        extractedCode={extractedCodeData?.code || null}
        codeData={extractedCodeData?.codeData || null}
        studyDate={new Date().toISOString()}
        onApprove={handleCodeApprove}
        onSkip={handleCodeSkip}
      />
      {toolbarState?.visible && (
        <SelectionToolbar 
            top={toolbarState.top}
            left={toolbarState.left}
            onCorrect={handleCorrectSelection}
            isCorrecting={isCorrectingSelection}
        />
      )}
      {toastMessage && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-green-600/90 text-white px-4 py-2 rounded-lg shadow-lg z-20 animate-fade-in">
              {toastMessage}
          </div>
      )}
      {correctionTarget && (
        <CorrectionTooltip 
          target={correctionTarget}
          onClose={() => setCorrectionTarget(null)}
          onSave={(spoken, replacement) => {
            if(correctionTarget) {
                handleApplyCorrection(spoken, replacement, correctionTarget.range);
            }
          }}
        />
      )}
      {activeError && (
        <GrammarTooltip
            activeError={activeError}
            onClose={() => setActiveError(null)}
            onAccept={(element, suggestion) => {
                element.textContent = suggestion;
                element.classList.remove('grammar-error');
                setGrammarErrors(prev => prev.filter(e => e.id !== activeError.error.id));
                setActiveError(null);
                // Trigger an input event to update the main text state
                editorRef.current?.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
            }}
        />
      )}

      <div className={`flex-shrink-0 ${densityPadding} border-b border-gray-700 flex flex-wrap items-center justify-between gap-2`}>
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleListen}
              className={`relative px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all duration-300 font-semibold ${isListening ? 'bg-red-600 shadow-lg shadow-red-500/50 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
              title={`${t('editor.pressToTalk')} (${hotkeys.toggleRecord})`}
            >
              <div className={`absolute inset-0 rounded-lg border-2 border-white/30 ${isListening ? 'animate-pulse' : 'hidden'}`}></div>
              {isListening ? <StopIcon className={micIconSize} /> : <MicrophoneIcon className={micIconSize} />}
              <span className={layoutDensity === 'compact' ? 'hidden sm:inline text-sm' : 'text-sm'}>{isListening ? t('editor.recording') : t('editor.pressToTalk')}</span>
            </button>
            <button
              onClick={() => setIsAlwaysOn(!isAlwaysOn)}
              title={t('editor.continuousModeDesc')}
              className={`${buttonPadding} rounded-lg flex items-center justify-center transition-colors ${isAlwaysOn ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
            >
              <SmallMicrophoneIcon className={iconSize} />
            </button>
            <button 
              onClick={() => setMicrophoneSource(microphoneSource === 'local' ? 'remote' : 'local')} 
              title={`Microphone source: ${microphoneSource === 'local' ? 'Local' : 'Remote (Android)'}`}
              className={`${buttonPadding} rounded-lg flex items-center justify-center transition-colors text-xs font-semibold ${
                microphoneSource === 'remote' 
                  ? localRemoteAudioStream ? 'bg-blue-500 text-white' : 'bg-orange-600 text-white'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}>
              {microphoneSource === 'local' ? 'Local' : localRemoteAudioStream ? '📱' : '⚠️'}
            </button>
            <button 
              onClick={() => setIsCorrectionMode(!isCorrectionMode)} 
              title={t('editor.correctionModeDesc')} 
              className={`${buttonPadding} rounded-lg flex items-center justify-center transition-colors ${isCorrectionMode ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>
              <PencilIcon className={iconSize} />
            </button>
            <button 
              onClick={() => setIsSpellCheckOn(!isSpellCheckOn)} 
              title={t('editor.spellCheckDesc')} 
              className={`${buttonPadding} rounded-lg flex items-center justify-center transition-colors ${isSpellCheckOn ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>
              <CheckBadgeIcon className={iconSize}/>
            </button>
            {lastRawText && (
               <button
                onClick={handleTrainAI}
                disabled={isStyleTrainingLimitReached}
                title={isStyleTrainingLimitReached
                  ? `Training limit reached (${styleExamples.length}/20). Compact in Settings to continue.`
                  : t('editor.trainAIDesc', 'Train AI from your corrections')
                }
                className={`${buttonPadding} rounded-lg flex items-center justify-center transition-all ${
                  isStyleTrainingLimitReached
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-amber-500 text-white hover:bg-amber-600 shadow-[0_0_10px_rgba(245,158,11,0.3)] animate-pulse'
                }`}>
                <BrainIcon className={iconSize}/>
                {isStyleTrainingLimitReached && (
                  <span className="ml-1 text-xs">({styleExamples.length}/20)</span>
                )}
              </button>
            )}
          </div>
          
          <div className="flex items-center justify-end gap-2">
            <div className="hidden xl:flex items-center gap-2 mr-2">
                {/* Day Stats Box */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-gray-600/50 bg-gray-700/30 text-sm">
                    <span className="font-semibold text-gray-400 uppercase text-xs tracking-wider">
                        {today.toLocaleDateString(language === 'pl' ? 'pl' : 'en-US', { day: 'numeric', month: 'short' })}:
                    </span>
                    <span className="font-bold text-white">
                        {dayStats.points.toFixed(0)} <span className="font-normal text-gray-500 text-xs">pts</span>
                    </span>
                    <span className="text-gray-600">/</span>
                    <span className="font-bold text-white">
                        {dayStats.count} <span className="font-normal text-gray-500 text-xs">st.</span>
                    </span>
                </div>

                {/* Month Stats Box */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-blue-500/20 bg-blue-900/10 text-sm">
                    <span className="font-semibold text-blue-400/80 uppercase text-xs tracking-wider">
                        {today.toLocaleString(language === 'pl' ? 'pl' : 'en-US', { month: 'long' })}:
                    </span>
                    <span className="font-bold text-blue-200">
                        {monthStats.points.toFixed(0)} <span className="font-normal text-blue-400/60 text-xs">pts</span>
                    </span>
                    <span className="text-blue-500/40">/</span>
                    <span className="font-bold text-blue-200">
                        {monthStats.count} <span className="font-normal text-blue-400/60 text-xs">st.</span>
                    </span>
                </div>
            </div>

            <button
                onClick={handleEnhanceWithAI} 
                disabled={!hasText || isProcessingAI} 
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded-md hover:bg-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title={`${t('editor.enhanceAI')} (${hotkeys.triggerAI})`}
              >
                  {isProcessingAI ? <SpinnerIcon className="h-4 w-4"/> : <SparklesIcon className="h-4 w-4"/>}
                  <span className={layoutDensity === 'compact' ? 'hidden lg:inline' : 'hidden sm:inline'}>{t('editor.enhanceAI')}</span>
              </button>
          </div>
      </div>
      <div className="h-5 text-center text-xs text-gray-400 pt-1">
          {error ? <span className="text-red-400">{error}</span> : isListening ? <span className="text-voice">{interimText || t('editor.listening')}</span> : hasText ? '' : ''}
      </div>
      
      <div className={`relative w-full flex-grow min-h-0 grid ${getGridClass()} overflow-hidden`} style={{ borderColor: currentTheme.colors.borderColor, borderTopWidth: '1px' }}>
        {/* Main Editor Panel */}
        <div className="relative w-full h-full flex flex-col overflow-hidden" style={{ backgroundColor: currentTheme.colors.bgPrimary }}>
             {/* New Header Structure using Flexbox for proper height and alignment */}
             <div className="flex-none h-12 flex items-center justify-between px-3" style={{ backgroundColor: currentTheme.colors.bgSecondary, borderBottomColor: currentTheme.colors.borderColor, borderBottomWidth: '1px' }}>
                <div className="flex-1"></div> {/* Left spacer */}
                <div className="text-sm font-semibold whitespace-nowrap" style={{ color: currentTheme.colors.textMuted }}>
                    {t('editor.mainPanelTitle')}
                </div>
                <div className="flex-1 flex justify-end items-center gap-1">
                    <button onClick={increaseFontSize} title={t('editor.increaseFontSize')} className="p-1.5 text-gray-300 hover:bg-gray-700 rounded-md transition-colors"><MagnifyingGlassPlusIcon /></button>
                    <button onClick={decreaseFontSize} title={t('editor.decreaseFontSize')} className="p-1.5 text-gray-300 hover:bg-gray-700 rounded-md transition-colors"><MagnifyingGlassMinusIcon /></button>
                    <button onClick={handlePasteFromClipboard} title={t('editor.pasteText')} className="p-1.5 text-gray-300 hover:bg-gray-700 rounded-md transition-colors"><PasteIcon /></button>
                    <button onClick={handleCopy} title={t('editor.copyText')} className="p-1.5 text-gray-300 hover:bg-gray-700 rounded-md transition-colors">{copied ? <CheckIcon/> : <CopyIcon/>}</button>
                    <button onClick={onClear} title={t('editor.clearText')} className="p-1.5 text-gray-300 hover:bg-gray-700 rounded-md transition-colors"><TrashIcon /></button>
                </div>
             </div>

            <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                spellCheck={isSpellCheckOn}
                onInput={handleInput}
                onContextMenu={handleContextMenu}
                onPaste={handlePaste}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDrop={handleDrop}
                className={`w-full flex-1 ${layoutDensity === 'compact' ? 'p-4' : 'p-6'} pt-2 text-keyboard focus:outline-none overflow-y-auto whitespace-pre-wrap leading-relaxed selection:bg-blue-500/50`}
                data-placeholder={t('editor.placeholder')}
                style={{ fontSize: `${fontSize}px` }}
            />
        </div>

        {isSplitView && (
             <div className="relative w-full h-full flex flex-col bg-gray-900 overflow-hidden">
                {/* Comparison Panel Header */}
                <div className="flex-none h-12 flex items-center justify-between px-3 border-b border-gray-700 bg-gray-800">
                    <div className="flex-1"></div> {/* Left spacer */}
                    <div className="text-sm font-semibold text-gray-400 whitespace-nowrap">
                        {(comparisonText && comparisonTitle) ? comparisonTitle : t('editor.comparisonPanelTitle')}
                    </div>
                    <div className="flex-1 flex justify-end items-center gap-1">
                        <button onClick={increaseFontSize} title={t('editor.increaseFontSize')} className="p-1.5 text-gray-300 hover:bg-gray-700 rounded-md transition-colors"><MagnifyingGlassPlusIcon /></button>
                        <button onClick={decreaseFontSize} title={t('editor.decreaseFontSize')} className="p-1.5 text-gray-300 hover:bg-gray-700 rounded-md transition-colors"><MagnifyingGlassMinusIcon /></button>
                        <button onClick={handlePasteToComparison} title={t('editor.pasteComparison')} className="p-1.5 text-gray-300 hover:bg-gray-700 rounded-md transition-colors">
                            <PasteIcon />
                        </button>
                        <button onClick={handleCopyComparison} title={t('editor.copyComparison', 'Copy Comparison')} className="p-1.5 text-gray-300 hover:bg-gray-700 rounded-md transition-colors">
                            {comparisonCopied ? <CheckIcon/> : <CopyIcon/>}
                        </button>
                        <button onClick={() => setComparisonText('')} title={t('editor.clearComparison')} className="p-1.5 text-gray-300 hover:bg-gray-700 rounded-md transition-colors">
                            <TrashIcon />
                        </button>
                    </div>
                </div>

                <div
                    className={`w-full flex-1 ${layoutDensity === 'compact' ? 'p-4' : 'p-6'} text-gray-400 overflow-y-auto whitespace-pre-wrap leading-relaxed`}
                    style={{ fontSize: `${fontSize}px` }}
                >
                    {comparisonText}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default EditorPanel;
