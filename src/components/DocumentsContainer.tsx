import React, { useState, useCallback } from 'react';
import type { Document, DocumentCategory } from '../types';
import { openDocument } from '../lib/openDocument';

const CATEGORIES: DocumentCategory[] = [
    'Policy', 'Certificate', 'Purchase', 'Tenancy Agreement', 'Lease',
    'Title Deed', 'Mortgage', 'Invoice', 'Receipt', 'Inspection Report',
    'Compliance', 'Correspondence', 'Valuation', 'Tax', 'Other',
];

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

function getMimeType(file: File): string {
    if (file.type) return file.type;
    const ext = file.name.split('.').pop()?.toLowerCase();
    const map: Record<string, string> = {
        pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg',
        jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
        doc: 'application/msword',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        xls: 'application/vnd.ms-excel',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
    return map[ext || ''] || 'application/octet-stream';
}

const FileIcon = ({ mimeType, className = "w-5 h-5" }: { mimeType?: string; className?: string }) => {
    if (mimeType?.startsWith('image/')) {
        return (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
            </svg>
        );
    }
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>
    );
};

const TrashIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
);

const PlusIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
);

const EditIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
    </svg>
);

interface DocumentsContainerProps {
    documents: Document[];
    onChange: (documents: Document[]) => void;
    defaultCategory?: DocumentCategory;
    title?: string;
}

const DocumentsContainer: React.FC<DocumentsContainerProps> = ({
    documents,
    onChange,
    defaultCategory = 'Other',
    title = 'Documents',
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [filterCategory, setFilterCategory] = useState<DocumentCategory | 'All'>('All');

    const handleFiles = useCallback(async (files: FileList | File[]) => {
        const newDocs: Document[] = [];
        for (const file of Array.from(files)) {
            const buffer = await file.arrayBuffer();
            const base64 = arrayBufferToBase64(buffer);
            const id = crypto.randomUUID();
            newDocs.push({
                id,
                name: file.name,
                label: file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' '),
                category: defaultCategory,
                url: '#',
                data: base64,
                mimeType: getMimeType(file),
                uploadedAt: new Date().toISOString(),
            });
        }
        onChange([...documents, ...newDocs]);
    }, [documents, onChange, defaultCategory]);

    const onDragEnter = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }, []);
    const onDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }, []);
    const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); }, []);
    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation(); setIsDragging(false);
        if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
    }, [handleFiles]);

    const removeDoc = (index: number) => {
        const updated = documents.filter((_, i) => i !== index);
        onChange(updated);
    };

    const updateDoc = (index: number, updates: Partial<Document>) => {
        const updated = documents.map((d, i) => i === index ? { ...d, ...updates } : d);
        onChange(updated);
    };

    const filtered = filterCategory === 'All'
        ? documents
        : documents.filter(d => d.category === filterCategory);

    const usedCategories = [...new Set(documents.map(d => d.category).filter(Boolean))] as DocumentCategory[];

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-brand-primary">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                    </svg>
                    {title}
                    {documents.length > 0 && (
                        <span className="text-xs font-normal bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">{documents.length}</span>
                    )}
                </h2>
            </div>

            <div className="p-5 space-y-4">
                {/* Category filter */}
                {usedCategories.length > 1 && (
                    <div className="flex flex-wrap gap-1.5">
                        <button
                            onClick={() => setFilterCategory('All')}
                            className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors ${filterCategory === 'All' ? 'bg-brand-primary text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                        >All</button>
                        {usedCategories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setFilterCategory(cat)}
                                className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors ${filterCategory === cat ? 'bg-brand-primary text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                            >{cat}</button>
                        ))}
                    </div>
                )}

                {/* Document list */}
                {filtered.length > 0 ? (
                    <div className="space-y-2">
                        {filtered.map((doc, idx) => {
                            const realIndex = documents.indexOf(doc);
                            const isEditing = editingId === (doc.id || String(realIndex));
                            return (
                                <div key={doc.id || realIndex} className="group flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                    <button
                                        onClick={() => openDocument(doc)}
                                        className="mt-0.5 text-brand-primary hover:text-brand-primary/80 flex-shrink-0"
                                        title="Open document"
                                    >
                                        <FileIcon mimeType={doc.mimeType} />
                                    </button>
                                    <div className="flex-1 min-w-0">
                                        {isEditing ? (
                                            <div className="space-y-2">
                                                <input
                                                    value={doc.label || ''}
                                                    onChange={e => updateDoc(realIndex, { label: e.target.value })}
                                                    placeholder="Display name"
                                                    className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-sm text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-brand-primary"
                                                />
                                                <select
                                                    value={doc.category || defaultCategory}
                                                    onChange={e => updateDoc(realIndex, { category: e.target.value as DocumentCategory })}
                                                    className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-sm text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-brand-primary"
                                                >
                                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                                <button
                                                    onClick={() => setEditingId(null)}
                                                    className="text-xs text-brand-primary font-medium"
                                                >Done</button>
                                            </div>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => openDocument(doc)}
                                                    className="text-sm font-medium text-slate-800 dark:text-slate-200 hover:text-brand-primary truncate block text-left w-full"
                                                    title={doc.name}
                                                >
                                                    {doc.label || doc.name}
                                                </button>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    {doc.category && (
                                                        <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded">{doc.category}</span>
                                                    )}
                                                    <span className="text-xs text-slate-400 truncate">{doc.name}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                        <button
                                            onClick={() => setEditingId(doc.id || String(realIndex))}
                                            className="p-1 text-slate-400 hover:text-brand-primary rounded"
                                            title="Edit label & category"
                                        >
                                            <EditIcon />
                                        </button>
                                        <button
                                            onClick={() => removeDoc(realIndex)}
                                            className="p-1 text-slate-400 hover:text-red-500 rounded"
                                            title="Remove"
                                        >
                                            <TrashIcon />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : documents.length > 0 ? (
                    <p className="text-sm text-slate-400 italic">No documents in this category.</p>
                ) : null}

                {/* Upload area */}
                <label
                    onDragEnter={onDragEnter} onDragLeave={onDragLeave} onDragOver={onDragOver} onDrop={onDrop}
                    className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isDragging ? 'border-brand-primary bg-brand-primary/10' : 'border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                >
                    <div className="flex flex-col items-center justify-center text-center py-4">
                        <PlusIcon className="w-8 h-8 mb-2 text-slate-400" />
                        <p className="text-sm text-slate-500 dark:text-gray-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                        <p className="text-xs text-slate-400 mt-1">PDF, images, Word, Excel</p>
                    </div>
                    <input type="file" className="hidden" multiple accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx" onChange={e => e.target.files && handleFiles(e.target.files)} />
                </label>
            </div>
        </div>
    );
};

export default DocumentsContainer;
