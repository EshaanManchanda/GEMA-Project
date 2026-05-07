// Development tools for debugging API connectivity and proxy issues
import { env } from '../config/env';
import logger from './logger';

export const devTools = {
  // Check if we're in development mode
  isDev: env.isDev,

  // Test API connectivity
  async testAPIConnectivity() {
    const apiUrl = import.meta.env.VITE_API_URL || 'https://gema-project.onrender.com/api';

    logger.group('🔧 API Connectivity Test');

    try {
      // Test direct connection to backend
      logger.debug('Testing direct backend connection...');
      const directResponse = await fetch(`${apiUrl}/health`, {
        method: 'GET',
        mode: 'cors'
      });
      logger.debug('✅ Direct backend connection:', directResponse.status, directResponse.statusText);
    } catch (error) {
      logger.error('❌ Direct backend connection failed:', error);
    }

    try {
      // Test proxied connection
      logger.debug('Testing proxied connection...');
      const proxiedResponse = await fetch('/api/health', {
        method: 'GET'
      });
      logger.debug('✅ Proxied connection:', proxiedResponse.status, proxiedResponse.statusText);
    } catch (error) {
      logger.error('❌ Proxied connection failed:', error);
    }

    logger.debug('Environment variables:');
    logger.debug('- VITE_API_URL:', import.meta.env.VITE_API_URL);
    logger.debug('- MODE:', import.meta.env.MODE);

    logger.groupEnd();
  },

  // Log API request/response details
  logAPICall(method: string, url: string, status?: number, error?: any) {
    if (!this.isDev) return;

    const timestamp = new Date().toLocaleTimeString();

    if (error) {
      logger.group(`🚨 [${timestamp}] API Error: ${method} ${url}`);
      logger.error('Error details:', error);
      logger.error('Error code:', error.code);
      logger.error('Error message:', error.message);
      if (error.response) {
        logger.error('Response status:', error.response.status);
        logger.error('Response data:', error.response.data);
      }
      logger.groupEnd();
    } else {
      logger.debug(`✅ [${timestamp}] ${method} ${url} → ${status}`);
    }
  },

  // Display proxy status
  displayProxyStatus() {
    if (!this.isDev) return;

    logger.group('🔗 Proxy Configuration Status');
    logger.debug('Frontend URL:', window.location.origin);
    logger.debug('Expected Backend URL:', 'https://gema-project.onrender.com');
    logger.debug('API Base URL:', import.meta.env.VITE_API_URL || 'Using proxy (/api)');
    logger.debug('API should route to:', 'https://gema-project.onrender.com/api/*');
    logger.groupEnd();
  },

  // Quick health check
  async healthCheck() {
    if (!this.isDev) return;

    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      logger.debug('🏥 Health Check:', response.status, data);
      return { status: response.status, data };
    } catch (error) {
      logger.error('🏥 Health Check Failed:', error);
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
  logger.debug('🔧 Development tools available globally as window.devTools');
}