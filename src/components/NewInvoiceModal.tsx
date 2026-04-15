import React, { useState, useCallback } from 'react';
import type { InvoiceInfo } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { Type, extractFromPdf, arrayBufferToBase64 } from '../lib/pdfExtraction';

const CURRENCY_OPTIONS = ['GBP', 'AUD', 'USD', 'EUR', 'PLN'];

interface NewInvoiceModalProps {
    onClose: () => void;
    onCreate: (invoice: InvoiceInfo) => void;
    allGroups: string[];
}

const invoiceSchema = {
    type: Type.OBJECT,
    properties: {
        description: { type: Type.STRING, description: "A concise description of the item or service purchased.", nullable: true },
        purchaseDate: { type: Type.STRING, description: "The purchase/invoice date in YYYY-MM-DD format.", nullable: true },
        amount: { type: Type.NUMBER, description: "The total amount paid (plain number, no currency symbol).", nullable: true },
        category: { type: Type.STRING, description: "A single category for this purchase (e.g., Electronics, Furniture, Automotive, Medical, Travel, Home, Office, Clothing, Food, Entertainment, Insurance, Utilities, Other).", nullable: true },
    },
};

const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
    </svg>
);

const NewInvoiceModal: React.FC<NewInvoiceModalProps> = ({ onClose, onCreate, allGroups }) => {
    const [currency, setCurrency] = useState('AUD');
    const [file, setFile] = useState<File | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile?.type === 'application/pdf') {
            setFile(droppedFile);
            setError(null);
        }
    }, []);

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (selected) {
            setFile(selected);
            setError(null);
        }
    }, []);

    const handleSubmit = async () => {
        if (!file) return;

        setIsExtracting(true);
        setError(null);

        try {
            const buildPrompt = (pdfText: string) => `Extract purchase/invoice details from the text below. Rules:
- For "description": provide a concise summary of what was purchased or the service provided.
- Format the date as YYYY-MM-DD.
- The amount must be a plain number without currency symbols.
- For "category": pick the single best-fit category.
- If a field cannot be confidently determined, return null.

Invoice/receipt text:
${pdfText}`;

            const { data: extracted, document: documentToStore } = await extractFromPdf<{
                description?: string;
                purchaseDate?: string;
                amount?: number;
                category?: string;
            }>(file, buildPrompt, invoiceSchema);

            // Build the invoice
            const newInvoice: InvoiceInfo = {
                id: uuidv4(),
                description: extracted.description || file.name.replace(/\.pdf$/i, ''),
                purchaseDate: extracted.purchaseDate || new Date().toISOString().split('T')[0],
                amount: extracted.amount || 0,
                currency,
                document: documentToStore,
                groups: extracted.category ? [extracted.category] : [],
            };

            onCreate(newInvoice);
        } catch (err) {
            console.error("Invoice extraction failed:", err);
            setError("Failed to extract data. You can still create the invoice manually.");

            // Fallback: create with just the PDF attached
            const arrayBuffer = await file.arrayBuffer();
            const base64Data = arrayBufferToBase64(arrayBuffer);
            const fallbackInvoice: InvoiceInfo = {
                id: uuidv4(),
                description: file.name.replace(/\.pdf$/i, ''),
                purchaseDate: new Date().toISOString().split('T')[0],
                amount: 0,
                currency,
                document: {
                    name: file.name,
                    url: '#',
                    data: base64Data,
                    mimeType: 'application/pdf',
                },
                groups: [],
            };
            onCreate(fallbackInvoice);
        } finally {
            setIsExtracting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">New Invoice</h2>
                    <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">Upload a receipt or invoice PDF. Details will be extracted automatically.</p>
                </div>

                <div className="p-6 space-y-5">
                    {/* Currency */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1.5">Currency</label>
                        <select
                            value={currency}
                            onChange={e => setCurrency(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-primary dark:focus:ring-brand-secondary focus:border-transparent"
                        >
                            {CURRENCY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    {/* PDF Upload */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1.5">Invoice / Receipt (PDF)</label>
                        <div
                            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handleDrop}
                            className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
                                dragOver
                                    ? 'border-brand-primary dark:border-brand-secondary bg-brand-primary/5 dark:bg-brand-secondary/5'
                                    : file
                                        ? 'border-green-400 dark:border-green-500 bg-green-50 dark:bg-green-900/10'
                                        : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'
                            }`}
                        >
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={handleFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            {file ? (
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-green-700 dark:text-green-400">{file.name}</p>
                                    <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(0)} KB</p>
                                </div>
                            ) : (
                                <div className="space-y-2 text-slate-400 dark:text-gray-500">
                                    <UploadIcon />
                                    <p className="text-sm">Drop PDF here or click to browse</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {error && <p className="text-sm text-red-500">{error}</p>}
                </div>

                <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isExtracting}
                        className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!file || isExtracting}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-brand-primary text-white hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[140px] justify-center"
                    >
                        {isExtracting ? (
                            <>
                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Extracting...
                            </>
                        ) : (
                            'Upload & Extract'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NewInvoiceModal;
