import React, { useMemo, useState } from 'react';
import { useTemplate } from '../context/TemplateContext';
import { useTranslations } from '../context/LanguageContext';
import { getAIService } from '../services/aiService';

interface Props {
  onResult: (text: string) => void;
  onClose: () => void;
}

/**
 * AI-merge (Approach 3): pick a base template, type/dictate only the deltas
 * (the bits that differ for this patient), and let the AI integrate them into
 * the base — updating measurements, flipping findings, adjusting the conclusion.
 */
const AIMergeModal: React.FC<Props> = ({ onResult, onClose }) => {
  const { templates } = useTemplate();
  const { language } = useTranslations();
  const [baseId, setBaseId] = useState<string>(templates[0]?.id ?? '');
  const [deltas, setDeltas] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const base = useMemo(() => templates.find(t => t.id === baseId) ?? null, [templates, baseId]);

  const run = async () => {
    if (!base || !deltas.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const merged = await getAIService().mergeReport(base.content, deltas.trim(), language);
      onResult(merged);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Merge failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-gray-800 text-gray-100 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-gray-700"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700">
          <h2 className="font-bold text-lg">🪄 AI merge from base</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl px-2" aria-label="Close">✕</button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Base template</label>
            <select
              value={baseId}
              onChange={e => setBaseId(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {templates.length === 0 && <option value="">No templates available</option>}
              {templates.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">
              What's different for this patient (measurements, findings present/absent, severity…)
            </label>
            <textarea
              value={deltas}
              onChange={e => setDeltas(e.target.value)}
              rows={5}
              placeholder="e.g. portal vein 17, splenic vein 13, spleen 141 x 65 x 158, recanalized umbilical vein with shunt, compensated cirrhosis"
              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Tip: keep it terse — only the differences. The AI keeps the rest of the base unchanged.
            </p>
          </div>

          {error && <div className="text-sm text-red-400 bg-red-900/30 border border-red-800 rounded px-3 py-2">{error}</div>}
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-700">
          <button onClick={onClose} className="px-4 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-sm">Cancel</button>
          <button
            onClick={run}
            disabled={!base || !deltas.trim() || busy}
            className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold"
          >
            {busy ? 'Generating…' : 'Generate report'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIMergeModal;
