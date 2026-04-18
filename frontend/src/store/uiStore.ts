import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  modals: Record<string, boolean>;
  openModal: (name: string) => void;
  closeModal: (name: string) => void;
  closeAllModals: () => void;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      modals: {},
      openModal: (name) => set((s) => ({ modals: { ...s.modals, [name]: true } })),
      closeModal: (name) => set((s) => ({ modals: { ...s.modals, [name]: false } })),
      closeAllModals: () => set({ modals: {} }),
      sidebarOpen: false,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      theme: 'light',
      toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'gema-ui-store',
      partialize: (s) => ({ theme: s.theme }),
    },
  ),
);
