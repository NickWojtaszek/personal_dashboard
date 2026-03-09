import React, { useState, useMemo, useCallback } from 'react';
import type { AppInfo } from '../types';
import ProjectControls from './ProjectControls';
import AppGrid from './AppGrid';
import { arrayMove } from '@dnd-kit/sortable';

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

const AppsPage: React.FC<AppsPageProps> = ({ apps, onAppOrderChange, onEditApp, isAdminMode, appGroups, onNewApp, onAppGroupsChange }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSort, setSelectedSort] = useState<SortOption>('default');
    const [selectedGroup, setSelectedGroup] = useState('All');

    const filteredApps = useMemo(() => {
        let filtered;
        // If sorting by name, we need a mutable copy to sort
        if (selectedSort === 'name') {
            filtered = [...apps]; 
            filtered.sort((a, b) => a.name.localeCompare(b.name));
        } else {
            // Otherwise, we respect the user-defined order
            filtered = apps;
        }
        
        if (selectedGroup !== 'All') {
            filtered = filtered.filter(app => 
                app.groups?.includes(selectedGroup)
            );
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
        // When sorting is active, we can't reorder.
        if (selectedSort !== 'default') {
            alert("Please set sorting to 'My Order' to reorder items.");
            return;
        }
        onAppOrderChange(activeId, overId);
    }, [onAppOrderChange, selectedSort]);

    const sortOptions = [
        { value: 'default', label: 'Sort by: My Order' },
        { value: 'name', label: 'Sort by: Name (A-Z)' },
    ];

    return (
        <div className="space-y-8">
            <ProjectControls
                title="Applications"
                searchTerm={searchTerm}
                onSearchTermChange={setSearchTerm}
                selectedSort={selectedSort}
                onSortChange={(sort) => setSelectedSort(sort as SortOption)}
                selectedGroup={selectedGroup}
                onGroupChange={setSelectedGroup}
                groups={appGroups}
                isAdminMode={isAdminMode}
                onNewProject={onNewApp}
                projectCount={filteredApps.length}
                sortOptions={sortOptions}
            />
            
            <AppGrid 
                apps={filteredApps}
                isAdminMode={isAdminMode}
                onEdit={onEditApp}
                onAppOrderChange={handleOrderChange}
            />
        </div>
    );
};

export default AppsPage;
