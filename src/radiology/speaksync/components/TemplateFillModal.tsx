import React, { useMemo, useState } from 'react';
import type { Template } from '../types';
import { analyzeTemplate, defaultValues, renderTemplate, type MacroValues } from '../utils/templateMacros';

interface Props {
  template: Template;
  mode: 'replace' | 'append';
  onInsert: (text: string) => void;
  onClose: () => void;
}

/**
 * Interactive fill-in panel for a parameterized template (Approach 1).
 * Shows measurements as inputs, alternative phrasings as dropdowns, and
 * optional findings as checkboxes, with a live preview. On insert, the
 * rendered report text is handed back to the editor.
 */
const TemplateFillModal: React.FC<Props> = ({ template, mode, onInsert, onClose }) => {
  const controls = useMemo(() => analyzeTemplate(template.content), [template.content]);
  const [values, setValues] = useState<MacroValues>(() => defaultValues(controls));

  const preview = useMemo(() => renderTemplate(template.content, values), [template.content, values]);

  const setField = (name: string, v: string) =>
    setValues(s => ({ ...s, fields: { ...s.fields, [name]: v } }));
  const setBlock = (name: string, on: boolean) =>
    setValues(s => ({ ...s, blocks: { ...s.blocks, [name]: on } }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-gray-800 text-gray-100 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-gray-700"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700">
          <h2 className="font-bold text-lg truncate" title={template.title}>{template.title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl px-2" aria-label="Close">✕</button>
        </div>

        <div className="flex-1 min-h-0 grid md:grid-cols-2">
          {/* Controls */}
          <div className="p-4 overflow-y-auto space-y-3 md:border-r border-gray-700">
            {controls.length === 0 && (
              <p className="text-sm text-gray-400">This template has no fill-in fields.</p>
            )}
            {controls.map((c, i) => {
              if (c.kind === 'block') {
                return (
                  <label key={i} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={values.blocks[c.name] !== false}
                      onChange={e => setBlock(c.name, e.target.checked)}
                      className="accent-blue-500 w-4 h-4"
                    />
                    <span className="text-gray-200">{c.name}</span>
                  </label>
                );
              }
              if (c.kind === 'choice') {
                return (
                  <div key={i}>
                    <label className="block text-xs text-gray-400 mb-1">{c.name}</label>
                    <select
                      value={values.fields[c.name] ?? c.options[0] ?? ''}
                      onChange={e => setField(c.name, e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {c.options.map((o, j) => <option key={j} value={o}>{o}</option>)}
                    </select>
                  </div>
                );
              }
              return (
                <div key={i}>
                  <label className="block text-xs text-gray-400 mb-1">{c.name}</label>
                  <input
                    value={values.fields[c.name] ?? ''}
                    onChange={e => setField(c.name, e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              );
            })}
          </div>

          {/* Live preview */}
          <div className="p-4 overflow-y-auto bg-gray-850">
            <div className="text-xs text-gray-400 mb-1">Preview</div>
            <pre className="whitespace-pre-wrap text-sm text-gray-100 font-sans leading-relaxed">{preview}</pre>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-700">
          <button onClick={onClose} className="px-4 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-sm">Cancel</button>
          <button
            onClick={() => onInsert(preview)}
            className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-sm font-semibold"
          >
            {mode === 'append' ? 'Insert into report' : 'Load into editor'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TemplateFillModal;
