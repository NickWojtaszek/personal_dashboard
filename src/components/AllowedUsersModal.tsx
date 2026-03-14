import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface AllowedUser {
    email: string;
    added_at: string;
}

interface Props {
    open: boolean;
    onClose: () => void;
}

const AllowedUsersModal: React.FC<Props> = ({ open, onClose }) => {
    const [users, setUsers] = useState<AllowedUser[]>([]);
    const [newEmail, setNewEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open) fetchUsers();
    }, [open]);

    async function fetchUsers() {
        if (!supabase) return;
        const { data, error } = await supabase
            .from('allowed_users')
            .select('email, added_at')
            .order('added_at', { ascending: true });
        if (data) setUsers(data);
        if (error) setError(error.message);
    }

    async function addUser(e: React.FormEvent) {
        e.preventDefault();
        if (!supabase || !newEmail.trim()) return;
        setLoading(true);
        setError(null);

        const email = newEmail.trim().toLowerCase();
        const { error } = await supabase
            .from('allowed_users')
            .insert({ email });

        if (error) {
            setError(error.code === '23505' ? 'Email already exists.' : error.message);
        } else {
            setNewEmail('');
            fetchUsers();
        }
        setLoading(false);
    }

    async function removeUser(email: string) {
        if (!supabase) return;
        setError(null);
        const { error } = await supabase
            .from('allowed_users')
            .delete()
            .eq('email', email);
        if (error) {
            setError(error.message);
        } else {
            setUsers(prev => prev.filter(u => u.email !== email));
        }
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Allowed Users</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {/* Add user form */}
                    <form onSubmit={addUser} className="flex gap-2">
                        <input
                            type="email"
                            placeholder="email@example.com"
                            value={newEmail}
                            onChange={e => setNewEmail(e.target.value)}
                            className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                            Add
                        </button>
                    </form>

                    {error && <p className="text-red-400 text-sm">{error}</p>}

                    {/* User list */}
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                        {users.map(u => (
                            <div key={u.email} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                                <span className="text-sm text-slate-700 dark:text-slate-300">{u.email}</span>
                                <button
                                    onClick={() => removeUser(u.email)}
                                    className="text-slate-400 hover:text-red-500 transition-colors"
                                    title="Remove user"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                        {users.length === 0 && (
                            <p className="text-sm text-slate-400 text-center py-4">No users found.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AllowedUsersModal;
