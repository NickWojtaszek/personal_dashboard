import React, { useState, useEffect } from 'react';
import type { VehicleInfo } from '../../types';

const VehicleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v.958m12 0a2.25 2.25 0 0 1-2.25 2.25H4.5a2.25 2.25 0 0 1-2.25-2.25m15-3.375-3 3m0 0-3-3m3 3v11.25m6-16.5l-3 3m0 0-3-3m3 3V7.5" /></svg>;
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>;
const SaveIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9 3.75H6.912a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H15M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.012-1.244h3.86M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>;

interface VehicleInfoSectionProps {
    vehicle: VehicleInfo;
    isEditing: boolean;
    onSetEditing: () => void;
    onSave: (vehicle: VehicleInfo) => void;
    onCancel: () => void;
}

const DetailItem: React.FC<{ label: string; value?: string | number | null; className?: string }> = ({ label, value, className }) => (
    <div className={className}>
        <p className="text-sm text-slate-500 dark:text-gray-400">{label}</p>
        <p className="font-medium text-slate-800 dark:text-gray-200 break-words">{value || 'N/A'}</p>
    </div>
);

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition" />;
const Label: React.FC<{ htmlFor?: string, children: React.ReactNode }> = ({ htmlFor, children }) => <label htmlFor={htmlFor} className="block text-xs font-medium text-slate-600 dark:text-gray-300 mb-1">{children}</label>;

const VehicleInfoSection: React.FC<VehicleInfoSectionProps> = ({ vehicle, isEditing, onSetEditing, onSave, onCancel }) => {
    const [editedData, setEditedData] = useState<VehicleInfo>(vehicle);
    
    useEffect(() => {
        if(isEditing) {
            setEditedData(vehicle);
        }
    }, [vehicle, isEditing]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setEditedData(prev => ({ ...prev, [name]: type === 'number' ? (value === '' ? undefined : parseInt(value)) : value }));
    };

    const handleSave = () => {
        onSave(editedData);
    };

    if(isEditing) {
        return (
             <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-brand-primary/50 dark:border-brand-secondary/50">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold flex items-center gap-3"><VehicleIcon /> Editing Vehicle Information</h2>
                </div>
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><Label>Name</Label><Input name="name" value={editedData.name} onChange={handleInputChange} /></div>
                    <div><Label>Rego</Label><Input name="rego" value={editedData.rego} onChange={handleInputChange} /></div>
                    <div><Label>State</Label><Input name="state" value={editedData.state} onChange={handleInputChange} /></div>
                    <div><Label>Expiry Date</Label><Input type="date" name="expiryDate" value={editedData.expiryDate} onChange={handleInputChange} /></div>
                    <div><Label>Make</Label><Input name="make" value={editedData.make || ''} onChange={handleInputChange} /></div>
                    <div><Label>Model</Label><Input name="model" value={editedData.model || ''} onChange={handleInputChange} /></div>
                    <div><Label>Year</Label><Input type="number" name="year" value={editedData.year || ''} onChange={handleInputChange} /></div>
                    <div className="sm:col-span-2"><Label>VIN</Label><Input name="vin" value={editedData.vin || ''} onChange={handleInputChange} /></div>
                </div>
                 <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                    <button onClick={onCancel} className="px-4 py-2 rounded-lg bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">Cancel</button>
                    <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-primary text-white font-semibold hover:bg-opacity-90 transition-colors">
                        <SaveIcon />
                        Save Changes
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-3"><VehicleIcon /> Vehicle Information</h2>
                <button
                    onClick={onSetEditing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/50 text-sm font-semibold text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                    <EditIcon />
                    <span>Edit</span>
                </button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <DetailItem label="Registration (Rego)" value={vehicle.rego} />
                <DetailItem label="State/Country" value={vehicle.state} />
                <DetailItem label="Expiry Date" value={new Date(vehicle.expiryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} />
                <DetailItem label="Make" value={vehicle.make} />
                <DetailItem label="Model" value={vehicle.model} />
                <DetailItem label="Year" value={vehicle.year} />
                <DetailItem label="VIN" value={vehicle.vin} className="sm:col-span-2" />
            </div>
        </div>
    );
};

export default VehicleInfoSection;
