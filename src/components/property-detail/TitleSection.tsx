import React, { useState, useEffect } from 'react';
import type { PropertyInfo, PropertyTitle, TitleEncumbrance } from '../../types';
import { EditIcon, SaveIcon } from './Icons';

const DocumentIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
);

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
);

const PlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
);

interface TitleSectionProps {
    property: PropertyInfo;
    isEditing: boolean;
    onSetEditing: () => void;
    onSave: (property: PropertyInfo) => void;
    onCancel: () => void;
}

const DetailItem: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
    <div>
        <p className="text-xs text-slate-500 dark:text-gray-400">{label}</p>
        <p className="text-sm font-medium text-slate-800 dark:text-gray-200 break-words">{value || <span className="text-slate-400 dark:text-gray-500">N/A</span>}</p>
    </div>
);

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition" />
);

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <label className="block text-xs font-medium text-slate-600 dark:text-gray-300 mb-1">{children}</label>
);

const TitleSection: React.FC<TitleSectionProps> = ({ property, isEditing, onSetEditing, onSave, onCancel }) => {
    const [editedTitle, setEditedTitle] = useState<PropertyTitle>(property.title || {});

    useEffect(() => {
        if (isEditing) setEditedTitle(JSON.parse(JSON.stringify(property.title || {})));
    }, [property.title, isEditing]);

    const handleChange = (field: keyof PropertyTitle, value: string) => {
        setEditedTitle(prev => ({ ...prev, [field]: value || undefined }));
    };

    const handleEncumbranceChange = (index: number, field: keyof TitleEncumbrance, value: string) => {
        setEditedTitle(prev => {
            const enc = [...(prev.encumbrances || [])];
            enc[index] = { ...enc[index], [field]: value || undefined };
            return { ...prev, encumbrances: enc };
        });
    };

    const addEncumbrance = () => {
        setEditedTitle(prev => ({
            ...prev,
            encumbrances: [...(prev.encumbrances || []), { type: '' }],
        }));
    };

    const removeEncumbrance = (index: number) => {
        setEditedTitle(prev => ({
            ...prev,
            encumbrances: (prev.encumbrances || []).filter((_, i) => i !== index),
        }));
    };

    const handleSave = () => {
        const updated = JSON.parse(JSON.stringify(property)) as PropertyInfo;
        updated.title = editedTitle;
        onSave(updated);
    };

    const title = property.title;
    const hasData = title && (title.titleReference || title.registeredOwner || title.estate);

    if (isEditing) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-brand-primary/50 dark:border-brand-secondary/50">
                <div className="p-5 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-lg font-bold flex items-center gap-2"><DocumentIcon /> Editing Title / Deed</h2>
                </div>
                <div className="p-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div><Label>Title Reference</Label><Input value={editedTitle.titleReference || ''} onChange={e => handleChange('titleReference', e.target.value)} /></div>
                        <div><Label>Date Created</Label><Input type="date" value={editedTitle.dateCreated || ''} onChange={e => handleChange('dateCreated', e.target.value)} /></div>
                        <div><Label>Previous Title</Label><Input value={editedTitle.previousTitle || ''} onChange={e => handleChange('previousTitle', e.target.value)} /></div>
                        <div><Label>Estate Type</Label><Input value={editedTitle.estate || ''} onChange={e => handleChange('estate', e.target.value)} placeholder="e.g. Estate in Fee Simple" /></div>
                        <div className="col-span-full"><Label>Lot / Plan</Label><Input value={editedTitle.lotPlan || ''} onChange={e => handleChange('lotPlan', e.target.value)} /></div>
                        <div><Label>Local Government</Label><Input value={editedTitle.localGovernment || ''} onChange={e => handleChange('localGovernment', e.target.value)} /></div>
                        <div><Label>Search Date</Label><Input type="date" value={editedTitle.searchDate || ''} onChange={e => handleChange('searchDate', e.target.value)} /></div>
                    </div>

                    <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                        <h3 className="text-sm font-semibold text-slate-600 dark:text-gray-300 mb-2">Registered Owner</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="col-span-full"><Label>Owner Name</Label><Input value={editedTitle.registeredOwner || ''} onChange={e => handleChange('registeredOwner', e.target.value)} /></div>
                            <div><Label>Ownership Date</Label><Input type="date" value={editedTitle.ownershipDate || ''} onChange={e => handleChange('ownershipDate', e.target.value)} /></div>
                            <div><Label>Dealing Number</Label><Input value={editedTitle.dealingNumber || ''} onChange={e => handleChange('dealingNumber', e.target.value)} /></div>
                        </div>
                    </div>

                    <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-semibold text-slate-600 dark:text-gray-300">Encumbrances</h3>
                            <button onClick={addEncumbrance} className="flex items-center gap-1 text-xs text-brand-primary hover:text-brand-primary/80 font-semibold">
                                <PlusIcon /> Add
                            </button>
                        </div>
                        <div className="space-y-3">
                            {(editedTitle.encumbrances || []).map((enc, i) => (
                                <div key={i} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-600 space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <div><Label>Type</Label><Input value={enc.type || ''} onChange={e => handleEncumbranceChange(i, 'type', e.target.value)} placeholder="e.g. Mortgage" /></div>
                                            <div><Label>Reference</Label><Input value={enc.reference || ''} onChange={e => handleEncumbranceChange(i, 'reference', e.target.value)} /></div>
                                            <div><Label>Date</Label><Input type="date" value={enc.date || ''} onChange={e => handleEncumbranceChange(i, 'date', e.target.value)} /></div>
                                            <div><Label>Party</Label><Input value={enc.party || ''} onChange={e => handleEncumbranceChange(i, 'party', e.target.value)} /></div>
                                            <div className="col-span-full"><Label>Details</Label><Input value={enc.details || ''} onChange={e => handleEncumbranceChange(i, 'details', e.target.value)} /></div>
                                        </div>
                                        <button onClick={() => removeEncumbrance(i)} className="mt-5 p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                            <TrashIcon />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                        <Label>Community/Management Statements (comma-separated)</Label>
                        <Input
                            value={(editedTitle.communityStatements || []).join(', ')}
                            onChange={e => setEditedTitle(prev => ({
                                ...prev,
                                communityStatements: e.target.value ? e.target.value.split(',').map(s => s.trim()).filter(Boolean) : undefined,
                            }))}
                            placeholder="e.g. 53063, 52596"
                        />
                    </div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                    <button onClick={onCancel} className="px-4 py-2 rounded-lg bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">Cancel</button>
                    <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-primary text-white font-semibold hover:bg-opacity-90 transition-colors">
                        <SaveIcon /> Save Changes
                    </button>
                </div>
            </div>
        );
    }

    if (!hasData) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h2 className="text-lg font-bold flex items-center gap-2"><DocumentIcon /> Title / Deed</h2>
                    <button onClick={onSetEditing} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/50 text-sm font-semibold text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                        <EditIcon /><span>Edit</span>
                    </button>
                </div>
                <div className="p-5">
                    <p className="text-sm text-slate-400 dark:text-gray-500 italic">No title data. Upload a title search PDF via the AI Assistant or edit manually.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <h2 className="text-lg font-bold flex items-center gap-2"><DocumentIcon /> Title / Deed</h2>
                <button onClick={onSetEditing} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/50 text-sm font-semibold text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                    <EditIcon /><span>Edit</span>
                </button>
            </div>
            <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <DetailItem label="Title Reference" value={title!.titleReference} />
                    <DetailItem label="Estate" value={title!.estate} />
                    {title!.lotPlan && <div className="col-span-2"><DetailItem label="Lot / Plan" value={title!.lotPlan} /></div>}
                    <DetailItem label="Local Government" value={title!.localGovernment} />
                    {title!.dateCreated && <DetailItem label="Title Created" value={title!.dateCreated} />}
                </div>

                <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                    <h3 className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-2">Registered Owner</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2"><DetailItem label="Name" value={title!.registeredOwner} /></div>
                        {title!.ownershipDate && <DetailItem label="Ownership Date" value={title!.ownershipDate} />}
                        {title!.dealingNumber && <DetailItem label="Dealing No." value={title!.dealingNumber} />}
                    </div>
                </div>

                {title!.encumbrances && title!.encumbrances.length > 0 && (
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                        <h3 className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-2">Encumbrances & Interests</h3>
                        <div className="space-y-2">
                            {title!.encumbrances.map((enc, i) => (
                                <div key={i} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-600">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 font-semibold">{enc.type}</span>
                                        {enc.reference && <span className="text-[11px] text-slate-500 dark:text-gray-400">#{enc.reference}</span>}
                                    </div>
                                    <div className="text-xs text-slate-600 dark:text-gray-400 space-y-0.5">
                                        {enc.party && <p>{enc.party}</p>}
                                        {enc.date && <p className="text-slate-400">{enc.date}</p>}
                                        {enc.details && <p className="italic">{enc.details}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {title!.communityStatements && title!.communityStatements.length > 0 && (
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                        <h3 className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-2">Community Statements</h3>
                        <div className="flex flex-wrap gap-2">
                            {title!.communityStatements.map((ref, i) => (
                                <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium border border-blue-200 dark:border-blue-800/30">
                                    {ref}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {title!.searchDate && (
                    <p className="text-[11px] text-slate-400 dark:text-gray-500 pt-2 border-t border-slate-200 dark:border-slate-700">
                        Title search conducted: {title!.searchDate}
                        {title!.previousTitle && <span className="ml-3">Previous title: {title!.previousTitle}</span>}
                    </p>
                )}
            </div>
        </div>
    );
};

export default TitleSection;
