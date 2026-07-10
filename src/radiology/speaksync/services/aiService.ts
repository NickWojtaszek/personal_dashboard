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
   * Merge a base report/template with the radiologist's dictated deltas.
   */
  async mergeReport(base: string, deltas: string, language: Language): Promise<string> {
    const provider = getActiveProvider(this.aiSettings);
    if (!provider.mergeReport) {
      throw new AIProviderError(
        `AI-merge is currently available with the Google Gemini provider. The active provider ("${provider.getName()}") does not support it yet — switch to Gemini in Settings > AI Configuration.`,
        provider.getName()
      );
    }
    return provider.mergeReport(base, deltas, language);
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

// ─── # directives ────────────────────────────────────────────────────
// Anywhere in the dictated report, a fragment starting with `#` is an
// instruction to the AI, not report text: "#policz RECIST",
// "#zaproponuj follow-up guzka płuca". They are stripped from the body
// and passed as an explicit instruction block.

/** Split a report into its body and any #-directives it contains. */
export function splitDirectives(text: string): { body: string; directives: string[] } {
  const directives: string[] = [];
  const body = text
    .split('\n')
    .map(line => {
      const hashIdx = line.indexOf('#');
      if (hashIdx === -1) return line;
      const directive = line.slice(hashIdx + 1).trim();
      if (directive) directives.push(directive);
      return line.slice(0, hashIdx).trimEnd();
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return { body, directives };
}

const DIRECTIVE_HEADER: Record<Language, string> = {
  pl: `POLECENIA UŻYTKOWNIKA — to NIE jest treść raportu i nie może pojawić się w wyniku. Zasady wykonania:
(1) Wyniki poleceń umieszczaj WYŁĄCZNIE w sekcji wniosków (Wnioski), chyba że polecenie wyraźnie wskazuje inną sekcję. Treści opisu NIE zmieniaj ponad zwykłe zasady korekty.
(2) Polecenia obliczeniowe i klasyfikacyjne (RECIST, TNM, Fleischner itp.) wykonuj według formalnych kryteriów, podając liczby. Dla RECIST 1.1: suma najdłuższych wymiarów zmian docelowych (SLD) obecnie i poprzednio, zmiana procentowa, kategoria odpowiedzi — PD przy wzroście SLD ≥20% i ≥5 mm bezwzględnie lub nowej zmianie; PR przy spadku ≥30%; SD pomiędzy; CR przy ustąpieniu zmian. Format wniosku np.: "Progresja choroby wg RECIST 1.1 — SLD 6 mm → 16 mm (+167%)."
(3) Jeśli w raporcie brakuje danych do wykonania polecenia (np. brak pomiarów poprzednich), napisz to wprost we wnioskach zamiast zgadywać.`,
  en: `USER DIRECTIVES — this is NOT report content and must not appear in the output. Execution rules:
(1) Place directive results ONLY in the conclusions section, unless the directive explicitly names another section. Do not alter the findings/body beyond the normal correction rules.
(2) Computational/classification directives (RECIST, TNM, Fleischner etc.) must follow the formal criteria with numbers. For RECIST 1.1: sum of longest diameters (SLD) now and prior, percent change, response category — PD at SLD increase ≥20% and ≥5 mm absolute or a new lesion; PR at ≥30% decrease; SD in between; CR on resolution. Conclusion format e.g.: "Disease progression per RECIST 1.1 — SLD 6 mm → 16 mm (+167%)."
(3) If the report lacks the data needed (e.g. no prior measurements), state that explicitly in the conclusions instead of guessing.`,
  de: `BENUTZERANWEISUNGEN — dies ist KEIN Berichtsinhalt und darf nicht in der Ausgabe erscheinen. Regeln:
(1) Ergebnisse NUR in den Schlussfolgerungen platzieren, sofern die Anweisung nichts anderes nennt; den Befundtext nicht darüber hinaus verändern.
(2) Berechnungs-/Klassifikationsanweisungen (RECIST, TNM, Fleischner) nach formalen Kriterien mit Zahlen ausführen (RECIST 1.1: SLD aktuell und zuvor, prozentuale Änderung, Kategorie).
(3) Fehlen Daten, dies ausdrücklich in den Schlussfolgerungen benennen statt zu raten.`,
};

function buildDirectiveBlock(directives: string[], language: Language): string {
  const header = DIRECTIVE_HEADER[language] || DIRECTIVE_HEADER.en;
  return `---\n${header}\n${directives.map(d => `- ${d}`).join('\n')}\n---`;
}

/**
 * Legacy exports for backward compatibility
 * These maintain the same function signatures as the old geminiService
 */
export const enhanceReport = async (
  text: string,
  config: AIPromptConfig,
  language: Language,
  examples: StyleExample[] = [],
  directives: string[] = []
): Promise<string> => {
  const payload = directives.length > 0
    ? `${text}\n\n${buildDirectiveBlock(directives, language)}`
    : text;
  return getAIService().enhanceReport(payload, config, language, examples);
};

export const correctSelection = async (text: string): Promise<string> => {
  return getAIService().correctSelection(text);
};

export const checkGrammar = async (text: string): Promise<Omit<GrammarError, 'id'>[]> => {
  return getAIService().checkGrammar(text);
};
