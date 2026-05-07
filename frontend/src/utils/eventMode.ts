export type EventMode = 'Online' | 'Offline';

export const normalizeEventMode = (value?: string | null): EventMode => {
  const normalized = value?.toString().trim().toLowerCase();

  if (normalized === 'online') {
    return 'Online';
  }

  // Treat legacy venue style values as Offline.
  if (normalized === 'offline' || normalized === 'indoor' || normalized === 'outdoor') {
    return 'Offline';
  }

  return 'Offline';
};

export const getEventMode = (event: {
  eventType?: string | null;
  venueType?: string | null;
}): EventMode => normalizeEventMode(event.eventType || event.venueType);
