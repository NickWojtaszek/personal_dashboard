/**
 * Local/Custom AI Provider Implementation
 * For self-hosted models or custom API endpoints compatible with OpenAI-like interface
 */

import { AIProvider, AIProviderError } from './AIProvider';
import { generatePrompt } from '../../data/promptData';
import type { AIPromptConfig, GrammarError, StyleExample } from '../../types';
import type { Language } from '../../context/LanguageContext';

interface LocalMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface LocalResponse {
  choices?: Array<{
    message?: {
      content: string;
    };
    text?: string; // Some local models use different response format
  }>;
  response?: string; // Alternative response format
  text?: string; // Another alternative
}

export class LocalProvider implements AIProvider {
  private apiKey: string;
  private model: string;
  private endpoint: string;

  constructor(apiKey: string, model: string = 'local-model', endpoint?: string) {
    if (!endpoint) {
      throw new AIProviderError('Custom endpoint is required for local provider', 'Local');
    }
    this.apiKey = apiKey || 'none'; // Some local models don't need API keys
    this.model = model;
    this.endpoint = endpoint;
  }

  private async makeRequest(messages: LocalMessage[], temperature: number = 0.7): Promise<string> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      // Only add Authorization if API key is provided and not 'none'
      if (this.apiKey && this.apiKey !== 'none') {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Local API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
      }

      const data: LocalResponse = await response.json();

      // Try different response formats (various local models use different structures)
      const content =
        data.choices?.[0]?.message?.content ||
        data.choices?.[0]?.text ||
        data.response ||
        data.text ||
        '';

      return content;
    } catch (error) {
      throw new AIProviderError(
        `Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'Local',
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
      const messages: LocalMessage[] = [
        {
          role: 'system',
          content: prompt
        },
        {
          role: 'user',
          content: `---RAPORT---\n${text}`
        }
      ];

      return await this.makeRequest(messages, 0.7);
    } catch (error) {
      console.error('Error enhancing report with Local provider:', error);
      throw new AIProviderError(
        'Failed to enhance report',
        'Local',
        error instanceof Error ? error : undefined
      );
    }
  }

  async correctSelection(text: string): Promise<string> {
    try {
      const messages: LocalMessage[] = [
        {
          role: 'system',
          content: "You are a precise editor. Your task is to correct only the grammar, spelling, and punctuation errors in the provided text. Do not alter the meaning, style, or sentence structure. Return only the corrected text. Do not add any explanations or markdown formatting."
        },
        {
          role: 'user',
          content: text
        }
      ];

      const result = await this.makeRequest(messages, 0.3);
      return result.trim();
    } catch (error) {
      console.error('Error correcting selection with Local provider:', error);
      throw new AIProviderError(
        'Failed to correct selection',
        'Local',
        error instanceof Error ? error : undefined
      );
    }
  }

  async checkGrammar(text: string): Promise<Omit<GrammarError, 'id'>[]> {
    if (!text.trim()) {
      return [];
    }

    try {
      const messages: LocalMessage[] = [
        {
          role: 'system',
          content: "You are a grammar checker. Analyze the user's text and identify grammatical errors, spelling mistakes, and awkward phrasing. For each error, provide the original problematic text, a suggested correction, and a brief, simple explanation of the issue. Focus on clear and common errors. Do not flag stylistic choices unless they are grammatically incorrect. Return the response as a JSON array with objects containing: originalText, suggestion, explanation."
        },
        {
          role: 'user',
          content: text
        }
      ];

      const result = await this.makeRequest(messages, 0.3);

      // Try to extract JSON from response
      let jsonString = result.trim();
      if (jsonString.startsWith('```')) {
        jsonString = jsonString.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }

      const parsed = JSON.parse(jsonString);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Error checking grammar with Local provider:', error);
      throw new AIProviderError(
        'Failed to check grammar',
        'Local',
        error instanceof Error ? error : undefined
      );
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const messages: LocalMessage[] = [
        {
          role: 'user',
          content: 'Test'
        }
      ];
      const result = await this.makeRequest(messages, 0.1);
      return result.length > 0;
    } catch (error) {
      console.error('Local provider availability check failed:', error);
      return false;
    }
  }

  getName(): string {
    return `Local (${this.endpoint})`;
  }
}
