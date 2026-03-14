import React, { useState, useMemo } from 'react';
import type { VehicleInfo } from '../types';
import VehicleGrid from './VehicleGrid';
import Button from './ui/Button';
import { ListIcon, TilesIcon, PlusIcon, SearchIcon } from './Icons';

interface VehiclesPageProps {
    vehicles: VehicleInfo[];
    onOrderChange: (activeId: string, overId: string) => void;
    isAdminMode: boolean;
    vehicleGroups: string[];
    onSelectVehicle: (id: string) => void;
    onNewVehicle: () => void;
    onEditVehicle: (vehicle: VehicleInfo) => void;
    onClearAll?: () => void;
}

type SortOption = 'expiryDate' | 'name' | 'rego';
type ViewMode = 'tiles' | 'list';

const SORT_OPTIONS = [
    { value: 'expiryDate', label: 'Expiry Date' },
    { value: 'name', label: 'Name (A-Z)' },
    { value: 'rego', label: 'Rego (A-Z)' },
];

// --- List View Row ---
const VehicleListRow: React.FC<{ vehicle: VehicleInfo; onSelect: (id: string) => void }> = ({ vehicle, onSelect }) => {
    const expiryDate = vehicle.expiryDate ? new Date(vehicle.expiryDate) : null;
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const daysLeft = expiryDate ? Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
    const isExpired = daysLeft !== null && daysLeft < 0;
    const isDueSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 30;

    return (
        <button
            onClick={() => onSelect(vehicle.id)}
            className={`w-full text-left grid grid-cols-12 gap-4 items-center px-4 py-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group border border-transparent hover:border-slate-200 dark:hover:border-slate-600 ${isExpired ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}
        >
            <div className="col-span-3 min-w-0">
                <p className="font-medium text-slate-800 dark:text-gray-200 truncate group-hover:text-brand-primary dark:group-hover:text-brand-secondary transition-colors">{vehicle.name}</p>
                <p className="text-xs text-slate-500 dark:text-gray-400">{vehicle.rego}</p>
            </div>
            <div className="col-span-3 min-w-0">
                <p className="text-sm text-slate-600 dark:text-gray-300 truncate">{[vehicle.make, vehicle.model].filter(Boolean).join(' ') || '\u2014'}</p>
            </div>
            <div className="col-span-2">
                <p className="text-sm text-slate-600 dark:text-gray-300">{vehicle.state}</p>
            </div>
            <div className="col-span-2">
                <p className="text-sm text-slate-600 dark:text-gray-300">
                    {expiryDate ? expiryDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '\u2014'}
                </p>
            </div>
            <div className="col-span-2 flex justify-end">
                {isExpired ? (
                    <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300">Expired</span>
                ) : isDueSoon ? (
                    <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300">Due Soon</span>
                ) : (
                    <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">Current</span>
                )}
            </div>
        </button>
    );
};

const VehiclesPage: React.FC<VehiclesPageProps> = ({
    vehicles, onOrderChange, isAdminMode, vehicleGroups,
    onSelectVehicle, onNewVehicle, onEditVehicle, onClearAll,
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSort, setSelectedSort] = useState<SortOption>('expiryDate');
    const [selectedGroup, setSelectedGroup] = useState('All');
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [confirmClear, setConfirmClear] = useState(false);

    const filteredVehicles = useMemo(() => {
        let filtered = [...vehicles];

        if (selectedGroup !== 'All') {
            filtered = filtered.filter(vehicle => vehicle.groups?.includes(selectedGroup));
        }

        if (searchTerm.trim()) {
            const lowercasedTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(vehicle =>
                vehicle.name.toLowerCase().includes(lowercasedTerm) ||
                vehicle.rego.toLowerCase().includes(lowercasedTerm) ||
                vehicle.state.toLowerCase().includes(lowercasedTerm) ||
                (vehicle.make || '').toLowerCase().includes(lowercasedTerm) ||
                (vehicle.model || '').toLowerCase().includes(lowercasedTerm)
            );
        }

        return filtered.sort((a, b) => {
            switch (selectedSort) {
                case 'name': return a.name.localeCompare(b.name);
                case 'rego': return a.rego.localeCompare(b.rego);
                case 'expiryDate': return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
                default: return 0;
            }
        });
    }, [vehicles, searchTerm, selectedSort, selectedGroup]);

    const selectClasses = "bg-slate-50 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition";

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Vehicle Registrations</h1>
                    <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
                        {filteredVehicles.length} vehicle{filteredVehicles.length !== 1 ? 's' : ''} across all groups.
                    </p>
                </div>
                <div className="flex items-center gap-2 self-start">
                    <div className="p-1 bg-slate-100 dark:bg-slate-700/50 rounded-lg flex items-center gap-1">
                        <Button variant={viewMode === 'list' ? 'primary' : 'ghost'} size="sm" onClick={() => setViewMode('list')} leftIcon={<ListIcon />}>List</Button>
                        <Button variant={viewMode === 'tiles' ? 'primary' : 'ghost'} size="sm" onClick={() => setViewMode('tiles')} leftIcon={<TilesIcon />}>Tiles</Button>
                    </div>
                    <Button onClick={onNewVehicle} leftIcon={<PlusIcon />}>Vehicle</Button>
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
                                placeholder="Search vehicles..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-lg pl-10 pr-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition"
                            />
                        </div>
                        <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)} className={selectClasses}>
                            <option value="All">All Groups</option>
                            {vehicleGroups.sort().map(group => <option key={group} value={group}>{group}</option>)}
                        </select>
                        <select value={selectedSort} onChange={(e) => setSelectedSort(e.target.value as SortOption)} className={selectClasses}>
                            {SORT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </div>

                    {/* Clear All */}
                    {onClearAll && vehicles.length > 0 && (
                        <div className="flex items-center gap-2 mt-3">
                            {confirmClear ? (
                                <>
                                    <span className="text-sm text-red-600 dark:text-red-400">Clear all {vehicles.length} vehicles?</span>
                                    <Button variant="danger" size="sm" onClick={() => { onClearAll(); setConfirmClear(false); }}>Yes, clear all</Button>
                                    <Button variant="ghost" size="sm" onClick={() => setConfirmClear(false)}>Cancel</Button>
                                </>
                            ) : (
                                <Button variant="outline" size="sm" onClick={() => setConfirmClear(true)} className="text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20">
                                    Clear All
                                </Button>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-5">
                    {filteredVehicles.length === 0 ? (
                        <div className="text-center py-16 text-slate-500 dark:text-gray-400">
                            <p className="text-lg">No vehicles found.</p>
                            <p>Try adjusting your search or filters.</p>
                        </div>
                    ) : viewMode === 'list' ? (
                        <div>
                            <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-slate-400 dark:text-gray-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 mb-1">
                                <div className="col-span-3">Vehicle</div>
                                <div className="col-span-3">Make / Model</div>
                                <div className="col-span-2">State</div>
                                <div className="col-span-2">Expiry</div>
                                <div className="col-span-2 text-right">Status</div>
                            </div>
                            <div className="space-y-0.5">
                                {filteredVehicles.map(v => <VehicleListRow key={v.id} vehicle={v} onSelect={onSelectVehicle} />)}
                            </div>
                        </div>
                    ) : (
                        <VehicleGrid
                            vehicles={filteredVehicles}
                            isAdminMode={isAdminMode}
                            onEdit={onEditVehicle}
                            onSelect={onSelectVehicle}
                            onOrderChange={onOrderChange}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default VehiclesPage;
