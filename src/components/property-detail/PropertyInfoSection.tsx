
import React, { useState, useEffect } from 'react';
import type { PropertyInfo } from '../../types';
import { BedIcon, BathIcon, CarIcon, BoxIcon, BuildingIcon, ListIcon, EditIcon, SaveIcon } from './Icons';

interface PropertyInfoSectionProps {
    property: PropertyInfo;
    isEditing: boolean;
    onSetEditing: () => void;
    onSave: (property: PropertyInfo) => void;
    onCancel: () => void;
}

const DetailItem: React.FC<{ label: string; value?: string | number | null; children?: React.ReactNode; }> = ({ label, value, children }) => (
    <div>
        <p className="text-sm text-slate-500 dark:text-gray-400">{label}</p>
        {value ? <p className="font-medium text-slate-800 dark:text-gray-200">{value}</p> : children}
    </div>
);

const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; }> = ({ title, icon, children }) => (
    <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-gray-300 mb-3 uppercase tracking-wider">
            {icon} {title}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {children}
        </div>
    </div>
);

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition" />
);

const Label: React.FC<{ htmlFor?: string, children: React.ReactNode }> = ({ htmlFor, children }) => (
    <label htmlFor={htmlFor} className="block text-xs font-medium text-slate-600 dark:text-gray-300 mb-1">{children}</label>
);

const PropertyInfoSection: React.FC<PropertyInfoSectionProps> = ({ property, isEditing, onSetEditing, onSave, onCancel }) => {
    const [editedData, setEditedData] = useState<PropertyInfo>(property);
    
    useEffect(() => {
        if(isEditing) {
            setEditedData(property);
        }
    }, [property, isEditing]);

    const handleNestedChange = (path: string, value: any) => {
        setEditedData(prev => {
            const keys = path.split('.');
            const newState = JSON.parse(JSON.stringify(prev));
            let current = newState;
            for (let i = 0; i < keys.length - 1; i++) {
                if (!current[keys[i]]) current[keys[i]] = {};
                current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = value;
            return newState;
        });
    };

    const handleSave = () => {
        onSave(editedData);
    };

    const commonInputChange = (e: React.ChangeEvent<HTMLInputElement>) => handleNestedChange(e.target.name, e.target.value);
    const numericInputChange = (e: React.ChangeEvent<HTMLInputElement>) => handleNestedChange(e.target.name, e.target.value === '' ? undefined : parseFloat(e.target.value));


    if(isEditing) {
        return (
             <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-brand-primary/50 dark:border-brand-secondary/50">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold flex items-center gap-3"><BuildingIcon /> Editing Property Info</h2>
                </div>
                <div className="p-6 space-y-6">
                     <Section title="Overview" icon={<ListIcon />}>
                        <div><Label htmlFor="overview.address">Full Address</Label><Input type="text" name="overview.address" value={editedData.overview?.address || ''} onChange={commonInputChange} /></div>
                        <div><Label htmlFor="overview.propertyType">Property Type</Label><Input type="text" name="overview.propertyType" value={editedData.overview?.propertyType || ''} onChange={commonInputChange} /></div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 col-span-full">
                            <div><Label>Beds</Label><Input type="number" name="overview.configuration.beds" value={editedData.overview?.configuration?.beds || ''} onChange={numericInputChange} /></div>
                            <div><Label>Baths</Label><Input type="number" name="overview.configuration.baths" value={editedData.overview?.configuration?.baths || ''} onChange={numericInputChange} /></div>
                            <div><Label>Parking</Label><Input type="number" name="overview.configuration.parking" value={editedData.overview?.configuration?.parking || ''} onChange={numericInputChange} /></div>
                            <div><Label>Storage</Label><Input type="number" name="overview.configuration.storage" value={editedData.overview?.configuration?.storage || ''} onChange={numericInputChange} /></div>
                        </div>
                    </Section>
                    <Section title="Details" icon={<ListIcon />}>
                        <div><Label>Complex/Building Name</Label><Input type="text" name="details.complexName" value={editedData.details?.complexName || ''} onChange={commonInputChange} /></div>
                        <div><Label>Unit/Lot Number</Label><Input type="text" name="details.unitLotNumber" value={editedData.details?.unitLotNumber || ''} onChange={commonInputChange} /></div>
                    </Section>
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


    const { overview, details } = property;
    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-3"><BuildingIcon /> Property Info</h2>
                <button
                    onClick={onSetEditing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/50 text-sm font-semibold text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                    <EditIcon />
                    <span>Edit</span>
                </button>
            </div>
            <div className="p-6 space-y-6">
                <Section title="Overview" icon={<ListIcon />}>
                    <DetailItem label="Address" value={overview?.address} />
                    <DetailItem label="Property Type" value={overview?.propertyType} />
                    <DetailItem label="Configuration">
                        <div className="flex items-center gap-4 text-slate-800 dark:text-gray-200 font-medium">
                            <span className="flex items-center gap-1"><BedIcon /> {overview?.configuration?.beds ?? 'N/A'}</span>
                            <span className="flex items-center gap-1"><BathIcon /> {overview?.configuration?.baths ?? 'N/A'}</span>
                            <span className="flex items-center gap-1"><CarIcon /> {overview?.configuration?.parking ?? 'N/A'}</span>
                            <span className="flex items-center gap-1"><BoxIcon /> {overview?.configuration?.storage ?? 'N/A'}</span>
                        </div>
                    </DetailItem>
                </Section>
                <Section title="Details" icon={<ListIcon />}>
                    <DetailItem label="Complex/Building Name" value={details?.complexName} />
                    <DetailItem label="Unit/Lot Number" value={details?.unitLotNumber} />
                    <DetailItem label="Property Features">
                        {details?.features && details.features.length > 0 ? (
                             <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-300">
                                {details.features.map((feature, i) => <li key={i}>{feature}</li>)}
                            </ul>
                        ) : <p className="text-sm text-slate-500 dark:text-gray-400">Not specified.</p>}
                    </DetailItem>
                </Section>
            </div>
        </div>
    );
};

export default PropertyInfoSection;