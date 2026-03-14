
import React, { useState, useEffect } from 'react';
import type { PropertyInfo, MortgagePayment, MortgageLoan, MortgageRatePeriod } from '../../types';
import { BanknotesIcon, EditIcon, SaveIcon, TrashIcon, PlusIcon } from './Icons';
import { getPropertyLabels } from '../../lib/countryLabels';
import { v4 as uuidv4 } from 'uuid';

interface MortgageSectionProps {
    property: PropertyInfo;
    isEditing: boolean;
    onSetEditing: () => void;
    onSave: (property: PropertyInfo) => void;
    onCancel: () => void;
}

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition" />
);

const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
    <select {...props} className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition" />
);

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <label className="block text-xs font-medium text-slate-600 dark:text-gray-300 mb-1">{children}</label>
);

const MortgageSection: React.FC<MortgageSectionProps> = ({ property, isEditing, onSetEditing, onSave, onCancel }) => {
    const [editedData, setEditedData] = useState<PropertyInfo>(property);
    const [expandedLoan, setExpandedLoan] = useState<string | null>(null);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const labels = getPropertyLabels(property.country);

    useEffect(() => {
        if (isEditing) {
            const initialData = JSON.parse(JSON.stringify(property));
            if (!initialData.mortgage) initialData.mortgage = {};
            if (!initialData.mortgage.loans) initialData.mortgage.loans = [];

            // Auto-migrate legacy single-loan data into the loans array
            if (initialData.mortgage.loans.length === 0 && (initialData.mortgage.outstandingBalance || initialData.mortgage.payments?.length)) {
                const legacyLoan: MortgageLoan = {
                    id: uuidv4(),
                    type: initialData.mortgage.type || undefined,
                    outstandingBalance: initialData.mortgage.outstandingBalance,
                    payments: (initialData.mortgage.payments || []).map((p: MortgagePayment) => ({
                        ...p,
                        id: p.id || uuidv4(),
                    })),
                };
                initialData.mortgage.loans.push(legacyLoan);
                // Clear legacy fields so they don't persist alongside the loan
                delete initialData.mortgage.payments;
            }

            setEditedData(initialData);
        }
    }, [property, isEditing]);

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const cs = labels.currencySymbol;
    const formatCurrency = (amount: number | undefined) => {
        if (amount === undefined || amount === null) return '';
        return `${cs}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // --- Edit mode helpers ---
    const updateMortgage = (updater: (m: any) => void) => {
        setEditedData(prev => {
            const next = JSON.parse(JSON.stringify(prev));
            if (!next.mortgage) next.mortgage = {};
            updater(next.mortgage);
            return next;
        });
    };

    const handleLoanChange = (loanId: string, field: string, value: any) => {
        updateMortgage(m => {
            const loan = m.loans?.find((l: MortgageLoan) => l.id === loanId);
            if (loan) (loan as any)[field] = value;
        });
    };

    const addLoan = () => {
        updateMortgage(m => {
            if (!m.loans) m.loans = [];
            m.loans.push({
                id: uuidv4(),
                accountNumber: '',
                type: 'Variable',
                outstandingBalance: 0,
                payments: [],
            });
        });
    };

    const removeLoan = (loanId: string) => {
        updateMortgage(m => {
            m.loans = (m.loans || []).filter((l: MortgageLoan) => l.id !== loanId);
        });
    };

    const addLoanPayment = (loanId: string) => {
        updateMortgage(m => {
            const loan = m.loans?.find((l: MortgageLoan) => l.id === loanId);
            if (!loan) return;
            if (!loan.payments) loan.payments = [];
            loan.payments.unshift({
                id: uuidv4(),
                date: new Date().toISOString().split('T')[0],
                amount: 0,
                principal: 0,
                interest: 0,
            });
        });
    };

    const handleLoanPaymentChange = (loanId: string, paymentId: string, field: keyof MortgagePayment, value: string | number) => {
        updateMortgage(m => {
            const loan = m.loans?.find((l: MortgageLoan) => l.id === loanId);
            if (!loan) return;
            const payment = loan.payments?.find((p: MortgagePayment) => p.id === paymentId);
            if (payment) (payment as any)[field] = value;
        });
    };

    const removeLoanPayment = (loanId: string, paymentId: string) => {
        updateMortgage(m => {
            const loan = m.loans?.find((l: MortgageLoan) => l.id === loanId);
            if (!loan) return;
            loan.payments = (loan.payments || []).filter((p: MortgagePayment) => p.id !== paymentId);
        });
    };

    const addRatePeriod = (loanId: string) => {
        updateMortgage(m => {
            const loan = m.loans?.find((l: MortgageLoan) => l.id === loanId);
            if (!loan) return;
            if (!loan.ratePeriods) loan.ratePeriods = [];
            loan.ratePeriods.push({
                id: uuidv4(),
                startDate: new Date().toISOString().split('T')[0],
                type: 'Fixed',
            });
        });
    };

    const handleRatePeriodChange = (loanId: string, periodId: string, field: keyof MortgageRatePeriod, value: any) => {
        updateMortgage(m => {
            const loan = m.loans?.find((l: MortgageLoan) => l.id === loanId);
            if (!loan) return;
            const period = loan.ratePeriods?.find((p: MortgageRatePeriod) => p.id === periodId);
            if (period) (period as any)[field] = value;
        });
    };

    const removeRatePeriod = (loanId: string, periodId: string) => {
        updateMortgage(m => {
            const loan = m.loans?.find((l: MortgageLoan) => l.id === loanId);
            if (!loan) return;
            loan.ratePeriods = (loan.ratePeriods || []).filter((p: MortgageRatePeriod) => p.id !== periodId);
        });
    };

    const handleSave = () => {
        // Recalculate summary fields before saving
        const data = JSON.parse(JSON.stringify(editedData)) as PropertyInfo;
        if (data.mortgage?.loans) {
            data.mortgage.totalDebt = data.mortgage.loans.reduce((sum: number, l: MortgageLoan) => sum + (l.outstandingBalance || 0), 0);
            data.mortgage.netExposure = data.mortgage.totalDebt - (data.mortgage.offsetBalance || 0);
            data.mortgage.outstandingBalance = data.mortgage.totalDebt;
            // Clear legacy single-loan fields now that we use the loans array
            delete data.mortgage.payments;
            if (data.mortgage.loans.length > 0) {
                data.mortgage.type = data.mortgage.loans[0].type as 'Fixed' | 'Variable' | undefined;
            }
        }
        onSave(data);
    };

    const handleClearAll = () => {
        const cleared = JSON.parse(JSON.stringify(property)) as PropertyInfo;
        cleared.mortgage = {};
        onSave(cleared);
        setShowClearConfirm(false);
    };

    // --- Determine display mode: multi-loan or legacy single-loan ---
    const { mortgage } = property;
    const hasLoans = mortgage?.loans && mortgage.loans.length > 0;
    const hasLegacyOnly = !hasLoans && (mortgage?.outstandingBalance || mortgage?.payments?.length);

    // Clear confirmation modal
    const clearModal = showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4">
                <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-2">Clear All Mortgage Data?</h3>
                <p className="text-sm text-slate-600 dark:text-gray-300 mb-4">
                    This will remove all loans, payments, rate history, and offset data. This action cannot be undone.
                </p>
                <div className="flex justify-end gap-3">
                    <button onClick={() => setShowClearConfirm(false)} className="px-4 py-2 rounded-lg bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">Cancel</button>
                    <button onClick={handleClearAll} className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors">Clear All</button>
                </div>
            </div>
        </div>
    );

    if (isEditing) {
        return (
            <>
            {clearModal}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-brand-primary/50 dark:border-brand-secondary/50">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold flex items-center gap-3"><BanknotesIcon /> Editing Mortgage Details</h2>
                    <button onClick={() => setShowClearConfirm(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
                        <TrashIcon /><span>Clear All</span>
                    </button>
                </div>
                <div className="p-6 space-y-6">
                    {/* Legacy fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <Label>Mortgage Type</Label>
                            <Select value={editedData.mortgage?.type || ''} onChange={e => updateMortgage(m => m.type = e.target.value)}>
                                <option value="Fixed">Fixed</option>
                                <option value="Variable">Variable</option>
                            </Select>
                        </div>
                        {editedData.mortgage?.type === 'Fixed' && (
                            <div>
                                <Label>Renewal Date</Label>
                                <Input type="date" value={editedData.mortgage?.renewalDate || ''} onChange={e => updateMortgage(m => m.renewalDate = e.target.value)} />
                            </div>
                        )}
                    </div>

                    {/* Offset Account */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <Label>Offset Account Number</Label>
                            <Input type="text" value={editedData.mortgage?.offsetAccountNumber || ''} onChange={e => updateMortgage(m => m.offsetAccountNumber = e.target.value)} placeholder="e.g. 017435025" />
                        </div>
                        <div>
                            <Label>Offset Balance</Label>
                            <Input type="number" value={editedData.mortgage?.offsetBalance || ''} onChange={e => updateMortgage(m => m.offsetBalance = e.target.value === '' ? undefined : parseFloat(e.target.value))} />
                        </div>
                    </div>

                    {/* Loan Accounts */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-semibold">Loan Accounts</h3>
                            <button type="button" onClick={addLoan} className="flex items-center gap-1 text-sm font-semibold text-brand-primary hover:underline"><PlusIcon /> Add Loan</button>
                        </div>
                        <div className="space-y-4">
                            {(editedData.mortgage?.loans || []).map((loan: MortgageLoan) => (
                                <div key={loan.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-semibold text-slate-700 dark:text-gray-300">
                                            {loan.accountNumber || 'New Loan'}
                                        </span>
                                        <button type="button" onClick={() => removeLoan(loan.id)} className="p-1 text-red-500 hover:text-red-700"><TrashIcon /></button>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <div><Label>Account #</Label><Input type="text" value={loan.accountNumber || ''} onChange={e => handleLoanChange(loan.id, 'accountNumber', e.target.value)} /></div>
                                        <div><Label>Lender</Label><Input type="text" value={loan.lender || ''} onChange={e => handleLoanChange(loan.id, 'lender', e.target.value)} /></div>
                                        <div>
                                            <Label>Current Rate Type</Label>
                                            <Select value={loan.type || ''} onChange={e => handleLoanChange(loan.id, 'type', e.target.value)}>
                                                <option value="Fixed">Fixed</option>
                                                <option value="Variable">Variable</option>
                                                <option value="Tracker">Tracker</option>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label>Repayment Type</Label>
                                            <Select value={loan.repaymentType || ''} onChange={e => handleLoanChange(loan.id, 'repaymentType', e.target.value || undefined)}>
                                                <option value="">—</option>
                                                <option value="interest-only">Interest Only</option>
                                                <option value="capital-repayment">Capital Repayment</option>
                                            </Select>
                                        </div>
                                        <div><Label>Interest Rate %</Label><Input type="number" step="0.01" value={loan.interestRate || ''} onChange={e => handleLoanChange(loan.id, 'interestRate', e.target.value === '' ? undefined : parseFloat(e.target.value))} /></div>
                                        <div><Label>Outstanding Balance</Label><Input type="number" value={loan.outstandingBalance || ''} onChange={e => handleLoanChange(loan.id, 'outstandingBalance', e.target.value === '' ? undefined : parseFloat(e.target.value))} /></div>
                                        <div><Label>Original Amount</Label><Input type="number" value={loan.originalAmount || ''} onChange={e => handleLoanChange(loan.id, 'originalAmount', e.target.value === '' ? undefined : parseFloat(e.target.value))} /></div>
                                        <div><Label>Repayment Amount</Label><Input type="number" value={loan.repaymentAmount || ''} onChange={e => handleLoanChange(loan.id, 'repaymentAmount', e.target.value === '' ? undefined : parseFloat(e.target.value))} /></div>
                                        <div><Label>Start Date</Label><Input type="date" value={loan.startDate || ''} onChange={e => handleLoanChange(loan.id, 'startDate', e.target.value || undefined)} /></div>
                                        <div><Label>Term</Label><Input type="text" value={loan.term || ''} onChange={e => handleLoanChange(loan.id, 'term', e.target.value || undefined)} placeholder="e.g. 25 years" /></div>
                                        <div><Label>Deal End Date</Label><Input type="date" value={loan.dealEndDate || ''} onChange={e => handleLoanChange(loan.id, 'dealEndDate', e.target.value || undefined)} /></div>
                                        <div><Label>Credit Limit</Label><Input type="number" value={loan.creditLimit || ''} onChange={e => handleLoanChange(loan.id, 'creditLimit', e.target.value === '' ? undefined : parseFloat(e.target.value))} /></div>
                                    </div>
                                    {/* Notes */}
                                    <div>
                                        <Label>Notes</Label>
                                        <input type="text" value={loan.notes || ''} onChange={e => handleLoanChange(loan.id, 'notes', e.target.value || undefined)} placeholder="e.g. Remortgaging soon, was fixed now on SVR..." className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition" />
                                    </div>
                                    {/* Rate Periods */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium text-slate-600 dark:text-gray-400">Rate History</span>
                                            <button type="button" onClick={() => addRatePeriod(loan.id)} className="text-xs font-semibold text-brand-primary hover:underline flex items-center gap-1"><PlusIcon /> Add Period</button>
                                        </div>
                                        {(loan.ratePeriods || []).length > 0 && (
                                            <div className="space-y-2">
                                                {(loan.ratePeriods || []).map((rp: MortgageRatePeriod) => (
                                                    <div key={rp.id} className="grid grid-cols-12 gap-2 items-end bg-slate-50 dark:bg-slate-700/30 rounded-lg p-2">
                                                        <div className="col-span-2"><Label>From</Label><Input type="date" value={rp.startDate} onChange={e => handleRatePeriodChange(loan.id, rp.id, 'startDate', e.target.value)} /></div>
                                                        <div className="col-span-2"><Label>To</Label><Input type="date" value={rp.endDate || ''} onChange={e => handleRatePeriodChange(loan.id, rp.id, 'endDate', e.target.value || undefined)} /></div>
                                                        <div className="col-span-2">
                                                            <Label>Type</Label>
                                                            <Select value={rp.type} onChange={e => handleRatePeriodChange(loan.id, rp.id, 'type', e.target.value)}>
                                                                <option value="Fixed">Fixed</option>
                                                                <option value="Variable">Variable</option>
                                                                <option value="Tracker">Tracker</option>
                                                                <option value="SVR">SVR</option>
                                                                <option value="Discount">Discount</option>
                                                            </Select>
                                                        </div>
                                                        <div className="col-span-2"><Label>Rate %</Label><Input type="number" step="0.01" value={rp.rate || ''} onChange={e => handleRatePeriodChange(loan.id, rp.id, 'rate', e.target.value === '' ? undefined : parseFloat(e.target.value))} /></div>
                                                        <div className="col-span-2"><Label>Monthly £</Label><Input type="number" value={rp.monthlyPayment || ''} onChange={e => handleRatePeriodChange(loan.id, rp.id, 'monthlyPayment', e.target.value === '' ? undefined : parseFloat(e.target.value))} /></div>
                                                        <div className="col-span-2 flex items-end gap-1">
                                                            <div className="flex-1"><Label>Note</Label><Input type="text" value={rp.notes || ''} onChange={e => handleRatePeriodChange(loan.id, rp.id, 'notes', e.target.value || undefined)} /></div>
                                                            <button type="button" onClick={() => removeRatePeriod(loan.id, rp.id)} className="p-2 text-red-500 hover:text-red-700 flex-shrink-0"><TrashIcon /></button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {/* Loan payments */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium text-slate-600 dark:text-gray-400">Payments</span>
                                            <button type="button" onClick={() => addLoanPayment(loan.id)} className="text-xs font-semibold text-brand-primary hover:underline flex items-center gap-1"><PlusIcon /> Add</button>
                                        </div>
                                        {(loan.payments || []).length > 0 && (
                                            <div className="space-y-1">
                                                <div className="grid grid-cols-12 gap-2 text-xs font-medium text-slate-500 px-1">
                                                    <div className="col-span-2">Date</div>
                                                    <div className="col-span-2">Type</div>
                                                    <div className="col-span-2">Amount</div>
                                                    <div className="col-span-2">Principal</div>
                                                    <div className="col-span-2">Interest</div>
                                                    <div className="col-span-2"></div>
                                                </div>
                                                {(loan.payments || []).map((p: MortgagePayment) => (
                                                    <div key={p.id} className="grid grid-cols-12 gap-2 items-center">
                                                        <div className="col-span-2"><Input type="date" value={p.date} onChange={e => handleLoanPaymentChange(loan.id, p.id, 'date', e.target.value)} /></div>
                                                        <div className="col-span-2">
                                                            <Select value={p.paymentType || 'regular'} onChange={e => handleLoanPaymentChange(loan.id, p.id, 'paymentType', e.target.value)}>
                                                                <option value="regular">Regular</option>
                                                                <option value="overpayment">Overpayment</option>
                                                            </Select>
                                                        </div>
                                                        <div className="col-span-2"><Input type="number" value={p.amount} onChange={e => handleLoanPaymentChange(loan.id, p.id, 'amount', parseFloat(e.target.value) || 0)} /></div>
                                                        <div className="col-span-2"><Input type="number" value={p.principal} onChange={e => handleLoanPaymentChange(loan.id, p.id, 'principal', parseFloat(e.target.value) || 0)} /></div>
                                                        <div className="col-span-2"><Input type="number" value={p.interest} onChange={e => handleLoanPaymentChange(loan.id, p.id, 'interest', parseFloat(e.target.value) || 0)} /></div>
                                                        <div className="col-span-2 text-right">
                                                            <button type="button" onClick={() => removeLoanPayment(loan.id, p.id)} className="p-1 text-red-500 hover:text-red-700"><TrashIcon /></button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                    <button onClick={onCancel} className="px-4 py-2 rounded-lg bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">Cancel</button>
                    <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-primary text-white font-semibold hover:bg-opacity-90 transition-colors"><SaveIcon /> Save Changes</button>
                </div>
            </div>
            </>
        );
    }

    // --- View mode ---

    // Multi-loan view
    if (hasLoans) {
        const totalDebt = mortgage!.totalDebt ?? mortgage!.loans!.reduce((s, l) => s + (l.outstandingBalance || 0), 0);
        const offsetBalance = mortgage!.offsetBalance || 0;
        const netExposure = totalDebt - offsetBalance;

        return (
            <>
            {clearModal}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold flex items-center gap-3"><BanknotesIcon /> Mortgage</h2>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setShowClearConfirm(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
                            <TrashIcon /><span>Clear All</span>
                        </button>
                        <button onClick={onSetEditing} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/50 text-sm font-semibold text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                            <EditIcon /><span>Edit</span>
                        </button>
                    </div>
                </div>
                <div className="p-6 space-y-6">
                    {/* Summary cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <SummaryCard title="Total Debt" amount={totalDebt} cs={cs} colorClass="text-red-600 dark:text-red-400" />
                        {offsetBalance > 0 && (
                            <SummaryCard title="Offset Balance" amount={offsetBalance} cs={cs} colorClass="text-green-600 dark:text-green-400" />
                        )}
                        <SummaryCard
                            title={offsetBalance > 0 ? "Net Exposure" : "Outstanding"}
                            amount={netExposure}
                            cs={cs}
                            colorClass="text-brand-primary dark:text-brand-secondary"
                        />
                    </div>

                    {/* Offset info */}
                    {mortgage!.offsetAccountNumber && (
                        <div className="text-xs text-slate-500 dark:text-gray-400 flex items-center gap-2">
                            <span>Offset Account: <span className="font-mono">{mortgage!.offsetAccountNumber}</span></span>
                            <span>({formatCurrency(offsetBalance)})</span>
                        </div>
                    )}

                    {/* Individual loans */}
                    {mortgage!.loans!.map(loan => {
                        const isExpanded = expandedLoan === loan.id;
                        const totalInterest = (loan.payments || []).reduce((s, p) => s + p.interest, 0);
                        const totalPrincipal = (loan.payments || []).reduce((s, p) => s + p.principal, 0);
                        const totalPaid = (loan.payments || []).reduce((s, p) => s + p.amount, 0);

                        // Deal end date warning
                        const dealEndDays = loan.dealEndDate
                            ? Math.ceil((new Date(loan.dealEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                            : null;
                        const dealEndSoon = dealEndDays !== null && dealEndDays <= 180 && dealEndDays > 0;
                        const dealExpired = dealEndDays !== null && dealEndDays <= 0;

                        return (
                            <div key={loan.id} className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                                <button
                                    onClick={() => setExpandedLoan(isExpanded ? null : loan.id)}
                                    className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="text-left min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-semibold text-slate-800 dark:text-gray-200">
                                                    {loan.lender || 'Loan'} — <span className="font-mono text-sm">{loan.accountNumber}</span>
                                                </span>
                                                {loan.repaymentType === 'interest-only' && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                                                        Interest Only
                                                    </span>
                                                )}
                                                {loan.type && (
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                                                        loan.type === 'Fixed' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                                                        loan.type === 'Variable' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' :
                                                        'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                                                    }`}>
                                                        {loan.type}
                                                    </span>
                                                )}
                                                {loan.interestRate !== undefined && (
                                                    <span className="text-xs text-slate-500 dark:text-gray-400">{loan.interestRate}% p.a.</span>
                                                )}
                                                {dealExpired && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                                                        Deal Expired
                                                    </span>
                                                )}
                                                {dealEndSoon && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300">
                                                        Deal ends in {dealEndDays}d
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-sm text-slate-500 dark:text-gray-400 mt-0.5">
                                                Balance: <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">{formatCurrency(loan.outstandingBalance)}</span>
                                                {loan.repaymentAmount !== undefined && (
                                                    <span className="ml-3">Repayment: <span className="font-mono">{formatCurrency(loan.repaymentAmount)}</span>/mo</span>
                                                )}
                                                {loan.term && (
                                                    <span className="ml-3">Term: {loan.term}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <svg className={`w-5 h-5 text-slate-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                                </button>

                                {isExpanded && (
                                    <div className="border-t border-slate-200 dark:border-slate-700">
                                        {/* Loan details row */}
                                        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-700/20 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1 text-xs">
                                            {loan.originalAmount !== undefined && (
                                                <span className="text-slate-500">Original: <span className="font-semibold text-slate-700 dark:text-slate-200">{formatCurrency(loan.originalAmount)}</span></span>
                                            )}
                                            {loan.startDate && (
                                                <span className="text-slate-500">Started: <span className="font-semibold">{formatDate(loan.startDate)}</span></span>
                                            )}
                                            {loan.dealEndDate && (
                                                <span className={`${dealExpired ? 'text-red-600 dark:text-red-400' : dealEndSoon ? 'text-yellow-600 dark:text-yellow-400' : 'text-slate-500'}`}>
                                                    Deal ends: <span className="font-semibold">{formatDate(loan.dealEndDate)}</span>
                                                </span>
                                            )}
                                            {loan.repaymentType && (
                                                <span className="text-slate-500">Type: <span className="font-semibold">{loan.repaymentType === 'interest-only' ? 'Interest Only' : 'Capital Repayment'}</span></span>
                                            )}
                                        </div>
                                        {loan.notes && (
                                            <div className="px-4 py-2 text-xs text-slate-500 dark:text-gray-400 italic border-b border-slate-100 dark:border-slate-700">
                                                {loan.notes}
                                            </div>
                                        )}

                                        {/* Rate history timeline */}
                                        {(loan.ratePeriods || []).length > 0 && (
                                            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                                                <span className="text-xs font-semibold text-slate-600 dark:text-gray-300 mb-2 block">Rate History</span>
                                                <div className="space-y-1">
                                                    {[...(loan.ratePeriods || [])].sort((a, b) => a.startDate.localeCompare(b.startDate)).map((rp, idx, arr) => {
                                                        const isCurrent = !rp.endDate || new Date(rp.endDate) >= new Date();
                                                        const typeColor = rp.type === 'Fixed' ? 'bg-blue-500' :
                                                            rp.type === 'SVR' ? 'bg-red-500' :
                                                            rp.type === 'Variable' ? 'bg-amber-500' :
                                                            rp.type === 'Tracker' ? 'bg-purple-500' : 'bg-teal-500';
                                                        return (
                                                            <div key={rp.id} className="flex items-center gap-2 text-xs">
                                                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${typeColor} ${isCurrent ? 'ring-2 ring-offset-1 ring-offset-white dark:ring-offset-slate-800 ring-brand-primary' : ''}`} />
                                                                <span className="font-mono text-slate-500 dark:text-gray-400 w-44 flex-shrink-0">
                                                                    {formatDate(rp.startDate)} — {rp.endDate ? formatDate(rp.endDate) : 'present'}
                                                                </span>
                                                                <span className={`font-semibold ${
                                                                    rp.type === 'Fixed' ? 'text-blue-700 dark:text-blue-300' :
                                                                    rp.type === 'SVR' ? 'text-red-600 dark:text-red-400' :
                                                                    rp.type === 'Variable' ? 'text-amber-700 dark:text-amber-300' :
                                                                    'text-purple-700 dark:text-purple-300'
                                                                }`}>
                                                                    {rp.type}{rp.rate !== undefined ? ` ${rp.rate}%` : ''}
                                                                </span>
                                                                {rp.monthlyPayment !== undefined && (
                                                                    <span className="text-slate-500 font-mono">{formatCurrency(rp.monthlyPayment)}/mo</span>
                                                                )}
                                                                {rp.notes && <span className="text-slate-400 italic">{rp.notes}</span>}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Payment summary */}
                                        {(loan.payments || []).length > 0 && (() => {
                                            const overpaymentTotal = (loan.payments || []).filter(p => p.paymentType === 'overpayment').reduce((s, p) => s + p.amount, 0);
                                            const regularTotal = totalPaid - overpaymentTotal;
                                            return (
                                                <div className="px-4 py-2 bg-slate-50 dark:bg-slate-700/30 flex gap-6 text-xs flex-wrap">
                                                    <span className="text-slate-500">Total Paid: <span className="font-semibold text-slate-700 dark:text-slate-200">{formatCurrency(totalPaid)}</span></span>
                                                    {totalPrincipal > 0 && <span className="text-slate-500">Principal: <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(totalPrincipal)}</span></span>}
                                                    <span className="text-slate-500">Interest: <span className="font-semibold text-red-600 dark:text-red-400">{formatCurrency(totalInterest)}</span></span>
                                                    {overpaymentTotal > 0 && <span className="text-slate-500">Overpayments: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(overpaymentTotal)}</span></span>}
                                                    <span className="text-slate-500">Payments: <span className="font-semibold">{loan.payments!.length}</span></span>
                                                </div>
                                            );
                                        })()}
                                        {/* Payment table */}
                                        <div className="max-h-64 overflow-y-auto">
                                            {(loan.payments || []).length > 0 ? (
                                                <table className="w-full text-sm">
                                                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-700/50">
                                                        <tr className="text-xs font-semibold text-slate-600 dark:text-gray-300">
                                                            <th className="px-4 py-2 text-left">Date</th>
                                                            <th className="px-4 py-2 text-left">Type</th>
                                                            <th className="px-4 py-2 text-right">Amount</th>
                                                            <th className="px-4 py-2 text-right">Principal</th>
                                                            <th className="px-4 py-2 text-right">Interest</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                                        {loan.payments!.map(p => {
                                                            const isOverpayment = p.paymentType === 'overpayment';
                                                            return (
                                                                <tr key={p.id} className={`font-mono text-sm ${isOverpayment ? 'bg-emerald-50 dark:bg-emerald-900/10' : ''}`}>
                                                                    <td className="px-4 py-2 text-slate-500 dark:text-gray-400">{formatDate(p.date)}</td>
                                                                    <td className="px-4 py-2">
                                                                        {isOverpayment ? (
                                                                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">Overpayment</span>
                                                                        ) : (
                                                                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">Regular</span>
                                                                        )}
                                                                    </td>
                                                                    <td className={`px-4 py-2 text-right ${isOverpayment ? 'text-emerald-700 dark:text-emerald-300 font-semibold' : 'text-slate-700 dark:text-slate-200'}`}>{formatCurrency(p.amount)}</td>
                                                                    <td className="px-4 py-2 text-right text-green-600 dark:text-green-400">{formatCurrency(p.principal)}</td>
                                                                    <td className="px-4 py-2 text-right text-red-500 dark:text-red-400">{formatCurrency(p.interest)}</td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            ) : (
                                                <div className="px-4 py-6 text-center text-sm text-slate-500 dark:text-gray-400">
                                                    No payment history for this loan.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
            </>
        );
    }

    // Legacy single-loan view (backward compat)
    return (
        <>
        {clearModal}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-3"><BanknotesIcon /> Mortgage</h2>
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowClearConfirm(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
                        <TrashIcon /><span>Clear All</span>
                    </button>
                    <button onClick={onSetEditing} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/50 text-sm font-semibold text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                        <EditIcon /><span>Add/Edit</span>
                    </button>
                </div>
            </div>
            <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <p className="text-sm text-slate-500 dark:text-gray-400">Mortgage Type</p>
                        <p className="font-medium text-slate-800 dark:text-gray-200">{mortgage?.type || 'N/A'}</p>
                    </div>
                    {mortgage?.type === 'Fixed' && (
                        <div>
                            <p className="text-sm text-slate-500 dark:text-gray-400">Renewal Date</p>
                            <p className="font-medium text-slate-800 dark:text-gray-200">{formatDate(mortgage?.renewalDate)}</p>
                        </div>
                    )}
                    <div className="sm:col-span-3">
                        <SummaryCard title="Outstanding Balance" amount={mortgage?.outstandingBalance ?? 0} cs={cs} colorClass="text-brand-primary dark:text-brand-secondary" />
                    </div>
                </div>
                <div>
                    <h3 className="text-lg font-semibold mb-2 text-slate-700 dark:text-gray-300">Payment History</h3>
                    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                        <div className="grid grid-cols-10 px-4 py-2 bg-slate-50 dark:bg-slate-700/50 font-semibold text-sm text-slate-600 dark:text-gray-300">
                            <div className="col-span-3">Date</div>
                            <div className="col-span-3 text-right">Total Paid</div>
                            <div className="col-span-2 text-right">Principal</div>
                            <div className="col-span-2 text-right">Interest</div>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-700 min-h-[6rem]">
                            {mortgage?.payments && mortgage.payments.length > 0 ? mortgage.payments.map(p => (
                                <div key={p.id} className="grid grid-cols-10 px-4 py-3 text-sm font-mono">
                                    <div className="col-span-3 text-slate-500 dark:text-gray-400">{formatDate(p.date)}</div>
                                    <div className="col-span-3 text-right text-slate-700 dark:text-slate-200">{formatCurrency(p.amount)}</div>
                                    <div className="col-span-2 text-right text-slate-500 dark:text-gray-400">{formatCurrency(p.principal)}</div>
                                    <div className="col-span-2 text-right text-slate-500 dark:text-gray-400">{formatCurrency(p.interest)}</div>
                                </div>
                            )) : (
                                <div className="px-4 py-8 text-center text-slate-500 dark:text-gray-400">
                                    No mortgage payments recorded.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        </>
    );
};

const SummaryCard: React.FC<{ title: string; amount: number; cs: string; colorClass: string }> = ({ title, amount, cs, colorClass }) => (
    <div className="bg-slate-100 dark:bg-slate-700/50 p-4 rounded-lg text-center">
        <p className="text-sm text-slate-500 dark:text-gray-400">{title}</p>
        <p className={`text-2xl font-bold font-mono ${colorClass}`}>
            {cs}{amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
    </div>
);

export default MortgageSection;
