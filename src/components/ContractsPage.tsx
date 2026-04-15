import React, { useState, useMemo, useCallback } from 'react';
import type { ContractInfo } from '../types';
import ContractCard from './ContractCard';
import { ListIcon, TilesIcon, PlusIcon, SearchIcon } from './Icons';
import { getCountryBorder, getCountryFlag } from '../lib/countryColors';
import { getStatusColor, daysUntil, periodProgress as contractProgress } from '../lib/formatting';

interface ContractsPageProps {
    contracts: ContractInfo[];
    onOrderChange: (activeId: string, overId: string) => void;
    isAdminMode: boolean;
    contractGroups: string[];
    onSelectContract: (id: string) => void;
    onNewContract: () => void;
    onEditContract: (contract: ContractInfo) => void;
    onGroupsChange: (groups: string[]) => void;
}

type SortOption = 'name' | 'expirationDate' | 'signedDate' | 'status';
type ViewMode = 'list' | 'tiles';

const SORT_OPTIONS = [
    { value: 'name', label: 'Name (A-Z)' },
    { value: 'expirationDate', label: 'Expiration (Soonest)' },
    { value: 'signedDate', label: 'Signed Date' },
    { value: 'status', label: 'Status' },
];

const ContractListRow: React.FC<{ contract: ContractInfo; onSelect: (id: string) => void }> = ({ contract, onSelect }) => {
    const days = daysUntil(contract.expirationDate);
    const progress = contractProgress(contract.effectiveDate, contract.expirationDate);

    return (
        <button
            onClick={() => onSelect(contract.id)}
            className={`w-full text-left grid grid-cols-12 gap-4 items-center px-4 py-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group border border-transparent hover:border-slate-200 dark:hover:border-slate-600 ${getCountryBorder(contract.country)}`}
        >
            <div className="col-span-3 min-w-0">
                <p className="font-medium text-slate-800 dark:text-gray-200 truncate group-hover:text-brand-primary dark:group-hover:text-brand-secondary transition-colors">
                    {contract.country && <span className="mr-1.5">{getCountryFlag(contract.country)}</span>}
                    {contract.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-gray-400 truncate">{contract.contractType || '—'}</p>
            </div>
            <div className="col-span-2 min-w-0">
                <p className="text-sm text-slate-600 dark:text-gray-300 truncate">{contract.employer || '—'}</p>
            </div>
            <div className="col-span-2">
                <p className="text-sm text-slate-600 dark:text-gray-300">
                    {contract.expirationDate ? new Date(contract.expirationDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                </p>
            </div>
            <div className="col-span-2">
                {progress !== null && (
                    <div className="space-y-1">
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                            <div
                                className={`h-full rounded-full ${progress >= 90 ? 'bg-red-500' : progress >= 75 ? 'bg-amber-500' : 'bg-blue-500'}`}
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        {days !== null && (
                            <p className={`text-xs ${days <= 30 ? 'text-red-500' : days <= 90 ? 'text-amber-500' : 'text-slate-400'}`}>
                                {days > 0 ? `${days}d left` : days === 0 ? 'Today' : `${Math.abs(days)}d ago`}
                            </p>
                        )}
                    </div>
                )}
            </div>
            <div className="col-span-1 flex justify-end">
                {contract.status && (
                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${getStatusColor(contract.status)} whitespace-nowrap`}>
                        {contract.status}
                    </span>
                )}
            </div>
            <div className="col-span-2 flex justify-end gap-1 flex-wrap">
                {contract.groups?.map(g => (
                    <span key={g} className="px-2 py-0.5 text-xs rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-gray-400">{g}</span>
                ))}
            </div>
        </button>
    );
};

const ContractsPage: React.FC<ContractsPageProps> = ({
    contracts, onOrderChange, isAdminMode, contractGroups,
    onSelectContract, onNewContract, onEditContract, onGroupsChange,
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSort, setSelectedSort] = useState<SortOption>('expirationDate');
    const [selectedGroup, setSelectedGroup] = useState('All');
    const [viewMode, setViewMode] = useState<ViewMode>('list');

    const filteredAndSorted = useMemo(() => {
        let result = [...contracts];
        const lowercasedTerm = searchTerm.toLowerCase();
        if (searchTerm) {
            result = result.filter(c =>
                c.name.toLowerCase().includes(lowercasedTerm) ||
                (c.contractType || '').toLowerCase().includes(lowercasedTerm) ||
                (c.employer || '').toLowerCase().includes(lowercasedTerm) ||
                (c.contractor || '').toLowerCase().includes(lowercasedTerm) ||
                (c.description || '').toLowerCase().includes(lowercasedTerm)
            );
        }
        if (selectedGroup !== 'All') {
            result = result.filter(c => c.groups?.includes(selectedGroup));
        }
        switch (selectedSort) {
            case 'name': result.sort((a, b) => a.name.localeCompare(b.name)); break;
            case 'expirationDate': result.sort((a, b) => (a.expirationDate || '9999').localeCompare(b.expirationDate || '9999')); break;
            case 'signedDate': result.sort((a, b) => (b.signedDate || '').localeCompare(a.signedDate || '')); break;
            case 'status': result.sort((a, b) => (a.status || '').localeCompare(b.status || '')); break;
        }
        return result;
    }, [contracts, searchTerm, selectedSort, selectedGroup]);

    const activeCount = contracts.filter(c => c.status === 'Active').length;
    const expiringSoon = contracts.filter(c => {
        const d = daysUntil(c.expirationDate);
        return d !== null && d > 0 && d <= 90 && c.status === 'Active';
    }).length;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Contracts</h1>
                    <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
                        {contracts.length} total, {activeCount} active
                        {expiringSoon > 0 && <span className="text-amber-500 ml-2">({expiringSoon} expiring within 90 days)</span>}
                    </p>
                </div>
                <button onClick={onNewContract} className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-opacity-90 transition-colors text-sm font-semibold">
                    <PlusIcon /> New Contract
                </button>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                    <div className="relative flex-grow">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="text" placeholder="Search contracts..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-primary text-slate-900 dark:text-white" />
                    </div>
                    <select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)} className="px-3 py-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none text-slate-900 dark:text-white">
                        <option value="All">All Groups</option>
                        {contractGroups.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                    <select value={selectedSort} onChange={e => setSelectedSort(e.target.value as SortOption)} className="px-3 py-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none text-slate-900 dark:text-white">
                        {SORT_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                    <div className="flex gap-1 border border-slate-200 dark:border-slate-600 rounded-lg p-0.5">
                        <button onClick={() => setViewMode('list')} className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-brand-primary text-white' : 'text-slate-400 hover:text-slate-600'}`}><ListIcon /></button>
                        <button onClick={() => setViewMode('tiles')} className={`p-1.5 rounded ${viewMode === 'tiles' ? 'bg-brand-primary text-white' : 'text-slate-400 hover:text-slate-600'}`}><TilesIcon /></button>
                    </div>
                </div>

                <div className="p-4">
                    {filteredAndSorted.length === 0 ? (
                        <div className="text-center py-16 text-slate-500 dark:text-gray-400">
                            <p className="text-lg">No contracts found.</p>
                            <p>Add a new contract or adjust your search.</p>
                        </div>
                    ) : viewMode === 'list' ? (
                        <div className="space-y-1">
                            <div className="grid grid-cols-12 gap-4 px-4 pb-2 text-xs font-medium text-slate-400 dark:text-gray-500 uppercase tracking-wider">
                                <div className="col-span-3">Contract</div>
                                <div className="col-span-2">Employer</div>
                                <div className="col-span-2">Expires</div>
                                <div className="col-span-2">Progress</div>
                                <div className="col-span-1 text-right">Status</div>
                                <div className="col-span-2 text-right">Groups</div>
                            </div>
                            {filteredAndSorted.map(contract => (
                                <ContractListRow key={contract.id} contract={contract} onSelect={onSelectContract} />
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredAndSorted.map(contract => (
                                <ContractCard key={contract.id} contract={contract} isAdminMode={isAdminMode} onEdit={onEditContract} onSelect={onSelectContract} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ContractsPage;
