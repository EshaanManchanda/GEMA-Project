import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackEngagement, trackPageView } from '@/services/api/analyticsEventsAPI';

/** Page views on route change, plus visible time per page (sent when it's left or hidden). */
export const usePageTracking = (): void => {
  const location = useLocation();
  const lastPath = useRef('');
  const visibleSince = useRef<number | null>(null);
  const visibleMs = useRef(0);

  const flush = () => {
    if (visibleSince.current !== null) {
      visibleMs.current += Date.now() - visibleSince.current;
      visibleSince.current = document.visibilityState === 'visible' ? Date.now() : null;
    }
    if (lastPath.current) trackEngagement(lastPath.current, visibleMs.current);
    visibleMs.current = 0;
  };

  useEffect(() => {
    if (location.pathname === lastPath.current) return;
    flush();
    lastPath.current = location.pathname;
    visibleSince.current = document.visibilityState === 'visible' ? Date.now() : null;
    trackPageView(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
      else visibleSince.current = Date.now();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
    };
  }, []);
};
