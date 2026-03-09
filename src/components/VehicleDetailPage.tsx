import React, { useState } from 'react';
import type { VehicleInfo } from '../types';
import VehicleInfoSection from './vehicle-detail/VehicleInfoSection';

const BackIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>);

export type EditableVehicleSection = 'info' | null;

interface VehicleDetailPageProps {
    vehicle: VehicleInfo;
    onBack: () => void;
    onSaveVehicle: (vehicle: VehicleInfo) => void;
}

const VehicleDetailPage: React.FC<VehicleDetailPageProps> = ({ vehicle, onBack, onSaveVehicle }) => {
    const [editingSection, setEditingSection] = useState<EditableVehicleSection>(null);

    const handleSave = (updatedVehicle: VehicleInfo) => {
        onSaveVehicle(updatedVehicle);
        setEditingSection(null);
    };

    const handleCancel = () => {
        setEditingSection(null);
    };

    const handleSetEditing = (section: EditableVehicleSection) => {
        setEditingSection(current => current === section ? null : section);
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-gray-300 hover:text-brand-primary dark:hover:text-brand-secondary transition-colors">
                    <BackIcon />
                    Back to All Vehicles
                </button>
            </div>

            <header className="pb-4 border-b border-slate-200 dark:border-slate-700">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{vehicle.name}</h1>
                <p className="text-lg text-slate-500 dark:text-gray-400 mt-1">Rego: {vehicle.rego} ({vehicle.state})</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                <div className="md:col-span-2">
                    <VehicleInfoSection
                        vehicle={vehicle}
                        isEditing={editingSection === 'info'}
                        onSetEditing={() => handleSetEditing('info')}
                        onSave={handleSave}
                        onCancel={handleCancel}
                    />
                </div>
                <div className="md:col-span-1 space-y-8">
                    {/* Placeholder for future sections like AI assistant or documents */}
                </div>
            </div>
        </div>
    );
};

export default VehicleDetailPage;
