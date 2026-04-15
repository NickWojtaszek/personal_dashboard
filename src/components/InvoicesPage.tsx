import React, { useState, useMemo, useCallback } from 'react';
import type { InvoiceInfo } from '../types';
import InvoiceTable from './InvoiceGrid';
import { exportToGoogleSheets, isGoogleSheetsConfigured } from '../lib/googleSheets';
import Button from './ui/Button';
import { ListIcon, TilesIcon, PlusIcon, SearchIcon, CloseIcon, DownloadIcon as ExportIcon } from './Icons';
import { formatCurrency as fmtCurrency } from '../lib/formatting';

interface InvoicesPageProps {
    invoices: InvoiceInfo[];
    onOrderChange: (activeId: string, overId: string) => void;
    isAdminMode: boolean;
    invoiceGroups: string[];
    onSelectInvoice: (id: string) => void;
    onNewInvoice: () => void;
    onEditInvoice: (invoice: InvoiceInfo) => void;
}

const ExpandIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
    </svg>
);
const SheetsIcon = () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
        <path d="M19 11V9h-6V3h-2v6H5v2h6v10h2V11z" opacity="0" />
        <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" />
        <path d="M8 15h8v1.5H8zm0-3h8v1.5H8z" />
    </svg>
);

type SortOption = 'purchaseDate' | 'amount' | 'description';
type ViewMode = 'list' | 'tiles';

const SORT_OPTIONS = [
    { value: 'purchaseDate', label: 'Purchase Date' },
    { value: 'amount', label: 'Amount (High-Low)' },
    { value: 'description', label: 'Description (A-Z)' },
];

function escapeCsv(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}

function formatAmount(amount: number, currency?: string): string {
    return fmtCurrency(amount, currency || 'GBP', { decimals: 2 });
}

function buildCsvRows(items: InvoiceInfo[]): string[] {
    return items.map(inv =>
        [
            escapeCsv(inv.description),
            escapeCsv((inv.groups || []).join('; ')),
            escapeCsv(inv.location || ''),
            inv.purchaseDate,
            inv.currency || 'GBP',
            inv.amount.toFixed(2),
        ].join(',')
    );
}

function downloadCsv(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

// --- List View Row ---
const InvoiceListRow: React.FC<{ invoice: InvoiceInfo; onSelect: (id: string) => void }> = ({ invoice, onSelect }) => (
    <button
        onClick={() => onSelect(invoice.id)}
        className="w-full text-left grid grid-cols-12 gap-4 items-center px-4 py-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group border border-transparent hover:border-slate-200 dark:hover:border-slate-600"
    >
        <div className="col-span-4 min-w-0">
            <p className="font-medium text-slate-800 dark:text-gray-200 truncate group-hover:text-brand-primary dark:group-hover:text-brand-secondary transition-colors">{invoice.description}</p>
            <p className="text-xs text-slate-500 dark:text-gray-400 truncate">{(invoice.groups || []).join(', ') || '\u2014'}</p>
        </div>
        <div className="col-span-2">
            <p className="text-sm text-slate-600 dark:text-gray-300">{invoice.location || '\u2014'}</p>
        </div>
        <div className="col-span-2">
            <p className="text-sm text-slate-600 dark:text-gray-300">
                {invoice.purchaseDate ? new Date(invoice.purchaseDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '\u2014'}
            </p>
        </div>
        <div className="col-span-2 text-right">
            <p className="text-sm font-medium text-slate-700 dark:text-gray-200">{formatAmount(invoice.amount, invoice.currency)}</p>
        </div>
        <div className="col-span-2 flex justify-end">
            {invoice.document?.data && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">PDF</span>
            )}
        </div>
    </button>
);

const InvoicesPage: React.FC<InvoicesPageProps> = ({
    invoices, onOrderChange, isAdminMode, invoiceGroups,
    onSelectInvoice, onNewInvoice, onEditInvoice,
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSort, setSelectedSort] = useState<SortOption>('purchaseDate');
    const [selectedGroup, setSelectedGroup] = useState('All');
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [previewInvoiceId, setPreviewInvoiceId] = useState<string | null>(null);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [sheetsExporting, setSheetsExporting] = useState(false);
    const [sheetsMessage, setSheetsMessage] = useState<{ type: 'success' | 'error'; text: string; url?: string } | null>(null);

    const filteredInvoices = useMemo(() => {
        let filtered = [...invoices];

        if (selectedGroup !== 'All') {
            filtered = filtered.filter(invoice => invoice.groups?.includes(selectedGroup));
        }

        if (searchTerm.trim()) {
            const lowercasedTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(invoice =>
                invoice.description.toLowerCase().includes(lowercasedTerm)
            );
        }

        return filtered.sort((a, b) => {
            switch (selectedSort) {
                case 'description': return a.description.localeCompare(b.description);
                case 'amount': return b.amount - a.amount;
                case 'purchaseDate': return new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime();
                default: return 0;
            }
        });
    }, [invoices, searchTerm, selectedSort, selectedGroup]);

    const handleExportFiltered = useCallback(() => {
        if (filteredInvoices.length === 0) return;
        const header = 'Description,Category,Location,Date,Currency,Amount';
        const rows = buildCsvRows(filteredInvoices);
        const totals: Record<string, number> = {};
        filteredInvoices.forEach(inv => { const c = inv.currency || 'GBP'; totals[c] = (totals[c] || 0) + inv.amount; });
        const totalLines = Object.entries(totals).map(([c, t]) => `,,,,${c},${t.toFixed(2)}`);
        const csv = [header, ...rows, '', 'TOTALS', ...totalLines].join('\n');
        const dateStr = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
        const filterLabel = selectedGroup !== 'All' ? `_${selectedGroup}` : '';
        downloadCsv(csv, `invoices${filterLabel}_${dateStr}.csv`);
        setShowExportMenu(false);
    }, [filteredInvoices, selectedGroup]);

    const handleExportByLocation = useCallback(() => {
        if (filteredInvoices.length === 0) return;
        const header = 'Description,Category,Location,Date,Currency,Amount';
        const byLocation: Record<string, InvoiceInfo[]> = {};
        filteredInvoices.forEach(inv => { const loc = inv.location || 'Unassigned'; if (!byLocation[loc]) byLocation[loc] = []; byLocation[loc].push(inv); });
        const sections: string[] = [header];
        for (const [loc, items] of Object.entries(byLocation).sort(([a], [b]) => a.localeCompare(b))) {
            sections.push('', `--- ${loc} ---`, ...buildCsvRows(items));
            const subtotals: Record<string, number> = {};
            items.forEach(inv => { const c = inv.currency || 'GBP'; subtotals[c] = (subtotals[c] || 0) + inv.amount; });
            Object.entries(subtotals).forEach(([c, t]) => { sections.push(`,,Subtotal (${loc}),,${c},${t.toFixed(2)}`); });
        }
        const csv = sections.join('\n');
        const dateStr = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
        downloadCsv(csv, `invoices_by_location_${dateStr}.csv`);
        setShowExportMenu(false);
    }, [filteredInvoices]);

    const handleExportSeparateFiles = useCallback(() => {
        if (filteredInvoices.length === 0) return;
        const header = 'Description,Category,Location,Date,Currency,Amount';
        const byLocation: Record<string, InvoiceInfo[]> = {};
        filteredInvoices.forEach(inv => { const loc = inv.location || 'Unassigned'; if (!byLocation[loc]) byLocation[loc] = []; byLocation[loc].push(inv); });
        const dateStr = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
        for (const [loc, items] of Object.entries(byLocation)) {
            const rows = buildCsvRows(items);
            const totals: Record<string, number> = {};
            items.forEach(inv => { const c = inv.currency || 'GBP'; totals[c] = (totals[c] || 0) + inv.amount; });
            const totalLines = Object.entries(totals).map(([c, t]) => `,,,,${c},${t.toFixed(2)}`);
            const csv = [header, ...rows, '', 'TOTALS', ...totalLines].join('\n');
            const safeLoc = loc.replace(/[^a-zA-Z0-9]/g, '_');
            downloadCsv(csv, `invoices_${safeLoc}_${dateStr}.csv`);
        }
        setShowExportMenu(false);
    }, [filteredInvoices]);

    const googleSheetsAvailable = isGoogleSheetsConfigured();

    const handleExportToSheets = useCallback(async (groupBy: 'location' | 'category') => {
        if (filteredInvoices.length === 0) return;
        setSheetsExporting(true);
        setSheetsMessage(null);
        setShowExportMenu(false);
        try {
            const filterLabel = selectedGroup !== 'All' ? ` (${selectedGroup})` : '';
            const url = await exportToGoogleSheets({
                invoices: filteredInvoices, groupBy,
                title: `Invoices${filterLabel} - ${new Date().toLocaleString('en-GB')}`,
            });
            setSheetsMessage({ type: 'success', text: 'Spreadsheet created!', url });
        } catch (err: any) {
            setSheetsMessage({ type: 'error', text: err.message || 'Export failed' });
        } finally {
            setSheetsExporting(false);
        }
    }, [filteredInvoices, selectedGroup]);

    const locationCount = useMemo(() => {
        return new Set(filteredInvoices.map(i => i.location || 'Unassigned')).size;
    }, [filteredInvoices]);

    const previewInvoice = previewInvoiceId ? invoices.find(i => i.id === previewInvoiceId) : null;
    const previewDataUrl = previewInvoice?.document?.data && previewInvoice.document.mimeType
        ? `data:${previewInvoice.document.mimeType};base64,${previewInvoice.document.data}`
        : null;

    const handlePreview = (id: string) => {
        const invoice = invoices.find(i => i.id === id);
        if (invoice?.document?.data) {
            setPreviewInvoiceId(prev => prev === id ? null : id);
        } else {
            onSelectInvoice(id);
        }
    };

    const totalsByCurrency = useMemo(() => {
        const totals: Record<string, number> = {};
        filteredInvoices.forEach(inv => { const c = inv.currency || 'GBP'; totals[c] = (totals[c] || 0) + inv.amount; });
        return totals;
    }, [filteredInvoices]);

    const selectClasses = "bg-slate-50 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition";

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Purchase Invoices</h1>
                    <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
                        {filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? 's' : ''} across all categories.
                    </p>
                </div>
                <div className="flex items-center gap-2 self-start">
                    <div className="p-1 bg-slate-100 dark:bg-slate-700/50 rounded-lg flex items-center gap-1">
                        <Button variant={viewMode === 'list' ? 'primary' : 'ghost'} size="sm" onClick={() => setViewMode('list')} leftIcon={<ListIcon />}>List</Button>
                        <Button variant={viewMode === 'tiles' ? 'primary' : 'ghost'} size="sm" onClick={() => setViewMode('tiles')} leftIcon={<TilesIcon />}>Table</Button>
                    </div>
                    {/* Export dropdown */}
                    <div className="relative">
                        <Button variant="secondary" size="md" onClick={() => setShowExportMenu(!showExportMenu)} disabled={filteredInvoices.length === 0} leftIcon={<ExportIcon />}>Export</Button>
                        {showExportMenu && (
                            <div className="absolute right-0 top-full mt-1 z-30 w-72 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 py-1">
                                <p className="px-4 py-1.5 text-[10px] font-semibold text-slate-400 dark:text-gray-500 uppercase tracking-wider">CSV Download</p>
                                <button onClick={handleExportFiltered} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                    <span className="font-medium text-slate-700 dark:text-gray-200">Export current view</span>
                                    <span className="block text-xs text-slate-400 dark:text-gray-500">{filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? 's' : ''} as single CSV</span>
                                </button>
                                <button onClick={handleExportByLocation} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                    <span className="font-medium text-slate-700 dark:text-gray-200">Grouped by location</span>
                                    <span className="block text-xs text-slate-400 dark:text-gray-500">Single CSV with sections per location</span>
                                </button>
                                <button onClick={handleExportSeparateFiles} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                    <span className="font-medium text-slate-700 dark:text-gray-200">Separate files per location</span>
                                    <span className="block text-xs text-slate-400 dark:text-gray-500">{locationCount} CSV file{locationCount !== 1 ? 's' : ''} — one per location</span>
                                </button>
                                <div className="border-t border-slate-200 dark:border-slate-700 mt-1 pt-1">
                                    <p className="px-4 py-1.5 text-[10px] font-semibold text-slate-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1.5"><SheetsIcon /> Google Sheets</p>
                                    {googleSheetsAvailable ? (
                                        <>
                                            <button onClick={() => handleExportToSheets('location')} disabled={sheetsExporting} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50">
                                                <span className="font-medium text-slate-700 dark:text-gray-200">Grouped by location</span>
                                                <span className="block text-xs text-slate-400 dark:text-gray-500">Formatted spreadsheet on your Drive</span>
                                            </button>
                                            <button onClick={() => handleExportToSheets('category')} disabled={sheetsExporting} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50">
                                                <span className="font-medium text-slate-700 dark:text-gray-200">Grouped by category</span>
                                                <span className="block text-xs text-slate-400 dark:text-gray-500">Formatted spreadsheet on your Drive</span>
                                            </button>
                                        </>
                                    ) : (
                                        <p className="px-4 py-2 text-xs text-slate-400 dark:text-gray-500">
                                            Set GOOGLE_CLIENT_ID in .env.local to enable.
                                            <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="block text-brand-primary hover:underline mt-0.5">Google Cloud Console</a>
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    <Button onClick={onNewInvoice} leftIcon={<PlusIcon />}>Invoice</Button>
                </div>
            </div>

            {/* Content card */}
            <div className={`grid gap-6 ${previewDataUrl ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                    {/* Sheets export status */}
                    {sheetsExporting && (
                        <div className="flex items-center gap-2 mx-5 mt-5 px-4 py-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-700 dark:text-blue-300">
                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Creating Google Sheet...
                        </div>
                    )}
                    {sheetsMessage && !sheetsExporting && (
                        <div className={`flex items-center justify-between mx-5 mt-5 px-4 py-2.5 rounded-lg text-sm border ${
                            sheetsMessage.type === 'success'
                                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
                                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                        }`}>
                            <span>{sheetsMessage.text}</span>
                            <div className="flex items-center gap-2">
                                {sheetsMessage.url && (
                                    <a href={sheetsMessage.url} target="_blank" rel="noreferrer" className="font-medium underline hover:no-underline">Open in Google Sheets</a>
                                )}
                                <button onClick={() => setSheetsMessage(null)} className="p-0.5 hover:opacity-70"><CloseIcon /></button>
                            </div>
                        </div>
                    )}
                    {/* Search, filter, sort bar */}
                    <div className="p-5 border-b border-slate-200 dark:border-slate-700">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <SearchIcon className="w-5 h-5 text-slate-400 dark:text-gray-500" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search invoices..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-lg pl-10 pr-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition"
                                />
                            </div>
                            <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)} className={selectClasses}>
                                <option value="All">All Groups</option>
                                {invoiceGroups.sort().map(group => <option key={group} value={group}>{group}</option>)}
                            </select>
                            <select value={selectedSort} onChange={(e) => setSelectedSort(e.target.value as SortOption)} className={selectClasses}>
                                {SORT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                        </div>

                        {/* Totals summary */}
                        {Object.keys(totalsByCurrency).length > 0 && (
                            <div className="flex flex-wrap gap-3 mt-3">
                                {Object.entries(totalsByCurrency).map(([currency, total]) => (
                                    <div key={currency} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                        <span className="text-xs font-medium text-slate-500 dark:text-gray-400">Total ({currency})</span>
                                        <span className="text-sm font-bold text-slate-800 dark:text-gray-200">{formatAmount(total as number, currency)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Content */}
                    <div className="p-5">
                        {filteredInvoices.length === 0 ? (
                            <div className="text-center py-16 text-slate-500 dark:text-gray-400">
                                <p className="text-lg">No invoices found.</p>
                                <p>Try adjusting your search or filters.</p>
                            </div>
                        ) : viewMode === 'list' ? (
                            <div>
                                <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-slate-400 dark:text-gray-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 mb-1">
                                    <div className="col-span-4">Description</div>
                                    <div className="col-span-2">Location</div>
                                    <div className="col-span-2">Date</div>
                                    <div className="col-span-2 text-right">Amount</div>
                                    <div className="col-span-2 text-right">Attachment</div>
                                </div>
                                <div className="space-y-0.5">
                                    {filteredInvoices.map(inv => <InvoiceListRow key={inv.id} invoice={inv} onSelect={handlePreview} />)}
                                </div>
                            </div>
                        ) : (
                            <InvoiceTable
                                invoices={filteredInvoices}
                                isAdminMode={isAdminMode}
                                onEdit={onEditInvoice}
                                onSelect={handlePreview}
                                onOrderChange={onOrderChange}
                            />
                        )}
                    </div>
                </div>

                {/* Preview panel */}
                {previewDataUrl && previewInvoice && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col lg:sticky lg:top-24" style={{ height: 'calc(100vh - 8rem)' }}>
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-800 dark:text-gray-200 truncate">{previewInvoice.description}</p>
                                <p className="text-xs text-slate-500 dark:text-gray-400">{previewInvoice.document?.name}</p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                                <button onClick={() => window.open(previewDataUrl, '_blank')} className="p-1.5 rounded-lg text-slate-500 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors" title="Open in new tab"><ExpandIcon /></button>
                                <button onClick={() => setPreviewInvoiceId(null)} className="p-1.5 rounded-lg text-slate-500 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors" title="Close preview"><CloseIcon /></button>
                            </div>
                        </div>
                        <iframe src={previewDataUrl} className="flex-1 w-full" title="Invoice PDF Preview" />
                    </div>
                )}
            </div>
        </div>
    );
};

export default InvoicesPage;
