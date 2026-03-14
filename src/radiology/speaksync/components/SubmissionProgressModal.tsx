import React, { useState, useEffect } from 'react';
import { useTranslations } from '../context/LanguageContext';
import { CheckIcon } from './Icons';

interface SubmissionProgressModalProps {
    isOpen: boolean;
    month: string;
    studyCount: number;
    totalAmount: number;
    onConfirm: () => void;
    onCancel: () => void;
}

type ModalStep = 'confirmation' | 'progress' | 'completed';

// Default translations for submission modal
const DEFAULT_TRANSLATIONS = {
    confirmTitle: 'Submit Report?',
    month: 'Month',
    studies: 'Number of Studies',
    amount: 'Total Amount',
    confirmMessage: 'Please review the details before submitting. This action cannot be undone.',
    yes: 'Yes, Submit',
    no: 'Cancel',
    submitting: 'Submitting Your Report',
    progress: 'Processing',
    processingMessage: 'Please wait while your report is being submitted...',
    successTitle: 'Report Submitted Successfully',
    successMessage: 'Your report has been submitted for verification and will be reviewed shortly.',
    close: 'Close',
};

const SubmissionProgressModal: React.FC<SubmissionProgressModalProps> = ({
    isOpen,
    month,
    studyCount,
    totalAmount,
    onConfirm,
    onCancel,
}) => {
    const { t } = useTranslations();
    
    // Translate with fallback to default translations
    const translate = (key: string, defaultValue: string) => {
        try {
            const value = t(`reports.submission.${key}`);
            return value === `reports.submission.${key}` ? defaultValue : value;
        } catch {
            return defaultValue;
        }
    };
    const [step, setStep] = useState<ModalStep>('confirmation');
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (!isOpen) {
            setStep('confirmation');
            setProgress(0);
        }
    }, [isOpen]);

    useEffect(() => {
        if (step === 'progress') {
            const interval = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 100) {
                        clearInterval(interval);
                        setTimeout(() => setStep('completed'), 300);
                        return 100;
                    }
                    return prev + Math.random() * 30;
                });
            }, 200);

            return () => clearInterval(interval);
        }
    }, [step]);

    if (!isOpen) return null;

    const handleSubmit = () => {
        setStep('progress');
        setTimeout(() => {
            onConfirm();
        }, 2000);
    };

    const handleClose = () => {
        if (step === 'confirmation') {
            onCancel();
        } else if (step === 'completed') {
            setStep('confirmation');
            setProgress(0);
            onCancel();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div
                className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-md flex flex-col animate-fade-in"
                onClick={e => e.stopPropagation()}
            >
                {/* Confirmation Step */}
                {step === 'confirmation' && (
                    <>
                        <div className="p-6">
                            <h3 className="text-xl font-bold text-white mb-4">
                                {translate('confirmTitle', DEFAULT_TRANSLATIONS.confirmTitle)}
                            </h3>
                            <div className="space-y-3 mb-6">
                                <div className="flex justify-between items-center p-3 bg-gray-900/50 rounded-lg">
                                    <span className="text-gray-400">{translate('month', DEFAULT_TRANSLATIONS.month)}:</span>
                                    <span className="text-white font-semibold">{month}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-gray-900/50 rounded-lg">
                                    <span className="text-gray-400">{translate('studies', DEFAULT_TRANSLATIONS.studies)}:</span>
                                    <span className="text-white font-semibold">{studyCount}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-gray-900/50 rounded-lg">
                                    <span className="text-gray-400">{translate('amount', DEFAULT_TRANSLATIONS.amount)}:</span>
                                    <span className="text-green-400 font-semibold">{totalAmount.toFixed(2)}</span>
                                </div>
                            </div>
                            <p className="text-sm text-gray-400 mb-6">
                                {translate('confirmMessage', DEFAULT_TRANSLATIONS.confirmMessage)}
                            </p>
                        </div>
                        <div className="p-4 border-t border-gray-700 bg-gray-900/50 grid grid-cols-2 gap-3">
                            <button
                                onClick={handleClose}
                                className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md text-white font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
                            >
                                {translate('no', DEFAULT_TRANSLATIONS.no)}
                            </button>
                            <button
                                onClick={handleSubmit}
                                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md text-white font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
                            >
                                {translate('yes', DEFAULT_TRANSLATIONS.yes)}
                            </button>
                        </div>
                    </>
                )}

                {/* Progress Step */}
                {step === 'progress' && (
                    <div className="p-6">
                        <h3 className="text-xl font-bold text-white mb-6 text-center">
                            {translate('submitting', DEFAULT_TRANSLATIONS.submitting)}
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm text-gray-400">
                                        {translate('progress', DEFAULT_TRANSLATIONS.progress)}
                                    </span>
                                    <span className="text-sm font-semibold text-white">
                                        {Math.round(progress)}%
                                    </span>
                                </div>
                                <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-600 to-blue-600 transition-all duration-300 ease-out rounded-full"
                                        style={{ width: `${Math.min(progress, 100)}%` }}
                                    />
                                </div>
                            </div>
                            <p className="text-center text-sm text-gray-400">
                                {translate('processingMessage', DEFAULT_TRANSLATIONS.processingMessage)}
                            </p>
                        </div>
                    </div>
                )}

                {/* Completed Step */}
                {step === 'completed' && (
                    <>
                        <div className="p-6 text-center">
                            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-900/50 mb-4">
                                <CheckIcon className="h-8 w-8 text-green-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">
                                {translate('successTitle', DEFAULT_TRANSLATIONS.successTitle)}
                            </h3>
                            <p className="text-sm text-gray-400">
                                {translate('successMessage', DEFAULT_TRANSLATIONS.successMessage)}
                            </p>
                        </div>
                        <div className="p-4 border-t border-gray-700 bg-gray-900/50">
                            <button
                                onClick={handleClose}
                                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md text-white font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
                            >
                                {translate('close', DEFAULT_TRANSLATIONS.close)}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default SubmissionProgressModal;
