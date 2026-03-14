
import React from 'react';
import { useTranslations } from '../context/LanguageContext';
import { TrashIcon } from './Icons';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message }) => {
  const { t } = useTranslations();

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-md flex flex-col animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="p-6 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-800/50 mb-4">
                <TrashIcon className="h-6 w-6 text-red-300" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
            <p className="text-sm text-gray-400">{message}</p>
        </div>
        <div className="p-4 border-t border-gray-700 bg-gray-900/50 grid grid-cols-2 gap-3">
          <button 
            type="button" 
            onClick={onClose} 
            className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md text-white font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            {t('confirmModal.cancel')}
          </button>
          <button 
            type="button" 
            onClick={handleConfirm} 
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md text-white font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            {t('confirmModal.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
