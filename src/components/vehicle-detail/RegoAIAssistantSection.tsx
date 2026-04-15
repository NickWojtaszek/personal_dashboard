import React, { useState, useCallback, useEffect } from 'react';
import type { VehicleInfo, Document } from '../../types';
import { MagicWandIcon, UploadCloudIcon, DocumentTextIcon, TrashIcon } from '../insurance-detail/Icons';
import { Type, extractFromPdf } from '../../lib/pdfExtraction';
import type { RegoDocType } from '../NewRegistrationModal';

export interface RegoExtractedData extends Partial<VehicleInfo> {
    document?: Document;
    _docType?: RegoDocType;
}

interface RegoAIAssistantSectionProps {
    onDataExtracted: (data: RegoExtractedData) => void;
    pendingFile?: File | null;
    pendingDocType?: RegoDocType;
    onPendingFileConsumed?: () => void;
    hasRenewalDoc?: boolean;
    hasPaymentDoc?: boolean;
}

// Schema for RENEWAL NOTICE — full vehicle + cost details
const renewalSchema = {
    type: Type.OBJECT,
    properties: {
        make: { type: Type.STRING, description: "Vehicle make (e.g. Toyota, Honda).", nullable: true },
        model: { type: Type.STRING, description: "Vehicle model (e.g. Hilux, Civic).", nullable: true },
        bodyType: { type: Type.STRING, description: "Body type (e.g. Utility, Hatchback, Sedan).", nullable: true },
        rego: { type: Type.STRING, description: "Registration plate number.", nullable: true },
        state: { type: Type.STRING, description: "State or territory (e.g. QLD, NSW, VIC).", nullable: true },
        purpose: { type: Type.STRING, description: "Purpose of use (e.g. Private, Business).", nullable: true },
        totalAmount: { type: Type.NUMBER, description: "Total registration renewal amount for the 6-month term. Plain number.", nullable: true },
        ctpAmount: { type: Type.NUMBER, description: "CTP insurance premium for the 6-month term. Plain number.", nullable: true },
        registrationFee: { type: Type.NUMBER, description: "Registration fee for the 6-month term. Plain number.", nullable: true },
        trafficImprovementFee: { type: Type.NUMBER, description: "Traffic improvement fee for the 6-month term. Plain number.", nullable: true },
        ctpInsurer: { type: Type.STRING, description: "CTP insurer name (e.g. QBE, Allianz, Suncorp).", nullable: true },
        ctpClass: { type: Type.STRING, description: "CTP insurance class number.", nullable: true },
        startDate: { type: Type.STRING, description: "Renewal due date (start of new period) in YYYY-MM-DD.", nullable: true },
        expiryDate: { type: Type.STRING, description: "Next registration expiry date for 6-month term in YYYY-MM-DD.", nullable: true },
        currency: { type: Type.STRING, enum: ['AUD', 'GBP', 'USD', 'EUR', 'PLN'], description: "Currency code.", nullable: true },
        notes: { type: Type.STRING, description: "Customer reference number, BPAY details, or other relevant info.", nullable: true },
    },
};

// Schema for PAYMENT CONFIRMATION — only the fields that appear on these documents
const paymentSchema = {
    type: Type.OBJECT,
    properties: {
        rego: { type: Type.STRING, description: "Registration plate number.", nullable: true },
        term: {
            type: Type.STRING,
            enum: ['1 Month', '3 Months', '6 Months', '12 Months'],
            description: "The chosen registration term.",
            nullable: true
        },
        ctpInsurer: { type: Type.STRING, description: "CTP insurer name, properly capitalized (e.g. QBE, Allianz, Suncorp).", nullable: true },
        notes: { type: Type.STRING, description: "Transaction date/time or any other confirmation details.", nullable: true },
    },
};

const RegoAIAssistantSection: React.FC<RegoAIAssistantSectionProps> = ({
    onDataExtracted, pendingFile, pendingDocType, onPendingFileConsumed, hasRenewalDoc, hasPaymentDoc
}) => {
    const [file, setFile] = useState<File | null>(null);
    const [docType, setDocType] = useState<RegoDocType>('renewal');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const pendingFileProcessed = React.useRef(false);

    const shouldAutoExtract = React.useRef(false);
    useEffect(() => {
        if (pendingFile && !pendingFileProcessed.current) {
            pendingFileProcessed.current = true;
            shouldAutoExtract.current = true;
            if (pendingDocType) setDocType(pendingDocType);
            setFile(pendingFile);
            onPendingFileConsumed?.();
        }
    }, [pendingFile, pendingDocType, onPendingFileConsumed]);

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
        e.preventDefault(); e.stopPropagation(); setIsDragging(false);
        handleFileChange(e.dataTransfer.files);
    }, []);

    const handleExtract = useCallback(async () => {
        if (!file) { setError("Please select a PDF file first."); return; }

        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const isRenewal = docType === 'renewal';
            const buildPrompt = (pdfText: string) => isRenewal
                ? `Extract vehicle registration RENEWAL NOTICE details from the text below.
This document contains fee breakdowns, vehicle details, CTP info, and pricing for 6 and 12 month terms.

Rules:
- Format all dates as YYYY-MM-DD.
- All monetary values must be plain numbers without currency symbols.
- Extract the 6-month column values by default.
- For "expiryDate": use the 6-month next expiry date.
- For "ctpInsurer": properly capitalized (e.g. "QBE", "Allianz", "Suncorp").
- If a field cannot be determined, return null.

Document text:
${pdfText}`
                : `Extract vehicle registration PAYMENT CONFIRMATION details from the text below.
This is a short receipt confirming registration was renewed. It shows the chosen term, CTP insurer, and rego number.

Rules:
- For "term": extract exactly as shown (e.g. "6 months" → "6 Months").
- For "ctpInsurer": properly capitalized.
- If a field cannot be determined, return null.

Document text:
${pdfText}`;

            const { data: extractedData, document: documentToStore } = await extractFromPdf<Partial<VehicleInfo>>(
                file,
                buildPrompt,
                isRenewal ? renewalSchema : paymentSchema
            );

            onDataExtracted({ ...extractedData, document: documentToStore, _docType: docType });

            const label = isRenewal ? 'Renewal notice' : 'Payment confirmation';
            setSuccessMessage(`${label} extracted and stored.`);
            setFile(null);
            setTimeout(() => setSuccessMessage(null), 4000);

        } catch (err) {
            console.error("AI extraction failed:", err);
            setError("Failed to extract data. The PDF might be image-based or corrupted.");
        } finally {
            setIsLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [file, docType, onDataExtracted]);

    useEffect(() => {
        if (file && shouldAutoExtract.current && !isLoading) {
            shouldAutoExtract.current = false;
            handleExtract();
        }
    }, [file, handleExtract, isLoading]);

    const selectClasses = "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary outline-none transition";

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="p-5 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-bold flex items-center gap-3"><MagicWandIcon /> AI Rego Assistant</h2>
            </div>
            <div className="p-5 space-y-4">
                {/* Document type selector */}
                <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-gray-300 mb-1.5">Document Type</label>
                    <select value={docType} onChange={e => setDocType(e.target.value as RegoDocType)} className={selectClasses}>
                        <option value="renewal">Renewal Notice</option>
                        <option value="payment">Payment Confirmation</option>
                    </select>
                </div>

                <p className="text-xs text-slate-400 dark:text-gray-500">
                    {docType === 'renewal'
                        ? 'Extracts: vehicle details, fees, CTP info, dates'
                        : 'Extracts: chosen term, CTP insurer, rego number'}
                </p>

                {/* Document status indicators */}
                <div className="flex gap-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${hasRenewalDoc ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-gray-500'}`}>
                        {hasRenewalDoc ? '\u2713' : '\u2013'} Renewal
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${hasPaymentDoc ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-gray-500'}`}>
                        {hasPaymentDoc ? '\u2713' : '\u2013'} Payment
                    </span>
                </div>

                {/* File drop zone */}
                {!file ? (
                    <label
                        onDragEnter={onDragEnter} onDragLeave={onDragLeave} onDragOver={onDragOver} onDrop={onDrop}
                        className={`flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isDragging ? 'border-brand-primary bg-brand-primary/10' : 'border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                    >
                        <div className="flex flex-col items-center justify-center py-4 text-center">
                            <UploadCloudIcon className="w-8 h-8 mb-2 text-slate-400" />
                            <p className="text-sm text-slate-500 dark:text-gray-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                            <p className="text-xs text-slate-400 mt-1">PDF documents only</p>
                        </div>
                        <input type="file" className="hidden" accept="application/pdf" onChange={(e) => handleFileChange(e.target.files)} />
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

export default RegoAIAssistantSection;
