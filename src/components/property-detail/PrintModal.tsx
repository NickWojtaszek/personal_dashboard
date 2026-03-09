import React, { useState, useMemo, useRef } from 'react';
import type { PropertyInfo } from '../../types';

interface PrintModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (startYear: number, endYear: number) => void;
    property: PropertyInfo;
    title: string;
    confirmButtonText: string;
}

const InformationCircleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
);

const getAllYears = (property: PropertyInfo): number[] => {
    const years = new Set<number>();
    const currentYear = new Date().getFullYear();

    const addYear = (dateStr?: string | number) => {
        if (dateStr === null || dateStr === undefined) return;
        let year: number | undefined;

        if (typeof dateStr === 'number') {
            year = dateStr;
        } else {
             try {
                const date = new Date(dateStr);
                if (!isNaN(date.getTime())) {
                    year = date.getFullYear();
                }
            } catch (e) { /* ignore invalid dates */ }
        }
       
        if(year && year > 1990 && year <= currentYear + 10) {
            years.add(year);
        }
    };

    property.financials?.transactions?.forEach(t => addYear(t.date));
    property.mortgage?.payments?.forEach(p => addYear(p.date));
    property.operations?.tenancy?.agreements?.forEach(a => { addYear(a.leaseStart); addYear(a.leaseEnd); });
    property.operations?.maintenance?.jobs?.forEach(j => addYear(j.date));
    property.operations?.maintenance?.equipment?.forEach(e => addYear(e.date));
    property.operations?.leaseholdCharges?.serviceCharges?.forEach(sc => addYear(sc.year));
    property.operations?.leaseholdCharges?.groundRent?.forEach(gr => addYear(gr.year));
    property.operations?.leaseholdCharges?.councilTax?.forEach(ct => addYear(ct.year));
    property.operations?.compliance?.eicr?.checks?.forEach(c => addYear(c.date));
    property.operations?.compliance?.gasSafety?.checks?.forEach(c => addYear(c.date));
    property.operations?.compliance?.insurance?.policies?.forEach(p => { addYear(p.startDate); addYear(p.endDate); });
    property.correspondence?.forEach(c => addYear(c.date));

    if (years.size === 0) {
        years.add(currentYear);
    }

    return Array.from(years).sort((a, b) => b - a);
};


const PrintModal: React.FC<PrintModalProps> = ({ isOpen, onClose, onConfirm, property, title, confirmButtonText }) => {
    const availableYears = useMemo(() => getAllYears(property), [property]);
    
    const [startYear, setStartYear] = useState(availableYears[availableYears.length - 1] || new Date().getFullYear());
    const [endYear, setEndYear] = useState(availableYears[0] || new Date().getFullYear());
    const mouseDownTarget = useRef<EventTarget | null>(null);

    if (!isOpen) return null;
    
    const handleConfirmClick = () => {
        onConfirm(startYear, endYear);
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        mouseDownTarget.current = e.target;
    };

    const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget && mouseDownTarget.current === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div 
            className="fixed inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" 
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
        >
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md m-4 border border-slate-200 dark:border-slate-700">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
                    <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">Select a date range to include in the file.</p>
                </div>
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="startYear" className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-1">From Year</label>
                            <select
                                id="startYear"
                                value={startYear}
                                onChange={(e) => setStartYear(Number(e.target.value))}
                                className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition"
                            >
                                {availableYears.slice().reverse().map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>
                         <div>
                            <label htmlFor="endYear" className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-1">To Year</label>
                            <select
                                id="endYear"
                                value={endYear}
                                onChange={(e) => setEndYear(Number(e.target.value))}
                                className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition"
                            >
                                {availableYears.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                     {startYear > endYear && <p className="text-sm text-red-500 text-center">"From" year cannot be after "To" year.</p>}

                     {confirmButtonText.includes('Print') && (
                        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg flex items-start gap-3">
                            <div className="flex-shrink-0 text-blue-500 dark:text-blue-400 pt-0.5">
                                <InformationCircleIcon />
                            </div>
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                                <strong>Tip:</strong> This will open your browser's print dialog. To save the report as a file, choose <strong>"Save as PDF"</strong> from your printer/destination list.
                            </p>
                        </div>
                    )}
                </div>
                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end space-x-3 rounded-b-xl">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">Cancel</button>
                    <button type="button" onClick={handleConfirmClick} disabled={startYear > endYear} className="px-4 py-2 rounded-lg bg-brand-primary text-white font-semibold hover:bg-opacity-90 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed">
                        {confirmButtonText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PrintModal;