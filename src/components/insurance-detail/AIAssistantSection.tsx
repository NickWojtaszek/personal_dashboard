

import React, { useState, useCallback, useEffect } from 'react';
import type { InsuranceInfo, Document } from '../../types';
import { MagicWandIcon, UploadCloudIcon, DocumentTextIcon, TrashIcon } from './Icons';
import { GoogleGenAI, Type } from "@google/genai";
import * as pdfjs from 'pdfjs-dist';

// Set worker source for pdf.js
pdfjs.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@4.5.136/build/pdf.worker.mjs';

interface AIAssistantSectionProps {
    onDataExtracted: (data: Partial<InsuranceInfo> & { document?: Document }) => void;
}

const insuranceSchema = {
    type: Type.OBJECT,
    properties: {
        policyholder: { type: Type.STRING, description: "The full name of the policyholder.", nullable: true },
        policyType: { type: Type.STRING, description: "The type of insurance policy (e.g., Home & Contents, Comprehensive Car).", nullable: true },
        policyNumber: { type: Type.STRING, description: "The unique identifier for the policy.", nullable: true },
        provider: { type: Type.STRING, description: "The name of the insurance company or provider.", nullable: true },
        coverageAmount: { type: Type.NUMBER, description: "The total coverage amount.", nullable: true },
        premiumAmount: { type: Type.NUMBER, description: "The amount for a single premium payment.", nullable: true },
        paymentFrequency: { 
          type: Type.STRING, 
          enum: ['Monthly', 'Annually', 'Other'],
          description: "How often the premium is paid.",
          nullable: true
        },
        deductible: { type: Type.NUMBER, description: "The deductible or excess amount.", nullable: true },
        startDate: { type: Type.STRING, description: "The policy start date in YYYY-MM-DD format.", nullable: true },
        endDate: { type: Type.STRING, description: "The policy end date in YYYY-MM-DD format.", nullable: true },
        coverageSummary: { type: Type.STRING, description: "A brief summary of what the policy covers.", nullable: true },
        notes: { type: Type.STRING, description: "Any other relevant notes or details from the policy text.", nullable: true },
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

    const onDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);
    const onDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);
    const onDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);
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
            
            // 1. Convert PDF to Base64 for storage
            const base64Data = arrayBufferToBase64(arrayBuffer);
            const documentToStore: Document = {
                name: file.name,
                url: '#', // The URL will be a data URL generated from the base64 data
                data: base64Data,
                mimeType: 'application/pdf',
            };

            // 2. Extract text from PDF for AI
            const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;
            let pdfText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                pdfText += textContent.items.map(item => item.str).join(' ') + '\n';
            }
            
            // 3. Send text to Gemini API
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const prompt = `From the following insurance policy text, extract the specified details. Pay close attention to dates and currency amounts. Format all dates as 'YYYY-MM-DD'. All monetary values should be numbers without currency symbols. If a piece of information is not present, omit the key from the final JSON object. Here is the policy text:\n\n${pdfText}`;
            
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: insuranceSchema,
                },
            });

            const jsonStr = response.text.trim();
            const extractedData = JSON.parse(jsonStr) as Partial<InsuranceInfo>;
            
            // 4. Send data and document back to parent
            onDataExtracted({ ...extractedData, document: documentToStore });
            
            setSuccessMessage("Success! Policy data extracted and PDF stored.");
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
                <h2 className="text-lg font-bold flex items-center gap-3"><MagicWandIcon /> AI Policy Assistant</h2>
            </div>
            <div className="p-5 space-y-4">
                 <p className="text-sm text-slate-500 dark:text-gray-400">
                    Drop a policy PDF below. The AI will read it, autofill the fields on this page, and store the PDF for you.
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