import React, { useState, useEffect } from 'react';
import type { VehicleInfo } from '../../types';

const CURRENCY_SYMBOLS: Record<string, string> = { GBP: '\u00a3', USD: '$', AUD: 'A$', EUR: '\u20ac', PLN: 'z\u0142' };

const DollarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>;
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>;
const SaveIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9 3.75H6.912a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H15M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.012-1.244h3.86M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>;

const TERMS = ['1 Month', '3 Months', '6 Months', '12 Months'];
const CURRENCIES = ['AUD', 'GBP', 'USD', 'EUR', 'PLN'];

interface RegoCostsSectionProps {
    vehicle: VehicleInfo;
    isEditing: boolean;
    onSetEditing: () => void;
    onSave: (vehicle: VehicleInfo) => void;
    onCancel: () => void;
}

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition" />;
const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => <label className="block text-xs font-medium text-slate-600 dark:text-gray-300 mb-1">{children}</label>;

const CostItem: React.FC<{ label: string; value?: number; currency?: string }> = ({ label, value, currency }) => {
    const sym = CURRENCY_SYMBOLS[currency || 'AUD'] || '$';
    return (
        <div>
            <p className="text-sm text-slate-500 dark:text-gray-400">{label}</p>
            <p className="font-medium text-slate-800 dark:text-gray-200">
                {typeof value === 'number' ? `${sym}${value.toFixed(2)}` : 'N/A'}
            </p>
        </div>
    );
};

const RegoCostsSection: React.FC<RegoCostsSectionProps> = ({ vehicle, isEditing, onSetEditing, onSave, onCancel }) => {
    const [editedData, setEditedData] = useState<VehicleInfo>(vehicle);

    useEffect(() => {
        if (isEditing) setEditedData(vehicle);
    }, [vehicle, isEditing]);

    const handleNumberChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setEditedData(prev => ({ ...prev, [field]: val === '' ? undefined : parseFloat(val) }));
    };

    const handleSave = () => onSave(editedData);

    const sym = CURRENCY_SYMBOLS[vehicle.currency || 'AUD'] || '$';

    if (isEditing) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-brand-primary/50 dark:border-brand-secondary/50">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold flex items-center gap-3"><DollarIcon /> Editing Costs & Fees</h2>
                </div>
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <Label>Total Amount</Label>
                        <Input type="number" step="0.01" value={editedData.totalAmount ?? ''} onChange={handleNumberChange('totalAmount')} />
                    </div>
                    <div>
                        <Label>CTP Premium</Label>
                        <Input type="number" step="0.01" value={editedData.ctpAmount ?? ''} onChange={handleNumberChange('ctpAmount')} />
                    </div>
                    <div>
                        <Label>Registration Fee</Label>
                        <Input type="number" step="0.01" value={editedData.registrationFee ?? ''} onChange={handleNumberChange('registrationFee')} />
                    </div>
                    <div>
                        <Label>Traffic Improvement Fee</Label>
                        <Input type="number" step="0.01" value={editedData.trafficImprovementFee ?? ''} onChange={handleNumberChange('trafficImprovementFee')} />
                    </div>
                    <div>
                        <Label>Term</Label>
                        <select value={editedData.term || ''} onChange={e => setEditedData(prev => ({ ...prev, term: e.target.value as any }))} className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary outline-none transition">
                            <option value="">Select...</option>
                            {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div>
                        <Label>Currency</Label>
                        <select value={editedData.currency || 'AUD'} onChange={e => setEditedData(prev => ({ ...prev, currency: e.target.value }))} className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary outline-none transition">
                            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <Label>CTP Insurer</Label>
                        <Input value={editedData.ctpInsurer || ''} onChange={e => setEditedData(prev => ({ ...prev, ctpInsurer: e.target.value }))} />
                    </div>
                    <div>
                        <Label>CTP Class</Label>
                        <Input value={editedData.ctpClass || ''} onChange={e => setEditedData(prev => ({ ...prev, ctpClass: e.target.value }))} />
                    </div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                    <button onClick={onCancel} className="px-4 py-2 rounded-lg bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">Cancel</button>
                    <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-primary text-white font-semibold hover:bg-opacity-90 transition-colors"><SaveIcon /> Save Changes</button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-3"><DollarIcon /> Costs & Fees</h2>
                <button onClick={onSetEditing} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/50 text-sm font-semibold text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"><EditIcon /><span>Edit</span></button>
            </div>
            <div className="p-6">
                {/* Total highlight */}
                {typeof vehicle.totalAmount === 'number' && (
                    <div className="mb-5 p-4 bg-gradient-to-r from-brand-primary/10 to-brand-secondary/10 dark:from-brand-primary/20 dark:to-brand-secondary/20 rounded-lg">
                        <p className="text-sm text-slate-600 dark:text-gray-400">Total Renewal Cost {vehicle.term ? `(${vehicle.term})` : ''}</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{sym}{vehicle.totalAmount.toFixed(2)}</p>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <CostItem label="CTP Premium" value={vehicle.ctpAmount} currency={vehicle.currency} />
                    <CostItem label="Registration Fee" value={vehicle.registrationFee} currency={vehicle.currency} />
                    <CostItem label="Traffic Improvement Fee" value={vehicle.trafficImprovementFee} currency={vehicle.currency} />
                    <div>
                        <p className="text-sm text-slate-500 dark:text-gray-400">Term</p>
                        <p className="font-medium text-slate-800 dark:text-gray-200">{vehicle.term || 'N/A'}</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 dark:text-gray-400">CTP Insurer</p>
                        <p className="font-medium text-slate-800 dark:text-gray-200">{vehicle.ctpInsurer || 'N/A'}</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 dark:text-gray-400">CTP Class</p>
                        <p className="font-medium text-slate-800 dark:text-gray-200">{vehicle.ctpClass || 'N/A'}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RegoCostsSection;
