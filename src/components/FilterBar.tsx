import React from 'react';
import Button from './ui/Button';

interface FilterBarProps {
    specialties: string[];
    activeFilter: string;
    onFilterChange: (filter: string) => void;
}

const FilterBar: React.FC<FilterBarProps> = ({ specialties, activeFilter, onFilterChange }) => {
    const filters = ['All', ...specialties];

    return (
        <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
            {filters.map(filter => {
                const isActive = activeFilter === filter;
                return (
                    <Button
                        key={filter}
                        onClick={() => onFilterChange(filter)}
                        // Use custom styling to match the pill design exactly
                        className={`rounded-full ${
                             isActive 
                                ? 'bg-brand-primary text-white shadow hover:bg-opacity-90' 
                                : 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600'
                        }`}
                        // active prop is not strictly needed if we control classes, but nice for semantics
                        aria-pressed={isActive}
                    >
                        {filter}
                    </Button>
                );
            })}
        </div>
    );
};

export default FilterBar;
