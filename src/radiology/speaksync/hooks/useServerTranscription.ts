/**
 * Continuous-dictation hook backed by the local Whisper server.
 *
 * Press record once. Audio is captured and split into ~6-second
 * segments automatically. Each segment is POSTed to /transcribe
 * in the background; text appears in the editor as each segment
 * comes back. Press stop to end.
 *
 * Segments are sent sequentially (one request in flight at a time)
 * so transcripts arrive in the order they were spoken, even if the
 * server is slow on a particular segment.
 *
 * Trade-off vs. true streaming: there's a ~50 ms gap between
 * segments where we stop the MediaRecorder and start a new one.
 * In natural dictation that gap usually lands in a pause, but you
 * may occasionally lose a syllable. For radiology where pauses
 * are frequent this is acceptable.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { health, transcribe } from '../services/transcriptionService';
import type { TranscribeResponse } from '../services/transcriptionService';
import { createSilenceDetector, type SilenceDetector } from './silenceDetector';

interface UseServerTranscriptionProps {
    onTranscriptFinalized: (transcript: string, source?: 'voice' | 'server') => void;
    lang: string;
    serverUrl: string;
    enabled: boolean;
    correct?: boolean;
    /** Cut segments on silence via VAD instead of a fixed timer. Recommended. */
    useVad?: boolean;
    /** Hard upper bound on segment length (ms). Used as a safety whether VAD is on or off. */
    maxSegmentMs?: number;
    onTranscribed?: (response: TranscribeResponse) => void;
}

const HEALTH_POLL_MS = 30_000;
const DEFAULT_MAX_SEGMENT_MS = 15000;
const FIXED_TIMER_SEGMENT_MS = 6000;

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

export const useServerTranscription = ({
    onTranscriptFinalized,
    lang,
    serverUrl,
    enabled,
    correct = true,
    useVad = true,
    maxSegmentMs = DEFAULT_MAX_SEGMENT_MS,
    onTranscribed,
}: UseServerTranscriptionProps) => {
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [serverLatency, setServerLatency] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [permissionDenied, setPermissionDenied] = useState(false);
    const [lastResponse, setLastResponse] = useState<TranscribeResponse | null>(null);

    const streamRef = useRef<MediaStream | null>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const rotateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const vadRef = useRef<SilenceDetector | null>(null);
    const isListeningRef = useRef(false); // synchronous access for onstop callback
    const sendQueueRef = useRef<Promise<void>>(Promise.resolve());
    const inFlightCountRef = useRef(0);
    const isSupported = typeof MediaRecorder !== 'undefined' && typeof navigator?.mediaDevices?.getUserMedia === 'function';

    const requestRotate = useCallback(() => {
        if (isListeningRef.current && recorderRef.current?.state === 'recording') {
            try { recorderRef.current.stop(); } catch { /* ignore */ }
        }
    }, []);

    const clearRotateTimer = useCallback(() => {
        if (rotateTimeoutRef.current) {
            clearTimeout(rotateTimeoutRef.current);
            rotateTimeoutRef.current = null;
        }
    }, []);

    const scheduleFixedRotate = useCallback((ms: number) => {
        clearRotateTimer();
        rotateTimeoutRef.current = setTimeout(requestRotate, ms);
    }, [clearRotateTimer, requestRotate]);

    // Health polling — only when enabled. Re-checks on visibility change too.
    useEffect(() => {
        if (!enabled) {
            setIsConnected(false);
            return;
        }

        let cancelled = false;

        const check = async () => {
            const result = await health(serverUrl);
            if (!cancelled) setIsConnected(!!result && result.status === 'ok');
        };

        check();
        const interval = setInterval(check, HEALTH_POLL_MS);
        const onVis = () => {
            if (document.visibilityState === 'visible') check();
        };
        document.addEventListener('visibilitychange', onVis);

        return () => {
            cancelled = true;
            clearInterval(interval);
            document.removeEventListener('visibilitychange', onVis);
        };
    }, [enabled, serverUrl]);

    const releaseStream = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
    }, []);

    // Enqueue a segment blob for sequential sending. The text from each
    // segment is forwarded to the editor in the order segments were spoken.
    const enqueueSegment = useCallback((blob: Blob) => {
        if (!blob || blob.size === 0) return;
        inFlightCountRef.current += 1;
        setIsProcessing(true);
        sendQueueRef.current = sendQueueRef.current.then(async () => {
            try {
                const result = await transcribe(serverUrl, blob, lang || 'en', correct);
                setServerLatency(result.processing_ms);
                setLastResponse(result);
                const text = result.corrected_text || result.raw_text;
                if (text && text.trim()) {
                    onTranscriptFinalized(text, 'server');
                }
                onTranscribed?.(result);
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                setError(msg);
                console.error('[serverTranscription] segment failed:', err);
            } finally {
                inFlightCountRef.current -= 1;
                if (inFlightCountRef.current <= 0) {
                    inFlightCountRef.current = 0;
                    setIsProcessing(false);
                }
            }
        });
    }, [serverUrl, lang, correct, onTranscriptFinalized, onTranscribed]);

    // Start a new MediaRecorder cycle. On stop, either enqueue + restart
    // (if still listening) or enqueue only (if user stopped).
    const startRecorder = useCallback(() => {
        const stream = streamRef.current;
        if (!stream) return;

        const mimeType = pickMimeType();
        const recorder = mimeType
            ? new MediaRecorder(stream, { mimeType })
            : new MediaRecorder(stream);
        recorderRef.current = recorder;

        const chunks: Blob[] = [];
        recorder.ondataavailable = (ev: BlobEvent) => {
            if (ev.data && ev.data.size > 0) chunks.push(ev.data);
        };

        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
            enqueueSegment(blob);

            if (isListeningRef.current) {
                // Reset segment timing for the next cycle
                vadRef.current?.reset();
                // Start the next recorder immediately
                startRecorder();
                // If VAD is not available, fall back to fixed-timer rotation
                if (!vadRef.current) {
                    scheduleFixedRotate(FIXED_TIMER_SEGMENT_MS);
                }
            } else {
                // User stopped — release the stream now that final blob is queued
                releaseStream();
                recorderRef.current = null;
                if (vadRef.current) {
                    vadRef.current.stop();
                    vadRef.current = null;
                }
            }
        };

        recorder.onerror = (ev: Event) => {
            console.error('[serverTranscription] recorder error:', ev);
            setError('Recorder error');
        };

        recorder.start();
    }, [enqueueSegment, releaseStream, scheduleFixedRotate]);

    const start = useCallback(async () => {
        if (!enabled) return;
        if (!isSupported) {
            setError('MediaRecorder API not supported in this browser');
            return;
        }
        if (isListeningRef.current) return;

        setError(null);
        setPermissionDenied(false);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            isListeningRef.current = true;
            setIsListening(true);

            // Set up the rotation strategy BEFORE starting the recorder.
            if (useVad) {
                try {
                    vadRef.current = createSilenceDetector(stream, () => {
                        requestRotate();
                    }, {
                        silenceMs: 800,
                        minSegmentMs: 2500,
                        maxSegmentMs,
                    });
                } catch (err) {
                    console.warn('[serverTranscription] VAD init failed, falling back to fixed timer:', err);
                    vadRef.current = null;
                }
            }

            startRecorder();

            // If VAD isn't available or disabled, use a fixed timer as fallback.
            if (!vadRef.current) {
                scheduleFixedRotate(FIXED_TIMER_SEGMENT_MS);
            }
        } catch (err) {
            const name = (err as DOMException)?.name;
            if (name === 'NotAllowedError' || name === 'SecurityError') {
                setError('Microphone permission denied. Click the camera/lock icon in the address bar, allow microphone, then try again.');
                setPermissionDenied(true);
            } else {
                setError(err instanceof Error ? err.message : 'Failed to start recording');
            }
            releaseStream();
            isListeningRef.current = false;
            setIsListening(false);
        }
    }, [enabled, isSupported, releaseStream, startRecorder, useVad, maxSegmentMs, requestRotate, scheduleFixedRotate]);

    const stop = useCallback(() => {
        isListeningRef.current = false;
        setIsListening(false);

        clearRotateTimer();

        const recorder = recorderRef.current;
        if (recorder && recorder.state !== 'inactive') {
            try {
                recorder.stop();
                // onstop will enqueue the final blob, release the stream,
                // and tear down the VAD.
            } catch (err) {
                console.warn('[serverTranscription] stop failed:', err);
                releaseStream();
                if (vadRef.current) {
                    vadRef.current.stop();
                    vadRef.current = null;
                }
            }
        } else {
            releaseStream();
            recorderRef.current = null;
            if (vadRef.current) {
                vadRef.current.stop();
                vadRef.current = null;
            }
        }
    }, [clearRotateTimer, releaseStream]);

    const toggleListen = useCallback(() => {
        if (isListeningRef.current) stop();
        else start();
    }, [start, stop]);

    const clearError = useCallback(() => {
        setError(null);
        setPermissionDenied(false);
    }, []);

    // Cleanup on unmount or when disabled
    useEffect(() => {
        if (!enabled) {
            stop();
        }
        return () => {
            stop();
        };
    }, [enabled, stop]);

    return {
        // Shared interface with useSpeechRecognition
        isListening,
        interimText: '',
        error,
        toggleListen,
        isAlwaysOn: false,
        setIsAlwaysOn: (_: boolean) => { /* no-op for server mode */ },
        isSupported,
        usingRemoteAudio: false,
        // Server-specific extras
        isConnected,
        isProcessing,
        serverLatency,
        permissionDenied,
        lastResponse,
        clearError,
    };
};
