/**
 * Shared PDF + Gemini extraction utilities.
 *
 * Consolidates the PDF-to-text conversion, base64 encoding, and Gemini
 * structured-output calls that are duplicated across Insurance, Vehicle,
 * Contract, Invoice, and Property detail pages.
 *
 * Each caller still supplies its own schema and prompt — this just removes
 * the boilerplate of setting up the pipeline.
 */

import { GoogleGenAI, Type } from '@google/genai';
import * as pdfjs from 'pdfjs-dist';
import type { Document } from '../types';

// Configure PDF.js worker (same pattern used across the app)
if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
    ).toString();
}

export { Type };

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

/** Convert a File to both extracted text and a storable Document. */
export async function readPdfFile(file: File): Promise<{ text: string; document: Document }> {
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = arrayBufferToBase64(arrayBuffer);
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        text += textContent.items.map((item: any) => item.str).join(' ') + '\n';
    }
    return {
        text,
        document: {
            name: file.name,
            url: '#',
            data: base64Data,
            mimeType: 'application/pdf',
        },
    };
}

interface ExtractOptions {
    prompt: string;
    schema: any;
    temperature?: number;
    model?: string;
}

/**
 * Send a prompt + schema to Gemini and parse the structured JSON response.
 * Throws on API errors or invalid JSON.
 */
export async function extractWithGemini<T>(options: ExtractOptions): Promise<T> {
    const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY
        || (import.meta as any).env?.API_KEY
        || process.env.API_KEY;
    if (!apiKey) {
        throw new Error('Gemini API key is not set');
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
        model: options.model || 'gemini-2.5-flash',
        contents: options.prompt,
        config: {
            temperature: options.temperature ?? 0.1,
            responseMimeType: 'application/json',
            responseSchema: options.schema,
        },
    });

    const text = response.text;
    if (!text) throw new Error('Gemini returned no text');
    try {
        return JSON.parse(text) as T;
    } catch (err) {
        throw new Error(`Failed to parse Gemini response as JSON: ${err instanceof Error ? err.message : String(err)}`);
    }
}

/**
 * Convenience helper: read a PDF, send text to Gemini, return parsed result + Document.
 */
export async function extractFromPdf<T>(
    file: File,
    buildPrompt: (pdfText: string) => string,
    schema: any,
    options?: { temperature?: number; model?: string }
): Promise<{ data: T; document: Document }> {
    const { text, document } = await readPdfFile(file);
    const data = await extractWithGemini<T>({
        prompt: buildPrompt(text),
        schema,
        temperature: options?.temperature,
        model: options?.model,
    });
    return { data, document };
}
