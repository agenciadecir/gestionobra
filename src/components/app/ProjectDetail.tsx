'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import type { Project } from '@/lib/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Pencil,
  MapPin,
  CalendarDays,
  User,
  FileText,
  ClipboardList,
  DollarSign,
  CreditCard,
  Package,
  HardHat,
  CheckSquare,
  TrendingUp,
  Calculator,
  Wallet,
  Banknote,
  StickyNote,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import BudgetsTab from './tabs/BudgetsTab';
import InvoicesTab from './tabs/InvoicesTab';
import MaterialsTab from './tabs/MaterialsTab';
import LaborCostsTab from './tabs/LaborCostsTab';
import TasksTab from './tabs/TasksTab';

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  Project['status'],
  { label: string; className: string }
> = {
  PRESUPUESTO: {
    label: 'Presupuesto',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  EN_CURSO: {
    label: 'En Curso',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  PAUSADA: {
    label: 'Pausada',
    className: 'bg-orange-100 text-orange-800 border-orange-200',
  },
  FINALIZADA: {
    label: 'Finalizada',
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  CANCELADA: {
    label: 'Cancelada',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
};

const CLIENT_TYPE_LABELS: Record<string, string> = {
  PARTICULAR: 'Particular',
  CONSORCIO: 'Consorcio',
};

const moneyFormat = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
});

const fmtMoney = (amount: number) => moneyFormat.format(amount);
const fmtDate = (date?: string | null) =>
  date ? new Date(date).toLocaleDateString('es-AR') : '—';

// ── Zod schema for edit form ────────────────────────────────────────────────

const editProjectSchema = z.object({
  title: z.string().min(1, 'El título es obligatorio'),
  description: z.string(),
  address: z.string(),
  status: z.enum(['PRESUPUESTO', 'EN_CURSO', 'PAUSADA', 'FINALIZADA', 'CANCELADA']),
  startDate: z.string(),
  endDate: z.string(),
  notes: z.string(),
});

type EditProjectForm = z.infer<typeof editProjectSchema>;

// ── Component ────────────────────────────────────────────────────────────────

export default function ProjectDetail() {
  const { selectedProjectId, setCurrentView } = useAppStore();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Fetch project ────────────────────────────────────────────────────────

  const fetchProject = useCallback(async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${selectedProjectId}`);
      if (!res.ok) throw new Error('Error al cargar el proyecto');
      const data: Project = await res.json();
      setProject(data);
    } catch {
      toast.error('Error al cargar el proyecto');
      setCurrentView('projects');
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId, setCurrentView]);

  useEffect(() => {
    if (!selectedProjectId) {
      setCurrentView('projects');
      return;
    }
    fetchProject();
  }, [selectedProjectId, setCurrentView, fetchProject]);

  // ── Edit form ────────────────────────────────────────────────────────────

  const form = useForm<EditProjectForm>({
    resolver: zodResolver(editProjectSchema),
    defaultValues: {
      title: '',
      description: '',
      address: '',
      status: 'PRESUPUESTO',
      startDate: '',
      endDate: '',
      notes: '',
    },
  });

  // Populate form when project loads or dialog opens
  useEffect(() => {
    if (project && editOpen) {
      form.reset({
        title: project.title,
        description: project.description ?? '',
        address: project.address ?? '',
        status: project.status,
        startDate: project.startDate ? project.startDate.slice(0, 10) : '',
        endDate: project.endDate ? project.endDate.slice(0, 10) : '',
        notes: project.notes ?? '',
      });
    }
  }, [project, editOpen, form]);

  const onSubmit = async (values: EditProjectForm) => {
    if (!project) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          clientId: project.clientId,
          startDate: values.startDate || null,
          endDate: values.endDate || null,
          description: values.description || null,
          address: values.address || null,
          notes: values.notes || null,
        }),
      });
      if (!res.ok) throw new Error('Error al actualizar');
      toast.success('Proyecto actualizado correctamente');
      setEditOpen(false);
      fetchProject();
    } catch {
      toast.error('Error al actualizar el proyecto');
    } finally {
      setSaving(false);
    }
  };

  // ── Summary calculations ─────────────────────────────────────────────────

  const totalPresupuestado =
    project?.budgets
      ?.filter((b) => b.status === 'APROBADO')
      .reduce((sum, b) => sum + b.totalAmount, 0) ?? 0;

  const totalFacturado =
    project?.invoices
      ?.filter((i) => i.status !== 'ANULADA')
      .reduce((sum, i) => sum + i.amount, 0) ?? 0;

  const totalCobrado =
    project?.invoices?.reduce(
      (sum, i) => sum + (i.payments?.reduce((ps, p) => ps + p.amount, 0) ?? 0),
      0
    ) ?? 0;

  const saldoPendiente = totalFacturado - totalCobrado;

  const totalMateriales =
    project?.materials
      ?.filter((m) => m.purchasedBy === 'YO')
      .reduce((sum, m) => sum + m.totalCost, 0) ?? 0;

  const totalCostosMO =
    project?.laborCosts?.reduce((sum, l) => sum + l.finalPrice, 0) ?? 0;

  const gananciaEstimada =
    totalPresupuestado - totalMateriales - totalCostosMO;

  const totalTasks = project?.tasks?.length ?? 0;
  const completedTasks = project?.tasks?.filter((t) => t.status === 'COMPLETADA').length ?? 0;

  // ── Loading skeleton ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-5 w-32" />
          <div className="flex gap-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-16 w-full" />
        </div>
        <Skeleton className="h-10 w-full max-w-2xl" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  if (!project) return null;

  // ── Summary cards data ───────────────────────────────────────────────────

  const summaryCards = [
    {
      label: 'Total Presupuestado',
      value: fmtMoney(totalPresupuestado),
      icon: Calculator,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Total Facturado',
      value: fmtMoney(totalFacturado),
      icon: CreditCard,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
    },
    {
      label: 'Total Cobrado',
      value: fmtMoney(totalCobrado),
      icon: Banknote,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Saldo Pendiente',
      value: fmtMoney(saldoPendiente),
      icon: Wallet,
      color: saldoPendiente > 0 ? 'text-red-600' : 'text-green-600',
      bg: saldoPendiente > 0 ? 'bg-red-50' : 'bg-green-50',
    },
    {
      label: 'Total Materiales',
      value: fmtMoney(totalMateriales),
      icon: Package,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Total Costos MO',
      value: fmtMoney(totalCostosMO),
      icon: HardHat,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
    {
      label: 'Ganancia Estimada',
      value: fmtMoney(gananciaEstimada),
      icon: TrendingUp,
      color: gananciaEstimada >= 0 ? 'text-emerald-600' : 'text-red-600',
      bg: gananciaEstimada >= 0 ? 'bg-emerald-50' : 'bg-red-50',
    },
    {
      label: 'Tareas Completadas',
      value: `${completedTasks} de ${totalTasks}`,
      icon: CheckSquare,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
  ];

  // ── Render ───────────────────────────────────────────────────────────────

  const statusCfg = STATUS_CONFIG[project.status];

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setCurrentView('projects')}
        className="gap-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Volver a Obras
      </Button>

      {/* Project header */}
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{project.title}</h1>
              <Badge variant="outline" className={statusCfg.className}>
                {statusCfg.label}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {project.client && (
                <span className="flex items-center gap-1.5">
                  <User className="size-3.5" />
                  {project.client.name}
                  {project.client.type && (
                    <span className="text-xs text-muted-foreground/70">
                      ({CLIENT_TYPE_LABELS[project.client.type] ?? project.client.type})
                    </span>
                  )}
                </span>
              )}
              {project.address && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-3.5" />
                  {project.address}
                </span>
              )}
              {project.startDate && (
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="size-3.5" />
                  {fmtDate(project.startDate)}
                  {project.endDate && ` — ${fmtDate(project.endDate)}`}
                </span>
              )}
            </div>
          </div>

          {/* Edit button */}
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Pencil className="size-4" />
                Editar
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Editar Proyecto</DialogTitle>
                <DialogDescription>
                  Modifica los datos principales del proyecto.
                </DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Título</FormLabel>
                        <FormControl>
                          <Input placeholder="Nombre del proyecto" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descripción</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Descripción del proyecto"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dirección</FormLabel>
                        <FormControl>
                          <Input placeholder="Dirección de obra" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Seleccionar estado" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                              <SelectItem key={key} value={key}>
                                {cfg.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fecha de inicio</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fecha de fin</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notas</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Notas internas"
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={saving}>
                      {saving ? 'Guardando...' : 'Guardar cambios'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Description & Notes */}
        {project.description && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <FileText className="mt-0.5 size-4 shrink-0" />
            <span>{project.description}</span>
          </div>
        )}
        {project.notes && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground/80">
            <StickyNote className="mt-0.5 size-4 shrink-0" />
            <span>{project.notes}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="resumen" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="resumen" className="gap-1.5">
            <ClipboardList className="size-3.5" />
            Resumen
          </TabsTrigger>
          <TabsTrigger value="presupuestos" className="gap-1.5">
            <DollarSign className="size-3.5" />
            Presupuestos
          </TabsTrigger>
          <TabsTrigger value="facturas" className="gap-1.5">
            <CreditCard className="size-3.5" />
            Facturas &amp; Pagos
          </TabsTrigger>
          <TabsTrigger value="materiales" className="gap-1.5">
            <Package className="size-3.5" />
            Materiales
          </TabsTrigger>
          <TabsTrigger value="mano-de-obra" className="gap-1.5">
            <HardHat className="size-3.5" />
            Mano de Obra
          </TabsTrigger>
          <TabsTrigger value="tareas" className="gap-1.5">
            <CheckSquare className="size-3.5" />
            Tareas
          </TabsTrigger>
        </TabsList>

        {/* Resumen tab – summary grid */}
        <TabsContent value="resumen">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {summaryCards.map((card) => {
              const Icon = card.icon;
              return (
                <Card key={card.label} className="gap-3 py-4">
                  <CardContent className="flex items-center gap-3 px-4">
                    <div
                      className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${card.bg}`}
                    >
                      <Icon className={`size-5 ${card.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs text-muted-foreground">
                        {card.label}
                      </p>
                      <p className="truncate text-sm font-semibold">{card.value}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Other tabs */}
        <TabsContent value="presupuestos">
          <BudgetsTab project={project} mode="full" onRefresh={fetchProject} />
        </TabsContent>

        <TabsContent value="facturas">
          {project && <InvoicesTab project={project} onRefresh={fetchProject} />}
        </TabsContent>

        <TabsContent value="materiales">
          <MaterialsTab project={project} onRefresh={fetchProject} />
        </TabsContent>

        <TabsContent value="mano-de-obra">
          <LaborCostsTab project={project} onRefresh={fetchProject} />
        </TabsContent>

        <TabsContent value="tareas">
          <TasksTab project={project} onRefresh={fetchProject} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
