import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseEnabled } from './supabase';
import type { Session, User } from '@supabase/supabase-js';

interface AuthState {
    user: User | null;
    session: Session | null;
    loading: boolean;
    /** null = not checked yet, true = allowed, false = rejected */
    allowed: boolean | null;
    error: string | null;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [allowed, setAllowed] = useState<boolean | null>(null);
    const [error, setError] = useState<string | null>(null);

    // If Supabase isn't configured, skip auth entirely (local dev)
    useEffect(() => {
        if (!isSupabaseEnabled() || !supabase) {
            setLoading(false);
            setAllowed(true);
            return;
        }

        // Get initial session
        supabase.auth.getSession().then(({ data: { session: s } }) => {
            setSession(s);
            setUser(s?.user ?? null);
            if (s?.user) {
                checkAllowlist(s.user.email ?? '');
            } else {
                setLoading(false);
            }
        });

        // Listen for auth changes (login, logout, token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
            setSession(s);
            setUser(s?.user ?? null);
            if (s?.user) {
                checkAllowlist(s.user.email ?? '');
            } else {
                setAllowed(null);
                setError(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    async function checkAllowlist(email: string) {
        if (!supabase || !email) {
            setAllowed(false);
            setError('No email associated with this account.');
            setLoading(false);
            return;
        }

        try {
            const { data, error: queryError } = await supabase
                .from('allowed_users')
                .select('email')
                .eq('email', email.toLowerCase())
                .single();

            if (queryError || !data) {
                setAllowed(false);
                setError(`Access denied. ${email} is not authorized.`);
            } else {
                setAllowed(true);
                setError(null);
            }
        } catch {
            setAllowed(false);
            setError('Failed to verify access. Please try again.');
        }

        setLoading(false);
    }

    async function signInWithGoogle() {
        if (!supabase) return;
        setError(null);

        const { error: signInError } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin,
            },
        });

        if (signInError) {
            setError(signInError.message);
        }
    }

    async function signOut() {
        if (!supabase) return;
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setAllowed(null);
        setError(null);
    }

    return (
        <AuthContext.Provider value={{ user, session, loading, allowed, error, signInWithGoogle, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};
