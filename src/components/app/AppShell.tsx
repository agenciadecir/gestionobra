'use client';

import { useAppStore } from '@/lib/store';
import {
  LayoutDashboard,
  Users,
  HardHat,
  Building2,
  Wrench,
  Menu,
  X,
  Home,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { AppView } from '@/lib/types';

const navItems: { view: AppView; label: string; icon: React.ReactNode }[] = [
  { view: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="size-5" /> },
  { view: 'clients', label: 'Clientes', icon: <Users className="size-5" /> },
  { view: 'workers', label: 'Trabajadores', icon: <HardHat className="size-5" /> },
  { view: 'projects', label: 'Obras', icon: <Building2 className="size-5" /> },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { currentView, setCurrentView, sidebarOpen, setSidebarOpen } = useAppStore();

  const handleNavClick = (view: AppView) => {
    setCurrentView(view);
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed z-50 flex h-full w-64 flex-col border-r bg-sidebar text-sidebar-foreground transition-transform duration-200 ease-in-out md:static md:z-auto md:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Sidebar header */}
        <div className="flex h-16 items-center gap-3 px-6">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Wrench className="size-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold leading-tight tracking-tight">ObraGestión</span>
            <span className="text-xs text-muted-foreground">Gestión de Obras</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto md:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="size-5" />
          </Button>
        </div>

        <Separator className="bg-sidebar-border" />

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <button
                key={item.view}
                onClick={() => handleNavClick(item.view)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  currentView === item.view
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                )}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>
        </ScrollArea>

        {/* Sidebar footer */}
        <div className="border-t bg-sidebar px-6 py-4">
          <p className="text-xs text-sidebar-foreground/50">
            &copy; {new Date().getFullYear()} ObraGestión
          </p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top header bar */}
        <header className="flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="size-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Home className="size-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {navItems.find((i) => i.view === currentView)?.label ?? 'Dashboard'}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-muted/30 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
