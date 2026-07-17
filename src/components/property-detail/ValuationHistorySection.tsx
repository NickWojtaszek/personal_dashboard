import React, { useMemo, useState } from 'react';
import type { PropertyInfo, PropertyValuation } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { deriveCapRate, sortValuations, valueChangePct } from '../../lib/valuation';
import { parseLocalDate, toLocalISO, todayLocal } from '../../lib/dates';
import { PlusIcon, TrashIcon } from './Icons';

const CURRENCY_SYMBOLS: Record<string, string> = { AUD: '$', USD: '$', GBP: '£', EUR: '€', NZD: '$', PLN: 'zł' };

interface Props {
    property: PropertyInfo;
    onSave: (property: PropertyInfo) => void;
}

const inputClass = 'w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary outline-none transition';

// Minimal, theme-aware value trend line (no external chart lib).
const Sparkline: React.FC<{ points: { x: number; y: number }[] }> = ({ points }) => {
    if (points.length < 2) return null;
    const W = 100, H = 32;
    const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x * W} ${H - p.y * H}`).join(' ');
    return (
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-14">
            <path d={path} fill="none" stroke="currentColor" strokeWidth={1.5} className="text-brand-primary" vectorEffect="non-scaling-stroke" />
            {points.map((p, i) => (
                <circle key={i} cx={p.x * W} cy={H - p.y * H} r={1.6} className="fill-brand-primary" vectorEffect="non-scaling-stroke" />
            ))}
        </svg>
    );
};

const ValuationHistorySection: React.FC<Props> = ({ property, onSave }) => {
    const sym = CURRENCY_SYMBOLS[property.financials?.currency || 'AUD'] || '$';
    const valuations = useMemo(() => sortValuations(property.financials?.valuations || []), [property.financials?.valuations]);

    const [showAdd, setShowAdd] = useState(false);
    const [draft, setDraft] = useState<Partial<PropertyValuation>>({ date: toLocalISO(todayLocal()), source: 'Manual' });

    const save = (list: PropertyValuation[]) =>
        onSave({ ...property, financials: { ...property.financials, valuations: list } });

    const addEntry = () => {
        if (!draft.date) return;
        const entry: PropertyValuation = {
            id: uuidv4(),
            date: draft.date,
            value: draft.value ? Number(draft.value) : undefined,
            rentPerWeek: draft.rentPerWeek ? Number(draft.rentPerWeek) : undefined,
            capRate: draft.capRate ? Number(draft.capRate) : undefined,
            source: draft.source || undefined,
            notes: draft.notes || undefined,
        };
        save([...(property.financials?.valuations || []), entry]);
        setDraft({ date: toLocalISO(todayLocal()), source: 'Manual' });
        setShowAdd(false);
    };

    const removeEntry = (id: string) =>
        save((property.financials?.valuations || []).filter(v => v.id !== id));

    const change = valueChangePct(valuations);

    // Normalised chart points from the value series.
    const points = useMemo(() => {
        const vals = valuations.filter(v => typeof v.value === 'number');
        if (vals.length < 2) return [];
        const times = vals.map(v => parseLocalDate(v.date)?.getTime() ?? 0);
        const minT = Math.min(...times), maxT = Math.max(...times);
        const amts = vals.map(v => v.value!);
        const minV = Math.min(...amts), maxV = Math.max(...amts);
        return vals.map((v, i) => ({
            x: maxT === minT ? i / (vals.length - 1) : (times[i] - minT) / (maxT - minT),
            y: maxV === minV ? 0.5 : (v.value! - minV) / (maxV - minV),
        }));
    }, [valuations]);

    const fmt = (n?: number) => (typeof n === 'number' ? `${sym}${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—');

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Value &amp; rent history</h2>
                    {change !== null && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${change >= 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'}`}>
                            {change >= 0 ? '+' : ''}{change.toFixed(1)}% since first
                        </span>
                    )}
                </div>
                <button onClick={() => setShowAdd(s => !s)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:bg-opacity-90 transition-colors">
                    <PlusIcon /> Add snapshot
                </button>
            </div>

            <div className="p-5 space-y-4">
                {points.length >= 2 && (
                    <div className="text-slate-400 dark:text-slate-500"><Sparkline points={points} /></div>
                )}

                {showAdd && (
                    <div className="p-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 grid grid-cols-2 md:grid-cols-3 gap-2.5">
                        <label className="text-xs text-slate-500 dark:text-slate-400">Date
                            <input type="date" className={inputClass} value={draft.date || ''} onChange={e => setDraft(d => ({ ...d, date: e.target.value }))} />
                        </label>
                        <label className="text-xs text-slate-500 dark:text-slate-400">Market value ({sym})
                            <input type="number" className={inputClass} value={draft.value ?? ''} onChange={e => setDraft(d => ({ ...d, value: e.target.value ? Number(e.target.value) : undefined }))} />
                        </label>
                        <label className="text-xs text-slate-500 dark:text-slate-400">Est. rent ({sym}/wk)
                            <input type="number" className={inputClass} value={draft.rentPerWeek ?? ''} onChange={e => setDraft(d => ({ ...d, rentPerWeek: e.target.value ? Number(e.target.value) : undefined }))} />
                        </label>
                        <label className="text-xs text-slate-500 dark:text-slate-400">Cap rate % (optional)
                            <input type="number" step="0.1" className={inputClass} placeholder="auto from rent" value={draft.capRate ?? ''} onChange={e => setDraft(d => ({ ...d, capRate: e.target.value ? Number(e.target.value) : undefined }))} />
                        </label>
                        <label className="text-xs text-slate-500 dark:text-slate-400">Source
                            <input className={inputClass} placeholder="Domain / realEstimate / Manual" value={draft.source || ''} onChange={e => setDraft(d => ({ ...d, source: e.target.value }))} />
                        </label>
                        <div className="flex items-end gap-2">
                            <button onClick={addEntry} className="px-3 py-1.5 rounded-lg bg-brand-primary text-white text-sm font-semibold">Save</button>
                            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-600 text-sm">Cancel</button>
                        </div>
                    </div>
                )}

                {valuations.length === 0 ? (
                    <p className="text-sm text-slate-400 dark:text-slate-500">No snapshots yet. Add one from a Domain/realEstimate value or a bank valuation to start a trend.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                                    <th className="py-2 pr-3">Date</th>
                                    <th className="py-2 pr-3 text-right">Value</th>
                                    <th className="py-2 pr-3 text-right">Rent /wk</th>
                                    <th className="py-2 pr-3 text-right">Cap rate</th>
                                    <th className="py-2 pr-3">Source</th>
                                    <th className="py-2"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {[...valuations].reverse().map(v => {
                                    const cap = deriveCapRate(v);
                                    return (
                                        <tr key={v.id} className="border-b border-slate-100 dark:border-slate-700/50">
                                            <td className="py-2 pr-3 text-slate-700 dark:text-slate-300">{v.date}</td>
                                            <td className="py-2 pr-3 text-right font-medium text-slate-800 dark:text-slate-200">{fmt(v.value)}</td>
                                            <td className="py-2 pr-3 text-right text-slate-600 dark:text-slate-400">{v.rentPerWeek ? `${sym}${v.rentPerWeek.toLocaleString()}` : '—'}</td>
                                            <td className="py-2 pr-3 text-right text-slate-600 dark:text-slate-400">{cap !== null ? `${cap.toFixed(1)}%` : '—'}</td>
                                            <td className="py-2 pr-3 text-slate-500 dark:text-slate-400">{v.source || '—'}</td>
                                            <td className="py-2 text-right">
                                                <button onClick={() => removeEntry(v.id)} className="p-1 text-red-500/70 hover:text-red-600"><TrashIcon /></button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ValuationHistorySection;
