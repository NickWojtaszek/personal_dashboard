/**
 * Google Gemini AI Provider Implementation
 */

import { GoogleGenAI, Type } from '@google/genai';
import { generatePrompt } from '../../data/promptData';
import { AIProvider, AIProviderError } from './AIProvider';
import type { AIPromptConfig, GrammarError, StyleExample } from '../../types';
import type { Language } from '../../context/LanguageContext';
import { GEMINI_FLASH_MODEL } from '../../constants';

export class GeminiProvider implements AIProvider {
  private ai: GoogleGenAI;
  private model: string;

  constructor(apiKey?: string, model?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY || '';
    this.ai = new GoogleGenAI({ apiKey: key });
    this.model = (model && !model.includes('2.0')) ? model : GEMINI_FLASH_MODEL;
  }

  async enhanceReport(
    text: string,
    config: AIPromptConfig,
    language: Language,
    examples: StyleExample[] = []
  ): Promise<string> {
    try {
      const prompt = generatePrompt(config, language, examples);
      const result = await this.ai.models.generateContent({
        model: this.model,
        contents: `${prompt}\n\n---RAPORT---\n${text}`
      });
      return result.text;
    } catch (error) {
      console.error('Error enhancing report with Gemini:', error);
      const detail = error instanceof Error ? error.message : String(error);
      throw new AIProviderError(
        `Gemini: ${detail}`,
        'Gemini',
        error instanceof Error ? error : undefined
      );
    }
  }

  async correctSelection(text: string): Promise<string> {
    try {
      const result = await this.ai.models.generateContent({
        model: this.model,
        config: {
          systemInstruction: "You are a precise editor. Your task is to correct only the grammar, spelling, and punctuation errors in the provided text. Do not alter the meaning, style, or sentence structure. Return only the corrected text. Do not add any explanations or markdown formatting."
        },
        contents: text,
      });
      return result.text.trim();
    } catch (error) {
      console.error('Error correcting selection with Gemini:', error);
      throw new AIProviderError(
        'Failed to correct selection',
        'Gemini',
        error instanceof Error ? error : undefined
      );
    }
  }

  async checkGrammar(text: string): Promise<Omit<GrammarError, 'id'>[]> {
    if (!text.trim()) {
      return [];
    }

    try {
      const response = await this.ai.models.generateContent({
        model: this.model,
        config: {
          systemInstruction: "You are a grammar checker. Analyze the user's text and identify grammatical errors, spelling mistakes, and awkward phrasing. For each error, provide the original problematic text, a suggested correction, and a brief, simple explanation of the issue. Focus on clear and common errors. Do not flag stylistic choices unless they are grammatically incorrect. Return the response as a JSON array.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                originalText: { type: Type.STRING, description: "The exact text phrase from the original document that contains the error." },
                suggestion: { type: Type.STRING, description: "The corrected version of the text phrase." },
                explanation: { type: Type.STRING, description: "A brief, simple explanation of what was wrong (e.g., 'Spelling mistake' or 'Incorrect verb tense')." },
              },
              required: ["originalText", "suggestion", "explanation"]
            }
          }
        },
        contents: text,
      });

      const jsonString = response.text.trim();
      const parsed = JSON.parse(jsonString);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Error checking grammar with Gemini:', error);
      throw new AIProviderError(
        'Failed to check grammar',
        'Gemini',
        error instanceof Error ? error : undefined
      );
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Quick test to verify API key works
      const result = await this.ai.models.generateContent({
        model: this.model,
        contents: 'Test'
      });
      return result.text.length > 0;
    } catch (error) {
      console.error('Gemini provider availability check failed:', error);
      return false;
    }
  }

  getName(): string {
    return 'Google Gemini';
  }
}
