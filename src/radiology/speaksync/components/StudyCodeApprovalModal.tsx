import React, { useState, useEffect, useMemo } from 'react';
import { CheckIcon } from './Icons';
import type { RadiologyCode } from '../types';

interface StudyCodeApprovalModalProps {
  isOpen: boolean;
  /** Code extracted from the template title — pre-fills the form, override allowed. */
  extractedCode: string | null;
  /** Full price list, for the code picker and points preview. */
  codes: RadiologyCode[];
  onAdd: (code: string, patientId: string, date: string) => void;
  onSkip: () => void;
}

/**
 * Post-approval study logger: after a report is approved, capture the study
 * number and confirm the code + date, then land it in the planner.
 */
const StudyCodeApprovalModal: React.FC<StudyCodeApprovalModalProps> = ({
  isOpen,
  extractedCode,
  codes,
  onAdd,
  onSkip
}) => {
  const today = new Date().toISOString().split('T')[0];
  const [code, setCode] = useState('');
  const [patientId, setPatientId] = useState('');
  const [date, setDate] = useState(today);

  // Re-seed the form each time the modal opens
  useEffect(() => {
    if (isOpen) {
      setCode(extractedCode || '');
      setPatientId('');
      setDate(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen, extractedCode]);

  const codeData = useMemo(() => codes.find(c => c.code === code) || null, [codes, code]);

  if (!isOpen) return null;

  const canAdd = !!codeData && date.length > 0;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div
        className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-md flex flex-col animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white mb-1">Log study to planner</h2>
          <p className="text-sm text-gray-400">
            {extractedCode
              ? 'Code pre-filled from the template — adjust if needed, add the study number.'
              : 'Pick the study code and add the study number.'}
          </p>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Study code</label>
            <select
              value={codeData ? code : ''}
              onChange={e => setCode(e.target.value)}
              className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— select code —</option>
              {codes.map(c => (
                <option key={c.code} value={c.code}>{c.code} — {c.desc} ({c.points.toFixed(1)} pkt)</option>
              ))}
            </select>
            {extractedCode && !codes.some(c => c.code === extractedCode) && (
              <p className="text-xs text-yellow-400 mt-1">
                Template code "{extractedCode}" is not in the price list — pick one manually.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Study number</label>
            <input
              type="text"
              value={patientId}
              onChange={e => setPatientId(e.target.value)}
              placeholder="e.g. 123456 (optional)"
              autoFocus
              className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={e => { if (e.key === 'Enter' && canAdd) onAdd(code, patientId.trim(), date); }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Study date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {codeData && (
            <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/30 rounded-lg p-3">
              <CheckIcon className="h-5 w-5 text-green-400 flex-shrink-0" />
              <p className="text-xs text-green-300">
                {codeData.desc} · <span className="font-bold">{codeData.points.toFixed(1)} pkt</span> — will be added to the planner for {date}.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 bg-gray-800/50 flex justify-end space-x-3">
          <button
            onClick={onSkip}
            className="px-6 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-md font-semibold transition-colors"
          >
            Skip
          </button>
          <button
            onClick={() => onAdd(code, patientId.trim(), date)}
            disabled={!canAdd}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add to planner
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudyCodeApprovalModal;
