import React, { useMemo, useState } from 'react';
import { useTemplate } from '../context/TemplateContext';
import type { Template } from '../types';

interface Props {
  onPick: (t: Template) => void;
  onAiMerge?: () => void;
}

/**
 * Compact "quick insert" palette (Approach 2). Lists the user's templates as
 * clickable chips; clicking one appends it to the current report (running it
 * through the fill-in panel first if it has macro fields). Collapsed by default
 * so it stays out of the way.
 */
const SnippetPalette: React.FC<Props> = ({ onPick, onAiMerge }) => {
  const { templates } = useTemplate();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = s
      ? templates.filter(t => t.title.toLowerCase().includes(s) || t.content.toLowerCase().includes(s))
      : templates;
    return list.slice(0, 60);
  }, [templates, q]);

  return (
    <div className="bg-gray-800/80 border border-gray-700 rounded-lg flex-shrink-0">
      <div className="w-full flex items-center justify-between px-3 py-2 text-sm">
        <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 text-gray-200 hover:text-white">
          <span>⚡ Quick insert{templates.length ? ` (${templates.length})` : ''}</span>
          <span className="text-gray-400 text-xs">{open ? '▲ hide' : '▼ show'}</span>
        </button>
        {onAiMerge && (
          <button
            onClick={onAiMerge}
            className="px-2 py-0.5 text-xs rounded bg-blue-600/80 hover:bg-blue-500 text-white"
            title="Pick a base template and dictate only the deltas — AI merges them"
          >
            🪄 AI merge
          </button>
        )}
      </div>
      {open && (
        <div className="px-3 pb-3 space-y-2">
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search snippets…"
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
            {filtered.map(t => (
              <button
                key={t.id}
                onClick={() => onPick(t)}
                title={t.content.slice(0, 240)}
                className="px-2 py-1 text-xs rounded bg-gray-700 hover:bg-blue-600 text-gray-100 border border-gray-600 transition-colors"
              >
                {t.title}
              </button>
            ))}
            {filtered.length === 0 && <span className="text-xs text-gray-500">No snippets.</span>}
          </div>
        </div>
      )}
    </div>
  );
};

export default SnippetPalette;
