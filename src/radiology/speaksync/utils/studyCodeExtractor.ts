/**
 * Study Code Extraction Utility
 * Extracts radiology study codes from template headers using regex patterns
 */

import type { RadiologyCode } from '../types';

/**
 * Common patterns for study code identification in template headers
 * These patterns match typical radiology study code formats
 */
const CODE_PATTERNS = [
  // Pattern: "RTG-123" or "CT-025"
  /\b([A-Z]{2,4})-?(\d{3})\b/gi,

  // Pattern: "025 - CT Head" or "123: MRI Brain"
  /\b(\d{3})\s*[-:]\s*/gi,

  // Pattern: Code at start of string "025 CT Head"
  /^(\d{3})\s+/i,

  // Pattern: Bracketed codes "[025]" or "(CT-025)"
  /[\[\(]([A-Z]*-?\d{3})[\]\)]/gi,
];

/**
 * Extract study code from template header or title
 */
export function extractStudyCode(templateHeader: string): string | null {
  if (!templateHeader || templateHeader.trim().length === 0) {
    return null;
  }

  const header = templateHeader.trim();

  // Try each pattern
  for (const pattern of CODE_PATTERNS) {
    const matches = header.match(pattern);
    if (matches && matches.length > 0) {
      // Extract just the numeric code
      const match = matches[0];
      const numericCode = match.replace(/[^0-9]/g, '');

      if (numericCode.length === 3) {
        return numericCode;
      }
    }
  }

  // Fallback: Look for any 3-digit number at the start
  const fallbackMatch = header.match(/^[^\d]*(\d{3})/);
  if (fallbackMatch) {
    return fallbackMatch[1];
  }

  return null;
}

/**
 * Extract study code and validate it exists in the radiology codes list
 */
export function extractAndValidateStudyCode(
  templateHeader: string,
  radiologyCodes: RadiologyCode[]
): { code: string; codeData: RadiologyCode } | null {
  const extractedCode = extractStudyCode(templateHeader);

  if (!extractedCode) {
    return null;
  }

  // Find matching code in radiology codes
  const codeData = radiologyCodes.find(c => c.code === extractedCode);

  if (!codeData) {
    console.warn(`Extracted code ${extractedCode} not found in radiology codes database`);
    return null;
  }

  return { code: extractedCode, codeData };
}

/**
 * Extract multiple codes from a template header (for complex procedures)
 */
export function extractMultipleStudyCodes(templateHeader: string): string[] {
  if (!templateHeader || templateHeader.trim().length === 0) {
    return [];
  }

  const codes: string[] = [];
  const header = templateHeader.trim();

  // Find all 3-digit codes
  const allMatches = header.match(/\b\d{3}\b/g);

  if (allMatches) {
    // Deduplicate and validate format
    const uniqueCodes = [...new Set(allMatches)];
    codes.push(...uniqueCodes);
  }

  return codes;
}

/**
 * Format study code for display (adds leading zeros if needed)
 */
export function formatStudyCode(code: string | number): string {
  const codeStr = String(code);
  return codeStr.padStart(3, '0');
}

/**
 * Test if a string contains a valid study code pattern
 */
export function hasStudyCode(text: string): boolean {
  return extractStudyCode(text) !== null;
}
