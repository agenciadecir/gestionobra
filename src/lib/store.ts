import { create } from 'zustand';
import type { AppView } from './types';

interface AppState {
  currentView: AppView;
  selectedProjectId: string | null;
  projectDetailTab: string;
  sidebarOpen: boolean;
  setCurrentView: (view: AppView) => void;
  setSelectedProject: (projectId: string) => void;
  setSidebarOpen: (open: boolean) => void;
  setProjectDetailTab: (tab: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'dashboard',
  selectedProjectId: null,
  projectDetailTab: 'resumen',
  sidebarOpen: true,
  setCurrentView: (view) => set({ currentView: view, selectedProjectId: view === 'project-detail' ? undefined : null }),
  setSelectedProject: (projectId) => set({ selectedProjectId: projectId, currentView: 'project-detail', projectDetailTab: 'resumen' }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setProjectDetailTab: (tab) => set({ projectDetailTab: tab }),
}));
