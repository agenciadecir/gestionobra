import { create } from 'zustand';
import type { AppView } from './types';

interface AppState {
  currentView: AppView;
  selectedProjectId: string | null;
  selectedWorkerId: string | null;
  projectDetailTab: string;
  sidebarOpen: boolean;
  setCurrentView: (view: AppView) => void;
  setSelectedProject: (projectId: string) => void;
  setSelectedWorker: (workerId: string) => void;
  setSidebarOpen: (open: boolean) => void;
  setProjectDetailTab: (tab: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'dashboard',
  selectedProjectId: null,
  selectedWorkerId: null,
  projectDetailTab: 'resumen',
  sidebarOpen: true,
  setCurrentView: (view) => set({ currentView: view, selectedProjectId: view === 'project-detail' ? undefined : null, selectedWorkerId: view === 'worker-detail' ? undefined : null }),
  setSelectedProject: (projectId) => set({ selectedProjectId: projectId, currentView: 'project-detail', projectDetailTab: 'resumen' }),
  setSelectedWorker: (workerId) => set({ selectedWorkerId: workerId, currentView: 'worker-detail' }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setProjectDetailTab: (tab) => set({ projectDetailTab: tab }),
}));
