import React, { useState, useMemo } from 'react';
import type { InvoiceInfo } from '../types';
import ProjectControls from './ProjectControls';
import InvoiceTable from './InvoiceGrid'; // Note: Filename is InvoiceGrid but component is InvoiceTable

interface InvoicesPageProps {
    invoices: InvoiceInfo[];
    onOrderChange: (activeId: string, overId: string) => void;
    isAdminMode: boolean;
    invoiceGroups: string[];
    onSelectInvoice: (id: string) => void;
    onNewInvoice: () => void;
    onEditInvoice: (invoice: InvoiceInfo) => void;
}

type SortOption = 'purchaseDate' | 'amount' | 'description';

const InvoicesPage: React.FC<InvoicesPageProps> = ({ 
    invoices, 
    onOrderChange, 
    isAdminMode, 
    invoiceGroups, 
    onSelectInvoice,
    onNewInvoice,
    onEditInvoice,
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSort, setSelectedSort] = useState<SortOption>('purchaseDate');
    const [selectedGroup, setSelectedGroup] = useState('All');

    const sortOptions = [
        { value: 'purchaseDate', label: 'Sort by: Purchase Date' },
        { value: 'amount', label: 'Sort by: Amount (High-Low)' },
        { value: 'description', label: 'Sort by: Description (A-Z)' },
    ];

    const filteredInvoices = useMemo(() => {
        let filtered = [...invoices];
        
        if (selectedGroup !== 'All') {
            filtered = filtered.filter(invoice => 
                invoice.groups?.includes(selectedGroup)
            );
        }
        
        if (searchTerm.trim()) {
            const lowercasedTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(invoice =>
                invoice.description.toLowerCase().includes(lowercasedTerm)
            );
        }
        
        return filtered.sort((a, b) => {
            switch (selectedSort) {
                case 'description': return a.description.localeCompare(b.description);
                case 'amount': return b.amount - a.amount;
                case 'purchaseDate': return new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime();
                default: return 0;
            }
        });
    }, [invoices, searchTerm, selectedSort, selectedGroup]);


    return (
        <div className="space-y-8">
            <ProjectControls
                title="Purchase Invoices"
                searchTerm={searchTerm}
                onSearchTermChange={setSearchTerm}
                selectedSort={selectedSort}
                onSortChange={(sort) => setSelectedSort(sort as SortOption)}
                selectedGroup={selectedGroup}
                onGroupChange={setSelectedGroup}
                groups={invoiceGroups}
                isAdminMode={isAdminMode}
                onNewProject={onNewInvoice}
                projectCount={filteredInvoices.length}
                sortOptions={sortOptions}
            />
            
            <InvoiceTable
                invoices={filteredInvoices}
                isAdminMode={isAdminMode}
                onEdit={onEditInvoice}
                onSelect={onSelectInvoice}
                onOrderChange={onOrderChange}
            />
        </div>
    );
};

export default InvoicesPage;