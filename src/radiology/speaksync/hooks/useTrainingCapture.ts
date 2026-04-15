/**
 * Parallel audio capture for Whisper fine-tuning.
 *
 * Runs alongside the browser's Web Speech API when `enabled` is true
 * and the user is in Browser dictation mode. A MediaRecorder streams
 * short chunks (~200ms timeslice) into a rolling buffer. When the
 * Web Speech API emits a finalised transcript, we slice the audio
 * buffer from the last finalisation to now, build a Blob, and save
 * it as a TrainingPair in IndexedDB along with the raw transcript.
 *
 * After the pair is saved, the editor wraps the inserted text in a
 * span with a `data-pair-id` attribute. Later (when the user saves
 * the report, or when the badge popover opens), we read the current
 * text from each span, compare to the original raw transcript, and
 * classify the edit as unedited / corrected / rewritten / deleted.
 *
 * The whole thing is local-only. Nothing leaves the browser unless
 * the user explicitly exports.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
    putPair,
    updatePair,
    getAllPairs,
    getStats,
    classifyEdit,
    type TrainingPair,
    type TrainingStats,
} from '../services/trainingStore';

interface UseTrainingCaptureProps {
    enabled: boolean;
    language: string;
    /** Called on mount/unmount so caller can e.g. refresh stats UI. */
    onStatsChanged?: () => void;
}

interface AudioChunk {
    data: Blob;
    timestamp: number; // performance.now() when dataavailable fired
}

const TIMESLICE_MS = 250;
const MIN_PAIR_MS = 400; // Drop segments shorter than this

function pickMimeType(): string {
    const candidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/mp4;codecs=mp4a.40.2',
        'audio/ogg;codecs=opus',
    ];
    if (typeof MediaRecorder === 'undefined') return '';
    for (const c of candidates) {
        try {
            if (MediaRecorder.isTypeSupported(c)) return c;
        } catch {
            /* ignore */
        }
    }
    return '';
}

export const useTrainingCapture = ({ enabled, language, onStatsChanged }: UseTrainingCaptureProps) => {
    const [isCapturing, setIsCapturing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const streamRef = useRef<MediaStream | null>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<AudioChunk[]>([]);
    const lastFinalizedAtRef = useRef<number>(0); // performance.now() of last finalize
    const isCapturingRef = useRef(false);

    const isSupported = typeof MediaRecorder !== 'undefined' && typeof navigator?.mediaDevices?.getUserMedia === 'function';

    const teardown = useCallback(() => {
        if (recorderRef.current && recorderRef.current.state !== 'inactive') {
            try { recorderRef.current.stop(); } catch { /* ignore */ }
        }
        recorderRef.current = null;
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        chunksRef.current = [];
        isCapturingRef.current = false;
        setIsCapturing(false);
    }, []);

    const start = useCallback(async (): Promise<boolean> => {
        if (!enabled || !isSupported) return false;
        if (isCapturingRef.current) return true;

        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const mimeType = pickMimeType();
            const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
            recorderRef.current = recorder;

            recorder.ondataavailable = (ev: BlobEvent) => {
                if (ev.data && ev.data.size > 0) {
                    chunksRef.current.push({ data: ev.data, timestamp: performance.now() });
                }
            };
            recorder.onerror = () => {
                setError('Training recorder error');
            };

            lastFinalizedAtRef.current = performance.now();
            recorder.start(TIMESLICE_MS);
            isCapturingRef.current = true;
            setIsCapturing(true);
            return true;
        } catch (err) {
            const name = (err as DOMException)?.name;
            if (name === 'NotAllowedError' || name === 'SecurityError') {
                setError('Mic permission denied — training capture off');
            } else {
                setError(err instanceof Error ? err.message : 'Training capture failed to start');
            }
            teardown();
            return false;
        }
    }, [enabled, isSupported, teardown]);

    const stop = useCallback(() => {
        teardown();
    }, [teardown]);

    /**
     * Slice audio chunks between the previous finalize and now, save
     * as a pair, and return the pair id so the caller can embed it
     * into the editor's span via data-pair-id.
     */
    const finalize = useCallback((rawTranscript: string): string | null => {
        if (!isCapturingRef.current) return null;
        if (!rawTranscript || !rawTranscript.trim()) {
            // No text — skip, but don't advance the finalize cursor (next one picks up these chunks)
            return null;
        }

        const now = performance.now();
        const sinceLast = now - lastFinalizedAtRef.current;
        if (sinceLast < MIN_PAIR_MS) {
            // Too short, treat as noise; drop chunks up to now
            chunksRef.current = chunksRef.current.filter(c => c.timestamp > now);
            lastFinalizedAtRef.current = now;
            return null;
        }

        // Pull out chunks that fall between lastFinalizedAt and now.
        const relevant = chunksRef.current.filter(c => c.timestamp > lastFinalizedAtRef.current && c.timestamp <= now);
        // Keep the tail (chunks after `now`, which will be none since we just measured — but future ones)
        chunksRef.current = chunksRef.current.filter(c => c.timestamp > now);

        if (relevant.length === 0) {
            lastFinalizedAtRef.current = now;
            return null;
        }

        const mimeType = recorderRef.current?.mimeType || 'audio/webm';
        const blob = new Blob(relevant.map(c => c.data), { type: mimeType });

        const id = crypto.randomUUID();
        const pair: TrainingPair = {
            id,
            timestamp: Date.now(),
            language,
            audio: blob,
            audioMimeType: mimeType,
            durationSec: sinceLast / 1000,
            rawTranscript: rawTranscript.trim(),
            finalTranscript: rawTranscript.trim(), // initial assumption: unedited
            classification: 'unedited',
            editDistance: 0,
        };

        // Fire-and-forget save (IndexedDB). We don't await so we don't
        // block the editor's insertion path.
        putPair(pair).then(() => {
            onStatsChanged?.();
        }).catch(err => {
            console.error('[trainingCapture] putPair failed:', err);
        });

        lastFinalizedAtRef.current = now;
        return id;
    }, [language, onStatsChanged]);

    /**
     * Walk all saved pairs, look up their span in the editor, and
     * reclassify based on edit distance.
     *
     * Caller passes a DOM root (usually the editor contenteditable
     * element) so we know where to look for spans.
     */
    const classifyAll = useCallback(async (editorRoot: HTMLElement | null): Promise<void> => {
        const pairs = await getAllPairs();
        for (const p of pairs) {
            const span = editorRoot?.querySelector(`[data-pair-id="${p.id}"]`);
            const current = span ? (span.textContent || '').trim() : null;
            const { classification, editDistance } = classifyEdit(p.rawTranscript, current);
            if (classification !== p.classification || (editDistance ?? -1) !== (p.editDistance ?? -1) || current !== p.finalTranscript) {
                await updatePair(p.id, { classification, editDistance, finalTranscript: current });
            }
        }
        onStatsChanged?.();
    }, [onStatsChanged]);

    // Auto-start/stop based on enabled
    useEffect(() => {
        if (!enabled && isCapturingRef.current) {
            stop();
        }
        return () => {
            stop();
        };
    }, [enabled, stop]);

    return {
        isSupported,
        isCapturing,
        error,
        start,
        stop,
        finalize,
        classifyAll,
    };
};

export async function loadStats(): Promise<TrainingStats> {
    return getStats();
}
