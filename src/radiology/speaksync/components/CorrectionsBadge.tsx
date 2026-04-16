/**
 * Compact badge that shows what the server-side dictionary corrected
 * in the last transcription. Click to expand a popover with the full
 * raw → corrected diff and per-correction breakdown.
 *
 * Helps with growing the Polish/German dictionaries: you can see
 * which terms got corrected (and which were missed) at a glance.
 */

import React, { useEffect, useRef, useState } from 'react';
import type { TranscribeResponse } from '../services/transcriptionService';

interface Props {
    response: TranscribeResponse | null;
    compact?: boolean;
}

const CorrectionsBadge: React.FC<Props> = ({ response, compact = false }) => {
    const [open, setOpen] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!open) return;
        const onClick = (e: MouseEvent) => {
            const target = e.target as Node;
            if (popoverRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
            setOpen(false);
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, [open]);

    if (!response) return null;

    const count = response.corrections_applied.length;
    const hasChanges = response.raw_text !== response.corrected_text;

    const buttonClass = compact
        ? 'px-1.5 py-1 text-[10px] rounded'
        : 'px-2 py-1 text-xs rounded-md';

    const dotColor = count > 0
        ? 'bg-emerald-400'
        : hasChanges
            ? 'bg-amber-400'
            : 'bg-gray-500';

    return (
        <div className="relative inline-flex">
            <button
                ref={buttonRef}
                onClick={() => setOpen(v => !v)}
                className={`${buttonClass} bg-gray-700/50 hover:bg-gray-700 text-gray-200 inline-flex items-center gap-1.5 transition-colors`}
                title={count > 0 ? `${count} dictionary correction(s) — click for details` : 'No corrections applied — click to view raw text'}
            >
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${dotColor}`} aria-hidden />
                <span className="font-mono">{count > 0 ? `✓ ${count}` : '✓ 0'}</span>
            </button>
            {open && (
                <div
                    ref={popoverRef}
                    className="absolute top-full mt-1 right-0 z-50 w-96 max-h-96 overflow-auto bg-gray-800 border border-gray-600 rounded-lg shadow-xl text-xs"
                >
                    <div className="p-3 border-b border-gray-700">
                        <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-gray-100">Last server transcription</span>
                            <button
                                onClick={() => setOpen(false)}
                                className="text-gray-400 hover:text-white text-base leading-none px-1"
                                aria-label="Close"
                            >×</button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-400">
                            <div>Confidence: <span className="text-gray-200">{(response.confidence * 100).toFixed(0)}%</span></div>
                            <div>Latency: <span className="text-gray-200">{response.processing_ms}ms</span></div>
                            <div>Audio: <span className="text-gray-200">{response.duration_sec.toFixed(1)}s</span></div>
                            <div>Lang: <span className="text-gray-200">{response.language_detected}</span></div>
                        </div>
                    </div>

                    {hasChanges ? (
                        <div className="p-3 border-b border-gray-700">
                            <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Raw</div>
                            <div className="font-mono text-amber-200/90 whitespace-pre-wrap break-words mb-2">{response.raw_text || '(empty)'}</div>
                            <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Corrected</div>
                            <div className="font-mono text-emerald-200/90 whitespace-pre-wrap break-words">{response.corrected_text || '(empty)'}</div>
                        </div>
                    ) : (
                        <div className="p-3 border-b border-gray-700 text-gray-400 italic">
                            No corrections were needed.
                        </div>
                    )}

                    {count > 0 && (
                        <div className="p-3">
                            <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">Corrections ({count})</div>
                            <div className="space-y-1">
                                {response.corrections_applied.map((c, i) => (
                                    <div key={i} className="flex items-center gap-2 font-mono">
                                        <span className="text-amber-300/80 line-through">{c.from}</span>
                                        <span className="text-gray-500">→</span>
                                        <span className="text-emerald-300">{c.to}</span>
                                        <span className="ml-auto text-[10px] text-gray-500">{c.type}</span>
                                    </div>
                                ))}
                            </div>
                            <p className="mt-3 text-[10px] text-gray-500 italic">
                                Tip: missing a term? Add it to <code>dictation-server/data/radiology_terms_{response.language_detected}.json</code> and the next transcription will catch it.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CorrectionsBadge;
