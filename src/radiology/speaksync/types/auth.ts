/**
 * PIN-based Authentication Types
 * Simple, reliable auth for radiology department staff
 */

export type UserRole = 'radiologist' | 'verifier' | 'accounting' | 'admin';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email?: string;
  pin?: string; // 4-digit PIN (optional per user)
  createdAt?: string;
}

export interface AuthData {
  users: User[];
  currentUser: User | null;
}

export interface AuthContextType {
  currentUser: User | null;
  users: User[];
  login: (userId: string) => boolean;
  logout: () => void;
  validatePin: (userId: string, pin: string) => boolean;
  updateUserPin: (userId: string, pin: string) => void;
  loading: boolean;
}

// Initial staff directory
export const INITIAL_STAFF: User[] = [
  { id: 'admin', name: 'Administrator', role: 'admin', pin: '0000' },
  { id: 'nick', name: 'Nick', role: 'radiologist' },
  { id: 'emilia', name: 'Emilia', role: 'radiologist' },
  { id: 'edyta', name: 'Edyta', role: 'verifier' },
];
