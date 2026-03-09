

import React, { useState, useCallback } from 'react';
import type { FinancialTransaction, Document } from '../../types';
import { MagicWandIcon, UploadCloudIcon, DocumentTextIcon, TrashIcon } from './Icons';
import { GoogleGenAI, Type } from "@google/genai";
import * as pdfjs from 'pdfjs-dist';

// Set worker source for pdf.js
pdfjs.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@4.5.136/build/pdf.worker.mjs';

interface AIAssistantSectionProps {
    onDataExtracted: (data: {
        leaseStart?: string;
        leaseEnd?: string;
        transactions?: FinancialTransaction[];
        document?: Document;
    }) => void;
}

const propertySchema = {
    type: Type.OBJECT,
    properties: {
        leaseStart: { type: Type.STRING, description: "The lease start date in YYYY-MM-DD format.", nullable: true },
        leaseEnd: { type: Type.STRING, description: "The lease end date in YYYY-MM-DD format.", nullable: true },
        transactions: {
            type: Type.ARRAY,
            description: "A list of financial transactions from the rental statement.",
            nullable: true,
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING, description: "A unique ID for the transaction, like a UUID." },
                    date: { type: Type.STRING, description: "The date of the transaction in YYYY-MM-DD format.", nullable: true },
                    description: { type: Type.STRING, description: "The description of the transaction line item." },
                    amount: { type: Type.NUMBER, description: "The monetary value of the transaction." },
                    type: { type: Type.STRING, enum: ['income', 'expense'], description: "The type of transaction, either 'income' for money received or 'expense' for money paid out." }
                },
                required: ['id', 'date', 'description', 'amount', 'type']
            }
        },
        contacts: {
            type: Type.ARRAY,
            description: "A list of contacts mentioned in the document, such as the landlord or agent.",
            nullable: true,
            items: {
                type: Type.OBJECT,
                properties: {
                    role: { type: Type.STRING, description: "The role of the contact (e.g., Landlord, Agent, Tenant)." },
                    name: { type: Type.STRING, description: "The full name of the contact." },
                    contact: { type: Type.STRING, description: "The contact details (e.g., address, email, or phone number)." },
                },
                required: ['role', 'name', 'contact']
            }
        },
        features: {
            type: Type.ARRAY,
            description: "A list of up to 5 key special conditions or important terms from the tenancy agreement. Do not include standard clauses.",
            nullable: true,
            items: {
                type: Type.STRING
            }
        }
    },
};

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}


const AIAssistantSection: React.FC<AIAssistantSectionProps> = ({ onDataExtracted }) => {
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleFileChange = (files: FileList | null) => {
        if (files && files.length > 0) {
            const selectedFile = files[0];
            if (selectedFile.type === 'application/pdf') {
                setFile(selectedFile);
                setError(null);
            } else {
                setError('Please upload a valid PDF file.');
            }
        }
    };
    
    const onDragEnter = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }, []);
    const onDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }, []);
    const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); }, []);
    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        handleFileChange(e.dataTransfer.files);
    }, []);

    const handleExtract = async () => {
        if (!file) {
            setError("Please select a PDF file first.");
            return;
        }
    
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);
    
        try {
            const arrayBuffer = await file.arrayBuffer();
            
            const base64Data = arrayBufferToBase64(arrayBuffer);
            const documentToStore: Document = {
                name: file.name,
                url: '#',
                data: base64Data,
                mimeType: 'application/pdf',
            };
    
            const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;
            let pdfText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                pdfText += textContent.items.map(item => (item as any).str).join(' ') + '\n';
            }
            
            // DEBUG: Log extracted text (remove in production)
            console.log("=== EXTRACTED PDF TEXT (first 2000 chars) ===");
            console.log(pdfText.substring(0, 2000));
            
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const prompt = `You are an intelligent assistant for property management. Your task is to analyze the provided document text and determine if it is a Tenancy Agreement or a Rental Statement.

**DOCUMENT TYPE IDENTIFICATION:**
- Look for keywords like "Tenancy Agreement", "Lease Agreement" → Tenancy Agreement
- Look for keywords like "Landlord Statement", "Statement of Account", "Rental Statement" → Rental Statement

---

**1. IF THE DOCUMENT IS A TENANCY AGREEMENT:**

Extract the following information:
- 'leaseStart': The tenancy/lease start date
- 'leaseEnd': The tenancy/lease end date  
- 'contacts': Key contacts such as Landlord, Agent, or Property Manager with their role, name, and contact details
- 'features': Up to 5 special conditions or important terms (NOT standard legal clauses)

**Date Format:**
- Convert all dates to YYYY-MM-DD format

**CRITICAL RULES FOR TENANCY AGREEMENTS:**
- DO NOT extract any fee schedules, rent amounts, or financial charges as transactions
- The 'transactions' array must be null or omitted entirely
- Ignore any payment tables or fee breakdowns

---

**2. IF THE DOCUMENT IS A RENTAL STATEMENT (Landlord Statement/Statement of Account):**

**STEP 1: LOCATE THE STATEMENT OF ACCOUNT TABLE**

Look for a table with headers similar to:
- Date | Description | Money In | Money Out | Balance (£)

This is the PRIMARY source for transaction data.

**STEP 2: UNDERSTAND THE TABLE STRUCTURE**

The table has these columns:
1. **Date** - When the transaction occurred
2. **Description** - What the transaction was for
3. **Money In** - Funds received (income to landlord)
4. **Money Out** - Funds paid out (expenses)
5. **Balance (£)** - Running total after each transaction

⚠️ **CRITICAL WARNING:** The Balance column shows cumulative totals. You must NEVER use Balance values as transaction amounts.

**STEP 3: EXTRACT EACH TRANSACTION ROW**

For EVERY row in the Statement of Account table (including "Opening Balance"), create a transaction by following these exact steps:

**A. Extract the Date:**
- Dates in the document are in UK format: DD/MM/YYYY
- Convert to YYYY-MM-DD format
- Examples:
  * '08/08/2025' → '2025-08-08' (8th August 2025)
  * '01/09/2025' → '2025-09-01' (1st September 2025)
  * '30/08/2025' → '2025-08-30' (30th August 2025)

**B. Extract the Description:**
- Copy the exact text from the Description column
- Do not abbreviate or modify it

**C. Extract the Amount and Determine Type:**

Read across the row carefully:

**IF there is a number in the 'Money In' column:**
- amount = that number (e.g., 2,200.00 → 2200.00)
- type = 'income'
- IGNORE what's in the Balance column

**IF there is a number in the 'Money Out' column:**  
- amount = that number (e.g., 375.00 → 375.00)
- type = 'expense'
- IGNORE what's in the Balance column

**IF the row is "Opening Balance":**
- Look for the opening balance amount (usually in Money In or shown separately)
- type = 'income' if positive
- amount = that opening balance value

**D. Generate Transaction ID:**
- Create a unique UUID for each transaction (use a proper UUID generator or unique string)

**STEP 4: WHAT TO EXCLUDE**

DO NOT extract transactions from these sections:
- "Purchase Orders / Work in Progress"
- "Breakdown of Agency Fees" 
- "Payment sent to landlord" (unless it's in the main Statement of Account table)
- Any footer or summary sections

Only extract from the main "Statement of Account" table.

**STEP 5: VALIDATION EXAMPLES**

From a real statement, here's what correct extraction looks like:

| PDF Shows | Money In | Money Out | Balance | ✓ Correct Extraction | ✗ Wrong |
|-----------|----------|-----------|---------|---------------------|---------|
| Advance Rent... | 2,200.00 | - | 2,484.00 | amount: 2200, type: income | amount: 2484 ❌ |
| Pre-Tenancy Package | - | 375.00 | 2,109.00 | amount: 375, type: expense | amount: 2109 ❌ |
| Management Fee | - | 336.60 | 1,772.40 | amount: 336.60, type: expense | amount: 1772.40 ❌ |
| EICR | - | 216.00 | 284.00 | amount: 216, type: expense | amount: 284 ❌ |

**CRITICAL REMINDERS:**
- All amounts must be positive numbers (no negatives)
- Remove currency symbols and commas from amounts (£2,200.00 → 2200.00)
- The Balance column is ONLY for reference - never use it as a transaction amount
- Include ALL rows from the Statement of Account table, even Opening Balance

**FIELDS TO OMIT:**
- DO NOT extract 'leaseStart' or 'leaseEnd' from rental statements
- DO NOT extract 'contacts' or 'features' from rental statements
- Leave those fields null or omit them

---

**DOCUMENT TEXT TO ANALYZE:**

${pdfText}`;
    
        console.log("=== SENDING TO AI ===");
            
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: propertySchema,
                },
            });
    
            const jsonStr = response.text.trim();
            console.log("=== AI RAW RESPONSE ===");
            console.log(jsonStr);
            
            const extractedData = JSON.parse(jsonStr);
            
            // DEBUG: Validate extraction
            if (extractedData.transactions) {
                console.log("=== EXTRACTED TRANSACTIONS ===");
                let totalMoneyIn = 0;
                let totalMoneyOut = 0;
                
                extractedData.transactions.forEach((t: any, idx: number) => {
                    console.log(`${idx + 1}. ${t.date} | ${t.description.substring(0, 40)}... | ${t.type} | £${t.amount}`);
                    
                    if (t.type === 'income') totalMoneyIn += t.amount;
                    if (t.type === 'expense') totalMoneyOut += t.amount;
                    
                    // Validation warnings
                    if (t.amount < 0) {
                        console.warn(`⚠️ Transaction ${idx + 1} has negative amount: ${t.amount}`);
                    }
                    if (!t.date || !/^\d{4}-\d{2}-\d{2}$/.test(t.date)) {
                        console.warn(`⚠️ Transaction ${idx + 1} has invalid date format: ${t.date}`);
                    }
                });
                
                console.log(`\n=== TOTALS ===`);
                console.log(`Money In: £${totalMoneyIn.toFixed(2)}`);
                console.log(`Money Out: £${totalMoneyOut.toFixed(2)}`);
                console.log(`Net: £${(totalMoneyIn - totalMoneyOut).toFixed(2)}`);
            }
            
            onDataExtracted({ ...extractedData, document: documentToStore });
            
            setSuccessMessage("Success! Data extracted and PDF stored.");
            setFile(null);
            setTimeout(() => setSuccessMessage(null), 4000);
    
        } catch (err) {
            console.error("AI extraction failed:", err);
            setError("Failed to extract data. The PDF might be image-based or corrupted.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="p-5 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-bold flex items-center gap-3"><MagicWandIcon /> AI Property Assistant</h2>
            </div>
            <div className="p-5 space-y-4">
                 <p className="text-sm text-slate-500 dark:text-gray-400">
                    Drop a **Tenancy Agreement** or a **Rental Statement** PDF. The AI will extract key data, autofill the page, and store the document.
                </p>
                {!file ? (
                     <label 
                        onDragEnter={onDragEnter} onDragLeave={onDragLeave} onDragOver={onDragOver} onDrop={onDrop}
                        className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isDragging ? 'border-brand-primary bg-brand-primary/10' : 'border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                     >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                            <UploadCloudIcon className="w-10 h-10 mb-3 text-slate-400" />
                            <p className="mb-2 text-sm text-slate-500 dark:text-gray-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                            <p className="text-xs text-slate-500 dark:text-gray-400">PDF documents only</p>
                        </div>
                        <input id="dropzone-file" type="file" className="hidden" accept="application/pdf" onChange={(e) => handleFileChange(e.target.files)} />
                    </label>
                ) : (
                    <div className="flex items-center justify-between w-full p-4 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                        <div className="flex items-center gap-3">
                             <DocumentTextIcon />
                             <span className="text-sm font-medium text-slate-700 dark:text-gray-200 truncate">{file.name}</span>
                        </div>
                        <button onClick={() => setFile(null)} disabled={isLoading} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 disabled:opacity-50">
                            <TrashIcon />
                        </button>
                    </div>
                )}
               
                {error && <p className="text-sm text-red-500">{error}</p>}
                {successMessage && <p className="text-sm text-green-600">{successMessage}</p>}
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                 <button
                    onClick={handleExtract}
                    disabled={isLoading || !file}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-brand-primary text-white font-semibold hover:bg-opacity-90 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed w-52"
                >
                    {isLoading ? (
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        <MagicWandIcon className="w-4 h-4" />
                    )}
                    <span>{isLoading ? 'Processing...' : 'Extract & Store PDF'}</span>
                </button>
            </div>
        </div>
    );
};

export default AIAssistantSection;