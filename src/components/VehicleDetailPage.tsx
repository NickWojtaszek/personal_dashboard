import React, { useState, useEffect } from 'react';
import type { VehicleInfo, Document } from '../types';
import VehicleInfoSection from './vehicle-detail/VehicleInfoSection';
import RegoCostsSection from './vehicle-detail/RegoCostsSection';
import RegoHistorySection from './vehicle-detail/RegoHistorySection';
import RegoAIAssistantSection from './vehicle-detail/RegoAIAssistantSection';
import type { RegoExtractedData } from './vehicle-detail/RegoAIAssistantSection';
import type { RegoDocType } from './NewRegistrationModal';
import PolicyProgressBar from './insurance-detail/PolicyProgressBar';
import { BackIcon, TrashIcon, DocumentIcon } from './Icons';

export type EditableVehicleSection = 'info' | 'costs' | null;

interface VehicleDetailPageProps {
    vehicle: VehicleInfo;
    onBack: () => void;
    onSaveVehicle: (vehicle: VehicleInfo) => void;
    onDeleteVehicle?: (id: string) => void;
    pendingFile?: File | null;
    pendingDocType?: RegoDocType;
    onPendingFileConsumed?: () => void;
    scrollToSection?: string | null;
    onScrollComplete?: () => void;
}

const VehicleDetailPage: React.FC<VehicleDetailPageProps> = ({ vehicle, onBack, onSaveVehicle, onDeleteVehicle, pendingFile, pendingDocType, onPendingFileConsumed, scrollToSection, onScrollComplete }) => {
    const [editingSection, setEditingSection] = useState<EditableVehicleSection>(null);
    const [confirmDelete, setConfirmDelete] = useState(false);

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

    const handleDataExtracted = (extractedData: RegoExtractedData) => {
        const { document: extractedDoc, _docType, ...regoData } = extractedData;

        // Only merge non-null extracted values — don't let a sparse PDF wipe existing data
        const updatedVehicle = { ...vehicle };
        for (const [key, value] of Object.entries(regoData)) {
            if (value !== null && value !== undefined) {
                (updatedVehicle as any)[key] = value;
            }
        }

        // Route document to the correct slot based on type
        if (extractedDoc) {
            if (_docType === 'payment') {
                updatedVehicle.paymentDocument = extractedDoc;
            } else {
                updatedVehicle.renewalDocument = extractedDoc;
            }
            // Keep legacy field as fallback
            updatedVehicle.document = extractedDoc;
        }

        // Auto-name from make + model if still generic
        if ((!vehicle.name || vehicle.name === 'New Registration') && updatedVehicle.make) {
            const parts: string[] = [];
            if (updatedVehicle.make) parts.push(updatedVehicle.make);
            if (updatedVehicle.model) parts.push(updatedVehicle.model);
            if (parts.length > 0) updatedVehicle.name = parts.join(' ');
        }

        // Auto-set status based on expiry
        if (updatedVehicle.expiryDate) {
            const expiry = new Date(updatedVehicle.expiryDate);
            const now = new Date();
            if (expiry < now) {
                updatedVehicle.status = 'Expired';
            } else {
                updatedVehicle.status = 'Current';
            }
        }

        onSaveVehicle(updatedVehicle);
    };

    const handleDelete = () => {
        if (confirmDelete && onDeleteVehicle) {
            onDeleteVehicle(vehicle.id);
        } else {
            setConfirmDelete(true);
            setTimeout(() => setConfirmDelete(false), 3000);
        }
    };

    const handleViewDocument = (doc?: Document) => {
        if (doc?.data) {
            const dataUrl = `data:${doc.mimeType || 'application/pdf'};base64,${doc.data}`;
            window.open(dataUrl, '_blank');
        }
    };

    // Compute status
    const expiryDate = vehicle.expiryDate ? new Date(vehicle.expiryDate) : null;
    const now = new Date();
    const daysUntilExpiry = expiryDate ? Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

    let statusColor = 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    let statusText = vehicle.status || 'Current';
    if (daysUntilExpiry !== null) {
        if (daysUntilExpiry <= 0) {
            statusColor = 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            statusText = 'Expired';
        } else if (daysUntilExpiry <= 30) {
            statusColor = 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
            statusText = 'Due Soon';
        }
    }

    useEffect(() => {
        if (!scrollToSection) return;
        const timer = setTimeout(() => {
            const el = document.querySelector(`[data-section="${scrollToSection}"]`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            onScrollComplete?.();
        }, 150);
        return () => clearTimeout(timer);
    }, [scrollToSection, onScrollComplete]);

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-gray-300 hover:text-brand-primary dark:hover:text-brand-secondary transition-colors">
                    <BackIcon />
                    Back to All Vehicles
                </button>
                <div className="flex items-center gap-2">
                    {vehicle.renewalDocument?.data && (
                        <button onClick={() => handleViewDocument(vehicle.renewalDocument)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-sm font-medium text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                            <DocumentIcon /> Renewal PDF
                        </button>
                    )}
                    {vehicle.paymentDocument?.data && (
                        <button onClick={() => handleViewDocument(vehicle.paymentDocument)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-sm font-medium text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                            <DocumentIcon /> Payment PDF
                        </button>
                    )}
                    {/* Legacy fallback for vehicles with only the old single document */}
                    {!vehicle.renewalDocument?.data && !vehicle.paymentDocument?.data && vehicle.document?.data && (
                        <button onClick={() => handleViewDocument(vehicle.document)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-sm font-medium text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                            <DocumentIcon /> View PDF
                        </button>
                    )}
                    {onDeleteVehicle && (
                        <button onClick={handleDelete} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${confirmDelete ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50'}`}>
                            <TrashIcon />
                            {confirmDelete ? 'Confirm Delete' : 'Delete'}
                        </button>
                    )}
                </div>
            </div>

            <header className="pb-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{vehicle.name}</h1>
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${statusColor}`}>{statusText}</span>
                </div>
                <div className="flex items-center gap-4 text-slate-500 dark:text-gray-400">
                    <span className="text-lg font-mono font-bold tracking-wider">{vehicle.rego}</span>
                    {vehicle.state && <span>({vehicle.state})</span>}
                    {vehicle.make && <span>{vehicle.year ? `${vehicle.year} ` : ''}{vehicle.make} {vehicle.model || ''}</span>}
                </div>
                {/* Progress bar */}
                {vehicle.startDate && vehicle.expiryDate && (
                    <div className="mt-4">
                        <PolicyProgressBar startDate={vehicle.startDate} endDate={vehicle.expiryDate} variant="full" />
                    </div>
                )}
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                <div className="md:col-span-2 space-y-8">
                    <div data-section="info">
                    <VehicleInfoSection
                        vehicle={vehicle}
                        isEditing={editingSection === 'info'}
                        onSetEditing={() => handleSetEditing('info')}
                        onSave={handleSave}
                        onCancel={handleCancel}
                    />
                    </div>

                    <div data-section="costs">
                    <RegoCostsSection
                        vehicle={vehicle}
                        isEditing={editingSection === 'costs'}
                        onSetEditing={() => handleSetEditing('costs')}
                        onSave={handleSave}
                        onCancel={handleCancel}
                    />
                    </div>

                    <RegoHistorySection
                        history={vehicle.history || []}
                        currentAmount={vehicle.totalAmount}
                        currentCurrency={vehicle.currency}
                    />
                </div>
                <div className="md:col-span-1 space-y-8">
                    <RegoAIAssistantSection
                        onDataExtracted={handleDataExtracted}
                        pendingFile={pendingFile}
                        pendingDocType={pendingDocType}
                        onPendingFileConsumed={onPendingFileConsumed}
                        hasRenewalDoc={!!vehicle.renewalDocument?.data}
                        hasPaymentDoc={!!vehicle.paymentDocument?.data}
                    />
                </div>
            </div>
        </div>
    );
};

export default VehicleDetailPage;
