import React, { createContext, useContext } from 'react';
import type { User, AuthContextType } from '../types/auth';

/**
 * Mock auth provider that satisfies PINAuthContext interface
 * without requiring login. Always provides a logged-in radiologist user.
 */

const PINAuthContext = createContext<AuthContextType | undefined>(undefined);

const MOCK_USER: User = {
    id: 'nick',
    name: 'Nick',
    role: 'radiologist',
};

export const MockAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const value: AuthContextType = {
        currentUser: MOCK_USER,
        users: [MOCK_USER],
        login: () => true,
        logout: () => {},
        validatePin: () => true,
        updateUserPin: () => {},
        loading: false,
    };

    return (
        <PINAuthContext.Provider value={value}>
            {children}
        </PINAuthContext.Provider>
    );
};

export const usePINAuth = (): AuthContextType => {
    const context = useContext(PINAuthContext);
    if (context === undefined) {
        throw new Error('usePINAuth must be used within a MockAuthProvider');
    }
    return context;
};

export default PINAuthContext;
