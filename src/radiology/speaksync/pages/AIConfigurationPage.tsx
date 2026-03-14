import React, { useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { useTranslations } from '../context/LanguageContext';
import type { AIProviderConfig, AIProviderType } from '../types';
import { ArrowLeftIcon, PlusIcon, TrashIcon, CheckIcon, XCircleIcon, EyeIcon, EyeSlashIcon } from '../components/Icons';

const AIConfigurationPage: React.FC = () => {
  const { t } = useTranslations();
  const { setView } = useApp();
  const { currentTheme } = useTheme();
  const { aiSettings, setAISettings } = useSettings();
  const [editingProvider, setEditingProvider] = useState<AIProviderConfig | null>(null);
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);

  const providerTemplates: Record<AIProviderType, {
    name: string;
    defaultModel: string;
    info: string;
    corsWarning?: string;
  }> = {
    gemini: {
      name: 'Google Gemini',
      defaultModel: 'gemini-2.5-flash',
      info: 'Get API key from: https://makersuite.google.com/app/apikey'
    },
    openai: {
      name: 'OpenAI GPT',
      defaultModel: 'gpt-4',
      info: 'Get API key from: https://platform.openai.com/api-keys',
      corsWarning: '⚠️ Requires backend proxy - browsers block direct OpenAI API calls due to CORS'
    },
    anthropic: {
      name: 'Anthropic Claude',
      defaultModel: 'claude-3-opus-20240229',
      info: 'Get API key from: https://console.anthropic.com/',
      corsWarning: '⚠️ Requires backend proxy - browsers block direct Anthropic API calls due to CORS'
    },
    local: {
      name: 'Local/Custom',
      defaultModel: 'custom-model',
      info: 'Configure your own API endpoint'
    }
  };

  const handleAddProvider = (type: AIProviderType) => {
    const template = providerTemplates[type];
    const newProvider: AIProviderConfig = {
      id: `${type}-${Date.now()}`,
      type,
      name: template.name,
      apiKey: '',
      model: template.defaultModel,
      enabled: true, // Enable by default
      endpoint: type === 'local' ? 'http://localhost:8000/api' : undefined
    };
    setEditingProvider(newProvider);
  };

  const handleSaveProvider = () => {
    if (!editingProvider || !editingProvider.apiKey.trim()) {
      alert('API Key is required');
      return;
    }

    const existingIndex = aiSettings.providers.findIndex(p => p.id === editingProvider.id);
    let updatedProviders;

    if (existingIndex >= 0) {
      updatedProviders = aiSettings.providers.map((p, i) =>
        i === existingIndex ? editingProvider : p
      );
    } else {
      updatedProviders = [...aiSettings.providers, editingProvider];
    }

    setAISettings({
      ...aiSettings,
      providers: updatedProviders,
      defaultProvider: aiSettings.defaultProvider || editingProvider.id
    });

    setEditingProvider(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDeleteProvider = (providerId: string) => {
    if (!confirm('Are you sure you want to delete this AI provider configuration?')) {
      return;
    }

    const updatedProviders = aiSettings.providers.filter(p => p.id !== providerId);
    setAISettings({
      ...aiSettings,
      providers: updatedProviders,
      defaultProvider: aiSettings.defaultProvider === providerId
        ? (updatedProviders[0]?.id || '')
        : aiSettings.defaultProvider
    });
  };

  const handleToggleProvider = (providerId: string) => {
    const updatedProviders = aiSettings.providers.map(p =>
      p.id === providerId ? { ...p, enabled: !p.enabled } : p
    );
    setAISettings({
      ...aiSettings,
      providers: updatedProviders
    });
  };

  const handleSetDefault = (providerId: string) => {
    setAISettings({
      ...aiSettings,
      defaultProvider: providerId
    });
  };

  const toggleShowApiKey = (providerId: string) => {
    setShowApiKey(prev => ({ ...prev, [providerId]: !prev[providerId] }));
  };

  return (
    <main className="bg-gray-900 text-gray-200 h-full overflow-auto p-4 font-sans">
      <div className="w-full max-w-6xl mx-auto">
        {/* Header */}
        <header className="flex items-center mb-6">
          <button
            onClick={() => setView('settings')}
            className="mr-4 p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors"
            aria-label={t('settings.back')}
          >
            <ArrowLeftIcon />
          </button>
          <h1 className="text-3xl font-bold text-white">AI Model Configuration</h1>
        </header>

        {/* CORS Warning Banner */}
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-4">
          <h2 className="text-lg font-semibold text-red-300 mb-2">⚠️ Browser Compatibility Notice</h2>
          <p className="text-sm text-red-200 mb-2">
            <strong>OpenAI and Anthropic APIs are blocked by browsers</strong> due to CORS (Cross-Origin Resource Sharing) security policies.
          </p>
          <p className="text-xs text-red-300 mb-2">
            <strong>✅ Works in browser:</strong> Google Gemini, Local/Custom endpoints with CORS enabled
          </p>
          <p className="text-xs text-red-300">
            <strong>❌ Requires backend proxy:</strong> OpenAI GPT, Anthropic Claude (browser will block these)
          </p>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-blue-300 mb-2">🔐 Secure API Key Storage</h2>
          <p className="text-sm text-blue-200 mb-2">
            Your API keys are stored locally in your browser and never sent to any server except the AI provider you configure.
          </p>
          <p className="text-xs text-blue-300">
            <strong>Note:</strong> This is a development configuration. For production, API keys should be managed server-side.
          </p>
        </div>

        {/* Add Provider Buttons */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Add AI Provider</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(Object.keys(providerTemplates) as AIProviderType[]).map(type => (
              <button
                key={type}
                onClick={() => handleAddProvider(type)}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                <PlusIcon className="h-5 w-5" />
                {providerTemplates[type].name}
              </button>
            ))}
          </div>
        </div>

        {/* Configured Providers */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Configured Providers</h2>
          {aiSettings.providers.length === 0 ? (
            <p className="text-gray-400 text-center py-8">
              No AI providers configured. Add one above to get started.
            </p>
          ) : (
            <div className="space-y-4">
              {aiSettings.providers.map(provider => (
                <div
                  key={provider.id}
                  className={`border rounded-lg p-4 ${
                    provider.enabled ? 'border-green-600 bg-green-900/20' : 'border-gray-700 bg-gray-900/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">{provider.name}</h3>
                        {aiSettings.defaultProvider === provider.id && (
                          <span className="px-2 py-1 text-xs bg-blue-600 text-white rounded">Default</span>
                        )}
                        <span className={`px-2 py-1 text-xs rounded ${
                          provider.enabled ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'
                        }`}>
                          {provider.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mb-2">Model: <span className="text-gray-300">{provider.model}</span></p>
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-sm text-gray-400">API Key:</p>
                        <code className="text-xs bg-gray-800 px-2 py-1 rounded font-mono text-gray-300">
                          {showApiKey[provider.id] ? provider.apiKey : '••••••••••••••••'}
                        </code>
                        <button
                          onClick={() => toggleShowApiKey(provider.id)}
                          className="p-1 text-gray-400 hover:text-white transition-colors"
                          title={showApiKey[provider.id] ? 'Hide' : 'Show'}
                        >
                          {showApiKey[provider.id] ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                        </button>
                      </div>
                      {provider.endpoint && (
                        <p className="text-sm text-gray-400">Endpoint: <span className="text-gray-300">{provider.endpoint}</span></p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleToggleProvider(provider.id)}
                        className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                          provider.enabled
                            ? 'bg-gray-700 hover:bg-gray-600 text-white'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                      >
                        {provider.enabled ? 'Disable' : 'Enable'}
                      </button>
                      {aiSettings.defaultProvider !== provider.id && (
                        <button
                          onClick={() => handleSetDefault(provider.id)}
                          className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition-colors"
                        >
                          Set Default
                        </button>
                      )}
                      <button
                        onClick={() => setEditingProvider(provider)}
                        className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteProvider(provider.id)}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded transition-colors"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Edit/Add Provider Modal */}
        {editingProvider && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-2xl">
              <div className="p-6 border-b border-gray-700">
                <h2 className="text-2xl font-bold text-white">
                  {aiSettings.providers.some(p => p.id === editingProvider.id) ? 'Edit' : 'Add'} AI Provider
                </h2>
              </div>
              <div className="p-6 space-y-4">
                {/* Provider Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Provider Name
                  </label>
                  <input
                    type="text"
                    value={editingProvider.name}
                    onChange={(e) => setEditingProvider({ ...editingProvider, name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* API Key */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    API Key <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={editingProvider.apiKey}
                    onChange={(e) => setEditingProvider({ ...editingProvider, apiKey: e.target.value })}
                    placeholder="Enter your API key"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  />
                  <p className="text-xs text-blue-400 mt-1">
                    {providerTemplates[editingProvider.type].info}
                  </p>
                  {providerTemplates[editingProvider.type].corsWarning && (
                    <div className="mt-2 p-2 bg-red-900/30 border border-red-700 rounded">
                      <p className="text-xs text-red-300">
                        {providerTemplates[editingProvider.type].corsWarning}
                      </p>
                    </div>
                  )}
                </div>

                {/* Model */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Model
                  </label>
                  <input
                    type="text"
                    value={editingProvider.model}
                    onChange={(e) => setEditingProvider({ ...editingProvider, model: e.target.value })}
                    placeholder="e.g., gpt-4, gemini-1.5-pro"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Endpoint (for local/custom) */}
                {editingProvider.type === 'local' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      API Endpoint
                    </label>
                    <input
                      type="text"
                      value={editingProvider.endpoint || ''}
                      onChange={(e) => setEditingProvider({ ...editingProvider, endpoint: e.target.value })}
                      placeholder="http://localhost:8000/api"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-gray-700 flex justify-end gap-3">
                <button
                  onClick={() => setEditingProvider(null)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProvider}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded transition-colors"
                >
                  <CheckIcon className="h-4 w-4" />
                  Save Provider
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {saved && (
          <div className="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
            <CheckIcon className="h-5 w-5" />
            Provider saved successfully!
          </div>
        )}
      </div>
    </main>
  );
};

export default AIConfigurationPage;
