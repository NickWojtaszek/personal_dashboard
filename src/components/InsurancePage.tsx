import React, { useState, useMemo } from 'react';
import type { InsuranceInfo } from '../types';
import ProjectControls from './ProjectControls';
import InsuranceGrid from './InsuranceGrid';
import UpcomingRenewals from './insurance-detail/UpcomingRenewals';

interface InsurancePageProps {
    policies: InsuranceInfo[];
    onOrderChange: (activeId: string, overId: string) => void;
    isAdminMode: boolean;
    insuranceGroups: string[];
    onSelectPolicy: (id: string) => void;
    onNewPolicy: () => void;
    onEditPolicy: (policy: InsuranceInfo) => void;
}

type SortOption = 'recent' | 'oldest' | 'name';

// Section component to render a group of policies
const InsuranceGroupSection: React.FC<{
    title: string;
    policies: InsuranceInfo[];
    isAdminMode: boolean;
    onEdit: (policy: InsuranceInfo) => void;
    onSelect: (id: string) => void;
    onOrderChange: (activeId: string, overId: string) => void;
}> = ({ title, policies, ...gridProps }) => {
    if (policies.length === 0) {
        return null;
    }
    return (
        <section> 
            <h2 className="text-2xl font-bold text-slate-800 dark:text-gray-200 mb-6">{title}</h2>
            <InsuranceGrid policies={policies} {...gridProps} />
        </section>
    );
};

const InsurancePage: React.FC<InsurancePageProps> = ({ 
    policies, 
    onOrderChange,
    isAdminMode, 
    insuranceGroups, 
    onSelectPolicy,
    onNewPolicy,
    onEditPolicy,
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSort, setSelectedSort] = useState<SortOption>('name');
    const [selectedGroup, setSelectedGroup] = useState('All');

    const filteredPolicies = useMemo(() => {
        let filtered = [...policies];
        
        if (selectedGroup !== 'All') {
            filtered = filtered.filter(policy => 
                policy.groups?.includes(selectedGroup)
            );
        }
        
        if (searchTerm.trim()) {
            const lowercasedTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(policy =>
                policy.name.toLowerCase().includes(lowercasedTerm) ||
                policy.provider.toLowerCase().includes(lowercasedTerm)
            );
        }
        
        const indexedPolicies = policies.map((p, index) => ({...p, originalIndex: index}));

        return filtered.sort((a, b) => {
            switch (selectedSort) {
                case 'name': return a.name.localeCompare(b.name);
                case 'recent': 
                     const bIndex = indexedPolicies.find(p => p.id === b.id)?.originalIndex ?? -1;
                    const aIndex = indexedPolicies.find(p => p.id === a.id)?.originalIndex ?? -1;
                    return bIndex - aIndex;
                case 'oldest': 
                    const aIndexOld = indexedPolicies.find(p => p.id === a.id)?.originalIndex ?? -1;
                    const bIndexOld = indexedPolicies.find(p => p.id === b.id)?.originalIndex ?? -1;
                    return aIndexOld - bIndexOld;
                default: return 0;
            }
        });
    }, [policies, searchTerm, selectedSort, selectedGroup]);

    // Grouping logic
    const { homePolicies, vehiclePolicies, lifeHealthPolicies, otherPolicies } = useMemo(() => {
        const homePolicies: InsuranceInfo[] = [];
        const vehiclePolicies: InsuranceInfo[] = [];
        const lifeHealthPolicies: InsuranceInfo[] = [];
        const otherPolicies: InsuranceInfo[] = [];

        filteredPolicies.forEach(policy => {
            const groups = policy.groups || [];
            if (groups.includes('Property')) {
                homePolicies.push(policy);
            } else if (groups.includes('Vehicle')) {
                vehiclePolicies.push(policy);
            } else if (groups.includes('Life') || groups.includes('Health')) {
                lifeHealthPolicies.push(policy);
            } else {
                otherPolicies.push(policy);
            }
        });

        return { homePolicies, vehiclePolicies, lifeHealthPolicies, otherPolicies };
    }, [filteredPolicies]);

    const gridProps = {
        isAdminMode,
        onEdit: onEditPolicy,
        onSelect: onSelectPolicy,
        onOrderChange,
    };

    return (
        <div className="space-y-8">
            <ProjectControls
                title="Insurance Policies"
                searchTerm={searchTerm}
                onSearchTermChange={setSearchTerm}
                selectedSort={selectedSort as any}
                onSortChange={setSelectedSort as any}
                selectedGroup={selectedGroup}
                onGroupChange={setSelectedGroup}
                groups={insuranceGroups}
                isAdminMode={isAdminMode}
                onNewProject={onNewPolicy}
                projectCount={filteredPolicies.length}
            />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
                <div className="lg:col-span-2 space-y-12">
                    {filteredPolicies.length > 0 ? (
                        <>
                            <InsuranceGroupSection title="Home Insurance" policies={homePolicies} {...gridProps} />
                            <InsuranceGroupSection title="Vehicle Insurance" policies={vehiclePolicies} {...gridProps} />
                            <InsuranceGroupSection title="Life & Health Insurance" policies={lifeHealthPolicies} {...gridProps} />
                            <InsuranceGroupSection title="Other Insurance" policies={otherPolicies} {...gridProps} />
                        </>
                    ) : (
                        <div className="text-center py-16 text-slate-500 dark:text-gray-400">
                            <p className="text-lg">No policies found.</p>
                            <p>Try adjusting your search or filters.</p>
                        </div>
                    )}
                </div>
                <div className="lg:col-span-1 lg:sticky lg:top-28">
                    <UpcomingRenewals policies={policies} />
                </div>
            </div>
        </div>
    );
};

export default InsurancePage;
