import { create } from 'zustand';
import type { AppView } from './types';

interface AppState {
  currentView: AppView;
  selectedProjectId: string | null;
  sidebarOpen: boolean;
  setCurrentView: (view: AppView) => void;
  setSelectedProject: (projectId: string) => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'dashboard',
  selectedProjectId: null,
  sidebarOpen: true,
  setCurrentView: (view) => set({ currentView: view, selectedProjectId: view === 'project-detail' ? undefined : null }),
  setSelectedProject: (projectId) => set({ selectedProjectId: projectId, currentView: 'project-detail' }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
