import React, { useState } from 'react';
import type { RegistrationFeeInfo, FeeBill } from '../types';
import { PlusIcon, TrashIcon, DocumentIcon, UploadIcon, CheckIcon } from './Icons';
import { v4 as uuidv4 } from 'uuid';
import { markBillPaid } from '../lib/bills';
import { parseLocalDate, todayLocal, toLocalISO } from '../lib/dates';
import { fileToDocument, openDocument } from '../lib/documents';

const CURRENCY_SYMBOLS: Record<string, string> = { GBP: '£', USD: '$', AUD: 'A$', NZD: 'NZ$', EUR: '€', PLN: 'zł' };
const CURRENCIES = ['GBP', 'EUR', 'AUD', 'NZD', 'USD', 'PLN'];

interface RegistrationFeesPageProps {
    fees: RegistrationFeeInfo[];
    feeGroups: string[];
    onNewFee: () => void;
    onSaveFee: (fee: RegistrationFeeInfo) => void;
    onDeleteFee: (feeId: string) => void;
    onGroupsChange: (groups: string[]) => void;
}

const inputClass = 'w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary outline-none transition';

function billStatus(bill: FeeBill): { text: string; color: string } {
    if (bill.amountPaid >= bill.amountDue && bill.amountDue > 0) {
        return { text: 'Paid', color: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' };
    }
    const due = parseLocalDate(bill.dueDate);
    if (due && due.getTime() < todayLocal().getTime()) {
        return { text: 'Overdue', color: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' };
    }
    return { text: 'Due', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300' };
}

const RegistrationFeesPage: React.FC<RegistrationFeesPageProps> = ({ fees, onNewFee, onSaveFee, onDeleteFee }) => {
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    // All edits funnel through onSaveFee, immutably, so App owns the single source of truth.
    const patchFee = (fee: RegistrationFeeInfo, changes: Partial<RegistrationFeeInfo>) => onSaveFee({ ...fee, ...changes });

    const patchBill = (fee: RegistrationFeeInfo, billId: string, changes: Partial<FeeBill>) =>
        patchFee(fee, { bills: (fee.bills || []).map(b => b.id === billId ? { ...b, ...changes } : b) });

    const addBill = (fee: RegistrationFeeInfo) => {
        const newBill: FeeBill = { id: uuidv4(), amountDue: 0, amountPaid: 0, dueDate: toLocalISO(todayLocal()) };
        patchFee(fee, { bills: [newBill, ...(fee.bills || [])] });
    };

    const removeBill = (fee: RegistrationFeeInfo, billId: string) =>
        patchFee(fee, { bills: (fee.bills || []).filter(b => b.id !== billId) });

    const markPaid = (fee: RegistrationFeeInfo, bill: FeeBill) =>
        patchBill(fee, bill.id, markBillPaid(bill));

    const attachReceipt = async (fee: RegistrationFeeInfo, billId: string, file: File) => {
        const doc = await fileToDocument(file, { category: 'Receipt', label: `${fee.name} receipt` });
        patchBill(fee, billId, { document: doc });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Professional Fees</h1>
                    <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
                        Registration &amp; membership fees — GMC, MCIRL, and the like. Due dates surface on the General overview.
                    </p>
                </div>
                <button onClick={onNewFee} className="self-start flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-primary text-white font-semibold hover:bg-opacity-90 transition-colors">
                    <PlusIcon /> Add registration
                </button>
            </div>

            {fees.length === 0 ? (
                <div className="text-center py-16 text-slate-500 dark:text-gray-400 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <p className="font-medium">No registrations yet.</p>
                    <p className="text-sm mt-1">Add GMC, the Irish Medical Council, or any recurring professional fee.</p>
                </div>
            ) : (
                fees.map(fee => {
                    const sym = CURRENCY_SYMBOLS[fee.currency || ''] || '';
                    const bills = [...(fee.bills || [])].sort((a, b) => (b.dueDate || '').localeCompare(a.dueDate || ''));
                    return (
                        <div key={fee.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                            {/* Registration header — editable identity fields */}
                            <div className="p-5 border-b border-slate-200 dark:border-slate-700">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 flex-1">
                                        <div className="col-span-2 lg:col-span-1">
                                            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Name</label>
                                            <input className={inputClass} value={fee.name} onChange={e => patchFee(fee, { name: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Authority</label>
                                            <input className={inputClass} value={fee.authority || ''} placeholder="General Medical Council" onChange={e => patchFee(fee, { authority: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Reference no.</label>
                                            <input className={inputClass} value={fee.referenceNumber || ''} placeholder="6121858" onChange={e => patchFee(fee, { referenceNumber: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Fee type</label>
                                            <input className={inputClass} value={fee.feeType || ''} placeholder="ARF" onChange={e => patchFee(fee, { feeType: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Currency</label>
                                            <select className={inputClass} value={fee.currency || ''} onChange={e => patchFee(fee, { currency: e.target.value || undefined })}>
                                                <option value="">—</option>
                                                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Renews every</label>
                                            <select
                                                className={inputClass}
                                                value={fee.billingFrequencyMonths ?? 12}
                                                onChange={e => patchFee(fee, { billingFrequencyMonths: parseInt(e.target.value, 10) })}
                                            >
                                                <option value="12">12 months (annual)</option>
                                                <option value="6">6 months</option>
                                                <option value="3">3 months</option>
                                                <option value="24">24 months</option>
                                            </select>
                                        </div>
                                    </div>
                                    {confirmDeleteId === fee.id ? (
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <button onClick={() => { onDeleteFee(fee.id); setConfirmDeleteId(null); }} className="px-2 py-1 text-xs rounded-md bg-red-600 text-white">Delete</button>
                                            <button onClick={() => setConfirmDeleteId(null)} className="px-2 py-1 text-xs rounded-md bg-slate-200 dark:bg-slate-600">Cancel</button>
                                        </div>
                                    ) : (
                                        <button onClick={() => setConfirmDeleteId(fee.id)} className="p-2 text-red-500 hover:text-red-700 flex-shrink-0" title="Delete registration"><TrashIcon /></button>
                                    )}
                                </div>
                            </div>

                            {/* Bills / notices */}
                            <div className="p-5 space-y-3">
                                {bills.length === 0 && <p className="text-sm text-slate-400 dark:text-gray-500">No notices logged yet.</p>}
                                {bills.map(bill => {
                                    const status = billStatus(bill);
                                    return (
                                        <div key={bill.id} className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg">
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
                                                <div>
                                                    <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">Amount ({sym || fee.currency || '—'})</label>
                                                    <input type="number" step="0.01" className={inputClass} value={bill.amountDue} onChange={e => patchBill(fee, bill.id, { amountDue: parseFloat(e.target.value) || 0 })} />
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">Due date</label>
                                                    <input type="date" className={inputClass} value={bill.dueDate} onChange={e => patchBill(fee, bill.id, { dueDate: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">Payment ref.</label>
                                                    <input className={inputClass} value={bill.reference || ''} placeholder="1-5510740618" onChange={e => patchBill(fee, bill.id, { reference: e.target.value || undefined })} />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`inline-block px-2 py-1 text-xs rounded-full font-medium ${status.color}`}>{status.text}</span>
                                                    {status.text !== 'Paid' && (
                                                        <button onClick={() => markPaid(fee, bill)} className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 hover:bg-green-200 font-medium" title="Mark paid & archive from the dashboard">
                                                            <CheckIcon /> Paid
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 mt-2 text-xs">
                                                {bill.paidAt && <span className="text-slate-400 dark:text-gray-500">Paid {bill.paidAt}</span>}
                                                {bill.document ? (
                                                    <button onClick={() => openDocument(bill.document!)} className="flex items-center gap-1 text-brand-primary hover:underline"><DocumentIcon /> Receipt</button>
                                                ) : (
                                                    <label className="flex items-center gap-1 text-slate-500 dark:text-gray-400 hover:text-brand-primary cursor-pointer">
                                                        <UploadIcon /> Attach receipt
                                                        <input type="file" className="hidden" accept="application/pdf,image/*" onChange={e => { const f = e.target.files?.[0]; if (f) attachReceipt(fee, bill.id, f); }} />
                                                    </label>
                                                )}
                                                <button onClick={() => removeBill(fee, bill.id)} className="text-red-500/70 hover:text-red-600 ml-auto">Remove</button>
                                            </div>
                                        </div>
                                    );
                                })}
                                <button onClick={() => addBill(fee)} className="flex items-center gap-1 text-sm font-semibold text-brand-primary hover:underline"><PlusIcon /> Add notice</button>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
};

export default RegistrationFeesPage;
