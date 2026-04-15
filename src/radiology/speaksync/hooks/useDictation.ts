/**
 * Router hook that swaps between browser Web Speech API and the local
 * Whisper server based on user's `dictation.mode` setting.
 *
 * If server mode is selected but the server isn't reachable, we fall
 * back to the browser hook automatically.
 *
 * Same return shape as both underlying hooks so EditorPanel doesn't
 * care which one is active.
 */

import { useSpeechRecognition } from './useSpeechRecognition';
import { useServerTranscription } from './useServerTranscription';
import { useSettings } from '../context/SettingsContext';

interface UseDictationProps {
    onTranscriptFinalized: (transcript: string, source?: 'voice' | 'server') => void;
    lang: string;
    vocabulary?: string[];
    remoteAudioStream?: MediaStream;
}

export const useDictation = (props: UseDictationProps) => {
    const { dictation } = useSettings();

    const browser = useSpeechRecognition({
        onTranscriptFinalized: (text) => props.onTranscriptFinalized(text, 'voice'),
        lang: props.lang,
        vocabulary: props.vocabulary,
        remoteAudioStream: props.remoteAudioStream,
    });

    const server = useServerTranscription({
        onTranscriptFinalized: props.onTranscriptFinalized,
        lang: props.lang,
        serverUrl: dictation.serverUrl,
        enabled: dictation.mode === 'server',
        correct: true,
        useVad: dictation.useVad ?? true,
    });

    const useServer = dictation.mode === 'server' && server.isConnected;

    if (useServer) {
        return {
            ...server,
            mode: 'server' as const,
            // Server has no interim transcript; expose a processing indicator instead
            interimText: server.isProcessing ? 'Transcribing\u2026' : '',
        };
    }

    return {
        ...browser,
        mode: 'browser' as const,
        isConnected: false,
        isProcessing: false,
        serverLatency: null,
        permissionDenied: false,
        lastResponse: null,
        clearError: () => { /* browser hook clears its own error on next start */ },
    };
};
