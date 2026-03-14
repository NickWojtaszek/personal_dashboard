/**
 * AI Service - Main interface for AI operations
 * Manages multiple AI providers and routes requests to the configured provider
 */

import { GeminiProvider } from './providers/GeminiProvider';
import { OpenAIProvider } from './providers/OpenAIProvider';
import { AnthropicProvider } from './providers/AnthropicProvider';
import { LocalProvider } from './providers/LocalProvider';
import { AIProvider, AIProviderError } from './providers/AIProvider';
import type { AIProviderConfig, AIProviderType, AISettings, AIPromptConfig, GrammarError, StyleExample } from '../types';
import type { Language } from '../context/LanguageContext';

/**
 * Factory function to create provider instances
 */
function createProvider(config: AIProviderConfig): AIProvider {
  const { type, apiKey, model, endpoint } = config;

  switch (type) {
    case 'gemini':
      return new GeminiProvider(apiKey, model);
    case 'openai':
      return new OpenAIProvider(apiKey, model, endpoint);
    case 'anthropic':
      return new AnthropicProvider(apiKey, model, endpoint);
    case 'local':
      return new LocalProvider(apiKey, model, endpoint);
    default:
      throw new Error(`Unknown provider type: ${type}`);
  }
}

/**
 * Get the active provider from settings
 */
function getActiveProvider(aiSettings: AISettings): AIProvider {
  // No providers configured - fall back to default Gemini provider
  if (!aiSettings.providers || aiSettings.providers.length === 0) {
    return new GeminiProvider();
  }

  // Find default provider if specified
  let providerConfig: AIProviderConfig | undefined;
  if (aiSettings.defaultProvider) {
    providerConfig = aiSettings.providers.find(
      p => p.id === aiSettings.defaultProvider && p.enabled
    );
  }

  // If no default or default not found, use first enabled provider
  if (!providerConfig) {
    providerConfig = aiSettings.providers.find(p => p.enabled);
  }

  // No enabled providers
  if (!providerConfig) {
    throw new AIProviderError(
      'No enabled AI providers found. Please enable at least one provider in Settings > AI Configuration.',
      'None'
    );
  }

  // Validate provider has API key (except for local/gemini which have fallbacks)
  if (providerConfig.type !== 'local' && providerConfig.type !== 'gemini' && !providerConfig.apiKey) {
    throw new AIProviderError(
      `Provider "${providerConfig.name}" is missing an API key. Please configure it in Settings > AI Configuration.`,
      providerConfig.name
    );
  }

  // Create and return provider instance
  return createProvider(providerConfig);
}

/**
 * AI Service class - Main interface for all AI operations
 */
export class AIService {
  private aiSettings: AISettings;

  constructor(aiSettings: AISettings) {
    this.aiSettings = aiSettings;
  }

  /**
   * Update AI settings (called when user changes settings)
   */
  updateSettings(aiSettings: AISettings): void {
    this.aiSettings = aiSettings;
  }

  /**
   * Enhance a medical report using AI
   */
  async enhanceReport(
    text: string,
    config: AIPromptConfig,
    language: Language,
    examples?: StyleExample[]
  ): Promise<string> {
    const provider = getActiveProvider(this.aiSettings);
    return provider.enhanceReport(text, config, language, examples);
  }

  /**
   * Quick grammar and spelling correction
   */
  async correctSelection(text: string): Promise<string> {
    const provider = getActiveProvider(this.aiSettings);
    return provider.correctSelection(text);
  }

  /**
   * Detailed grammar checking with explanations
   */
  async checkGrammar(text: string): Promise<Omit<GrammarError, 'id'>[]> {
    const provider = getActiveProvider(this.aiSettings);
    return provider.checkGrammar(text);
  }

  /**
   * Get the name of the currently active provider
   */
  getActiveProviderName(): string {
    try {
      const provider = getActiveProvider(this.aiSettings);
      return provider.getName();
    } catch {
      return 'None';
    }
  }

  /**
   * Check if any provider is available and configured
   */
  async isAvailable(): Promise<boolean> {
    try {
      const provider = getActiveProvider(this.aiSettings);
      return provider.isAvailable();
    } catch {
      return false;
    }
  }
}

/**
 * Singleton instance - will be initialized by SettingsContext
 */
let aiServiceInstance: AIService | null = null;

/**
 * Initialize the AI service (called by SettingsContext)
 */
export function initializeAIService(aiSettings: AISettings): AIService {
  aiServiceInstance = new AIService(aiSettings);
  return aiServiceInstance;
}

/**
 * Get the current AI service instance
 */
export function getAIService(): AIService {
  if (!aiServiceInstance) {
    throw new Error('AI Service not initialized. This is a bug - please report it.');
  }
  return aiServiceInstance;
}

/**
 * Legacy exports for backward compatibility
 * These maintain the same function signatures as the old geminiService
 */
export const enhanceReport = async (
  text: string,
  config: AIPromptConfig,
  language: Language,
  examples: StyleExample[] = []
): Promise<string> => {
  return getAIService().enhanceReport(text, config, language, examples);
};

export const correctSelection = async (text: string): Promise<string> => {
  return getAIService().correctSelection(text);
};

export const checkGrammar = async (text: string): Promise<Omit<GrammarError, 'id'>[]> => {
  return getAIService().checkGrammar(text);
};
