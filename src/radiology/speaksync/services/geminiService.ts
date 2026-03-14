
import { GoogleGenAI, Type } from '@google/genai';
import { generatePrompt } from '../data/promptData';
import { GEMINI_FLASH_MODEL } from '../constants';
import type { AIPromptConfig, GrammarError, StyleExample } from '../types';
import type { Language } from '../context/LanguageContext';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const enhanceReport = async (text: string, config: AIPromptConfig, language: Language, examples: StyleExample[] = []): Promise<string> => {
    try {
        const prompt = generatePrompt(config, language, examples);
        const result = await ai.models.generateContent({
            model: GEMINI_FLASH_MODEL,
            contents: `${prompt}\n\n---RAPORT---\n${text}`
        });
        return result.text;
    } catch (error) {
        console.error("Error enhancing report with AI:", error);
        throw new Error("Failed to enhance report.");
    }
};

export const correctSelection = async (text: string): Promise<string> => {
    try {
        const result = await ai.models.generateContent({
            model: GEMINI_FLASH_MODEL,
            config: {
                systemInstruction: "You are a precise editor. Your task is to correct only the grammar, spelling, and punctuation errors in the provided text. Do not alter the meaning, style, or sentence structure. Return only the corrected text. Do not add any explanations or markdown formatting."
            },
            contents: text,
        });
        return result.text.trim();
    } catch (error) {
        console.error("Error correcting selection with AI:", error);
        throw new Error("Failed to correct selection.");
    }
};

export const checkGrammar = async (text: string): Promise<Omit<GrammarError, 'id'>[]> => {
    if (!text.trim()) {
        return [];
    }
    try {
        const response = await ai.models.generateContent({
            model: GEMINI_FLASH_MODEL,
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
        console.error("Error checking grammar with AI:", error);
        throw new Error("Failed to check grammar.");
    }
};
