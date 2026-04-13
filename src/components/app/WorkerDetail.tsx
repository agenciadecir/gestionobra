'use client';

import { useEffect, useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useAppStore } from '@/lib/store';
import type { Worker } from '@/lib/types';
import {
  ArrowLeft,
  HardHat,
  Phone,
  Wrench,
  DollarSign,
  Calendar,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkerWithDetails extends Worker {
  laborCosts?: Array<{
    id: string;
    description: string;
    workerPrice: number;
    notes?: string;
    createdAt: string;
    project: { id: string; title: string };
    workerPayments?: Array<{
      id: string;
      date: string;
      amount: number;
      concept: string;
      method: string;
      notes?: string;
    }>;
    invoice?: { id: string; number: string } | null;
  }>;
  tasks?: Array<{
    id: string;
    title: string;
    description?: string;
    status: string;
    priority: string;
    createdAt: string;
    dueDate?: string;
    completedDate?: string;
    project: { id: string; title: string };
  }>;
}

interface ProjectEarnings {
  projectId: string;
  projectTitle: string;
  laborCosts: WorkerWithDetails['laborCosts'];
  totalCost: number;
  totalPaid: number;
  totalPending: number;
  payPercent: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
  });
}

function getConceptLabel(concept: string): string {
  const map: Record<string, string> = {
    ADELANTO: 'Adelanto',
    PARCIAL: 'Parcial',
    FINAL: 'Final',
    REINTEGRO_MATERIAL: 'Reintegro Material',
  };
  return map[concept] || concept;
}

function getMethodLabel(method: string): string {
  const map: Record<string, string> = {
    EFECTIVO: 'Efectivo',
    TRANSFERENCIA: 'Transferencia',
    CHEQUE: 'Cheque',
    OTRO: 'Otro',
  };
  return map[method] || method;
}

function getStatusBadge(status: string) {
  const config: Record<string, { label: string; className: string }> = {
    PENDIENTE: { label: 'Pendiente', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
    EN_CURSO: { label: 'En Curso', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
    COMPLETADA: { label: 'Completada', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
  };
  return config[status] || { label: status, className: 'bg-gray-100 text-gray-700' };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function WorkerDetail() {
  const { selectedWorkerId, setCurrentView } = useAppStore();
  const [worker, setWorker] = useState<WorkerWithDetails | null>(null);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const loading = worker === null && !error && !!selectedWorkerId;

  useEffect(() => {
    if (!selectedWorkerId) return;
    let cancelled = false;
    fetch(`/api/workers/${selectedWorkerId}`)
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Error al cargar');
      })
      .then((data) => {
        if (!cancelled) {
          setError(false);
          setWorker(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          toast.error('Error al cargar el trabajador');
          setError(true);
        }
      });
    return () => { cancelled = true; };
  }, [selectedWorkerId]);

  // ── Computed data ──────────────────────────────────────────────────────────

  const projectEarnings = useMemo((): ProjectEarnings[] => {
    if (!worker?.laborCosts) return [];

    const map = new Map<string, ProjectEarnings>();

    for (const lc of worker.laborCosts) {
      const pid = lc.project.id;
      let entry = map.get(pid);
      if (!entry) {
        entry = {
          projectId: pid,
          projectTitle: lc.project.title,
          laborCosts: [],
          totalCost: 0,
          totalPaid: 0,
          totalPending: 0,
          payPercent: 0,
        };
        map.set(pid, entry);
      }
      entry.laborCosts!.push(lc);
      entry.totalCost += lc.workerPrice;
      const paid = (lc.workerPayments ?? []).reduce((s, p) => s + p.amount, 0);
      entry.totalPaid += paid;
      entry.totalPending += (lc.workerPrice - paid);
    }

    // Calculate percentages
    for (const entry of map.values()) {
      entry.payPercent = entry.totalCost > 0 ? Math.round((entry.totalPaid / entry.totalCost) * 100) : 0;
      // Sort labor costs by date
      entry.laborCosts!.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }

    // Sort projects by totalPending (most owed first), then by totalCost
    return Array.from(map.values()).sort((a, b) => {
      if (b.totalPending !== a.totalPending) return b.totalPending - a.totalPending;
      return b.totalCost - a.totalCost;
    });
  }, [worker]);

  const grandTotals = useMemo(() => ({
    totalCost: projectEarnings.reduce((s, p) => s + p.totalCost, 0),
    totalPaid: projectEarnings.reduce((s, p) => s + p.totalPaid, 0),
    totalPending: projectEarnings.reduce((s, p) => s + p.totalPending, 0),
  }), [projectEarnings]);

  // All payments sorted by date (timeline)
  const paymentTimeline = useMemo(() => {
    const payments: Array<{
      id: string;
      date: string;
      amount: number;
      concept: string;
      method: string;
      projectTitle: string;
      laborCostDesc: string;
    }> = [];

    for (const pe of projectEarnings) {
      for (const lc of pe.laborCosts!) {
        for (const p of (lc.workerPayments ?? [])) {
          payments.push({
            id: p.id,
            date: p.date,
            amount: p.amount,
            concept: p.concept,
            method: p.method,
            projectTitle: pe.projectTitle,
            laborCostDesc: lc.description,
          });
        }
      }
    }

    return payments.sort((a, b) => b.date.localeCompare(a.date));
  }, [projectEarnings]);

  const activeProjects = projectEarnings.filter((p) => p.totalPending > 0).length;
  const completedProjects = projectEarnings.filter((p) => p.totalPending <= 0).length;

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <HardHat className="mb-3 size-10 text-muted-foreground/50" />
        <p className="text-muted-foreground">Trabajador no encontrado</p>
        <Button variant="link" onClick={() => setCurrentView('workers')} className="mt-1">
          Volver a Trabajadores
        </Button>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="space-y-4">
        <Button
          variant="ghost"
          className="gap-2 text-muted-foreground -ml-2"
          onClick={() => setCurrentView('workers')}
        >
          <ArrowLeft className="size-4" />
          Volver a Trabajadores
        </Button>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30">
                <HardHat className="size-6 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{worker.name}</h1>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  {worker.specialty && (
                    <span className="flex items-center gap-1">
                      <Wrench className="size-3.5" />
                      {worker.specialty}
                    </span>
                  )}
                  {worker.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="size-3.5" />
                      {worker.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <Badge variant="outline" className="text-xs w-fit">
            {projectEarnings.length} obra{projectEarnings.length !== 1 ? 's' : ''} · {(worker.tasks ?? []).length} tarea{(worker.tasks ?? []).length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <DollarSign className="size-4 text-green-600" />
              Total Cobrado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatMoney(grandTotals.totalPaid)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <AlertTriangle className="size-4 text-red-600" />
              Adeudado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {formatMoney(grandTotals.totalPending)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingUp className="size-4 text-blue-600" />
              Total Facturado MO
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatMoney(grandTotals.totalCost)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Building2 className="size-4 text-amber-600" />
              Obras
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              <span className="text-amber-600">{activeProjects}</span>
              <span className="text-muted-foreground font-normal text-lg"> pendientes</span>
              <span className="text-muted-foreground font-normal text-lg"> · </span>
              <span className="text-green-600">{completedProjects}</span>
              <span className="text-muted-foreground font-normal text-lg"> saldadas</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {grandTotals.totalCost > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progreso de pagos general</span>
            <span className="font-medium">
              {Math.round((grandTotals.totalPaid / grandTotals.totalCost) * 100)}%
            </span>
          </div>
          <Progress value={(grandTotals.totalPaid / grandTotals.totalCost) * 100} className="h-3" />
        </div>
      )}

      {/* By-project breakdown */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Building2 className="size-5" />
          Ganancias por Obra
        </h2>

        {projectEarnings.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <DollarSign className="mb-2 size-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No hay costos de mano de obra registrados para este trabajador.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {projectEarnings.map((pe) => {
              const isExpanded = expandedProject === pe.projectId;
              return (
                <Card key={pe.projectId} className="overflow-hidden">
                  {/* Project header row */}
                  <button
                    className="w-full text-left"
                    onClick={() => setExpandedProject(isExpanded ? null : pe.projectId)}
                  >
                    <div className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold truncate">{pe.projectTitle}</h3>
                          {pe.totalPending <= 0 ? (
                            <CheckCircle2 className="size-4 text-green-500 shrink-0" />
                          ) : (
                            <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 text-[10px]">
                              Adeudado
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                          <span>Facturado: <strong className="text-foreground">{formatMoney(pe.totalCost)}</strong></span>
                          <span className="text-green-600 dark:text-green-400">Cobrado: <strong>{formatMoney(pe.totalPaid)}</strong></span>
                          {pe.totalPending > 0 && (
                            <span className="text-red-600 dark:text-red-400">Adeudado: <strong>{formatMoney(pe.totalPending)}</strong></span>
                          )}
                        </div>
                      </div>

                      {/* Progress circle */}
                      <div className="hidden sm:flex items-center gap-3 shrink-0">
                        <div className="relative size-12">
                          <svg className="size-12 -rotate-90" viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/20" />
                            <circle
                              cx="18" cy="18" r="15" fill="none"
                              stroke={pe.payPercent >= 100 ? '#22c55e' : pe.payPercent >= 50 ? '#3b82f6' : '#ef4444'}
                              strokeWidth="3"
                              strokeDasharray={`${pe.payPercent * 0.9425} 100`}
                              strokeLinecap="round"
                            />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                            {pe.payPercent}%
                          </span>
                        </div>
                        {isExpanded ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
                      </div>

                      {/* Mobile chevron */}
                      <div className="sm:hidden">
                        {isExpanded ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
                      </div>
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t bg-muted/20">
                      <div className="p-4">
                        <div className="rounded-md border">
                          <div className="max-h-[300px] overflow-y-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Trabajo</TableHead>
                                  <TableHead className="text-right w-28">Costo MO</TableHead>
                                  <TableHead className="text-right w-28">Pagado</TableHead>
                                  <TableHead className="text-right w-28">Adeudado</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {pe.laborCosts!.map((lc) => {
                                  const paid = (lc.workerPayments ?? []).reduce((s, p) => s + p.amount, 0);
                                  const pending = lc.workerPrice - paid;
                                  return (
                                    <TableRow key={lc.id}>
                                      <TableCell>
                                        <div>
                                          <span className="font-medium">{lc.description}</span>
                                          {lc.workerPayments && lc.workerPayments.length > 0 && (
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                              {lc.workerPayments.length} pago{lc.workerPayments.length > 1 ? 's' : ''} registrado{lc.workerPayments.length > 1 ? 's' : ''}
                                            </p>
                                          )}
                                        </div>
                                      </TableCell>
                                      <TableCell className="text-right tabular-nums">
                                        {formatMoney(lc.workerPrice)}
                                      </TableCell>
                                      <TableCell className="text-right tabular-nums text-green-600 dark:text-green-400 font-medium">
                                        {formatMoney(paid)}
                                      </TableCell>
                                      <TableCell className={`text-right tabular-nums font-medium ${pending > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
                                        {formatMoney(pending)}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                              <TableFooter>
                                <TableRow>
                                  <TableCell className="font-semibold">Total</TableCell>
                                  <TableCell className="text-right font-bold tabular-nums">
                                    {formatMoney(pe.totalCost)}
                                  </TableCell>
                                  <TableCell className="text-right font-bold tabular-nums text-green-600 dark:text-green-400">
                                    {formatMoney(pe.totalPaid)}
                                  </TableCell>
                                  <TableCell className={`text-right font-bold tabular-nums ${pe.totalPending > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                    {formatMoney(pe.totalPending)}
                                  </TableCell>
                                </TableRow>
                              </TableFooter>
                            </Table>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Payment timeline */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="size-5" />
          Historial de Pagos
        </h2>

        {paymentTimeline.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <DollarSign className="mb-2 size-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No hay pagos registrados.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-md border">
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Obra</TableHead>
                    <TableHead>Trabajo</TableHead>
                    <TableHead className="text-center">Concepto</TableHead>
                    <TableHead className="text-center">Método</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentTimeline.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatDate(p.date)}
                      </TableCell>
                      <TableCell className="max-w-[140px] truncate text-sm">
                        {p.projectTitle}
                      </TableCell>
                      <TableCell className="max-w-[140px] truncate text-sm">
                        {p.laborCostDesc}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="text-[10px]">
                          {getConceptLabel(p.concept)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground">
                        {getMethodLabel(p.method)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-600 dark:text-green-400 tabular-nums">
                        {formatMoney(p.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      {/* Tasks */}
      {(worker.tasks && worker.tasks.length > 0) && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CheckCircle2 className="size-5" />
            Tareas Asignadas
          </h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {worker.tasks.map((task) => {
              const status = getStatusBadge(task.status);
              return (
                <Card key={task.id} className="py-0">
                  <CardContent className="p-3 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className={`text-sm font-medium leading-snug ${task.status === 'COMPLETADA' ? 'line-through text-muted-foreground' : ''}`}>
                        {task.title}
                      </span>
                      <Badge variant="secondary" className={`text-[10px] shrink-0 ${status.className}`}>
                        {status.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Building2 className="size-3" />
                      <span className="truncate">{task.project.title}</span>
                    </div>
                    {task.dueDate && (
                      <div className={`flex items-center gap-1 text-xs ${task.status !== 'COMPLETADA' && new Date(task.dueDate) < new Date() ? 'text-red-600' : 'text-muted-foreground'}`}>
                        <Clock className="size-3" />
                        {formatDateShort(task.dueDate)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Notes */}
      {worker.notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{worker.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
