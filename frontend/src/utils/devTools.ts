// Development tools for debugging API connectivity and proxy issues

export const devTools = {
  // Check if we're in development mode
  isDev: import.meta.env.VITE_DEV,

  // Test API connectivity
  async testAPIConnectivity() {
    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://gema-project.onrender.com/api';

    console.group('🔧 API Connectivity Test');

    try {
      // Test direct connection to backend
      console.log('Testing direct backend connection...');
      const directResponse = await fetch(`${apiUrl}/health`, {
        method: 'GET',
        mode: 'cors'
      });
      console.log('✅ Direct backend connection:', directResponse.status, directResponse.statusText);
    } catch (error) {
      console.error('❌ Direct backend connection failed:', error);
    }

    try {
      // Test proxied connection
      console.log('Testing proxied connection...');
      const proxiedResponse = await fetch('/api/health', {
        method: 'GET'
      });
      console.log('✅ Proxied connection:', proxiedResponse.status, proxiedResponse.statusText);
    } catch (error) {
      console.error('❌ Proxied connection failed:', error);
    }

    console.log('Environment variables:');
    console.log('- VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
    console.log('- NODE_ENV:', import.meta.env.VITE_NODE_ENV);
    console.log('- MODE:', import.meta.env.VITE_MODE);

    console.groupEnd();
  },

  // Log API request/response details
  logAPICall(method: string, url: string, status?: number, error?: any) {
    if (!this.isDev) return;
    
    const timestamp = new Date().toLocaleTimeString();
    
    if (error) {
      console.group(`🚨 [${timestamp}] API Error: ${method} ${url}`);
      console.error('Error details:', error);
      console.log('Error code:', error.code);
      console.log('Error message:', error.message);
      if (error.response) {
        console.log('Response status:', error.response.status);
        console.log('Response data:', error.response.data);
      }
      console.groupEnd();
    } else {
      console.log(`✅ [${timestamp}] ${method} ${url} → ${status}`);
    }
  },

  // Display proxy status
  displayProxyStatus() {
    if (!this.isDev) return;
    
    console.group('🔗 Proxy Configuration Status');
    console.log('Frontend URL:', window.location.origin);
    console.log('Expected Backend URL:', 'https://gema-project.onrender.com');
    console.log('API Base URL:', import.meta.env.VITE_API_BASE_URL || 'Using proxy (/api)');
    console.log('API should route to:', 'https://gema-project.onrender.com/api/*');
    console.groupEnd();
  },

  // Quick health check
  async healthCheck() {
    if (!this.isDev) return;
    
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      console.log('🏥 Health Check:', response.status, data);
      return { status: response.status, data };
    } catch (error) {
      console.error('🏥 Health Check Failed:', error);
      return { error };
    }
  }
};

// Auto-run diagnostics in development
if (devTools.isDev) {
  // Display proxy status on load
  setTimeout(() => {
    devTools.displayProxyStatus();
    
    // Test connectivity after a short delay
    setTimeout(() => {
      devTools.testAPIConnectivity();
    }, 2000);
  }, 1000);
}

// Make devTools available globally in development
if (devTools.isDev) {
  (window as any).devTools = devTools;
  console.log('🔧 Development tools available globally as window.devTools');
}