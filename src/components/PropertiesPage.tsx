
import React, { useState, useMemo, useCallback } from 'react';
import type { PropertyInfo } from '../types';
import ProjectControls from './ProjectControls';
import PropertyGrid from './PropertyGrid';

interface PropertiesPageProps {
    properties: PropertyInfo[];
    onOrderChange: (activeId: string, overId: string) => void;
    isAdminMode: boolean;
    propertyGroups: string[];
    onSelectProperty: (id: string) => void;
    onNewProperty: () => void;
    onEditProperty: (property: PropertyInfo) => void;
}

type SortOption = 'recent' | 'oldest' | 'name';

const PropertiesPage: React.FC<PropertiesPageProps> = ({ 
    properties, 
    onOrderChange, 
    isAdminMode, 
    propertyGroups, 
    onSelectProperty,
    onNewProperty,
    onEditProperty,
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSort, setSelectedSort] = useState<SortOption>('name');
    const [selectedGroup, setSelectedGroup] = useState('All');

    const filteredProperties = useMemo(() => {
        let filtered = [...properties];
        
        if (selectedGroup !== 'All') {
            filtered = filtered.filter(property => 
                property.groups?.includes(selectedGroup)
            );
        }
        
        if (searchTerm.trim()) {
            const lowercasedTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(property =>
                property.name.toLowerCase().includes(lowercasedTerm) ||
                property.location.toLowerCase().includes(lowercasedTerm)
            );
        }
        
        // Create a stable sort based on original order for non-name sorts
        const indexedProperties = properties.map((p, index) => ({...p, originalIndex: index}));

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


    return (
        <div className="space-y-8">
            <ProjectControls
                title="Owned Properties"
                searchTerm={searchTerm}
                onSearchTermChange={setSearchTerm}
                selectedSort={selectedSort as any}
                onSortChange={setSelectedSort as any}
                selectedGroup={selectedGroup}
                onGroupChange={setSelectedGroup}
                groups={propertyGroups}
                isAdminMode={isAdminMode}
                onNewProject={onNewProperty}
                projectCount={filteredProperties.length}
            />
            
            <PropertyGrid 
                properties={filteredProperties}
                isAdminMode={isAdminMode}
                onEdit={onEditProperty}
                onSelect={onSelectProperty}
                onOrderChange={onOrderChange}
            />
        </div>
    );
};

export default PropertiesPage;
