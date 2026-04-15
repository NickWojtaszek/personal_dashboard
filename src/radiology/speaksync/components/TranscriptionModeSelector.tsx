/**
 * Two-button toggle: [Browser | Server]
 * - Server option disabled with tooltip when health check fails
 * - Shows latency of last server transcription
 * - Persists to SettingsContext
 */

import React, { useEffect, useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { health, listModels, setModel } from '../services/transcriptionService';

interface Props {
    lastLatencyMs?: number | null;
    compact?: boolean;
}

const TranscriptionModeSelector: React.FC<Props> = ({ lastLatencyMs, compact = false }) => {
    const { dictation, setDictation } = useSettings();
    const [serverReachable, setServerReachable] = useState<boolean | null>(null);
    const [showConfig, setShowConfig] = useState(false);
    const [urlDraft, setUrlDraft] = useState(dictation.serverUrl);
    const [models, setModels] = useState<string[]>([]);
    const [currentModel, setCurrentModel] = useState<string>('');
    const [switchingModel, setSwitchingModel] = useState(false);
    const [modelError, setModelError] = useState<string | null>(null);

    // Probe the server periodically so the toggle reflects reality
    useEffect(() => {
        let cancelled = false;
        const probe = async () => {
            const result = await health(dictation.serverUrl);
            if (!cancelled) setServerReachable(!!result && result.status === 'ok');
        };
        probe();
        const interval = setInterval(probe, 30_000);
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [dictation.serverUrl]);

    const setMode = (mode: 'browser' | 'server') => {
        if (mode === dictation.mode) return;
        setDictation({ ...dictation, mode });
    };

    const saveUrl = () => {
        const trimmed = urlDraft.trim().replace(/\/+$/, '');
        if (trimmed && trimmed !== dictation.serverUrl) {
            setDictation({ ...dictation, serverUrl: trimmed });
        }
    };

    // Fetch models list when the popover opens
    useEffect(() => {
        if (!showConfig) return;
        let cancelled = false;
        (async () => {
            const info = await listModels(dictation.serverUrl);
            if (!cancelled && info) {
                setModels(info.available);
                setCurrentModel(info.current);
            }
        })();
        return () => { cancelled = true; };
    }, [showConfig, dictation.serverUrl]);

    const switchModel = async (model: string) => {
        if (model === currentModel) return;
        setSwitchingModel(true);
        setModelError(null);
        try {
            const info = await setModel(dictation.serverUrl, model);
            setCurrentModel(info.current);
        } catch (err) {
            setModelError(err instanceof Error ? err.message : 'Failed to switch model');
        } finally {
            setSwitchingModel(false);
        }
    };

    const toggleVad = () => {
        setDictation({ ...dictation, useVad: !(dictation.useVad ?? true) });
    };

    const toggleTraining = () => {
        setDictation({ ...dictation, captureTraining: !dictation.captureTraining });
    };

    const serverDisabled = serverReachable === false;
    const serverTitle = serverReachable === false
        ? `Server unreachable at ${dictation.serverUrl} \u2014 click \u2699 to change URL`
        : serverReachable === null
            ? 'Checking server\u2026'
            : `Whisper server at ${dictation.serverUrl}${lastLatencyMs ? ` \u00b7 last: ${lastLatencyMs}ms` : ''}`;

    const baseBtn = compact
        ? 'px-2 py-1 text-xs rounded transition-colors'
        : 'px-3 py-1.5 text-xs rounded-md font-medium transition-colors';

    return (
        <div className="inline-flex items-center gap-1">
            <div className="inline-flex items-center bg-gray-700/50 rounded-md p-0.5">
                <button
                    onClick={() => setMode('browser')}
                    className={`${baseBtn} ${dictation.mode === 'browser' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'}`}
                    title="Use the browser's built-in Web Speech API"
                >
                    Browser
                </button>
                <button
                    onClick={() => !serverDisabled && setMode('server')}
                    disabled={serverDisabled}
                    className={`${baseBtn} ${dictation.mode === 'server' && !serverDisabled
                        ? 'bg-purple-600 text-white'
                        : serverDisabled
                            ? 'text-gray-500 cursor-not-allowed opacity-50'
                            : 'text-gray-300 hover:text-white'}`}
                    title={serverTitle}
                >
                    <span className="inline-flex items-center gap-1">
                        <span
                            className={`inline-block w-1.5 h-1.5 rounded-full ${serverReachable === true ? 'bg-green-400' : serverReachable === false ? 'bg-red-400' : 'bg-yellow-400 animate-pulse'}`}
                            aria-hidden
                        />
                        Server
                        {dictation.mode === 'server' && lastLatencyMs != null && (
                            <span className="ml-1 text-[10px] opacity-75">{lastLatencyMs}ms</span>
                        )}
                    </span>
                </button>
            </div>
            <button
                onClick={() => { setUrlDraft(dictation.serverUrl); setShowConfig(v => !v); }}
                className="px-1.5 py-1 text-xs text-gray-400 hover:text-white rounded transition-colors"
                title="Configure server URL"
                aria-label="Configure server URL"
            >
                {/* gear */}
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
            </button>
            {showConfig && (
                <div className="absolute z-50 mt-32 right-0 p-4 bg-gray-800 border border-gray-600 rounded-lg shadow-xl w-96 space-y-4">
                    {/* Server URL */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1">Whisper server URL</label>
                        <div className="flex gap-1.5">
                            <input
                                type="text"
                                value={urlDraft}
                                onChange={e => setUrlDraft(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') saveUrl(); if (e.key === 'Escape') setShowConfig(false); }}
                                placeholder="http://localhost:8000"
                                className="flex-1 px-2 py-1 text-xs bg-gray-900 border border-gray-700 rounded text-white focus:outline-none focus:border-blue-500"
                            />
                            <button
                                onClick={saveUrl}
                                disabled={urlDraft.trim() === dictation.serverUrl}
                                className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded"
                            >Save URL</button>
                        </div>
                    </div>

                    {/* VAD toggle */}
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-xs font-semibold text-gray-300">Cut segments on silence (VAD)</div>
                            <div className="text-[10px] text-gray-500 mt-0.5">Recommended. Rotates segments at natural pauses instead of every 6 seconds.</div>
                        </div>
                        <button
                            onClick={toggleVad}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${dictation.useVad ?? true ? 'bg-blue-600' : 'bg-gray-600'}`}
                        >
                            <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition ${dictation.useVad ?? true ? 'translate-x-5' : 'translate-x-1'}`} />
                        </button>
                    </div>

                    {/* Training data capture toggle */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                        <div>
                            <div className="text-xs font-semibold text-gray-300">Collect training data (browser mode)</div>
                            <div className="text-[10px] text-gray-500 mt-0.5">Save (audio + transcript + edits) locally for later Whisper fine-tuning. Nothing leaves your machine.</div>
                        </div>
                        <button
                            onClick={toggleTraining}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${dictation.captureTraining ? 'bg-emerald-600' : 'bg-gray-600'}`}
                        >
                            <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition ${dictation.captureTraining ? 'translate-x-5' : 'translate-x-1'}`} />
                        </button>
                    </div>

                    {/* Model picker */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <div className="text-xs font-semibold text-gray-300">Whisper model</div>
                            {currentModel && <span className="text-[10px] text-gray-500">current: <span className="text-gray-300 font-mono">{currentModel}</span></span>}
                        </div>
                        <div className="text-[10px] text-gray-500 mb-1.5">
                            Larger models are more accurate, slower, and use more RAM. Switching reloads the model (may take 30\u201360s).
                        </div>
                        {models.length > 0 ? (
                            <div className="grid grid-cols-3 gap-1">
                                {['tiny', 'base', 'small', 'medium', 'large-v3', 'large-v3-turbo'].filter(m => models.includes(m)).map(m => (
                                    <button
                                        key={m}
                                        onClick={() => switchModel(m)}
                                        disabled={switchingModel || m === currentModel}
                                        className={`px-2 py-1 text-xs rounded transition-colors ${m === currentModel ? 'bg-purple-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-200'} ${switchingModel ? 'opacity-50 cursor-wait' : ''}`}
                                    >{m}</button>
                                ))}
                            </div>
                        ) : (
                            <div className="text-[11px] text-gray-500 italic">Server unreachable &mdash; connect first to fetch model list.</div>
                        )}
                        {switchingModel && (
                            <div className="text-[10px] text-purple-300 mt-1.5 flex items-center gap-1.5">
                                <svg className="animate-spin w-3 h-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"></path>
                                </svg>
                                Loading model\u2026 (first time downloads the weights)
                            </div>
                        )}
                        {modelError && (
                            <div className="text-[10px] text-red-400 mt-1.5">{modelError}</div>
                        )}
                    </div>

                    <div className="flex justify-end pt-1 border-t border-gray-700">
                        <button
                            onClick={() => setShowConfig(false)}
                            className="px-2 py-1 text-xs text-gray-400 hover:text-white"
                        >Close</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TranscriptionModeSelector;
