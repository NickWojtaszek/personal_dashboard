import React, { createContext, useContext, useState } from 'react';
import type { Template } from '../types';

type View = 'main' | 'settings' | 'accounting' | 'aiconfig';

interface TemplateModalState {
    isOpen: boolean;
    editingTemplate: Template | null;
}

interface ConfirmationModalState {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
}

interface AppContextType {
    view: View;
    setView: (view: View) => void;

    templateModal: TemplateModalState & {
        onClose: () => void;
        setIsOpen: (isOpen: boolean) => void;
        setEditingTemplate: (template: Template | null) => void;
    };

    confirmationState: ConfirmationModalState;
    setConfirmationState: (state: ConfirmationModalState) => void;
    closeConfirmation: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [view, setView] = useState<View>('main');
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
    const [confirmationState, setConfirmationState] = useState<ConfirmationModalState>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
    });

    const closeConfirmation = () => {
        setConfirmationState({ isOpen: false, title: '', message: '', onConfirm: () => {} });
    };
    
    const value: AppContextType = {
        view,
        setView,
        templateModal: {
            isOpen: isTemplateModalOpen,
            editingTemplate,
            setIsOpen: setIsTemplateModalOpen,
            setEditingTemplate,
            onClose: () => setIsTemplateModalOpen(false),
        },
        confirmationState,
        setConfirmationState,
        closeConfirmation
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextType => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useApp must be used within an AppContextProvider');
    }
    return context;
};
