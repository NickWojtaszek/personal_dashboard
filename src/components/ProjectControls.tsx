

import React from 'react';

interface ProjectControlsProps {
    title: string;
    searchTerm: string;
    onSearchTermChange: (term: string) => void;
    selectedSort: string;
    onSortChange: (sort: string) => void;
    selectedGroup: string;
    onGroupChange: (group: string) => void;
    groups: string[];
    isAdminMode: boolean;
    onNewProject: () => void;
    projectCount: number;
    sortOptions?: { value: string; label: string }[];
}

const SearchIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-slate-400 dark:text-gray-500"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>);
const PlusIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>);

const ProjectControls: React.FC<ProjectControlsProps> = ({
    title, searchTerm, onSearchTermChange,
    selectedSort, onSortChange,
    selectedGroup, onGroupChange,
    groups, isAdminMode, onNewProject, projectCount,
    sortOptions
}) => {
    const commonSelectClasses = "bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition text-sm";
    
    return (
        <div className="space-y-4">
             <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                 <h2 className="text-2xl font-bold">{title} ({projectCount})</h2>
                  <div title={!isAdminMode ? "Enable Admin Mode to add items" : ""}>
                    <button
                        onClick={onNewProject}
                        disabled={!isAdminMode}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-brand-primary text-white font-semibold hover:bg-opacity-90 transition-colors disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed"
                    >
                        <PlusIcon />
                        New Item
                    </button>
                </div>
             </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative md:col-span-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <SearchIcon />
                    </div>
                    <input
                        type="text"
                        placeholder="Search items..."
                        value={searchTerm}
                        onChange={(e) => onSearchTermChange(e.target.value)}
                        className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg pl-10 pr-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition"
                    />
                </div>
                
                <div className="grid grid-cols-2 gap-4 md:col-span-2">
                    <select
                        value={selectedGroup}
                        onChange={(e) => onGroupChange(e.target.value)}
                        className={commonSelectClasses}
                    >
                        <option value="All">All Groups</option>
                        {groups.sort().map(group => (
                            <option key={group} value={group}>{group}</option>
                        ))}
                    </select>
                    
                    <select
                        value={selectedSort}
                        onChange={(e) => onSortChange(e.target.value as any)}
                        className={commonSelectClasses}
                    >
                        {sortOptions ? (
                            sortOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)
                        ) : (
                            <>
                                <option value="recent">Sort by: Most Recent</option>
                                <option value="oldest">Sort by: Oldest</option>
                                <option value="name">Sort by: Name (A-Z)</option>
                            </>
                        )}
                    </select>
                </div>
            </div>
        </div>
    );
};

export default ProjectControls;