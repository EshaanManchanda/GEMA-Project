import logger from './logger';

if (typeof window !== 'undefined') {
  (window as any).__REACT_LOADED__ = true;
  logger.debug('[React Guard] ✅ React loaded and available');
}