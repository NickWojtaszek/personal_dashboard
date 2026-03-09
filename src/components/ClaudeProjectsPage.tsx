
import React, { useState, useMemo, useCallback } from 'react';
import type { ProjectInfo } from '../types';
import ProjectControls from './ProjectControls';
import ProjectGrid from './ProjectGrid';
import EditProjectModal from './EditProjectModal';
import { arrayMove } from '@dnd-kit/sortable';
import { v4 as uuidv4 } from 'uuid';

interface ClaudeProjectsPageProps {
    projects: ProjectInfo[];
    onProjectsChange: (projects: ProjectInfo[]) => void;
    isAdminMode: boolean;
    projectGroups: string[];
    onProjectGroupsChange: (groups: string[]) => void;
}

type SortOption = 'recent' | 'oldest' | 'name';

const parseTime = (timeString: string): number => {
    const now = new Date().getTime();
    if (!timeString) return now;
    const parts = timeString.split(' ');
    if (parts.length < 3 || parts[parts.length - 1] !== 'ago') return now; 

    const value = parseInt(parts[0], 10);
    if (isNaN(value)) return now;
    
    const unit = parts[1];

    let multiplier = 0;
    if (unit.startsWith('hour')) multiplier = 60 * 60 * 1000;
    else if (unit.startsWith('day')) multiplier = 24 * 60 * 60 * 1000;
    else if (unit.startsWith('week')) multiplier = 7 * 24 * 60 * 60 * 1000;
    else if (unit.startsWith('month')) multiplier = 30 * 24 * 60 * 60 * 1000;

    return now - (value * multiplier);
};

const ClaudeProjectsPage: React.FC<ClaudeProjectsPageProps> = ({ projects, onProjectsChange, isAdminMode, projectGroups, onProjectGroupsChange }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSort, setSelectedSort] = useState<SortOption>('recent');
    const [selectedGroup, setSelectedGroup] = useState('All');
    const [editingProject, setEditingProject] = useState<ProjectInfo | null>(null);

    const filteredProjects = useMemo(() => {
        let filtered = [...projects];
        
        if (selectedGroup !== 'All') {
            filtered = filtered.filter(project => 
                project.groups?.includes(selectedGroup)
            );
        }
        
        if (searchTerm.trim()) {
            const lowercasedTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(project =>
                project.name.toLowerCase().includes(lowercasedTerm) ||
                project.description?.toLowerCase().includes(lowercasedTerm)
            );
        }
        
        return filtered.sort((a, b) => {
            switch (selectedSort) {
                case 'name': return a.name.localeCompare(b.name);
                case 'recent': return parseTime(b.lastUpdated) - parseTime(a.lastUpdated);
                case 'oldest': return parseTime(a.lastUpdated) - parseTime(b.lastUpdated);
                default: return 0;
            }
        });
    }, [projects, searchTerm, selectedSort, selectedGroup]);

    const handleNewProject = useCallback(() => {
        setEditingProject({
            id: uuidv4(),
            name: '',
            url: '',
            description: '',
            lastUpdated: '1 hour ago',
            groups: [],
        });
    }, []);

    const handleEditProject = useCallback((project: ProjectInfo) => {
        setEditingProject(project);
    }, []);

    const handleSaveProject = useCallback((projectToSave: ProjectInfo) => {
        const existing = projects.find(p => p.id === projectToSave.id);
        let newProjects;
        if(existing) {
             newProjects = projects.map(p => p.id === projectToSave.id ? projectToSave : p);
        } else {
            newProjects = [projectToSave, ...projects];
        }
        onProjectsChange(newProjects);
        setEditingProject(null);
    }, [projects, onProjectsChange]);

    const handleOrderChange = useCallback((activeId: string, overId: string) => {
        const oldIndex = projects.findIndex(p => p.id === activeId);
        const newIndex = projects.findIndex(p => p.id === overId);
        if (oldIndex !== -1 && newIndex !== -1) {
            onProjectsChange(arrayMove(projects, oldIndex, newIndex));
        }
    }, [projects, onProjectsChange]);

    return (
        <div className="space-y-8">
            <ProjectControls
                title="Claude Projects"
                searchTerm={searchTerm}
                onSearchTermChange={setSearchTerm}
                selectedSort={selectedSort}
                onSortChange={setSelectedSort}
                selectedGroup={selectedGroup}
                onGroupChange={setSelectedGroup}
                groups={projectGroups}
                isAdminMode={isAdminMode}
                onNewProject={handleNewProject}
                projectCount={filteredProjects.length}
            />
            
            <ProjectGrid 
                projects={filteredProjects}
                isAdminMode={isAdminMode}
                onEdit={handleEditProject}
                onOrderChange={handleOrderChange}
            />
            
            {editingProject && (
                <EditProjectModal 
                    project={editingProject}
                    onSave={handleSaveProject}
                    onClose={() => setEditingProject(null)}
                    allGroups={projectGroups}
                    onGroupsChange={onProjectGroupsChange}
                />
            )}
        </div>
    );
};

export default ClaudeProjectsPage;