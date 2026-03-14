import { useState, useEffect } from 'react';

interface ApiRetryEvent {
  attempt: number;
  maxAttempts: number;
  delay: number;
  url: string;
  status?: number;
  method?: string;
}

interface ApiRetryState {
  isRetrying: boolean;
  currentAttempt: number;
  maxAttempts: number;
  lastRetry: ApiRetryEvent | null;
}

const useApiRetry = () => {
  const [retryState, setRetryState] = useState<ApiRetryState>({
    isRetrying: false,
    currentAttempt: 0,
    maxAttempts: 0,
    lastRetry: null,
  });

  useEffect(() => {
    const handleApiRetry = (event: CustomEvent<ApiRetryEvent>) => {
      const { detail } = event;

      setRetryState({
        isRetrying: true,
        currentAttempt: detail.attempt,
        maxAttempts: detail.maxAttempts,
        lastRetry: detail,
      });

      // Auto-clear retry state after the delay + a small buffer
      const clearDelay = detail.delay + 500;
      setTimeout(() => {
        setRetryState(prev => ({
          ...prev,
          isRetrying: false,
        }));
      }, clearDelay);
    };

    window.addEventListener('api-retry', handleApiRetry as EventListener);

    return () => {
      window.removeEventListener('api-retry', handleApiRetry as EventListener);
    };
  }, []);

  return retryState;
};

export default useApiRetry;