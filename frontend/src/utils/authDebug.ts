// Authentication debugging utilities
import logger from './logger';

/**
 * Debug current authentication state
 */
export const debugAuthState = () => {
  const token = localStorage.getItem('token');
  const refreshToken = localStorage.getItem('refreshToken');
  const user = localStorage.getItem('user');

  logger.group('🔐 Auth Debug Info');
  logger.debug('Token exists:', !!token);
  logger.debug('Refresh token exists:', !!refreshToken);
  logger.debug('User data exists:', !!user);

  if (token) {
    try {
      // Decode JWT payload (base64)
      const payload = JSON.parse(atob(token.split('.')[1]));
      logger.debug('Token payload:', payload);
      logger.debug('Token expires:', new Date(payload.exp * 1000));
      logger.debug('Token is expired:', Date.now() >= payload.exp * 1000);
    } catch (e) {
      logger.debug('Could not decode token:', e);
    }
  }

  if (user) {
    try {
      logger.debug('User data:', JSON.parse(user));
    } catch (e) {
      logger.debug('Could not parse user data:', e);
    }
  }

  logger.groupEnd();
};

/**
 * Create a test user token for debugging (development only)
 */
export const createTestUserToken = () => {
  if (!import.meta.env.DEV) {
    logger.warn('Test tokens can only be created in development mode');
    return null;
  }

  // Create a mock JWT-like token structure for testing
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    userId: 'test_user_id',
    email: 'test@kidrove.com',
    role: 'customer',
    exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour from now
    iat: Math.floor(Date.now() / 1000)
  }));
  const signature = btoa('test_signature');

  return `${header}.${payload}.${signature}`;
};

/**
 * Manually set auth state for testing
 */
export const setTestAuthState = () => {
  if (!import.meta.env.DEV) {
    logger.warn('Test auth state can only be set in development mode');
    return;
  }

  const testToken = createTestUserToken();
  const testUser = {
    id: 'test_user_id',
    email: 'test@kidrove.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'customer'
  };

  localStorage.setItem('token', testToken!);
  localStorage.setItem('user', JSON.stringify(testUser));

  logger.debug('✅ Test auth state set. Please refresh the page.');
};

/**
 * Clear all auth state
 */
export const clearAuthState = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  logger.debug('🧹 Auth state cleared. Please refresh the page.');
};

// Make debugging functions available globally in development
if (import.meta.env.DEV) {
  (window as any).authDebug = {
    debugAuthState,
    setTestAuthState,
    clearAuthState,
    createTestUserToken
  };

  logger.debug('🔧 Auth debugging tools available: window.authDebug');
}