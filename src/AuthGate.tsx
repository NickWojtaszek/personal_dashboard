import React from 'react';
import { useAuth } from './lib/auth';
import App from './App';
import LoginPage from './components/LoginPage';

const AuthGate: React.FC = () => {
    const { loading, allowed, user } = useAuth();

    // Loading spinner while checking session
    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // Not authenticated or not on allowlist — show login
    if (!allowed) {
        return <LoginPage />;
    }

    // Authenticated + allowed (or Supabase not configured for local dev)
    return <App />;
};

export default AuthGate;
