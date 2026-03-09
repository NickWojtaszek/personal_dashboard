
import React from 'react';
import type { PropertyInfo } from '../../types';

interface PrintablePropertyReportProps {
    property: PropertyInfo;
}

const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return 'Invalid Date';
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return 'Invalid Date'; }
};

const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return 'N/A';
    return `£${amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const Section: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
    <div className={`mt-6 print-page-break ${className || ''}`}>
        <h2 className="text-xl font-bold border-b-2 border-gray-300 pb-1 mb-3">{title}</h2>
        {children}
    </div>
);

const DetailGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="grid grid-cols-3 gap-x-4 gap-y-2">{children}</div>
);

const DetailItem: React.FC<{ label: string; value?: string | number | null; className?: string }> = ({ label, value, className }) => (
    <div className={`py-1 ${className}`}>
        <p className="text-xs text-gray-500 font-semibold uppercase">{label}</p>
        <p className="text-sm">{value || 'N/A'}</p>
    </div>
);

const PrintTable: React.FC<{ headers: string[], children: React.ReactNode }> = ({ headers, children }) => (
    <table className="w-full text-sm border-collapse border border-gray-400 mt-2">
        <thead>
            <tr className="bg-gray-100">
                {headers.map(h => <th key={h} className="border border-gray-300 p-2 text-left font-semibold">{h}</th>)}
            </tr>
        </thead>
        <tbody>
            {children}
        </tbody>
    </table>
);

const PrintablePropertyReport: React.FC<PrintablePropertyReportProps> = ({ property }) => {
    if (!property) return null;

    const isUkProperty = property.groups?.includes('UK');

    return (
        <div className="printable-area bg-white text-black font-sans p-4">
            <header className="text-center mb-6">
                <h1 className="text-3xl font-bold">{property.name}</h1>
                <p className="text-lg text-gray-600">{property.location}</p>
            </header>
            
            <Section title="Overview & Details">
                <DetailGrid>
                    <DetailItem label="Full Address" value={property.overview?.address} className="col-span-2" />
                    <DetailItem label="Property Type" value={property.overview?.propertyType} />
                    <DetailItem label="Beds" value={property.overview?.configuration?.beds} />
                    <DetailItem label="Baths" value={property.overview?.configuration?.baths} />
                    <DetailItem label="Parking" value={property.overview?.configuration?.parking} />
                    <DetailItem label="Complex Name" value={property.details?.complexName} />
                    <DetailItem label="Unit/Lot Number" value={property.details?.unitLotNumber} />
                </DetailGrid>
            </Section>

            {property.financials?.transactions && property.financials.transactions.length > 0 && (
                <Section title="Financial Statement">
                    <PrintTable headers={['Date', 'Details', 'Money Out', 'Money In']}>
                        {property.financials.transactions.map(t => (
                            <tr key={t.id} className="border-t border-gray-300">
                                <td className="p-2">{formatDate(t.date)}</td>
                                <td className="p-2">{t.description}</td>
                                <td className="p-2 text-right">{t.type === 'expense' ? formatCurrency(t.amount) : ''}</td>
                                <td className="p-2 text-right">{t.type === 'income' ? formatCurrency(t.amount) : ''}</td>
                            </tr>
                        ))}
                    </PrintTable>
                </Section>
            )}

            {property.mortgage?.payments && property.mortgage.payments.length > 0 && (
                <Section title="Mortgage">
                    <DetailGrid>
                        <DetailItem label="Type" value={property.mortgage?.type} />
                        <DetailItem label="Renewal Date" value={formatDate(property.mortgage?.renewalDate)} />
                        <DetailItem label="Outstanding Balance" value={formatCurrency(property.mortgage?.outstandingBalance)} />
                    </DetailGrid>
                    <PrintTable headers={['Date', 'Total Paid', 'Principal', 'Interest']}>
                        {property.mortgage.payments.map(p => (
                            <tr key={p.id} className="border-t border-gray-300">
                                <td className="p-2">{formatDate(p.date)}</td>
                                <td className="p-2 text-right">{formatCurrency(p.amount)}</td>
                                <td className="p-2 text-right">{formatCurrency(p.principal)}</td>
                                <td className="p-2 text-right">{formatCurrency(p.interest)}</td>
                            </tr>
                        ))}
                    </PrintTable>
                </Section>
            )}

            {(property.operations?.leaseholdCharges?.serviceCharges?.length || 0) > 0 && (property.operations?.leaseholdCharges?.groundRent?.length || 0) > 0 && (
                <Section title="Leasehold Charges">
                    <h3 className="font-bold mb-2">Service Charges</h3>
                    <PrintTable headers={['Year', 'Amount Due', 'Amount Paid', 'Due Date']}>
                        {(property.operations?.leaseholdCharges?.serviceCharges || []).map(sc => (
                            <tr key={sc.id} className="border-t border-gray-300">
                                <td className="p-2">{sc.year}</td>
                                <td className="p-2 text-right">{formatCurrency(sc.amountDue)}</td>
                                <td className="p-2 text-right">{formatCurrency(sc.amountPaid)}</td>
                                <td className="p-2">{formatDate(sc.dueDate)}</td>
                            </tr>
                        ))}
                    </PrintTable>
                    <h3 className="font-bold mb-2 mt-4">Ground Rent</h3>
                    <PrintTable headers={['Year', 'Amount Due', 'Amount Paid', 'Due Date']}>
                        {(property.operations?.leaseholdCharges?.groundRent || []).map(gr => (
                            <tr key={gr.id} className="border-t border-gray-300">
                                <td className="p-2">{gr.year}</td>
                                <td className="p-2 text-right">{formatCurrency(gr.amountDue)}</td>
                                <td className="p-2 text-right">{formatCurrency(gr.amountPaid)}</td>
                                <td className="p-2">{formatDate(gr.dueDate)}</td>
                            </tr>
                        ))}
                    </PrintTable>
                </Section>
            )}
            
            {(property.operations?.leaseholdCharges?.councilTax?.length || 0) > 0 && (
                 <Section title="Council Tax">
                    <PrintTable headers={isUkProperty ? ['Year', 'Amount Due', 'Amount Paid', 'Due Date', 'Paid By'] : ['Year', 'Amount Due', 'Amount Paid', 'Due Date']}>
                        {(property.operations?.leaseholdCharges?.councilTax || []).map(ct => (
                            <tr key={ct.id} className="border-t border-gray-300">
                                <td className="p-2">{ct.year}</td>
                                <td className="p-2 text-right">{ct.paidByTenant ? 'N/A' : formatCurrency(ct.amountDue)}</td>
                                <td className="p-2 text-right">{ct.paidByTenant ? 'N/A' : formatCurrency(ct.amountPaid)}</td>
                                <td className="p-2">{formatDate(ct.dueDate)}</td>
                                {isUkProperty && <td className="p-2">{ct.paidByTenant ? 'Tenant' : 'Landlord'}</td>}
                            </tr>
                        ))}
                    </PrintTable>
                </Section>
            )}


            <Section title="Compliance">
                 <PrintTable headers={['Type', 'Last Checked / Start Date', 'Next Due / End Date']}>
                    {property.operations?.compliance?.eicr?.checks?.map(c => <tr key={c.id}><td className="p-2">EICR</td><td className="p-2">{formatDate(c.date)}</td><td className="p-2">{formatDate(property.operations?.compliance?.eicr?.next)}</td></tr>)}
                    {property.operations?.compliance?.gasSafety?.checks?.map(c => <tr key={c.id}><td className="p-2">Gas Safety</td><td className="p-2">{formatDate(c.date)}</td><td className="p-2">{formatDate(property.operations?.compliance?.gasSafety?.next)}</td></tr>)}
                    {property.operations?.compliance?.insurance?.policies?.map(p => <tr key={p.id}><td className="p-2">Building Insurance</td><td className="p-2">{formatDate(p.startDate)}</td><td className="p-2">{formatDate(p.endDate)}</td></tr>)}
                </PrintTable>
            </Section>
            
            {((property.operations?.maintenance?.jobs?.length || 0) > 0 || (property.operations?.maintenance?.equipment?.length || 0) > 0) && (
                <Section title="Maintenance & Equipment">
                    <PrintTable headers={['Date', 'Description', 'Cost']}>
                        {[...(property.operations?.maintenance?.jobs || []), ...(property.operations?.maintenance?.equipment || [])]
                            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                            .map(item => (
                                <tr key={item.id} className="border-t border-gray-300">
                                    <td className="p-2">{formatDate(item.date)}</td>
                                    <td className="p-2">{item.description}</td>
                                    <td className="p-2 text-right">{formatCurrency(item.cost)}</td>
                                </tr>
                            ))
                        }
                    </PrintTable>
                </Section>
            )}

            {property.correspondence && property.correspondence.length > 0 && (
                <Section title="Correspondence">
                    {property.correspondence.map(item => (
                        <div key={item.id} className="border-t border-gray-300 py-2">
                            <p><strong>Date:</strong> {formatDate(item.date)}</p>
                            <p><strong>From:</strong> {item.from}  |  <strong>To:</strong> {item.to}</p>
                            <p><strong>Subject:</strong> {item.subject}</p>
                            <pre className="text-xs bg-gray-50 p-2 mt-1 whitespace-pre-wrap font-sans">{item.body}</pre>
                        </div>
                    ))}
                </Section>
            )}

            {property.notes && (
                <Section title="Notes">
                    <pre className="text-sm whitespace-pre-wrap font-sans">{property.notes}</pre>
                </Section>
            )}
        </div>
    );
};

export default PrintablePropertyReport;