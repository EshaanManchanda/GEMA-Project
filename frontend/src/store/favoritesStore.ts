import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FavoritesState {
  events: string[];
  courses: string[];
  toggleEvent: (eventId: string) => void;
  toggleCourse: (courseId: string) => void;
  isEventFavorite: (eventId: string) => boolean;
  isCourseFavorite: (courseId: string) => boolean;
  clearAll: () => void;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      events: [],
      courses: [],
      toggleEvent: (eventId) =>
        set((s) => ({
          events: s.events.includes(eventId)
            ? s.events.filter((id) => id !== eventId)
            : [...s.events, eventId],
        })),
      toggleCourse: (courseId) =>
        set((s) => ({
          courses: s.courses.includes(courseId)
            ? s.courses.filter((id) => id !== courseId)
            : [...s.courses, courseId],
        })),
      isEventFavorite: (eventId) => get().events.includes(eventId),
      isCourseFavorite: (courseId) => get().courses.includes(courseId),
      clearAll: () => set({ events: [], courses: [] }),
    }),
    { name: 'gema-favorites-store' },
  ),
);
