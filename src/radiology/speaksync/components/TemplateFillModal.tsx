import React from 'react';
import type { Template } from '../types';
import TemplateMacroFill from './TemplateMacroFill';

interface Props {
  template: Template;
  mode: 'replace' | 'append';
  onInsert: (text: string) => void;
  onClose: () => void;
}

/**
 * Interactive fill-in panel for a parameterized template. Wraps the shared
 * TemplateMacroFill (controls + color-coded preview) in a modal with an
 * insert action.
 */
const TemplateFillModal: React.FC<Props> = ({ template, mode, onInsert, onClose }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
  >
    <div
      className="bg-gray-800 text-gray-100 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-gray-700"
      onMouseDown={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700">
        <h2 className="font-bold text-lg truncate" title={template.title}>{template.title}</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-xl px-2" aria-label="Close">✕</button>
      </div>

      <TemplateMacroFill
        content={template.content}
        footer={(rendered) => (
          <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-700">
            <button onClick={onClose} className="px-4 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-sm">Cancel</button>
            <button
              onClick={() => onInsert(rendered)}
              className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-sm font-semibold"
            >
              {mode === 'append' ? 'Insert into report' : 'Load into editor'}
            </button>
          </div>
        )}
      />
    </div>
  </div>
);

export default TemplateFillModal;
