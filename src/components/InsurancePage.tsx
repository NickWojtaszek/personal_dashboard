import React, { useState, useMemo } from 'react';
import type { InsuranceInfo } from '../types';
import InsuranceGrid from './InsuranceGrid';
import PolicyProgressBar from './insurance-detail/PolicyProgressBar';
import Button from './ui/Button';
import { ListIcon, PlusIcon, TilesIcon, SearchIcon } from './Icons';
import { getStatusColor, formatCurrency as fmtCurrency } from '../lib/formatting';

interface InsurancePageProps {
    policies: InsuranceInfo[];
    onOrderChange: (activeId: string, overId: string) => void;
    isAdminMode: boolean;
    insuranceGroups: string[];
    onSelectPolicy: (id: string) => void;
    onNewPolicy: () => void;
    onEditPolicy: (policy: InsuranceInfo) => void;
    onClearAll?: () => void;
}

type SortOption = 'name' | 'recent' | 'oldest' | 'type' | 'due_date';
type ViewMode = 'tiles' | 'list';

const SORT_OPTIONS = [
    { value: 'name', label: 'Name (A-Z)' },
    { value: 'recent', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'type', label: 'Policy Type' },
    { value: 'due_date', label: 'Due Date' },
];

// Insurance page uses 2-decimal currency formatting
const formatCurrency = (amount?: number, currency?: string) => fmtCurrency(amount, currency, { decimals: 2 });

// --- List View Row ---
const InsuranceListRow: React.FC<{
    policy: InsuranceInfo;
    onSelect: (id: string) => void;
}> = ({ policy, onSelect }) => (
    <button
        onClick={() => onSelect(policy.id)}
        className="w-full text-left grid grid-cols-12 gap-4 items-center px-4 py-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group border border-transparent hover:border-slate-200 dark:hover:border-slate-600"
    >
        <div className="col-span-3 min-w-0">
            <p className="font-medium text-slate-800 dark:text-gray-200 truncate group-hover:text-brand-primary dark:group-hover:text-brand-secondary transition-colors">{policy.name}</p>
            <p className="text-xs text-slate-500 dark:text-gray-400 truncate">{policy.provider || '\u2014'}</p>
        </div>
        <div className="col-span-2">
            <p className="text-sm text-slate-600 dark:text-gray-300 truncate">{policy.policyType || '\u2014'}</p>
        </div>
        <div className="col-span-2 text-right">
            <p className="text-sm font-medium text-slate-700 dark:text-gray-200">{formatCurrency(policy.premiumAmount, policy.currency)}</p>
            <p className="text-xs text-slate-400 dark:text-gray-500">{policy.paymentFrequency || ''}</p>
        </div>
        <div className="col-span-4">
            <PolicyProgressBar startDate={policy.startDate} endDate={policy.endDate} variant="full" />
        </div>
        <div className="col-span-1 flex justify-end">
            {policy.status && (
                <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${getStatusColor(policy.status)}`}>
                    {policy.status}
                </span>
            )}
        </div>
    </button>
);

// --- List View Section ---
const InsuranceListSection: React.FC<{
    title: string;
    policies: InsuranceInfo[];
    onSelect: (id: string) => void;
}> = ({ title, policies, onSelect }) => {
    if (policies.length === 0) return null;
    return (
        <section>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-gray-200 mb-4">{title}</h3>
            <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-slate-400 dark:text-gray-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 mb-1">
                <div className="col-span-3">Policy</div>
                <div className="col-span-2">Type</div>
                <div className="col-span-2 text-right">Premium</div>
                <div className="col-span-4">Timeline</div>
                <div className="col-span-1 text-right">Status</div>
            </div>
            <div className="space-y-0.5">
                {policies.map(p => <InsuranceListRow key={p.id} policy={p} onSelect={onSelect} />)}
            </div>
        </section>
    );
};

// --- Tiles Section ---
const InsuranceGroupSection: React.FC<{
    title: string;
    policies: InsuranceInfo[];
    isAdminMode: boolean;
    onEdit: (policy: InsuranceInfo) => void;
    onSelect: (id: string) => void;
    onOrderChange: (activeId: string, overId: string) => void;
}> = ({ title, policies, ...gridProps }) => {
    if (policies.length === 0) return null;
    return (
        <section>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-gray-200 mb-6">{title}</h3>
            <InsuranceGrid policies={policies} {...gridProps} />
        </section>
    );
};

const InsurancePage: React.FC<InsurancePageProps> = ({
    policies,
    onOrderChange,
    isAdminMode,
    insuranceGroups,
    onSelectPolicy,
    onNewPolicy,
    onEditPolicy,
    onClearAll,
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSort, setSelectedSort] = useState<SortOption>('name');
    const [selectedGroup, setSelectedGroup] = useState('All');
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [confirmClear, setConfirmClear] = useState(false);

    const filteredPolicies = useMemo(() => {
        let filtered = [...policies];

        if (selectedGroup !== 'All') {
            filtered = filtered.filter(policy =>
                policy.groups?.includes(selectedGroup)
            );
        }

        if (searchTerm.trim()) {
            const lowercasedTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(policy =>
                policy.name.toLowerCase().includes(lowercasedTerm) ||
                policy.provider.toLowerCase().includes(lowercasedTerm) ||
                (policy.policyType || '').toLowerCase().includes(lowercasedTerm)
            );
        }

        const statusOrder: Record<string, number> = { Active: 0, Pending: 1, Expired: 2 };
        const getStatusOrder = (p: InsuranceInfo) => statusOrder[p.status || ''] ?? 1;
        const getEndTime = (p: InsuranceInfo) => p.endDate ? new Date(p.endDate).getTime() : 0;

        return filtered.sort((a, b) => {
            const statusDiff = getStatusOrder(a) - getStatusOrder(b);
            if (statusDiff !== 0) return statusDiff;

            switch (selectedSort) {
                case 'name': return a.name.localeCompare(b.name);
                case 'recent': return getEndTime(b) - getEndTime(a);
                case 'oldest': return getEndTime(a) - getEndTime(b);
                case 'type': return (a.policyType || '').localeCompare(b.policyType || '');
                case 'due_date': return getEndTime(a) - getEndTime(b);
                default: return 0;
            }
        });
    }, [policies, searchTerm, selectedSort, selectedGroup]);

    const { homePolicies, vehiclePolicies, lifeHealthPolicies, otherPolicies } = useMemo(() => {
        const homePolicies: InsuranceInfo[] = [];
        const vehiclePolicies: InsuranceInfo[] = [];
        const lifeHealthPolicies: InsuranceInfo[] = [];
        const otherPolicies: InsuranceInfo[] = [];

        filteredPolicies.forEach(policy => {
            const groups = policy.groups || [];
            if (groups.includes('Property')) {
                homePolicies.push(policy);
            } else if (groups.includes('Vehicle')) {
                vehiclePolicies.push(policy);
            } else if (groups.includes('Life') || groups.includes('Health')) {
                lifeHealthPolicies.push(policy);
            } else {
                otherPolicies.push(policy);
            }
        });

        return { homePolicies, vehiclePolicies, lifeHealthPolicies, otherPolicies };
    }, [filteredPolicies]);

    const gridProps = {
        isAdminMode,
        onEdit: onEditPolicy,
        onSelect: onSelectPolicy,
        onOrderChange,
    };

    const selectClasses = "bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition";

    const renderContent = () => {
        if (filteredPolicies.length === 0) {
            return (
                <div className="text-center py-16 text-slate-500 dark:text-gray-400">
                    <p className="text-lg">No policies found.</p>
                    <p>Try adjusting your search or filters.</p>
                </div>
            );
        }

        if (viewMode === 'list') {
            return (
                <div className="space-y-8">
                    <InsuranceListSection title="Home Insurance" policies={homePolicies} onSelect={onSelectPolicy} />
                    <InsuranceListSection title="Vehicle Insurance" policies={vehiclePolicies} onSelect={onSelectPolicy} />
                    <InsuranceListSection title="Life & Health Insurance" policies={lifeHealthPolicies} onSelect={onSelectPolicy} />
                    <InsuranceListSection title="Other Insurance" policies={otherPolicies} onSelect={onSelectPolicy} />
                </div>
            );
        }

        return (
            <div className="space-y-12">
                <InsuranceGroupSection title="Home Insurance" policies={homePolicies} {...gridProps} />
                <InsuranceGroupSection title="Vehicle Insurance" policies={vehiclePolicies} {...gridProps} />
                <InsuranceGroupSection title="Life & Health Insurance" policies={lifeHealthPolicies} {...gridProps} />
                <InsuranceGroupSection title="Other Insurance" policies={otherPolicies} {...gridProps} />
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header — matches dashboard pattern */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Insurance Policies</h1>
                    <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
                        {filteredPolicies.length} polic{filteredPolicies.length === 1 ? 'y' : 'ies'} across all categories.
                    </p>
                </div>
                <div className="flex items-center gap-2 self-start">
                    <div className="p-1 bg-slate-100 dark:bg-slate-700/50 rounded-lg flex items-center gap-1">
                        <Button
                            variant={viewMode === 'list' ? 'primary' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('list')}
                            leftIcon={<ListIcon />}
                        >
                            List
                        </Button>
                        <Button
                            variant={viewMode === 'tiles' ? 'primary' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('tiles')}
                            leftIcon={<TilesIcon />}
                        >
                            Tiles
                        </Button>
                    </div>
                    <Button onClick={onNewPolicy} leftIcon={<PlusIcon />}>
                        Policy
                    </Button>
                </div>
            </div>

            {/* Content card */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                {/* Search, filter, sort bar */}
                <div className="p-5 border-b border-slate-200 dark:border-slate-700">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="relative md:col-span-2">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <SearchIcon className="w-5 h-5 text-slate-400 dark:text-gray-500" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search policies..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-lg pl-10 pr-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition"
                            />
                        </div>
                        <select
                            value={selectedGroup}
                            onChange={(e) => setSelectedGroup(e.target.value)}
                            className={selectClasses}
                        >
                            <option value="All">All Groups</option>
                            {insuranceGroups.sort().map(group => (
                                <option key={group} value={group}>{group}</option>
                            ))}
                        </select>
                        <select
                            value={selectedSort}
                            onChange={(e) => setSelectedSort(e.target.value as SortOption)}
                            className={selectClasses}
                        >
                            {SORT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </div>

                    {/* Clear All (admin action) */}
                    {onClearAll && policies.length > 0 && (
                        <div className="flex items-center gap-2 mt-3">
                            {confirmClear ? (
                                <>
                                    <span className="text-sm text-red-600 dark:text-red-400">Clear all {policies.length} policies?</span>
                                    <Button variant="danger" size="sm" onClick={() => { onClearAll(); setConfirmClear(false); }}>
                                        Yes, clear all
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => setConfirmClear(false)}>
                                        Cancel
                                    </Button>
                                </>
                            ) : (
                                <Button variant="outline" size="sm" onClick={() => setConfirmClear(true)} className="text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20">
                                    Clear All
                                </Button>
                            )}
                        </div>
                    )}
                </div>

                {/* Main content */}
                <div className="p-5">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default InsurancePage;
