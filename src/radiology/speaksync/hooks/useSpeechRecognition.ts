
import { useState, useRef, useCallback, useEffect } from 'react';
import type { ISpeechRecognition, SpeechRecognitionEvent, SpeechRecognitionErrorEvent } from '../types';

const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
// Some browsers (Chrome) support the GrammarList, others don't. Safe access.
const SpeechGrammarListAPI = window.SpeechGrammarList || window.webkitSpeechGrammarList;

interface UseSpeechRecognitionProps {
    onTranscriptFinalized: (transcript: string) => void;
    lang: string;
    vocabulary?: string[]; // Optional list of words to prioritize
}

export const useSpeechRecognition = ({ onTranscriptFinalized, lang, vocabulary = [] }: UseSpeechRecognitionProps) => {
    const [isListening, setIsListening] = useState(false);
    const [interimText, setInterimText] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isAlwaysOn, setIsAlwaysOn] = useState(true);
    const recognitionRef = useRef<ISpeechRecognition | null>(null);
    const intentionalStop = useRef(false);
    const wakeLockRef = useRef<WakeLockSentinel | null>(null);

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
            // Quick permission check without starting the stream — the Web
            // Speech API always captures from the OS default microphone.
            const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });

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

            // Release the permission-check stream; recognition uses its own capture
            audioStream.getTracks().forEach(track => track.stop());
        } catch (err) {
            setError('Permission denied');
            console.error("Mic permission error:", err);
        }
    }, [lang, stop, onTranscriptFinalized, isAlwaysOn, vocabulary]);

    const toggleListen = useCallback(() => {
        isListening ? stop() : start();
    }, [isListening, start, stop]);
    
    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stop();
            releaseWakeLock();
        };
    }, [stop]);

    return {
        isListening,
        interimText,
        error,
        toggleListen,
        isAlwaysOn,
        setIsAlwaysOn,
        isSupported: !!SpeechRecognitionAPI
    };
};
