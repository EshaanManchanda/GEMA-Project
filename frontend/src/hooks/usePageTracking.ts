import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { ApiService } from '@/services/api';
import { v4 as uuidv4 } from 'uuid';

const getSessionId = (): string => {
  const key = 'gema_sid';
  let sid = sessionStorage.getItem(key);
  if (!sid) {
    sid = uuidv4();
    sessionStorage.setItem(key, sid);
  }
  return sid;
};

export const usePageTracking = (): void => {
  const location = useLocation();
  const lastPath = useRef('');

  useEffect(() => {
    if (location.pathname === lastPath.current) return;
    lastPath.current = location.pathname;

    // Fire-and-forget — never await, never show errors to user
    ApiService.post('/track/pageview', {
      path: location.pathname,
      referrer: document.referrer || null,
      sessionId: getSessionId(),
    }).catch(() => {});
  }, [location.pathname]);
};
