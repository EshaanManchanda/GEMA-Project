import { useContext } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';

/**
 * Custom hook for authentication functionality
 * This hook provides access to the authentication context
 */
const useAuth = () => {
  // Use the AuthContext directly
  const auth = useAuthContext();
  
  return {
    user: auth.user,
    isAuthenticated: auth.isAuthenticated,
    loading: auth.loading,
    error: auth.error,
    login: auth.login,
    register: auth.register,
    logout: auth.logout,
    updateProfile: auth.updateProfile,
    refreshUserData: auth.refreshUserData,
  };
};

export default useAuth;