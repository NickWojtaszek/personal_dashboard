import React, { useState, useMemo, useCallback } from 'react';
import type { AppInfo } from '../types';
import AppGrid from './AppGrid';
import Button from './ui/Button';
import { ListIcon, TilesIcon, PlusIcon, SearchIcon } from './Icons';

interface AppsPageProps {
    apps: AppInfo[];
    onAppOrderChange: (activeId: string, overId: string) => void;
    isAdminMode: boolean;
    appGroups: string[];
    onAppGroupsChange: (groups: string[]) => void;
    onEditApp: (app: AppInfo) => void;
    onNewApp: () => void;
}

type SortOption = 'name' | 'default';
type ViewMode = 'tiles' | 'list';

const SORT_OPTIONS = [
    { value: 'default', label: 'My Order' },
    { value: 'name', label: 'Name (A-Z)' },
];

// --- List View Row ---
const AppListRow: React.FC<{ app: AppInfo; onEdit: (app: AppInfo) => void }> = ({ app, onEdit }) => (
    <button
        onClick={() => app.url ? window.open(app.url, '_blank') : onEdit(app)}
        className="w-full text-left grid grid-cols-12 gap-4 items-center px-4 py-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group border border-transparent hover:border-slate-200 dark:hover:border-slate-600"
    >
        <div className="col-span-5 min-w-0">
            <p className="font-medium text-slate-800 dark:text-gray-200 truncate group-hover:text-brand-primary dark:group-hover:text-brand-secondary transition-colors">{app.name}</p>
            {app.description && <p className="text-xs text-slate-500 dark:text-gray-400 truncate">{app.description}</p>}
        </div>
        <div className="col-span-4 min-w-0">
            {app.url && <p className="text-xs text-slate-400 dark:text-gray-500 truncate">{app.url}</p>}
        </div>
        <div className="col-span-3 flex justify-end gap-1 flex-wrap">
            {app.groups?.map(g => (
                <span key={g} className="px-2 py-0.5 text-xs rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-gray-400">{g}</span>
            ))}
        </div>
    </button>
);

const AppsPage: React.FC<AppsPageProps> = ({ apps, onAppOrderChange, onEditApp, isAdminMode, appGroups, onNewApp }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSort, setSelectedSort] = useState<SortOption>('default');
    const [selectedGroup, setSelectedGroup] = useState('All');
    const [viewMode, setViewMode] = useState<ViewMode>('list');

    const filteredApps = useMemo(() => {
        let filtered;
        if (selectedSort === 'name') {
            filtered = [...apps];
            filtered.sort((a, b) => a.name.localeCompare(b.name));
        } else {
            filtered = apps;
        }

        if (selectedGroup !== 'All') {
            filtered = filtered.filter(app => app.groups?.includes(selectedGroup));
        }

        if (searchTerm.trim()) {
            const lowercasedTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(app =>
                app.name.toLowerCase().includes(lowercasedTerm) ||
                app.description?.toLowerCase().includes(lowercasedTerm)
            );
        }

        return filtered;
    }, [apps, searchTerm, selectedSort, selectedGroup]);

    const handleOrderChange = useCallback((activeId: string, overId: string) => {
        if (selectedSort !== 'default') {
            alert("Please set sorting to 'My Order' to reorder items.");
            return;
        }
        onAppOrderChange(activeId, overId);
    }, [onAppOrderChange, selectedSort]);

    const selectClasses = "bg-slate-50 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition";

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Applications</h1>
                    <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
                        {filteredApps.length} app{filteredApps.length !== 1 ? 's' : ''} across all groups.
                    </p>
                </div>
                <div className="flex items-center gap-2 self-start">
                    <div className="p-1 bg-slate-100 dark:bg-slate-700/50 rounded-lg flex items-center gap-1">
                        <Button variant={viewMode === 'list' ? 'primary' : 'ghost'} size="sm" onClick={() => setViewMode('list')} leftIcon={<ListIcon />}>List</Button>
                        <Button variant={viewMode === 'tiles' ? 'primary' : 'ghost'} size="sm" onClick={() => setViewMode('tiles')} leftIcon={<TilesIcon />}>Tiles</Button>
                    </div>
                    <Button onClick={onNewApp} leftIcon={<PlusIcon />}>App</Button>
                </div>
            </div>

            {/* Content card */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                {/* Search, filter, sort bar */}
                <div className="p-5 border-b border-slate-200 dark:border-slate-700">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <SearchIcon className="w-5 h-5 text-slate-400 dark:text-gray-500" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search apps..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-lg pl-10 pr-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition"
                            />
                        </div>
                        <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)} className={selectClasses}>
                            <option value="All">All Groups</option>
                            {appGroups.sort().map(group => <option key={group} value={group}>{group}</option>)}
                        </select>
                        <select value={selectedSort} onChange={(e) => setSelectedSort(e.target.value as SortOption)} className={selectClasses}>
                            {SORT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </div>
                </div>

                {/* Content */}
                <div className="p-5">
                    {filteredApps.length === 0 ? (
                        <div className="text-center py-16 text-slate-500 dark:text-gray-400">
                            <p className="text-lg">No apps found.</p>
                            <p>Try adjusting your search or filters.</p>
                        </div>
                    ) : viewMode === 'list' ? (
                        <div>
                            <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-slate-400 dark:text-gray-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 mb-1">
                                <div className="col-span-5">Name</div>
                                <div className="col-span-4">URL</div>
                                <div className="col-span-3 text-right">Groups</div>
                            </div>
                            <div className="space-y-0.5">
                                {filteredApps.map(app => <AppListRow key={app.id} app={app} onEdit={onEditApp} />)}
                            </div>
                        </div>
                    ) : (
                        <AppGrid
                            apps={filteredApps}
                            isAdminMode={isAdminMode}
                            onEdit={onEditApp}
                            onAppOrderChange={handleOrderChange}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default AppsPage;
