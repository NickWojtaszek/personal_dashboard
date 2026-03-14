/**
 * Abstract interface for AI providers
 * All AI providers (Gemini, OpenAI, Anthropic, etc.) must implement this interface
 */

import type { AIPromptConfig, GrammarError, StyleExample } from '../../types';
import type { Language } from '../../context/LanguageContext';

export interface AIProvider {
  /**
   * Enhance a medical report using AI
   * @param text The report text to enhance
   * @param config AI prompt configuration (fluency, summarization, etc.)
   * @param language The language of the report
   * @param examples Style examples for the AI to learn from
   * @returns Enhanced report text
   */
  enhanceReport(
    text: string,
    config: AIPromptConfig,
    language: Language,
    examples?: StyleExample[]
  ): Promise<string>;

  /**
   * Quick grammar and spelling correction
   * @param text The text to correct
   * @returns Corrected text
   */
  correctSelection(text: string): Promise<string>;

  /**
   * Detailed grammar checking with explanations
   * @param text The text to check
   * @returns Array of grammar errors with suggestions
   */
  checkGrammar(text: string): Promise<Omit<GrammarError, 'id'>[]>;

  /**
   * Test if the provider is properly configured and can be used
   * @returns true if provider is ready
   */
  isAvailable(): Promise<boolean>;

  /**
   * Get the provider name
   */
  getName(): string;
}

/**
 * Base error class for AI provider errors
 */
export class AIProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'AIProviderError';
  }
}
