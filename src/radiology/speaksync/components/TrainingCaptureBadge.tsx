/**
 * Badge + popover that surfaces Whisper-training data collection state.
 *
 * - Shows total pairs and total audio hours at a glance
 * - Popover breaks down unedited / corrected / rewritten counts
 * - Opening the popover triggers a reclassification pass against the
 *   current editor DOM, so stats reflect the user's latest edits
 * - Export: JSONL with base64 audio (simple, zero-dep, good for MVP)
 * - Delete all: wipes the IndexedDB store
 */

import React, { useEffect, useRef, useState } from 'react';
import {
    getAllPairs,
    getStats,
    deleteAllPairs,
    type TrainingStats,
    type TrainingPair,
} from '../services/trainingStore';

interface Props {
    enabled: boolean;
    /**
     * Called when the popover opens; the parent should pass the editor
     * DOM element so we can reclassify pairs against current text.
     */
    onReclassify: () => Promise<void> | void;
    /** Signal from parent that stats may have changed (new pair captured). */
    changeTick: number;
    compact?: boolean;
}

function formatBytes(b: number): string {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
    return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatDuration(sec: number): string {
    if (sec < 60) return `${sec.toFixed(0)}s`;
    if (sec < 3600) return `${(sec / 60).toFixed(1)}m`;
    return `${(sec / 3600).toFixed(2)}h`;
}

function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const dataUrl = reader.result as string;
            // Strip "data:audio/webm;base64," prefix
            const comma = dataUrl.indexOf(',');
            resolve(comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl);
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
    });
}

async function exportAsJsonl(pairs: TrainingPair[], filter: (p: TrainingPair) => boolean): Promise<void> {
    const eligible = pairs.filter(filter);
    const lines: string[] = [];
    for (const p of eligible) {
        const audioBase64 = await blobToBase64(p.audio);
        const line = JSON.stringify({
            id: p.id,
            timestamp: p.timestamp,
            language: p.language,
            duration_sec: p.durationSec,
            raw_transcript: p.rawTranscript,
            final_transcript: p.finalTranscript,
            classification: p.classification,
            edit_distance: p.editDistance,
            audio_mime: p.audioMimeType,
            audio_base64: audioBase64,
        });
        lines.push(line);
    }
    const content = lines.join('\n');
    const blob = new Blob([content], { type: 'application/jsonl' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.href = url;
    a.download = `whisper-training-${stamp}-${eligible.length}pairs.jsonl`;
    a.click();
    URL.revokeObjectURL(url);
}

const TrainingCaptureBadge: React.FC<Props> = ({ enabled, onReclassify, changeTick, compact = false }) => {
    const [open, setOpen] = useState(false);
    const [stats, setStats] = useState<TrainingStats | null>(null);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [includeUnedited, setIncludeUnedited] = useState(false);
    const [includeCorrected, setIncludeCorrected] = useState(true);
    const [includeRewritten, setIncludeRewritten] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const refreshStats = async () => {
        try {
            const s = await getStats();
            setStats(s);
        } catch {
            /* ignore */
        }
    };

    // Refresh on mount + whenever parent ticks
    useEffect(() => {
        if (!enabled) return;
        refreshStats();
    }, [enabled, changeTick]);

    // When popover opens: reclassify, then refresh stats
    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                await onReclassify();
                if (!cancelled) await refreshStats();
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [open, onReclassify]);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const onClick = (e: MouseEvent) => {
            const t = e.target as Node;
            if (popoverRef.current?.contains(t) || buttonRef.current?.contains(t)) return;
            setOpen(false);
            setConfirmDelete(false);
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, [open]);

    if (!enabled) return null;

    const handleExport = async () => {
        if (!stats || stats.total === 0) return;
        setExporting(true);
        try {
            const all = await getAllPairs();
            const filter = (p: TrainingPair) => (
                (includeUnedited && p.classification === 'unedited') ||
                (includeCorrected && p.classification === 'corrected') ||
                (includeRewritten && p.classification === 'rewritten')
            );
            await exportAsJsonl(all, filter);
        } catch (err) {
            console.error('[training] export failed:', err);
            alert('Export failed: ' + (err instanceof Error ? err.message : String(err)));
        } finally {
            setExporting(false);
        }
    };

    const handleDelete = async () => {
        await deleteAllPairs();
        setConfirmDelete(false);
        await refreshStats();
    };

    const buttonClass = compact
        ? 'px-1.5 py-1 text-[10px] rounded'
        : 'px-2 py-1 text-xs rounded-md';

    const total = stats?.total ?? 0;
    const hours = stats ? stats.totalDurationSec / 3600 : 0;

    return (
        <div className="relative inline-flex">
            <button
                ref={buttonRef}
                onClick={() => setOpen(v => !v)}
                className={`${buttonClass} bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-200 inline-flex items-center gap-1.5 transition-colors border border-emerald-800/50`}
                title={total > 0 ? `${total} training pairs collected · click to manage` : 'Training capture on — no pairs yet'}
            >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                    <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
                    <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
                </svg>
                <span className="font-mono">
                    {total > 0 ? `${total} \u00b7 ${formatDuration(hours * 3600)}` : 'rec'}
                </span>
            </button>
            {open && (
                <div
                    ref={popoverRef}
                    className="absolute top-full mt-1 right-0 z-50 w-96 bg-gray-800 border border-gray-600 rounded-lg shadow-xl text-xs"
                >
                    <div className="p-3 border-b border-gray-700 flex items-center justify-between">
                        <span className="font-semibold text-gray-100">Whisper training data</span>
                        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white text-base leading-none px-1" aria-label="Close">\u00d7</button>
                    </div>

                    <div className="p-3 space-y-2">
                        {loading ? (
                            <div className="text-gray-400 italic">Classifying pairs against editor\u2026</div>
                        ) : !stats || stats.total === 0 ? (
                            <div className="text-gray-400">
                                <p>No pairs captured yet.</p>
                                <p className="mt-2 text-[11px]">Dictate in <strong className="text-gray-200">Browser</strong> mode to start accumulating audio + transcript pairs. Nothing leaves your machine unless you export.</p>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-4 gap-1.5 text-center">
                                    <Stat label="unedited" value={stats.unedited} color="text-gray-300" />
                                    <Stat label="corrected" value={stats.corrected} color="text-emerald-300" />
                                    <Stat label="rewritten" value={stats.rewritten} color="text-amber-300" />
                                    <Stat label="deleted" value={stats.deleted} color="text-red-300" />
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-400 mt-2">
                                    <div>Total: <span className="text-gray-200">{stats.total}</span></div>
                                    <div>Audio: <span className="text-gray-200">{formatDuration(stats.totalDurationSec)}</span></div>
                                    <div>Storage: <span className="text-gray-200">{formatBytes(stats.totalAudioBytes)}</span></div>
                                    <div>Since: <span className="text-gray-200">{stats.oldestTimestamp ? new Date(stats.oldestTimestamp).toLocaleDateString() : '\u2014'}</span></div>
                                </div>

                                <div className="border-t border-gray-700 pt-2 mt-2">
                                    <div className="text-[11px] font-semibold text-gray-300 mb-1">Export as JSONL</div>
                                    <div className="flex flex-col gap-0.5 text-[11px] text-gray-300">
                                        <label className="inline-flex items-center gap-1.5"><input type="checkbox" checked={includeCorrected} onChange={e => setIncludeCorrected(e.target.checked)} /> Corrected ({stats.corrected}) <span className="text-emerald-400">\u2190 recommended</span></label>
                                        <label className="inline-flex items-center gap-1.5"><input type="checkbox" checked={includeUnedited} onChange={e => setIncludeUnedited(e.target.checked)} /> Unedited ({stats.unedited})</label>
                                        <label className="inline-flex items-center gap-1.5"><input type="checkbox" checked={includeRewritten} onChange={e => setIncludeRewritten(e.target.checked)} /> Rewritten ({stats.rewritten}) <span className="text-amber-400">\u2190 likely noisy</span></label>
                                    </div>
                                    <button
                                        onClick={handleExport}
                                        disabled={exporting || (!includeUnedited && !includeCorrected && !includeRewritten)}
                                        className="mt-2 w-full px-2 py-1.5 text-xs bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded font-medium"
                                    >
                                        {exporting ? 'Exporting\u2026' : 'Download .jsonl'}
                                    </button>
                                </div>
                            </>
                        )}

                        <div className="border-t border-gray-700 pt-2 mt-2 flex items-center justify-between">
                            {confirmDelete ? (
                                <>
                                    <span className="text-[11px] text-red-300">Delete all pairs?</span>
                                    <div className="flex gap-1.5">
                                        <button onClick={handleDelete} className="px-2 py-0.5 text-[11px] bg-red-600 hover:bg-red-700 text-white rounded">Yes</button>
                                        <button onClick={() => setConfirmDelete(false)} className="px-2 py-0.5 text-[11px] bg-gray-600 hover:bg-gray-500 text-gray-200 rounded">No</button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => { setOpen(false); refreshStats(); }} className="text-[11px] text-gray-400 hover:text-white">Refresh</button>
                                    {stats && stats.total > 0 && (
                                        <button onClick={() => setConfirmDelete(true)} className="text-[11px] text-red-400 hover:text-red-300">Delete all</button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const Stat: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
    <div className="bg-gray-700/30 rounded py-1">
        <div className={`font-mono font-bold ${color}`}>{value}</div>
        <div className="text-[9px] text-gray-500 uppercase tracking-wider">{label}</div>
    </div>
);

export default TrainingCaptureBadge;
