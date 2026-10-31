import { v4 as uuidv4 } from 'uuid';
import { ApiService } from '../api';
import { API_BASE_URL } from '../../config/api';

export type AnalyticsEventType =
  | 'eventViewed'
  | 'similarEventClicked'
  | 'recentlyViewedClicked'
  | 'bookingClicked'
  | 'favouriteAdded'
  | 'eventShared'
  | 'organiserProfileClicked'
  | 'searchPerformed'
  | 'filterApplied'
  | 'blogViewed'
  | 'blogShared'
  | 'registrationCompleted'
  | 'loginCompleted';

export type AnalyticsEventSection = 'similar' | 'organizer' | 'recentlyViewed' | 'trending';

interface TrackEventPayload {
  eventId?: string;
  blogId?: string;
  sourceEventId?: string;
  section?: AnalyticsEventSection;
  position?: number;
  meta?: {
    query?: string;
    resultCount?: number;
    filters?: Record<string, string | number>;
    platform?: string;
    method?: string;
  };
}

export interface Attribution {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  referrer?: string;
  landingPath?: string;
  paidClick?: boolean;
}

const SESSION_KEY = 'kd_sid';
const VISITOR_KEY = 'kd_vid';
const SESSION_ATTR_KEY = 'kd_attr';
const FIRST_TOUCH_KEY = 'kd_first_touch';

/** Honour Global Privacy Control / Do Not Track: no analytics calls at all. */
export const trackingAllowed = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return !(nav.globalPrivacyControl === true || nav.doNotTrack === '1');
};

const store = (s: () => Storage, key: string, make: () => string): string => {
  try {
    let v = s().getItem(key);
    if (!v) {
      v = make();
      s().setItem(key, v);
    }
    return v;
  } catch {
    // storage unavailable (private mode) — fall back to a per-call value
    return make();
  }
};

export const getSessionId = () => store(() => sessionStorage, SESSION_KEY, uuidv4);

let newVisitor = false;
/** Anonymous id kept per browser so returning visitors can be told apart. */
export const getVisitorId = () =>
  store(() => localStorage, VISITOR_KEY, () => {
    newVisitor = true;
    return uuidv4();
  });

const readJson = (s: () => Storage, key: string): Attribution | undefined => {
  try {
    const v = s().getItem(key);
    return v ? JSON.parse(v) : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Captured on the first page view of a tab session: UTM tags, ad click ids
 * and the external referrer. Kept for the session (every page view carries
 * it) and once per browser as first touch (sent with sign-up).
 */
export const getSessionAttribution = (): Attribution => {
  const existing = readJson(() => sessionStorage, SESSION_ATTR_KEY);
  if (existing) return existing;
  const q = new URLSearchParams(window.location.search);
  const attr: Attribution = {
    utmSource: q.get('utm_source') || undefined,
    utmMedium: q.get('utm_medium') || undefined,
    utmCampaign: q.get('utm_campaign') || undefined,
    referrer: document.referrer || undefined,
    landingPath: window.location.pathname,
    paidClick: q.has('gclid') || q.has('fbclid') || undefined,
  };
  try {
    sessionStorage.setItem(SESSION_ATTR_KEY, JSON.stringify(attr));
    if (!localStorage.getItem(FIRST_TOUCH_KEY)) localStorage.setItem(FIRST_TOUCH_KEY, JSON.stringify(attr));
  } catch {
    /* storage unavailable */
  }
  return attr;
};

/** First-touch attribution to send with registration (undefined when tracking is off). */
export const getSignupAttribution = (): (Attribution & { visitorId: string }) | undefined => {
  if (!trackingAllowed()) return undefined;
  const first = readJson(() => localStorage, FIRST_TOUCH_KEY) ?? getSessionAttribution();
  return { ...first, visitorId: getVisitorId() };
};

/** Page view beacon; called by usePageTracking on every route change. */
export function trackPageView(path: string): void {
  if (!trackingAllowed()) return;
  const visitorId = getVisitorId();
  ApiService.post('/track/pageview', {
    path,
    referrer: document.referrer || null,
    sessionId: getSessionId(),
    visitorId,
    isNewVisitor: newVisitor,
    attribution: getSessionAttribution(),
  }).catch(() => {});
}

/** Visible time on a page; sendBeacon survives the tab closing. */
export function trackEngagement(path: string, ms: number): void {
  if (!trackingAllowed() || ms < 1000) return;
  const body = JSON.stringify({ sessionId: getSessionId(), path, ms: Math.round(ms) });
  try {
    // text/plain keeps this a simple request (no CORS preflight)
    navigator.sendBeacon?.(`${API_BASE_URL}/track/engagement`, new Blob([body], { type: 'text/plain' }));
  } catch {
    /* best-effort */
  }
}

/**
 * Fire-and-forget UX telemetry. Never throws — a dropped analytics event
 * must not affect the page it was fired from.
 */
function trackEvent(type: AnalyticsEventType, payload: TrackEventPayload = {}): void {
  if (!trackingAllowed()) return;
  ApiService.post('/analytics/track', {
    type,
    sessionId: getSessionId(),
    visitorId: getVisitorId(),
    ...payload,
  }).catch(() => {
    // swallow — telemetry is best-effort
  });
}

const analyticsEventsAPI = { trackEvent };

export { trackEvent };
export default analyticsEventsAPI;
