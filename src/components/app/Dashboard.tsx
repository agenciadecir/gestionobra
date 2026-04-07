'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import type { DashboardStats } from '@/lib/types';
import {
  Building2,
  Users,
  HardHat,
  FileText,
  TrendingUp,
  ListChecks,
  DollarSign,
  CircleDollarSign,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const moneyFormat = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
});

const statusColors: Record<string, string> = {
  PRESUPUESTO: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  EN_CURSO: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  PAUSADA: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  FINALIZADA: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  CANCELADA: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const statusLabels: Record<string, string> = {
  PRESUPUESTO: 'Presupuesto',
  EN_CURSO: 'En Curso',
  PAUSADA: 'Pausada',
  FINALIZADA: 'Finalizada',
  CANCELADA: 'Cancelada',
};

function StatCard({
  title,
  value,
  icon,
  accent,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={accent ?? 'text-muted-foreground'}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function SkeletonCard() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="size-5 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16" />
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { setCurrentView, setSelectedProject } = useAppStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      // Silently fail - stats will show empty
    } finally {
      setLoading(false);
    }
  };

  const handleProjectClick = (projectId: string) => {
    setSelectedProject(projectId);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-1 h-4 w-72" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Resumen general de la gestión de obras
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Obras Activas"
          value={stats?.activeProjects ?? 0}
          icon={<Building2 className="size-5" />}
          accent="text-blue-600 dark:text-blue-400"
        />
        <StatCard
          title="Clientes"
          value={stats?.totalClients ?? 0}
          icon={<Users className="size-5" />}
          accent="text-green-600 dark:text-green-400"
        />
        <StatCard
          title="Trabajadores"
          value={stats?.totalWorkers ?? 0}
          icon={<HardHat className="size-5" />}
          accent="text-purple-600 dark:text-purple-400"
        />
        <StatCard
          title="Facturas Pendientes"
          value={moneyFormat.format(stats?.totalPendingAmount ?? 0)}
          icon={<FileText className="size-5" />}
          accent="text-orange-600 dark:text-orange-400"
        />
        <StatCard
          title="Ingresos Totales"
          value={moneyFormat.format(stats?.totalRevenue ?? 0)}
          icon={<TrendingUp className="size-5" />}
          accent="text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          title="Tareas Pendientes"
          value={stats?.pendingTasks ?? 0}
          icon={<ListChecks className="size-5" />}
          accent="text-amber-600 dark:text-amber-400"
        />
        <StatCard
          title="Costos MO Pendientes"
          value={moneyFormat.format(stats?.totalPendingLaborCosts ?? 0)}
          icon={<DollarSign className="size-5" />}
          accent="text-red-600 dark:text-red-400"
        />
        <StatCard
          title="Cobrado"
          value={moneyFormat.format(stats?.totalCollected ?? 0)}
          icon={<CircleDollarSign className="size-5" />}
          accent="text-teal-600 dark:text-teal-400"
        />
      </div>

      {/* Recent projects */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Obras Recientes</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentView('projects')}
            className="gap-2"
          >
            Ver Todas las Obras
            <ArrowRight className="size-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {!stats?.recentProjects || stats.recentProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Building2 className="mb-2 size-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No hay obras registradas todavía.
              </p>
              <Button
                variant="link"
                size="sm"
                onClick={() => setCurrentView('projects')}
                className="mt-1"
              >
                Crear primera obra
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Obra</th>
                    <th className="hidden pb-3 pr-4 font-medium sm:table-cell">Cliente</th>
                    <th className="hidden pb-3 pr-4 font-medium md:table-cell">Dirección</th>
                    <th className="pb-3 pr-4 font-medium">Estado</th>
                    <th className="hidden pb-3 font-medium lg:table-cell">Presupuestos</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentProjects.map((project) => (
                    <tr
                      key={project.id}
                      className="cursor-pointer border-b last:border-0 transition-colors hover:bg-muted/50"
                      onClick={() => handleProjectClick(project.id)}
                    >
                      <td className="py-3 pr-4 font-medium">{project.title}</td>
                      <td className="hidden py-3 pr-4 sm:table-cell">
                        {project.client?.name ?? '-'}
                      </td>
                      <td className="hidden max-w-[200px] truncate py-3 pr-4 md:table-cell">
                        {project.address ?? '-'}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge
                          variant="secondary"
                          className={statusColors[project.status] ?? ''}
                        >
                          {statusLabels[project.status] ?? project.status}
                        </Badge>
                      </td>
                      <td className="hidden py-3 lg:table-cell">
                        {project._count?.budgets ?? 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
