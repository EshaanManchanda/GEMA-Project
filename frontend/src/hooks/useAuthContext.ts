/**
 * useAuthContext hook — standalone .ts file (Fast Refresh compatible).
 * Uses AuthContext from authContextDef.ts directly.
 */
import { useContext } from 'react';
import { AuthContext } from '@/contexts/authContextDef';
import type { AuthContextType } from '@/contexts/authContextDef';

export const useAuthContext = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuthContext must be used within an AuthProvider');
    }
    return context;
};
