// Authentication debugging utilities

/**
 * Debug current authentication state
 */
export const debugAuthState = () => {
  const token = localStorage.getItem('token');
  const refreshToken = localStorage.getItem('refreshToken');
  const user = localStorage.getItem('user');

  console.group('🔐 Auth Debug Info');
  console.log('Token exists:', !!token);
  console.log('Refresh token exists:', !!refreshToken);
  console.log('User data exists:', !!user);

  if (token) {
    try {
      // Decode JWT payload (base64)
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log('Token payload:', payload);
      console.log('Token expires:', new Date(payload.exp * 1000));
      console.log('Token is expired:', Date.now() >= payload.exp * 1000);
    } catch (e) {
      console.log('Could not decode token:', e);
    }
  }

  if (user) {
    try {
      console.log('User data:', JSON.parse(user));
    } catch (e) {
      console.log('Could not parse user data:', e);
    }
  }

  console.groupEnd();
};

/**
 * Create a test user token for debugging (development only)
 */
export const createTestUserToken = () => {
  if (import.meta.env.VITE_NODE_ENV !== 'development') {
    console.warn('Test tokens can only be created in development mode');
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
  if (import.meta.env.VITE_NODE_ENV !== 'development') {
    console.warn('Test auth state can only be set in development mode');
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

  console.log('✅ Test auth state set. Please refresh the page.');
};

/**
 * Clear all auth state
 */
export const clearAuthState = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  console.log('🧹 Auth state cleared. Please refresh the page.');
};

// Make debugging functions available globally in development
if (import.meta.env.VITE_NODE_ENV === 'development') {
  (window as any).authDebug = {
    debugAuthState,
    setTestAuthState,
    clearAuthState,
    createTestUserToken
  };

  console.log('🔧 Auth debugging tools available: window.authDebug');
}