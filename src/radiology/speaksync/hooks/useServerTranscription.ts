/**
 * Push-to-talk dictation backed by the local Whisper server.
 *
 * - getUserMedia for the mic
 * - MediaRecorder records the whole utterance (no timeslice — single
 *   `dataavailable` event on stop with the full blob)
 * - On stop, POSTs the blob to /transcribe and forwards corrected_text
 *   to the parent via `onTranscriptFinalized(text, "server")`
 *
 * Same surface as `useSpeechRecognition` so a router hook can swap
 * between the two without the editor caring which is active.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { health, transcribe } from '../services/transcriptionService';
import type { TranscribeResponse } from '../services/transcriptionService';

interface UseServerTranscriptionProps {
    onTranscriptFinalized: (transcript: string, source?: 'voice' | 'server') => void;
    lang: string;
    serverUrl: string;
    enabled: boolean;
    correct?: boolean;
    onTranscribed?: (response: TranscribeResponse) => void;
}

const HEALTH_POLL_MS = 30_000;

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
    onTranscribed,
}: UseServerTranscriptionProps) => {
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [serverLatency, setServerLatency] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    const recorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const intentionalStop = useRef(false);
    const isSupported = typeof MediaRecorder !== 'undefined' && typeof navigator?.mediaDevices?.getUserMedia === 'function';

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

    const sendBlob = useCallback(async (blob: Blob) => {
        if (!blob || blob.size === 0) {
            setIsProcessing(false);
            return;
        }
        setIsProcessing(true);
        setError(null);
        try {
            const result = await transcribe(serverUrl, blob, lang || 'en', correct);
            setServerLatency(result.processing_ms);
            const text = result.corrected_text || result.raw_text;
            if (text && text.trim()) {
                onTranscriptFinalized(text, 'server');
            }
            onTranscribed?.(result);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            setError(msg);
            console.error('[serverTranscription] transcribe failed:', err);
        } finally {
            setIsProcessing(false);
        }
    }, [serverUrl, lang, correct, onTranscriptFinalized, onTranscribed]);

    const start = useCallback(async () => {
        if (!enabled) return;
        if (!isSupported) {
            setError('MediaRecorder API not supported in this browser');
            return;
        }
        if (isListening) return;

        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            chunksRef.current = [];
            intentionalStop.current = false;

            const mimeType = pickMimeType();
            const recorder = mimeType
                ? new MediaRecorder(stream, { mimeType })
                : new MediaRecorder(stream);
            recorderRef.current = recorder;

            recorder.ondataavailable = (ev: BlobEvent) => {
                if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
            };

            recorder.onstop = async () => {
                const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
                chunksRef.current = [];
                releaseStream();
                await sendBlob(blob);
            };

            recorder.onerror = (ev: Event) => {
                console.error('[serverTranscription] recorder error:', ev);
                setError('Recorder error');
                setIsListening(false);
                releaseStream();
            };

            // No timeslice → single dataavailable event when stop() is called
            recorder.start();
            setIsListening(true);
        } catch (err) {
            const name = (err as DOMException)?.name;
            if (name === 'NotAllowedError' || name === 'SecurityError') {
                setError('Microphone permission denied');
            } else {
                setError(err instanceof Error ? err.message : 'Failed to start recording');
            }
            releaseStream();
            setIsListening(false);
        }
    }, [enabled, isSupported, isListening, releaseStream, sendBlob]);

    const stop = useCallback(() => {
        if (!recorderRef.current || recorderRef.current.state === 'inactive') {
            setIsListening(false);
            return;
        }
        intentionalStop.current = true;
        try {
            recorderRef.current.stop();
        } catch (err) {
            console.warn('[serverTranscription] stop failed:', err);
        }
        setIsListening(false);
    }, []);

    const toggleListen = useCallback(() => {
        if (isListening) stop();
        else start();
    }, [isListening, start, stop]);

    // Cleanup on unmount or when disabled
    useEffect(() => {
        if (!enabled) {
            stop();
        }
        return () => {
            stop();
            releaseStream();
        };
    }, [enabled, stop, releaseStream]);

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
    };
};
