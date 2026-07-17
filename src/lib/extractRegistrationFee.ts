/**
 * AI extraction for professional registration fee receipts / invoices.
 *
 * Unlike property documents (always PDFs), a fee receipt is often the body of an
 * email (e.g. the GMC ARF receipt), so this supports raw pasted text as well as a
 * PDF file. Same Gemini pipeline as extractPropertyData.
 */

import { GoogleGenAI, Type } from '@google/genai';
import { extractPdfText } from './extractPropertyData';
import { arrayBufferToBase64 } from './documents';
import type { Document } from '../types';

export interface ExtractedFee {
    authority?: string;        // "General Medical Council"
    shortName?: string;        // "GMC"
    referenceNumber?: string;  // registration/member number
    feeType?: string;          // "ARF", "Annual Retention Fee"
    amount?: number;
    currency?: string;         // ISO 4217
    paymentReference?: string; // transaction reference
    date?: string;             // YYYY-MM-DD — paid date for a receipt, due date for an invoice
    isReceipt?: boolean;       // true = already paid; false = an invoice/demand to pay
    document?: Document;       // the receipt PDF, when imported from a file
}

const feeSchema = {
    type: Type.OBJECT,
    properties: {
        authority: { type: Type.STRING, nullable: true, description: "Full name of the issuing body, e.g. 'General Medical Council', 'Medical Council of Ireland'." },
        shortName: { type: Type.STRING, nullable: true, description: "Common abbreviation of the body, e.g. 'GMC', 'MCIRL'. Omit if not obvious." },
        referenceNumber: { type: Type.STRING, nullable: true, description: "The member's registration/reference number, e.g. a GMC reference number like '6121858'. NOT the payment reference." },
        feeType: { type: Type.STRING, nullable: true, description: "The fee type or reason, e.g. 'ARF', 'Annual Retention Fee', 'Registration Fee'. Use the code if given (e.g. 'ARF')." },
        amount: { type: Type.NUMBER, nullable: true, description: "The fee amount as a plain number, no currency symbol or commas." },
        currency: { type: Type.STRING, nullable: true, description: "ISO 4217 code inferred from the symbol/context (£=GBP, €=EUR, $=USD or AUD by context)." },
        paymentReference: { type: Type.STRING, nullable: true, description: "The payment/transaction reference, e.g. '1-5510740618'." },
        date: { type: Type.STRING, nullable: true, description: "The key date in YYYY-MM-DD. For a receipt use the date received/paid; for an invoice use the due date." },
        isReceipt: { type: Type.BOOLEAN, nullable: true, description: "True if this is a receipt confirming a payment already made; false if it is an invoice/demand for a payment still due." },
    },
};

function buildPrompt(text: string): string {
    return `You are extracting data from a professional body's registration/membership FEE document — a medical council or similar (e.g. the UK General Medical Council "GMC", the Medical Council of Ireland "MCIRL"). It may be a receipt for a payment already made, or an invoice/demand for a payment still due.

Extract:
- authority: the full issuing body name
- shortName: its common abbreviation (GMC, MCIRL) if clear
- referenceNumber: the member's registration/reference number (NOT the payment reference)
- feeType: the fee reason/code (e.g. "ARF" — Annual Retention Fee)
- amount: the fee amount as a number
- currency: ISO 4217 from the symbol/context
- paymentReference: the payment/transaction reference
- date: the key date in YYYY-MM-DD (paid date if a receipt, due date if an invoice)
- isReceipt: true if it confirms a completed payment, false if it is a demand still to pay

Convert all dates to YYYY-MM-DD. Return null for anything not present. Do not invent values.

**DOCUMENT:**
${text}`;
}

async function callGemini(text: string, base64Pdf?: string): Promise<ExtractedFee> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    const prompt = buildPrompt(text);
    const contents: any = base64Pdf
        ? [{ inlineData: { mimeType: 'application/pdf', data: base64Pdf } }, { text: prompt }]
        : prompt;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: { responseMimeType: 'application/json', responseSchema: feeSchema },
    });

    const jsonStr = response.text?.trim();
    if (!jsonStr) throw new Error('AI returned an empty response — try again.');
    try {
        return JSON.parse(jsonStr) as ExtractedFee;
    } catch {
        throw new Error('AI returned malformed data — try again.');
    }
}

/** Extract fee data from pasted text (e.g. an email body). */
export async function extractFeeFromText(text: string): Promise<ExtractedFee> {
    if (!text.trim()) throw new Error('Nothing to extract — paste the receipt text first.');
    return callGemini(text);
}

/** Extract fee data from a PDF receipt/invoice file. */
export async function extractFeeFromFile(file: File): Promise<ExtractedFee> {
    const arrayBuffer = await file.arrayBuffer();
    const base64 = arrayBufferToBase64(arrayBuffer);
    const pdfText = await extractPdfText(arrayBuffer);
    const result = await callGemini(pdfText, base64);
    const document: Document = {
        id: crypto.randomUUID(),
        name: file.name,
        url: '#',
        data: base64,
        mimeType: 'application/pdf',
        uploadedAt: new Date().toISOString(),
    };
    return { ...result, document };
}
