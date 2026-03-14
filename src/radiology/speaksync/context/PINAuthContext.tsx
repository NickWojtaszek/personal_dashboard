/**
 * Stub auth hook for single-user personal dashboard.
 * Returns a hardcoded user — no context provider needed.
 */

const SINGLE_USER = {
    id: 'nick',
    name: 'Nick',
    email: '',
    role: 'radiologist' as const,
};

export function usePINAuth() {
    return {
        currentUser: SINGLE_USER,
    };
}
