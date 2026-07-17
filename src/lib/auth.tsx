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

        // Safety net: if the auth service is unreachable — blocked by an ad/privacy
        // extension, offline, or a deadlocked token-refresh lock — getSession() can
        // hang forever. Without this the app sits on a blank loading spinner and
        // "doesn't load". Fall through to the login screen with an error instead.
        let settled = false;
        const unreachable = 'Could not reach the sign-in service. Check your connection or disable any ad/privacy blocker for this site, then reload.';
        const timer = setTimeout(() => {
            if (!settled) {
                settled = true;
                setError(unreachable);
                setLoading(false);
            }
        }, 6000);

        // Get initial session
        supabase.auth.getSession().then(({ data: { session: s } }) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            setSession(s);
            setUser(s?.user ?? null);
            if (s?.user) {
                checkAllowlist(s.user.email ?? '');
            } else {
                setLoading(false);
            }
        }).catch(() => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            setError(unreachable);
            setLoading(false);
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

        return () => { clearTimeout(timer); subscription.unsubscribe(); };
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
