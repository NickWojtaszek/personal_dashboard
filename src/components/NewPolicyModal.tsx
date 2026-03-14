import React, { useState, useCallback } from 'react';

const POLICY_TYPES = [
    'Home & Contents',
    'Landlord',
    'Comprehensive Car Insurance',
    'Third Party Car Insurance',
    'Health',
    'Life',
    'Travel',
    'Professional Indemnity',
    'Public Liability',
    'Business',
    'Pet',
    'Other',
];

const CURRENCY_OPTIONS = ['GBP', 'AUD', 'USD', 'EUR', 'PLN'];

interface NewPolicyModalProps {
    onClose: () => void;
    onCreate: (policyType: string, currency: string, file: File | null) => void;
}

const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
    </svg>
);

const NewPolicyModal: React.FC<NewPolicyModalProps> = ({ onClose, onCreate }) => {
    const [policyType, setPolicyType] = useState('');
    const [currency, setCurrency] = useState('AUD');
    const [file, setFile] = useState<File | null>(null);
    const [dragOver, setDragOver] = useState(false);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile?.type === 'application/pdf') {
            setFile(droppedFile);
        }
    }, []);

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (selected) setFile(selected);
    }, []);

    const handleSubmit = () => {
        if (!policyType) return;
        onCreate(policyType, currency, file);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">New Insurance Policy</h2>
                    <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">Select a type and upload the policy PDF. Details will be extracted automatically.</p>
                </div>

                <div className="p-6 space-y-5">
                    {/* Policy Type */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1.5">Policy Type</label>
                        <select
                            value={policyType}
                            onChange={e => setPolicyType(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-primary dark:focus:ring-brand-secondary focus:border-transparent"
                        >
                            <option value="">Select type...</option>
                            {POLICY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>

                    {/* Currency */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1.5">Currency</label>
                        <select
                            value={currency}
                            onChange={e => setCurrency(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-primary dark:focus:ring-brand-secondary focus:border-transparent"
                        >
                            {CURRENCY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    {/* PDF Upload */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1.5">Policy Document (PDF)</label>
                        <div
                            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handleDrop}
                            className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
                                dragOver
                                    ? 'border-brand-primary dark:border-brand-secondary bg-brand-primary/5 dark:bg-brand-secondary/5'
                                    : file
                                        ? 'border-green-400 dark:border-green-500 bg-green-50 dark:bg-green-900/10'
                                        : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'
                            }`}
                        >
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={handleFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            {file ? (
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-green-700 dark:text-green-400">{file.name}</p>
                                    <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(0)} KB</p>
                                </div>
                            ) : (
                                <div className="space-y-2 text-slate-400 dark:text-gray-500">
                                    <UploadIcon />
                                    <p className="text-sm">Drop PDF here or click to browse</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!policyType}
                        className="px-4 py-2 text-sm font-medium rounded-lg bg-brand-primary text-white hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {file ? 'Create & Extract' : 'Create Policy'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NewPolicyModal;
