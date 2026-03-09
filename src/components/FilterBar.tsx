
import React from 'react';

interface FilterBarProps {
    specialties: string[];
    activeFilter: string;
    onFilterChange: (filter: string) => void;
}

const FilterBar: React.FC<FilterBarProps> = ({ specialties, activeFilter, onFilterChange }) => {
    const filters = ['All', ...specialties];

    return (
        <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
            {filters.map(filter => (
                <button
                    key={filter}
                    onClick={() => onFilterChange(filter)}
                    aria-pressed={activeFilter === filter}
                    className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 focus:ring-brand-primary ${
                        activeFilter === filter
                            ? 'bg-brand-primary text-white shadow'
                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600'
                    }`}
                >
                    {filter}
                </button>
            ))}
        </div>
    );
};

export default FilterBar;
