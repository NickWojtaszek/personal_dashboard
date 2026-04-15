/**
 * Thin HTTP client for the dictation server (MVP1).
 *
 * Two operations:
 *   - health()       — GET /health
 *   - transcribe()   — POST /transcribe with multipart audio
 */

export interface ServerHealth {
    status: 'ok' | 'loading' | string;
    model: string;
    device: string;
    languages_loaded: string[];
}

export interface TranscribeCorrection {
    from: string;
    to: string;
    type: string;
}

export interface TranscribeResponse {
    raw_text: string;
    corrected_text: string;
    corrections_applied: TranscribeCorrection[];
    confidence: number;
    language_detected: string;
    duration_sec: number;
    processing_ms: number;
}

const HEALTH_TIMEOUT_MS = 3000;

function trimTrailingSlash(url: string): string {
    return url.replace(/\/+$/, '');
}

/** Probe the server. Returns null on any failure (network, timeout, non-2xx). */
export async function health(serverUrl: string): Promise<ServerHealth | null> {
    if (!serverUrl) return null;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), HEALTH_TIMEOUT_MS);
    try {
        const res = await fetch(`${trimTrailingSlash(serverUrl)}/health`, {
            method: 'GET',
            signal: ctrl.signal,
        });
        if (!res.ok) return null;
        return (await res.json()) as ServerHealth;
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

/**
 * Send recorded audio to /transcribe and return the parsed response.
 * Throws on network errors or non-2xx responses.
 */
export async function transcribe(
    serverUrl: string,
    audio: Blob,
    language: string,
    correct = true,
    signal?: AbortSignal,
): Promise<TranscribeResponse> {
    if (!serverUrl) throw new Error('Server URL not configured');
    if (!audio || audio.size === 0) throw new Error('Empty audio');

    const form = new FormData();
    // Filename hints the server's extension picker for tempfile suffix.
    const filename = mimeToFilename(audio.type);
    form.append('audio', audio, filename);
    form.append('language', language || 'en');
    form.append('correct', correct ? 'true' : 'false');

    const res = await fetch(`${trimTrailingSlash(serverUrl)}/transcribe`, {
        method: 'POST',
        body: form,
        signal,
    });

    if (!res.ok) {
        let detail = '';
        try {
            const j = await res.json();
            detail = j?.detail || '';
        } catch {
            /* ignore */
        }
        throw new Error(`Server returned ${res.status}${detail ? `: ${detail}` : ''}`);
    }

    return (await res.json()) as TranscribeResponse;
}

function mimeToFilename(mime: string): string {
    if (!mime) return 'audio.bin';
    if (mime.includes('webm')) return 'audio.webm';
    if (mime.includes('mp4') || mime.includes('m4a') || mime.includes('aac')) return 'audio.mp4';
    if (mime.includes('wav')) return 'audio.wav';
    if (mime.includes('ogg')) return 'audio.ogg';
    return 'audio.bin';
}
