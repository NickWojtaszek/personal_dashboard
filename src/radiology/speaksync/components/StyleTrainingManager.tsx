import React, { useState, useMemo } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useTheme } from '../context/ThemeContext';
import type { StyleExample } from '../types';
import { TrashIcon, CheckIcon } from './Icons';

/**
 * Style Training Manager Component
 * Allows users to review, compact, and manage their AI style training examples
 * Hard limit: 20 examples max
 */
const StyleTrainingManager: React.FC = () => {
  const { styleExamples, removeStyleExample, updateStyleExamples, clearStyleExamples, isStyleTrainingLimitReached } = useSettings();
  const { currentTheme } = useTheme();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showCompactMode, setShowCompactMode] = useState(false);

  // Detect similar/duplicate patterns
  const duplicateGroups = useMemo(() => {
    const groups: StyleExample[][] = [];
    const processed = new Set<string>();

    styleExamples.forEach((example, idx) => {
      if (processed.has(example.id)) return;

      const similar: StyleExample[] = [example];
      processed.add(example.id);

      // Find examples with similar transformations
      styleExamples.slice(idx + 1).forEach(other => {
        if (processed.has(other.id)) return;

        // Simple similarity check: same length change percentage
        const exampleLengthChange = ((example.final.length - example.raw.length) / example.raw.length) * 100;
        const otherLengthChange = ((other.final.length - other.raw.length) / other.raw.length) * 100;

        if (Math.abs(exampleLengthChange - otherLengthChange) < 10) {
          similar.push(other);
          processed.add(other.id);
        }
      });

      if (similar.length > 1) {
        groups.push(similar);
      }
    });

    return groups;
  }, [styleExamples]);

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const handleDeleteSelected = () => {
    selectedIds.forEach(id => removeStyleExample(id));
    setSelectedIds(new Set());
    setShowCompactMode(false);
  };

  const handleKeepSelected = () => {
    // Keep only selected items
    const keptExamples = styleExamples.filter(ex => selectedIds.has(ex.id));
    updateStyleExamples(keptExamples);
    setSelectedIds(new Set());
    setShowCompactMode(false);
  };

  const handleAutoSuggest = () => {
    // Auto-select to keep diverse examples (one per duplicate group, most recent)
    const toKeep = new Set<string>();

    // Add one from each duplicate group (most recent)
    duplicateGroups.forEach(group => {
      if (group.length > 0) {
        toKeep.add(group[0].id);
      }
    });

    // Add non-duplicated examples
    const allDuplicatedIds = new Set(duplicateGroups.flatMap(g => g.map(ex => ex.id)));
    styleExamples.forEach(ex => {
      if (!allDuplicatedIds.has(ex.id)) {
        toKeep.add(ex.id);
      }
    });

    setSelectedIds(toKeep);
  };

  if (styleExamples.length === 0) {
    return (
      <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-700">
        <h3 className="text-lg font-bold text-white mb-2">AI Style Training</h3>
        <p className="text-sm text-gray-400">
          No training examples yet. Use the "Train AI" button in the editor to capture your editing style.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-700 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">AI Style Training</h3>
          <p className="text-sm text-gray-400 mt-1">
            Manage your AI training examples ({styleExamples.length}/20)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {showCompactMode && selectedIds.size > 0 && (
            <>
              <button
                onClick={handleKeepSelected}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md transition-colors"
              >
                Keep Selected ({selectedIds.size})
              </button>
              <button
                onClick={handleDeleteSelected}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-md transition-colors flex items-center gap-1"
              >
                <TrashIcon className="h-4 w-4" />
                Delete Selected ({selectedIds.size})
              </button>
            </>
          )}
          {!showCompactMode && (
            <button
              onClick={() => setShowCompactMode(true)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
            >
              Compact Examples
            </button>
          )}
        </div>
      </div>

      {/* Warning Banner */}
      {isStyleTrainingLimitReached && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="h-6 w-6 text-yellow-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="flex-grow">
              <p className="text-sm font-semibold text-yellow-300">Training Limit Reached (20/20)</p>
              <p className="text-sm text-gray-300 mt-1">
                Review and compact your examples to continue training. Select examples to keep (recommended: 10-15).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Compact Mode Tools */}
      {showCompactMode && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-300">Compact Mode Active</p>
              <p className="text-sm text-gray-400 mt-1">
                Select examples to keep. Tip: Keep diverse patterns, remove duplicates.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleAutoSuggest}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
              >
                Auto-Suggest ({Math.min(15, styleExamples.length - duplicateGroups.reduce((acc, g) => acc + g.length - 1, 0))})
              </button>
              <button
                onClick={() => {
                  setShowCompactMode(false);
                  setSelectedIds(new Set());
                }}
                className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded-md transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>

          {duplicateGroups.length > 0 && (
            <div className="mt-3 text-xs text-yellow-300">
              ⚠️ Found {duplicateGroups.length} groups with similar patterns ({duplicateGroups.reduce((acc, g) => acc + g.length, 0)} examples total)
            </div>
          )}
        </div>
      )}

      {/* Example List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {styleExamples.map((example, idx) => {
          const isDuplicate = duplicateGroups.some(group => group.some(ex => ex.id === example.id));
          const isSelected = selectedIds.has(example.id);

          return (
            <div
              key={example.id}
              className={`border rounded-lg p-3 transition-all ${
                showCompactMode
                  ? 'cursor-pointer hover:border-blue-500'
                  : ''
              } ${
                isSelected
                  ? 'border-green-500 bg-green-500/10'
                  : isDuplicate
                  ? 'border-yellow-500/50 bg-yellow-500/5'
                  : 'border-gray-700 bg-gray-800/50'
              }`}
              onClick={() => showCompactMode && toggleSelection(example.id)}
            >
              <div className="flex items-start gap-3">
                {showCompactMode && (
                  <div className="flex-shrink-0 mt-1">
                    <div className={`w-5 h-5 border-2 rounded flex items-center justify-center ${
                      isSelected
                        ? 'bg-green-500 border-green-500'
                        : 'border-gray-500'
                    }`}>
                      {isSelected && <CheckIcon className="h-3 w-3 text-white" />}
                    </div>
                  </div>
                )}
                <div className="flex-grow min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-400">
                      Example #{styleExamples.length - idx}
                    </span>
                    {isDuplicate && (
                      <span className="text-xs text-yellow-400">Similar pattern detected</span>
                    )}
                    {!showCompactMode && (
                      <button
                        onClick={() => removeStyleExample(example.id)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                        title="Delete example"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-gray-500 mb-1">Original:</p>
                      <p className="text-gray-300 truncate font-mono bg-gray-900/50 p-2 rounded">
                        {example.raw.substring(0, 50)}...
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">Edited:</p>
                      <p className="text-green-300 truncate font-mono bg-gray-900/50 p-2 rounded">
                        {example.final.substring(0, 50)}...
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                    <span>Original: {example.raw.length} chars</span>
                    <span>Edited: {example.final.length} chars</span>
                    <span className={
                      example.final.length > example.raw.length
                        ? 'text-green-400'
                        : example.final.length < example.raw.length
                        ? 'text-yellow-400'
                        : 'text-gray-400'
                    }>
                      {example.final.length > example.raw.length ? '+' : ''}
                      {example.final.length - example.raw.length} chars
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Clear All Button */}
      {!showCompactMode && (
        <div className="pt-4 border-t border-gray-700">
          <button
            onClick={clearStyleExamples}
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-md transition-colors flex items-center justify-center gap-2"
          >
            <TrashIcon className="h-4 w-4" />
            Clear All Training Examples
          </button>
        </div>
      )}
    </div>
  );
};

export default StyleTrainingManager;
