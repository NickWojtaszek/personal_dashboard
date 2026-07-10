/**
 * Two-tier grammar checking.
 *
 * Tier 1 — LanguageTool (self-hosted, e.g. `docker run -p 8010:8010
 * erikvl87/languagetool`): deterministic Polish grammar/typo/agreement
 * checking in well under a second, nothing leaves the machine.
 *
 * Tier 2 — the AI provider (Gemini): contextual/stylistic checking, slow
 * (full LLM round trip). Used automatically when no LanguageTool server is
 * configured or it is unreachable.
 */

import type { GrammarError } from '../types';
import { checkGrammar as checkGrammarAI } from './aiService';

export const DEFAULT_GRAMMAR_SERVER = 'http://localhost:8010';

export type GrammarEngine = 'languagetool' | 'ai';

export interface GrammarCheckResult {
  errors: Omit<GrammarError, 'id'>[];
  engine: GrammarEngine;
}

interface LTMatch {
  message: string;
  offset: number;
  length: number;
  replacements?: { value: string }[];
  rule?: { id: string; category?: { id: string } };
}

/** Query a LanguageTool server (v2 API). Throws on network/HTTP failure. */
export async function checkWithLanguageTool(
  text: string,
  serverUrl: string,
  langCode: string
): Promise<Omit<GrammarError, 'id'>[]> {
  const body = new URLSearchParams({ text, language: langCode });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(`${serverUrl.replace(/\/$/, '')}/v2/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`LanguageTool HTTP ${res.status}`);
    const data = await res.json();
    const matches: LTMatch[] = data.matches || [];
    return matches
      // Whitespace nitpicks are noise in a dictation workflow
      .filter(m => m.rule?.id !== 'WHITESPACE_RULE')
      .map(m => ({
        originalText: text.slice(m.offset, m.offset + m.length),
        suggestion: m.replacements?.[0]?.value || '',
        explanation: m.message,
      }))
      .filter(e => e.originalText.trim().length > 0);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * LanguageTool first (fast, local); AI fallback when LT is not configured or
 * unreachable. Returns which engine produced the result so the UI can say so.
 */
export async function runGrammarCheck(
  text: string,
  grammarServerUrl: string | undefined,
  langCode: string
): Promise<GrammarCheckResult> {
  const serverUrl = grammarServerUrl?.trim() || DEFAULT_GRAMMAR_SERVER;
  try {
    const errors = await checkWithLanguageTool(text, serverUrl, langCode);
    return { errors, engine: 'languagetool' };
  } catch (e) {
    console.warn('LanguageTool unreachable, falling back to AI grammar check:', e);
    const errors = await checkGrammarAI(text);
    return { errors, engine: 'ai' };
  }
}
