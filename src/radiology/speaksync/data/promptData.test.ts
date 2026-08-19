import { describe, it, expect } from 'vitest';
import { generatePrompt } from './promptData';
import type { AIPromptConfig } from '../types';

const base: AIPromptConfig = {
    fluency: 1, summarization: 3, oncologyDetail: 3, conclusionDetail: 1,
    useRECIST: false, useTNM: false, useQA: false,
};

describe('generatePrompt — QA toggle', () => {
    it('omits the QA block when useQA is false', () => {
        const prompt = generatePrompt(base, 'pl', []);
        expect(prompt).not.toContain('QA CHECK');
        expect(prompt).not.toContain('Kontrola Jakości');
    });

    it('appends the QA block when useQA is true (PL)', () => {
        const prompt = generatePrompt({ ...base, useQA: true }, 'pl', []);
        expect(prompt).toContain('QA CHECK: PASS');
        expect(prompt).toContain('Stronność');
        // Flag-only discipline must survive into the prompt.
        expect(prompt).toContain('nie wprowadzaj żadnych zmian');
    });

    it('appends the QA block in English too', () => {
        const prompt = generatePrompt({ ...base, useQA: true }, 'en', []);
        expect(prompt).toContain('QA CHECK: PASS');
        expect(prompt).toContain('Laterality');
    });

    it('leaves RECIST/TNM independent of QA', () => {
        const prompt = generatePrompt({ ...base, useQA: true }, 'pl', []);
        expect(prompt).not.toContain('RECIST');
        expect(prompt).not.toContain('TNM');
    });
});
