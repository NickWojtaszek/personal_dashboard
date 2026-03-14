/**
 * OpenAI GPT Provider Implementation
 */

import { AIProvider, AIProviderError } from './AIProvider';
import { generatePrompt } from '../../data/promptData';
import type { AIPromptConfig, GrammarError, StyleExample } from '../../types';
import type { Language } from '../../context/LanguageContext';

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export class OpenAIProvider implements AIProvider {
  private apiKey: string;
  private model: string;
  private endpoint: string;

  constructor(apiKey: string, model: string = 'gpt-4', endpoint?: string) {
    if (!apiKey) {
      throw new AIProviderError('API key is required', 'OpenAI');
    }
    this.apiKey = apiKey;
    this.model = model;
    this.endpoint = endpoint || 'https://api.openai.com/v1/chat/completions';
  }

  private async makeRequest(messages: OpenAIMessage[], temperature: number = 0.7): Promise<string> {
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
      }

      const data: OpenAIResponse = await response.json();
      return data.choices[0]?.message?.content || '';
    } catch (error) {
      throw new AIProviderError(
        `Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'OpenAI',
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
      const messages: OpenAIMessage[] = [
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
      console.error('Error enhancing report with OpenAI:', error);
      if (error instanceof AIProviderError) throw error;
      const detail = error instanceof Error ? error.message : String(error);
      throw new AIProviderError(
        `OpenAI: ${detail}`,
        'OpenAI',
        error instanceof Error ? error : undefined
      );
    }
  }

  async correctSelection(text: string): Promise<string> {
    try {
      const messages: OpenAIMessage[] = [
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
      console.error('Error correcting selection with OpenAI:', error);
      throw new AIProviderError(
        'Failed to correct selection',
        'OpenAI',
        error instanceof Error ? error : undefined
      );
    }
  }

  async checkGrammar(text: string): Promise<Omit<GrammarError, 'id'>[]> {
    if (!text.trim()) {
      return [];
    }

    try {
      const messages: OpenAIMessage[] = [
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
      const parsed = JSON.parse(result.trim());
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Error checking grammar with OpenAI:', error);
      throw new AIProviderError(
        'Failed to check grammar',
        'OpenAI',
        error instanceof Error ? error : undefined
      );
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const messages: OpenAIMessage[] = [
        {
          role: 'user',
          content: 'Test'
        }
      ];
      const result = await this.makeRequest(messages, 0.1);
      return result.length > 0;
    } catch (error) {
      console.error('OpenAI provider availability check failed:', error);
      return false;
    }
  }

  getName(): string {
    return 'OpenAI GPT';
  }
}
