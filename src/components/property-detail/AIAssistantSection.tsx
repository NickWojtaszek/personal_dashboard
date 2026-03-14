

import React, { useState, useCallback } from 'react';
import type { PropertyCountry } from '../../types';
import { MagicWandIcon, UploadCloudIcon, DocumentTextIcon, TrashIcon } from './Icons';
import { extractFromFile, type ExtractedPropertyData } from '../../lib/extractPropertyData';

interface AIAssistantSectionProps {
    onDataExtracted: (data: ExtractedPropertyData) => void;
    country?: PropertyCountry;
}

const AIAssistantSection: React.FC<AIAssistantSectionProps> = ({ onDataExtracted, country }) => {
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
            const result = await extractFromFile(file, country);
            onDataExtracted(result);

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
                    Drop a **Tenancy Agreement**, **Rental Statement**, **Strata/Body Corporate Notice**, **Council Rates Notice**, **Mortgage Statement**, or **Title Search** PDF. The AI will extract key data, autofill the page, and store the document.
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
