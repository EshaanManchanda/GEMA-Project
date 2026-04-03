/**
 * Auth context object — in a .ts file (no JSX) so it can be imported
 * by AuthProvider (.tsx) and useAuthContext (.ts) separately,
 * keeping each file Vite Fast Refresh compatible.
 */
import { createContext } from 'react';
import { User, LoginCredentials, RegisterData } from '@/types/auth';

export interface AuthContextType {
    isAuthenticated: boolean;
    isInitialized: boolean;
    user: User | null;
    loading: boolean;
    error: string | null;
    login: (credentials: LoginCredentials) => Promise<void>;
    register: (userData: RegisterData) => Promise<void>;
    logout: () => Promise<void>;
    updateProfile: (userData: Partial<User>) => Promise<void>;
    refreshUserData: () => Promise<void>;
}

// Exported so both the Provider and the hook can use the same context object
export const AuthContext = createContext<AuthContextType | undefined>(undefined);
