import React, { useMemo, useState } from 'react';
import type { PropertyInfo, InsuranceInfo, InvoiceInfo, VehicleInfo, ContractInfo } from '../types';
import { collectAllDocuments, type DocEntityType, type DocumentRef } from '../lib/documentIndex';
import { openDocument } from '../lib/documents';

interface DocumentsPageProps {
    properties: PropertyInfo[];
    insurancePolicies: InsuranceInfo[];
    invoices: InvoiceInfo[];
    vehicles: VehicleInfo[];
    contracts: ContractInfo[];
}

const TYPE_BADGE: Record<DocEntityType, string> = {
    Property: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    Insurance: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    Invoice: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    Vehicle: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    Contract: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
};

const ALL_TYPES: DocEntityType[] = ['Property', 'Insurance', 'Invoice', 'Vehicle', 'Contract'];

function approxSize(doc: DocumentRef['doc']): string {
    if (!doc.data) return '';
    const bytes = Math.floor(doc.data.length * 0.75);
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const DocIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
);

const DocumentsPage: React.FC<DocumentsPageProps> = ({ properties, insurancePolicies, invoices, vehicles, contracts }) => {
    const [query, setQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<DocEntityType | 'All'>('All');

    const allRefs = useMemo(
        () => collectAllDocuments({ properties, insurance: insurancePolicies, invoices, vehicles, contracts }),
        [properties, insurancePolicies, invoices, vehicles, contracts]
    );

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return allRefs.filter(r => {
            if (typeFilter !== 'All' && r.entityType !== typeFilter) return false;
            if (!q) return true;
            return (
                (r.doc.label || r.doc.name).toLowerCase().includes(q) ||
                r.entityName.toLowerCase().includes(q) ||
                r.role.toLowerCase().includes(q)
            );
        });
    }, [allRefs, query, typeFilter]);

    const countByType = useMemo(() => {
        const m = new Map<DocEntityType, number>();
        for (const r of allRefs) m.set(r.entityType, (m.get(r.entityType) || 0) + 1);
        return m;
    }, [allRefs]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Documents</h1>
                    <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
                        Every stored document across properties, insurance, invoices, vehicles and contracts.
                    </p>
                </div>
                <div className="relative">
                    <input
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Search documents…"
                        className="w-full sm:w-72 pl-3 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                    />
                </div>
            </div>

            {/* Type filter chips */}
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => setTypeFilter('All')}
                    className={`px-3 py-1 rounded-full text-xs font-medium border ${typeFilter === 'All' ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-gray-300 border-slate-300 dark:border-slate-600'}`}
                >
                    All ({allRefs.length})
                </button>
                {ALL_TYPES.map(t => (
                    <button
                        key={t}
                        onClick={() => setTypeFilter(t)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border ${typeFilter === t ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-gray-300 border-slate-300 dark:border-slate-600'}`}
                    >
                        {t} ({countByType.get(t) || 0})
                    </button>
                ))}
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                {filtered.length === 0 ? (
                    <p className="text-center text-sm text-slate-500 dark:text-gray-400 py-16">
                        {allRefs.length === 0 ? 'No documents stored yet.' : 'No documents match your search.'}
                    </p>
                ) : (
                    <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                        {filtered.map((r, i) => (
                            <li key={`${r.entityId}-${i}`}>
                                <button
                                    onClick={() => openDocument(r.doc)}
                                    className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                                >
                                    <DocIcon />
                                    <div className="flex-grow min-w-0">
                                        <p className="text-sm font-medium text-slate-800 dark:text-gray-100 truncate">{r.doc.label || r.doc.name}</p>
                                        <p className="text-xs text-slate-500 dark:text-gray-400 truncate">
                                            {r.entityName}{r.role && r.role !== 'Document' ? ` · ${r.role}` : ''}
                                        </p>
                                    </div>
                                    <span className={`flex-shrink-0 text-[10px] font-semibold uppercase tracking-wide rounded px-2 py-0.5 ${TYPE_BADGE[r.entityType]}`}>
                                        {r.entityType}
                                    </span>
                                    <span className="flex-shrink-0 text-xs text-slate-400 w-16 text-right">{approxSize(r.doc)}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default DocumentsPage;
