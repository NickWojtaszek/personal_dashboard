
import { useState, useRef, useCallback, useEffect } from 'react';
import type { ISpeechRecognition, SpeechRecognitionEvent, SpeechRecognitionErrorEvent } from '../types';

const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
// Some browsers (Chrome) support the GrammarList, others don't. Safe access.
const SpeechGrammarListAPI = window.SpeechGrammarList || window.webkitSpeechGrammarList;

interface UseSpeechRecognitionProps {
    onTranscriptFinalized: (transcript: string) => void;
    lang: string;
    vocabulary?: string[]; // Optional list of words to prioritize
    remoteAudioStream?: MediaStream; // Optional remote audio stream from Android phone
}

export const useSpeechRecognition = ({ onTranscriptFinalized, lang, vocabulary = [], remoteAudioStream }: UseSpeechRecognitionProps) => {
    const [isListening, setIsListening] = useState(false);
    const [interimText, setInterimText] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isAlwaysOn, setIsAlwaysOn] = useState(true);
    const recognitionRef = useRef<ISpeechRecognition | null>(null);
    const intentionalStop = useRef(false);
    const wakeLockRef = useRef<WakeLockSentinel | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

    const requestWakeLock = async () => {
        if ('wakeLock' in navigator) {
            try {
                wakeLockRef.current = await navigator.wakeLock.request('screen');
            } catch (err) {
                console.warn('Wake Lock request failed:', err);
            }
        }
    };

    const releaseWakeLock = async () => {
        if (wakeLockRef.current) {
            try {
                await wakeLockRef.current.release();
                wakeLockRef.current = null;
            } catch (err) {
                console.warn('Wake Lock release failed:', err);
            }
        }
    };

    const stop = useCallback(() => {
        if (recognitionRef.current) {
            intentionalStop.current = true;
            recognitionRef.current.stop();
            releaseWakeLock();
        }
    }, []);

    const start = useCallback(async () => {
        if (!SpeechRecognitionAPI) {
            setError('API not supported');
            return;
        }
        
        stop(); // Stop any existing instance

        try {
            // Use remote audio stream if available, otherwise request local microphone
            let audioStream: MediaStream;
            
            if (remoteAudioStream) {
                audioStream = remoteAudioStream;
                console.log('Using remote audio stream');
            } else {
                // Quick permission check without starting the stream
                audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                console.log('Using local microphone');
            }

            // Setup audio context for processing remote audio if needed
            if (remoteAudioStream && !audioContextRef.current) {
                try {
                    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
                    audioSourceRef.current = audioContextRef.current.createMediaStreamSource(remoteAudioStream);
                    // Note: Web Speech API will use the remote stream when it's passed through getUserMedia
                    console.log('Audio context created for remote stream');
                } catch (err) {
                    console.warn('Could not create audio context:', err);
                }
            }

            recognitionRef.current = new SpeechRecognitionAPI();
            const recognition = recognitionRef.current;
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = lang;
            recognition.maxAlternatives = 1;

            // Inject Medical Grammar if supported
            // This prioritizes the radiology terms in the recognition engine
            if (SpeechGrammarListAPI && vocabulary.length > 0) {
                try {
                    const speechRecognitionList = new SpeechGrammarListAPI();
                    // JSGF format: public <term> = word1 | word2 | ... ;
                    // We give it a high weight (10) to prefer these words
                    const grammar = '#JSGF V1.0; grammar radiology; public <term> = ' + vocabulary.join(' | ') + ' ;';
                    speechRecognitionList.addFromString(grammar, 10);
                    recognition.grammars = speechRecognitionList;
                } catch (e) {
                    console.warn("Could not inject grammar list", e);
                }
            }

            recognition.onstart = () => {
                setIsListening(true);
                setError(null);
                intentionalStop.current = false;
                requestWakeLock();
            };

            recognition.onend = () => {
                setIsListening(false);
                setInterimText('');
                // Release lock if we are fully stopping, otherwise keep it for the restart
                if (!isAlwaysOn || intentionalStop.current) {
                    releaseWakeLock();
                }
                
                if (isAlwaysOn && !intentionalStop.current) {
                    setTimeout(() => {
                        try {
                            recognition.start();
                        } catch (e) {
                            // Ignore error if already started
                        }
                    }, 100);
                }
            };

            recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
                if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                    setError('Permission denied');
                    setIsAlwaysOn(false);
                    releaseWakeLock();
                } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
                    setError(`Error: ${event.error}`);
                }
            };

            recognition.onresult = (event: SpeechRecognitionEvent) => {
                let finalTranscript = '';
                let currentInterim = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        currentInterim += event.results[i][0].transcript;
                    }
                }
                setInterimText(currentInterim);
                if (finalTranscript) {
                    onTranscriptFinalized(finalTranscript);
                }
            };
            
            recognition.start();

            // Cleanup local stream if using local mic
            if (!remoteAudioStream) {
                audioStream.getTracks().forEach(track => track.stop());
            }
        } catch (err) {
            setError('Permission denied');
            console.error("Mic permission error:", err);
        }
    }, [lang, stop, onTranscriptFinalized, isAlwaysOn, vocabulary, remoteAudioStream]);

    const toggleListen = useCallback(() => {
        isListening ? stop() : start();
    }, [isListening, start, stop]);
    
    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stop();
            releaseWakeLock();
            if (audioSourceRef.current) {
                audioSourceRef.current.disconnect();
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, [stop]);

    return {
        isListening,
        interimText,
        error,
        toggleListen,
        isAlwaysOn,
        setIsAlwaysOn,
        isSupported: !!SpeechRecognitionAPI,
        usingRemoteAudio: !!remoteAudioStream
    };
};
