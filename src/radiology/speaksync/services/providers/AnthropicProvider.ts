/**
 * Anthropic Claude Provider Implementation
 */

import { AIProvider, AIProviderError } from './AIProvider';
import { generatePrompt } from '../../data/promptData';
import type { AIPromptConfig, GrammarError, StyleExample } from '../../types';
import type { Language } from '../../context/LanguageContext';

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
}

export class AnthropicProvider implements AIProvider {
  private apiKey: string;
  private model: string;
  private endpoint: string;

  constructor(apiKey: string, model: string = 'claude-3-opus-20240229', endpoint?: string) {
    if (!apiKey) {
      throw new AIProviderError('API key is required', 'Anthropic');
    }
    this.apiKey = apiKey;
    this.model = model;
    this.endpoint = endpoint || 'https://api.anthropic.com/v1/messages';
  }

  private async makeRequest(
    systemPrompt: string,
    userMessage: string,
    temperature: number = 0.7
  ): Promise<string> {
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 4096,
          temperature,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: userMessage
            }
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Anthropic API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
      }

      const data: AnthropicResponse = await response.json();
      return data.content[0]?.text || '';
    } catch (error) {
      throw new AIProviderError(
        `Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'Anthropic',
        error instanceof Error ? error : undefined
      );
    }
  }

  async enhanceReport(
    text: string,
    config: AIPromptConfig,
    language: Language,
    examples: StyleExample[] = []
  ): Promise<string> {
    try {
      const prompt = generatePrompt(config, language, examples);
      return await this.makeRequest(prompt, `---RAPORT---\n${text}`, 0.7);
    } catch (error) {
      console.error('Error enhancing report with Anthropic:', error);
      if (error instanceof AIProviderError) throw error;
      const detail = error instanceof Error ? error.message : String(error);
      throw new AIProviderError(
        `Anthropic: ${detail}`,
        'Anthropic',
        error instanceof Error ? error : undefined
      );
    }
  }

  async correctSelection(text: string): Promise<string> {
    try {
      const systemPrompt = "You are a precise editor. Your task is to correct only the grammar, spelling, and punctuation errors in the provided text. Do not alter the meaning, style, or sentence structure. Return only the corrected text. Do not add any explanations or markdown formatting.";
      const result = await this.makeRequest(systemPrompt, text, 0.3);
      return result.trim();
    } catch (error) {
      console.error('Error correcting selection with Anthropic:', error);
      throw new AIProviderError(
        'Failed to correct selection',
        'Anthropic',
        error instanceof Error ? error : undefined
      );
    }
  }

  async checkGrammar(text: string): Promise<Omit<GrammarError, 'id'>[]> {
    if (!text.trim()) {
      return [];
    }

    try {
      const systemPrompt = "You are a grammar checker. Analyze the user's text and identify grammatical errors, spelling mistakes, and awkward phrasing. For each error, provide the original problematic text, a suggested correction, and a brief, simple explanation of the issue. Focus on clear and common errors. Do not flag stylistic choices unless they are grammatically incorrect. Return the response as a JSON array with objects containing: originalText, suggestion, explanation. Return ONLY valid JSON, no markdown formatting.";
      const result = await this.makeRequest(systemPrompt, text, 0.3);

      // Strip potential markdown code blocks
      let jsonString = result.trim();
      if (jsonString.startsWith('```')) {
        jsonString = jsonString.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }

      const parsed = JSON.parse(jsonString);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Error checking grammar with Anthropic:', error);
      throw new AIProviderError(
        'Failed to check grammar',
        'Anthropic',
        error instanceof Error ? error : undefined
      );
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const result = await this.makeRequest('You are a helpful assistant.', 'Test', 0.1);
      return result.length > 0;
    } catch (error) {
      console.error('Anthropic provider availability check failed:', error);
      return false;
    }
  }

  getName(): string {
    return 'Anthropic Claude';
  }
}
