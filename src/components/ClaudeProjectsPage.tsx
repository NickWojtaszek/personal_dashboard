import React, { useState, useMemo, useCallback } from 'react';
import type { ProjectInfo } from '../types';
import ProjectGrid from './ProjectGrid';
import EditProjectModal from './EditProjectModal';
import { arrayMove } from '@dnd-kit/sortable';
import { v4 as uuidv4 } from 'uuid';
import Button from './ui/Button';
import { ListIcon, TilesIcon, PlusIcon, SearchIcon } from './Icons';

interface ClaudeProjectsPageProps {
    projects: ProjectInfo[];
    onProjectsChange: (projects: ProjectInfo[]) => void;
    isAdminMode: boolean;
    projectGroups: string[];
    onProjectGroupsChange: (groups: string[]) => void;
}

type SortOption = 'recent' | 'oldest' | 'name';
type ViewMode = 'tiles' | 'list';

const SORT_OPTIONS = [
    { value: 'recent', label: 'Most Recent' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'name', label: 'Name (A-Z)' },
];

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

// --- List View Row ---
const ProjectListRow: React.FC<{ project: ProjectInfo; onEdit: (p: ProjectInfo) => void }> = ({ project, onEdit }) => (
    <button
        onClick={() => project.url ? window.open(project.url, '_blank') : onEdit(project)}
        className="w-full text-left grid grid-cols-12 gap-4 items-center px-4 py-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group border border-transparent hover:border-slate-200 dark:hover:border-slate-600"
    >
        <div className="col-span-4 min-w-0">
            <p className="font-medium text-slate-800 dark:text-gray-200 truncate group-hover:text-brand-primary dark:group-hover:text-brand-secondary transition-colors">{project.name}</p>
            {project.description && <p className="text-xs text-slate-500 dark:text-gray-400 truncate">{project.description}</p>}
        </div>
        <div className="col-span-4 min-w-0">
            {project.url && <p className="text-xs text-slate-400 dark:text-gray-500 truncate">{project.url}</p>}
        </div>
        <div className="col-span-2">
            <p className="text-sm text-slate-500 dark:text-gray-400">{project.lastUpdated || '\u2014'}</p>
        </div>
        <div className="col-span-2 flex justify-end gap-1 flex-wrap">
            {project.groups?.map(g => (
                <span key={g} className="px-2 py-0.5 text-xs rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-gray-400">{g}</span>
            ))}
        </div>
    </button>
);

const ClaudeProjectsPage: React.FC<ClaudeProjectsPageProps> = ({ projects, onProjectsChange, isAdminMode, projectGroups, onProjectGroupsChange }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSort, setSelectedSort] = useState<SortOption>('recent');
    const [selectedGroup, setSelectedGroup] = useState('All');
    const [editingProject, setEditingProject] = useState<ProjectInfo | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('list');

    const filteredProjects = useMemo(() => {
        let filtered = [...projects];

        if (selectedGroup !== 'All') {
            filtered = filtered.filter(project => project.groups?.includes(selectedGroup));
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
        setEditingProject({ id: uuidv4(), name: '', url: '', description: '', lastUpdated: '1 hour ago', groups: [] });
    }, []);

    const handleEditProject = useCallback((project: ProjectInfo) => {
        setEditingProject(project);
    }, []);

    const handleSaveProject = useCallback((projectToSave: ProjectInfo) => {
        const existing = projects.find(p => p.id === projectToSave.id);
        const newProjects = existing
            ? projects.map(p => p.id === projectToSave.id ? projectToSave : p)
            : [projectToSave, ...projects];
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

    const selectClasses = "bg-slate-50 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition";

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Claude Projects</h1>
                    <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
                        {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''} across all groups.
                    </p>
                </div>
                <div className="flex items-center gap-2 self-start">
                    <div className="p-1 bg-slate-100 dark:bg-slate-700/50 rounded-lg flex items-center gap-1">
                        <Button variant={viewMode === 'list' ? 'primary' : 'ghost'} size="sm" onClick={() => setViewMode('list')} leftIcon={<ListIcon />}>List</Button>
                        <Button variant={viewMode === 'tiles' ? 'primary' : 'ghost'} size="sm" onClick={() => setViewMode('tiles')} leftIcon={<TilesIcon />}>Tiles</Button>
                    </div>
                    <Button onClick={handleNewProject} leftIcon={<PlusIcon />}>Project</Button>
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
                                placeholder="Search projects..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-lg pl-10 pr-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition"
                            />
                        </div>
                        <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)} className={selectClasses}>
                            <option value="All">All Groups</option>
                            {projectGroups.sort().map(group => <option key={group} value={group}>{group}</option>)}
                        </select>
                        <select value={selectedSort} onChange={(e) => setSelectedSort(e.target.value as SortOption)} className={selectClasses}>
                            {SORT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </div>
                </div>

                <div className="p-5">
                    {filteredProjects.length === 0 ? (
                        <div className="text-center py-16 text-slate-500 dark:text-gray-400">
                            <p className="text-lg">No projects found.</p>
                            <p>Try adjusting your search or filters.</p>
                        </div>
                    ) : viewMode === 'list' ? (
                        <div>
                            <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-slate-400 dark:text-gray-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 mb-1">
                                <div className="col-span-4">Name</div>
                                <div className="col-span-4">URL</div>
                                <div className="col-span-2">Updated</div>
                                <div className="col-span-2 text-right">Groups</div>
                            </div>
                            <div className="space-y-0.5">
                                {filteredProjects.map(p => <ProjectListRow key={p.id} project={p} onEdit={handleEditProject} />)}
                            </div>
                        </div>
                    ) : (
                        <ProjectGrid
                            projects={filteredProjects}
                            isAdminMode={isAdminMode}
                            onEdit={handleEditProject}
                            onOrderChange={handleOrderChange}
                        />
                    )}
                </div>
            </div>

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
