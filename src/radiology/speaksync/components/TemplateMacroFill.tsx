import React, { useEffect, useMemo, useState } from 'react';
import {
  analyzeTemplate,
  defaultValues,
  renderTemplate,
  renderSegments,
  type MacroValues,
} from '../utils/templateMacros';

const KIND_CLASS: Record<string, string> = {
  static: 'text-gray-100',
  field: 'text-amber-300',
  optional: 'text-sky-300',
};

/** Color-coded preview: white = static, amber = field value, sky = optional/toggle text. */
export const MacroPreview: React.FC<{ content: string; values: MacroValues; className?: string }> = ({ content, values, className }) => {
  const segs = useMemo(() => renderSegments(content, values), [content, values]);
  return (
    <pre className={`whitespace-pre-wrap text-sm font-sans leading-relaxed ${className ?? ''}`}>
      {segs.length === 0
        ? <span className="text-gray-500">Add {'{{tokens}}'} to see a preview here.</span>
        : segs.map((s, i) => <span key={i} className={KIND_CLASS[s.kind]}>{s.text}</span>)}
    </pre>
  );
};

export const MacroLegend: React.FC = () => (
  <div className="flex items-center gap-3 text-[11px] text-gray-400">
    <span><span className="text-gray-100">▉</span> static</span>
    <span><span className="text-amber-300">▉</span> field</span>
    <span><span className="text-sky-300">▉</span> optional</span>
  </div>
);

interface Props {
  content: string;
  /** Optional footer; receives the current rendered (plain) text for an insert action. */
  footer?: (rendered: string) => React.ReactNode;
}

/**
 * Interactive fill panel: controls on the left (text fields, dropdowns, toggles),
 * a live color-coded preview on the right. Used both by the insert flow
 * (TemplateFillModal) and the editor's "Test fields" tab. Values are preserved
 * across content edits where the field names still exist.
 */
const TemplateMacroFill: React.FC<Props> = ({ content, footer }) => {
  const controls = useMemo(() => analyzeTemplate(content), [content]);
  const controlsKey = useMemo(() => controls.map(c => `${c.kind}:${c.name}`).join('|'), [controls]);
  const [values, setValues] = useState<MacroValues>(() => defaultValues(controls));

  // Reconcile values when the set of controls changes (e.g. editing the template),
  // keeping any value the user already set for fields/blocks that still exist.
  useEffect(() => {
    setValues(prev => {
      const next = defaultValues(controls);
      for (const k of Object.keys(next.fields)) if (prev.fields[k] !== undefined) next.fields[k] = prev.fields[k];
      for (const k of Object.keys(next.blocks)) if (prev.blocks[k] !== undefined) next.blocks[k] = prev.blocks[k];
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlsKey]);

  const rendered = useMemo(() => renderTemplate(content, values), [content, values]);

  const setField = (name: string, v: string) => setValues(s => ({ ...s, fields: { ...s.fields, [name]: v } }));
  const setBlock = (name: string, on: boolean) => setValues(s => ({ ...s, blocks: { ...s.blocks, [name]: on } }));

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="flex-1 min-h-0 grid md:grid-cols-2">
        {/* Controls */}
        <div className="p-4 overflow-y-auto space-y-3 md:border-r border-gray-700">
          {controls.length === 0 && <p className="text-sm text-gray-400">This template has no fill-in fields.</p>}
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

        {/* Live color-coded preview */}
        <div className="p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">Preview</span>
            <MacroLegend />
          </div>
          <MacroPreview content={content} values={values} />
        </div>
      </div>
      {footer && footer(rendered)}
    </div>
  );
};

export default TemplateMacroFill;
