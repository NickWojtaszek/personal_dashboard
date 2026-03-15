import React, { useState, useMemo, useCallback, useRef } from 'react';
import type { PropertyInfo } from '../types';
import PropertyGrid from './PropertyGrid';
import Button from './ui/Button';
import { ListIcon, TilesIcon, PlusIcon, SearchIcon, UploadIcon } from './Icons';
import { getCountryBorder, getCountryFlag } from '../lib/countryColors';

interface PropertiesPageProps {
    properties: PropertyInfo[];
    onOrderChange: (activeId: string, overId: string) => void;
    isAdminMode: boolean;
    propertyGroups: string[];
    onSelectProperty: (id: string) => void;
    onNewProperty: () => void;
    onEditProperty: (property: PropertyInfo) => void;
    onImportProperty: (property: PropertyInfo) => void;
}

type SortOption = 'recent' | 'oldest' | 'name';
type ViewMode = 'tiles' | 'list';

const SORT_OPTIONS = [
    { value: 'name', label: 'Name (A-Z)' },
    { value: 'recent', label: 'Most Recent' },
    { value: 'oldest', label: 'Oldest First' },
];

// --- List View Row ---
const PropertyListRow: React.FC<{ property: PropertyInfo; onSelect: (id: string) => void }> = ({ property, onSelect }) => (
    <button
        onClick={() => onSelect(property.id)}
        className={`w-full text-left grid grid-cols-12 gap-4 items-center px-4 py-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group border border-transparent hover:border-slate-200 dark:hover:border-slate-600 ${getCountryBorder(property.country)}`}
    >
        <div className="col-span-4 min-w-0">
            <p className="font-medium text-slate-800 dark:text-gray-200 truncate group-hover:text-brand-primary dark:group-hover:text-brand-secondary transition-colors">
                {property.country && <span className="mr-1.5">{getCountryFlag(property.country)}</span>}
                {property.name}
            </p>
            {property.location && <p className="text-xs text-slate-500 dark:text-gray-400 truncate">{property.location}</p>}
        </div>
        <div className="col-span-4 min-w-0">
            {property.address && <p className="text-sm text-slate-600 dark:text-gray-300 truncate">{property.address}</p>}
        </div>
        <div className="col-span-4 flex justify-end gap-1 flex-wrap">
            {property.groups?.map(g => (
                <span key={g} className="px-2 py-0.5 text-xs rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-gray-400">{g}</span>
            ))}
        </div>
    </button>
);

const PropertiesPage: React.FC<PropertiesPageProps> = ({
    properties, onOrderChange, isAdminMode, propertyGroups,
    onSelectProperty, onNewProperty, onEditProperty, onImportProperty,
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSort, setSelectedSort] = useState<SortOption>('name');
    const [selectedGroup, setSelectedGroup] = useState('All');
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const importInputRef = useRef<HTMLInputElement>(null);

    const handleImportFile = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') throw new Error("File could not be read as text.");
                const importedData: PropertyInfo = JSON.parse(text);
                if (!importedData.id || !importedData.name) {
                    alert("Error: The file does not appear to contain valid property data.");
                    return;
                }
                const existing = properties.find(p => p.id === importedData.id);
                const action = existing
                    ? `overwrite existing property "${existing.name}"`
                    : `create new property "${importedData.name}"`;
                if (window.confirm(`This will ${action} with the imported data. Continue?`)) {
                    onImportProperty(importedData);
                    alert("Property imported successfully!");
                }
            } catch (error) {
                console.error("Failed to parse imported JSON file:", error);
                alert("Error: The selected file is not a valid JSON file or is corrupted.");
            } finally {
                if (importInputRef.current) importInputRef.current.value = '';
            }
        };
        reader.readAsText(file);
    }, [properties, onImportProperty]);

    const filteredProperties = useMemo(() => {
        let filtered = [...properties];

        if (selectedGroup !== 'All') {
            filtered = filtered.filter(property => property.groups?.includes(selectedGroup));
        }

        if (searchTerm.trim()) {
            const lowercasedTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(property =>
                property.name.toLowerCase().includes(lowercasedTerm) ||
                property.location.toLowerCase().includes(lowercasedTerm)
            );
        }

        const indexedProperties = properties.map((p, index) => ({ ...p, originalIndex: index }));

        return filtered.sort((a, b) => {
            switch (selectedSort) {
                case 'name': return a.name.localeCompare(b.name);
                case 'recent':
                    const bIndex = indexedProperties.find(p => p.id === b.id)?.originalIndex ?? -1;
                    const aIndex = indexedProperties.find(p => p.id === a.id)?.originalIndex ?? -1;
                    return bIndex - aIndex;
                case 'oldest':
                    const aIndexOld = indexedProperties.find(p => p.id === a.id)?.originalIndex ?? -1;
                    const bIndexOld = indexedProperties.find(p => p.id === b.id)?.originalIndex ?? -1;
                    return aIndexOld - bIndexOld;
                default: return 0;
            }
        });
    }, [properties, searchTerm, selectedSort, selectedGroup]);

    const selectClasses = "bg-slate-50 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition";

    return (
        <>
        <input type="file" ref={importInputRef} className="hidden" accept="application/json" onChange={handleImportFile} />
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Owned Properties</h1>
                    <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
                        {filteredProperties.length} propert{filteredProperties.length === 1 ? 'y' : 'ies'} across all groups.
                    </p>
                </div>
                <div className="flex items-center gap-2 self-start">
                    <div className="p-1 bg-slate-100 dark:bg-slate-700/50 rounded-lg flex items-center gap-1">
                        <Button variant={viewMode === 'list' ? 'primary' : 'ghost'} size="sm" onClick={() => setViewMode('list')} leftIcon={<ListIcon />}>List</Button>
                        <Button variant={viewMode === 'tiles' ? 'primary' : 'ghost'} size="sm" onClick={() => setViewMode('tiles')} leftIcon={<TilesIcon />}>Tiles</Button>
                    </div>
                    <Button variant="secondary" size="md" onClick={() => importInputRef.current?.click()} leftIcon={<UploadIcon />}>Import</Button>
                    <Button onClick={onNewProperty} leftIcon={<PlusIcon />}>Property</Button>
                </div>
            </div>

            {/* Content card */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                <div className="p-5 border-b border-slate-200 dark:border-slate-700">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <SearchIcon className="w-5 h-5 text-slate-400 dark:text-gray-500" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search properties..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-lg pl-10 pr-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition"
                            />
                        </div>
                        <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)} className={selectClasses}>
                            <option value="All">All Groups</option>
                            {propertyGroups.sort().map(group => <option key={group} value={group}>{group}</option>)}
                        </select>
                        <select value={selectedSort} onChange={(e) => setSelectedSort(e.target.value as SortOption)} className={selectClasses}>
                            {SORT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </div>
                </div>

                <div className="p-5">
                    {filteredProperties.length === 0 ? (
                        <div className="text-center py-16 text-slate-500 dark:text-gray-400">
                            <p className="text-lg">No properties found.</p>
                            <p>Try adjusting your search or filters.</p>
                        </div>
                    ) : viewMode === 'list' ? (
                        <div>
                            <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-slate-400 dark:text-gray-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 mb-1">
                                <div className="col-span-4">Name</div>
                                <div className="col-span-4">Address</div>
                                <div className="col-span-4 text-right">Groups</div>
                            </div>
                            <div className="space-y-0.5">
                                {filteredProperties.map(p => <PropertyListRow key={p.id} property={p} onSelect={onSelectProperty} />)}
                            </div>
                        </div>
                    ) : (
                        <PropertyGrid
                            properties={filteredProperties}
                            isAdminMode={isAdminMode}
                            onEdit={onEditProperty}
                            onSelect={onSelectProperty}
                            onOrderChange={onOrderChange}
                        />
                    )}
                </div>
            </div>
        </div>
        </>
    );
};

export default PropertiesPage;
