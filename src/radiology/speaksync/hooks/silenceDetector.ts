/**
 * Client-side voice activity detection (VAD) using the Web Audio API.
 *
 * Watches the microphone stream in real time. When speech stops for
 * longer than `silenceMs` (and the current segment has been recording
 * for at least `minSegmentMs`), fires `onSilence()`. Also fires a
 * `onSilence()` if `maxSegmentMs` is reached, so we never let a
 * segment run forever.
 *
 * The hook that owns the MediaRecorder uses `onSilence` as its cue
 * to rotate the recorder — stop the current one, start a new one.
 *
 * We sample the RMS amplitude every animation frame (throttled to
 * ~60 Hz) and smooth with an exponential moving average to be
 * robust against transient background noise.
 */

export interface SilenceDetectorOptions {
    /** Amplitude below this is "silence". 0.0–1.0; typical speech is 0.05–0.3. */
    silenceThreshold?: number;
    /** How long silence must persist before firing (ms). */
    silenceMs?: number;
    /** Don't fire before this much audio has been recorded. */
    minSegmentMs?: number;
    /** Force a segment cut after this much audio. */
    maxSegmentMs?: number;
    /** EMA smoothing factor (higher = more responsive, lower = more stable). */
    smoothing?: number;
}

const DEFAULTS: Required<SilenceDetectorOptions> = {
    silenceThreshold: 0.015,
    silenceMs: 800,
    minSegmentMs: 2500,
    maxSegmentMs: 15000,
    smoothing: 0.3,
};

export interface SilenceDetector {
    /** Resets segment timer; call after the MediaRecorder is rotated. */
    reset(): void;
    /** Stop sampling and release the AudioContext. */
    stop(): void;
    /** Current smoothed RMS (for a live level meter if needed). */
    getLevel(): number;
}

export function createSilenceDetector(
    stream: MediaStream,
    onSilence: () => void,
    options: SilenceDetectorOptions = {},
): SilenceDetector {
    const opts = { ...DEFAULTS, ...options };

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx: AudioContext = new AudioCtx();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.2;
    source.connect(analyser);

    const buf = new Float32Array(analyser.fftSize);

    let segmentStartMs = performance.now();
    let silenceStartMs: number | null = null;
    let smoothedLevel = 0;
    let rafId: number | null = null;
    let running = true;

    const tick = () => {
        if (!running) return;
        analyser.getFloatTimeDomainData(buf);
        // RMS in the time-domain window (normalised 0–1)
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
            const v = buf[i];
            sum += v * v;
        }
        const rms = Math.sqrt(sum / buf.length);
        smoothedLevel = smoothedLevel * (1 - opts.smoothing) + rms * opts.smoothing;

        const now = performance.now();
        const segmentAge = now - segmentStartMs;
        const isSilent = smoothedLevel < opts.silenceThreshold;

        if (isSilent) {
            if (silenceStartMs == null) silenceStartMs = now;
            const silenceAge = now - silenceStartMs;
            if (silenceAge >= opts.silenceMs && segmentAge >= opts.minSegmentMs) {
                onSilence();
                // segmentStartMs / silenceStartMs get reset by caller via reset()
                silenceStartMs = null;
            }
        } else {
            silenceStartMs = null;
        }

        // Hard cap — never let a single segment run past maxSegmentMs
        if (segmentAge >= opts.maxSegmentMs) {
            onSilence();
            silenceStartMs = null;
        }

        rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return {
        reset() {
            segmentStartMs = performance.now();
            silenceStartMs = null;
        },
        stop() {
            running = false;
            if (rafId != null) cancelAnimationFrame(rafId);
            try { source.disconnect(); } catch { /* ignore */ }
            try { analyser.disconnect(); } catch { /* ignore */ }
            ctx.close().catch(() => { /* ignore */ });
        },
        getLevel() {
            return smoothedLevel;
        },
    };
}
