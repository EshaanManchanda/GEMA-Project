import { ApiService } from '../api';

export type AnalyticsEventType =
  | 'eventViewed'
  | 'similarEventClicked'
  | 'recentlyViewedClicked';

export type AnalyticsEventSection = 'similar' | 'organizer' | 'recentlyViewed' | 'trending';

interface TrackEventPayload {
  eventId: string;
  sourceEventId?: string;
  section?: AnalyticsEventSection;
  position?: number;
}

const SESSION_KEY = 'gema_analytics_session_id';

function getSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    // sessionStorage unavailable (private mode, SSR) — fall back to a per-call id
    return crypto.randomUUID();
  }
}

/**
 * Fire-and-forget UX telemetry. Never throws — a dropped analytics event
 * must not affect the page it was fired from.
 */
function trackEvent(type: AnalyticsEventType, payload: TrackEventPayload): void {
  ApiService.post('/analytics/track', {
    type,
    sessionId: getSessionId(),
    ...payload,
  }).catch(() => {
    // swallow — telemetry is best-effort
  });
}

const analyticsEventsAPI = { trackEvent };

export default analyticsEventsAPI;
