'use client';

import { useAppStore } from '@/lib/store';
import AppShell from '@/components/app/AppShell';
import Dashboard from '@/components/app/Dashboard';
import ClientsView from '@/components/app/ClientsView';
import WorkersView from '@/components/app/WorkersView';
import ProjectsView from '@/components/app/ProjectsView';
import ProjectDetail from '@/components/app/ProjectDetail';

export default function Home() {
  const { currentView } = useAppStore();

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard key="dashboard" />;
      case 'clients':
        return <ClientsView key="clients" />;
      case 'workers':
        return <WorkersView key="workers" />;
      case 'projects':
        return <ProjectsView key="projects" />;
      case 'project-detail':
        return <ProjectDetail key="project-detail" />;
      default:
        return <Dashboard key="dashboard" />;
    }
  };

  return <AppShell>{renderView()}</AppShell>;
}
