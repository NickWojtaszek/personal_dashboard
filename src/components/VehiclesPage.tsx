import React, { useState, useMemo } from 'react';
import type { VehicleInfo } from '../types';
import ProjectControls from './ProjectControls';
import VehicleGrid from './VehicleGrid';

interface VehiclesPageProps {
    vehicles: VehicleInfo[];
    onOrderChange: (activeId: string, overId: string) => void;
    isAdminMode: boolean;
    vehicleGroups: string[];
    onSelectVehicle: (id: string) => void;
    onNewVehicle: () => void;
    onEditVehicle: (vehicle: VehicleInfo) => void;
}

type SortOption = 'expiryDate' | 'name' | 'rego';

const VehiclesPage: React.FC<VehiclesPageProps> = ({ 
    vehicles, 
    onOrderChange, 
    isAdminMode, 
    vehicleGroups, 
    onSelectVehicle,
    onNewVehicle,
    onEditVehicle,
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSort, setSelectedSort] = useState<SortOption>('expiryDate');
    const [selectedGroup, setSelectedGroup] = useState('All');

    const sortOptions = [
        { value: 'expiryDate', label: 'Sort by: Expiry Date' },
        { value: 'name', label: 'Sort by: Name (A-Z)' },
        { value: 'rego', label: 'Sort by: Rego (A-Z)' },
    ];

    const filteredVehicles = useMemo(() => {
        let filtered = [...vehicles];
        
        if (selectedGroup !== 'All') {
            filtered = filtered.filter(vehicle => 
                vehicle.groups?.includes(selectedGroup)
            );
        }
        
        if (searchTerm.trim()) {
            const lowercasedTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(vehicle =>
                vehicle.name.toLowerCase().includes(lowercasedTerm) ||
                vehicle.rego.toLowerCase().includes(lowercasedTerm) ||
                vehicle.state.toLowerCase().includes(lowercasedTerm)
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


    return (
        <div className="space-y-8">
            <ProjectControls
                title="Vehicle Registrations"
                searchTerm={searchTerm}
                onSearchTermChange={setSearchTerm}
                selectedSort={selectedSort}
                onSortChange={(sort) => setSelectedSort(sort as SortOption)}
                selectedGroup={selectedGroup}
                onGroupChange={setSelectedGroup}
                groups={vehicleGroups}
                isAdminMode={isAdminMode}
                onNewProject={onNewVehicle}
                projectCount={filteredVehicles.length}
                sortOptions={sortOptions}
            />
            
            <VehicleGrid 
                vehicles={filteredVehicles}
                isAdminMode={isAdminMode}
                onEdit={onEditVehicle}
                onSelect={onSelectVehicle}
                onOrderChange={onOrderChange}
            />
        </div>
    );
};

export default VehiclesPage;
