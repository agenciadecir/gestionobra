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
  Clock,
  AlertTriangle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
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

  // From budgets (approved)
  const totalPresupuestado =
    project?.budgets
      ?.filter((b) => b.status === 'APROBADO')
      .reduce((sum, b) => sum + b.totalAmount, 0) ?? 0;

  // From invoices (non-ANULADA)
  const totalFacturado =
    project?.invoices
      ?.filter((i) => i.status !== 'ANULADA')
      .reduce((sum, i) => sum + i.amount, 0) ?? 0;

  const totalCobrado =
    project?.invoices
      ?.filter((i) => i.status !== 'ANULADA')
      .reduce(
        (sum, i) => sum + (i.payments?.reduce((ps, p) => ps + p.amount, 0) ?? 0),
        0
      ) ?? 0;

  const saldoPendienteCliente = totalFacturado - totalCobrado;

  // Labor costs
  const totalMOCliente = project?.laborCosts?.reduce((sum, l) => sum + l.finalPrice, 0) ?? 0;
  const totalMOTrabajador = project?.laborCosts?.reduce((sum, l) => sum + l.workerPrice, 0) ?? 0;
  const totalMarkupGanancia = project?.laborCosts?.reduce((sum, l) => sum + l.markupAmount, 0) ?? 0;
  const moSinFacturar = project?.laborCosts?.filter((l) => !l.invoiceId).reduce((sum, l) => sum + l.finalPrice, 0) ?? 0;
  const moSinFacturarCount = project?.laborCosts?.filter((l) => !l.invoiceId).length ?? 0;

  // Worker payments
  const totalPagadoTrabajadores =
    project?.workerPayments?.reduce((sum, wp) => sum + wp.amount, 0) ?? 0;
  const saldoPendienteTrabajadores = totalMOTrabajador - totalPagadoTrabajadores;

  // Materials
  const totalMaterialesCompradosPorMi =
    project?.materials?.filter((m) => m.purchasedBy === 'YO').reduce((sum, m) => sum + m.totalCost, 0) ?? 0;
  const totalReintegros =
    project?.materials?.filter((m) => m.purchasedBy === 'TRABAJADOR' && m.reimbursed).reduce((sum, m) => sum + m.totalCost, 0) ?? 0;
  const materialesSinFacturar =
    project?.materials?.filter((m) => (m.purchasedBy === 'YO' || m.purchasedBy === 'TRABAJADOR') && !m.invoiceId).reduce((sum, m) => sum + m.totalCost, 0) ?? 0;
  const materialesSinFacturarCount =
    project?.materials?.filter((m) => (m.purchasedBy === 'YO' || m.purchasedBy === 'TRABAJADOR') && !m.invoiceId).length ?? 0;
  const pendienteReintegro =
    project?.materials?.filter((m) => m.purchasedBy === 'TRABAJADOR' && !m.reimbursed).reduce((sum, m) => sum + m.totalCost, 0) ?? 0;

  // My total costs = paid to workers + materials bought by me + reimbursements
  const totalMisCostos = totalPagadoTrabajadores + totalMaterialesCompradosPorMi + totalReintegros;
  // Gross profit = money received from client - my total costs
  const gananciaBruta = totalCobrado - totalMisCostos;

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
    // Row 1 – Dinero del cliente
    {
      label: 'Presupuestado',
      value: fmtMoney(totalPresupuestado),
      icon: Calculator,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Facturado',
      value: fmtMoney(totalFacturado),
      icon: CreditCard,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
    },
    {
      label: 'Cobrado',
      value: fmtMoney(totalCobrado),
      icon: Banknote,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Saldo Cliente',
      value: fmtMoney(saldoPendienteCliente),
      icon: Wallet,
      color: saldoPendienteCliente > 0 ? 'text-red-600' : 'text-green-600',
      bg: saldoPendienteCliente > 0 ? 'bg-red-50' : 'bg-green-50',
    },
    // Row 2 – Con el trabajador
    {
      label: 'MO Total (con markup)',
      value: fmtMoney(totalMOCliente),
      icon: DollarSign,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      label: 'Pagado al Trabajador',
      value: fmtMoney(totalPagadoTrabajadores),
      icon: HardHat,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
    {
      label: 'Pendiente Trabajador',
      value: fmtMoney(saldoPendienteTrabajadores),
      icon: Clock,
      color: saldoPendienteTrabajadores > 0 ? 'text-red-600' : 'text-green-600',
      bg: saldoPendienteTrabajadores > 0 ? 'bg-red-50' : 'bg-green-50',
    },
    {
      label: 'Ganancia x Markup',
      value: fmtMoney(totalMarkupGanancia),
      icon: TrendingUp,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    // Row 3 – Costos y Ganancia final
    {
      label: 'Gastado Materiales',
      value: fmtMoney(totalMaterialesCompradosPorMi + totalReintegros),
      icon: Package,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Pendiente Reintegro',
      value: fmtMoney(pendienteReintegro),
      icon: AlertTriangle,
      color: pendienteReintegro > 0 ? 'text-red-600' : 'text-green-600',
      bg: pendienteReintegro > 0 ? 'bg-red-50' : 'bg-green-50',
    },
    {
      label: 'Sin Facturar',
      value: fmtMoney(moSinFacturar + materialesSinFacturar),
      icon: AlertTriangle,
      color: (moSinFacturar + materialesSinFacturar) > 0 ? 'text-red-600' : 'text-green-600',
      bg: (moSinFacturar + materialesSinFacturar) > 0 ? 'bg-red-50' : 'bg-green-50',
    },
    {
      label: 'Ganancia Bruta',
      value: fmtMoney(gananciaBruta),
      icon: TrendingUp,
      color: gananciaBruta >= 0 ? 'text-emerald-600' : 'text-red-600',
      bg: gananciaBruta >= 0 ? 'bg-emerald-50' : 'bg-red-50',
    },
  ];

  const sinFacturarCount = moSinFacturarCount + materialesSinFacturarCount;

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
          {/* Alerts for unbilled items */}
          {sinFacturarCount > 0 && (
            <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/40">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-300">
                    {sinFacturarCount} item{sinFacturarCount !== 1 ? 's' : ''} pendiente{sinFacturarCount !== 1 ? 's' : ''} de facturar
                  </p>
                  <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
                    {moSinFacturarCount > 0 && (
                      <>{moSinFacturarCount} costo{moSinFacturarCount !== 1 ? 's' : ''} de MO por <strong>{fmtMoney(moSinFacturar)}</strong>. </>
                    )}
                    {materialesSinFacturarCount > 0 && (
                      <>{materialesSinFacturarCount} material{materialesSinFacturarCount !== 1 ? 'es' : ''} por <strong>{fmtMoney(materialesSinFacturar)}</strong>. </>
                    )}
                    Vinculalos desde las pestañas de Mano de Obra y Materiales.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Flujo Financiero ── */}
          <div className="mb-6 rounded-xl border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold">Flujo Financiero de la Obra</h3>
            <div className="space-y-3 text-sm">
              {/* Ingresos del cliente */}
              <div className="rounded-lg bg-green-50 p-4 dark:bg-green-950/30">
                <p className="mb-2 font-semibold text-green-800 dark:text-green-300">💰 Ingresos del Cliente</p>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total facturado (no anuladas)</span>
                    <span className="font-medium">{fmtMoney(totalFacturado)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">− Cobrado</span>
                    <span className="font-medium text-green-700">− {fmtMoney(totalCobrado)}</span>
                  </div>
                  <Separator className="my-1.5" />
                  <div className="flex justify-between font-semibold">
                    <span>Saldo pendiente del cliente</span>
                    <span className={saldoPendienteCliente > 0 ? 'text-red-600' : 'text-green-600'}>
                      {fmtMoney(saldoPendienteCliente)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Costos de Mano de Obra */}
              <div className="rounded-lg bg-purple-50 p-4 dark:bg-purple-950/30">
                <p className="mb-2 font-semibold text-purple-800 dark:text-purple-300">👷 Mano de Obra</p>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">MO total al cliente (con markup)</span>
                    <span className="font-medium">{fmtMoney(totalMOCliente)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">→ Costo trabajador (sin markup)</span>
                    <span className="font-medium">{fmtMoney(totalMOTrabajador)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">→ Ganancia por markup</span>
                    <span className="font-medium text-emerald-600">+ {fmtMoney(totalMarkupGanancia)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">→ Ya pagado al trabajador</span>
                    <span className="font-medium text-orange-700">− {fmtMoney(totalPagadoTrabajadores)}</span>
                  </div>
                  <Separator className="my-1.5" />
                  <div className="flex justify-between font-semibold">
                    <span>Saldo pendiente al trabajador</span>
                    <span className={saldoPendienteTrabajadores > 0 ? 'text-red-600' : 'text-green-600'}>
                      {fmtMoney(saldoPendienteTrabajadores)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Materiales */}
              <div className="rounded-lg bg-amber-50 p-4 dark:bg-amber-950/30">
                <p className="mb-2 font-semibold text-amber-800 dark:text-amber-300">📦 Materiales</p>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Comprados por mí</span>
                    <span className="font-medium">{fmtMoney(totalMaterialesCompradosPorMi)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reintegros al trabajador (reintegrados)</span>
                    <span className="font-medium">{fmtMoney(totalReintegros)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pendiente de reintegro</span>
                    <span className={pendienteReintegro > 0 ? 'font-medium text-red-600' : 'font-medium text-green-600'}>
                      {fmtMoney(pendienteReintegro)}
                    </span>
                  </div>
                  <Separator className="my-1.5" />
                  <div className="flex justify-between font-semibold">
                    <span>Total gastado en materiales</span>
                    <span>{fmtMoney(totalMaterialesCompradosPorMi + totalReintegros)}</span>
                  </div>
                </div>
              </div>

              {/* Ganancia */}
              <div className="rounded-lg border-2 border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/40">
                <p className="mb-2 font-semibold text-emerald-800 dark:text-emerald-300">📊 Ganancia de la Obra</p>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dinero cobrado del cliente</span>
                    <span className="font-medium text-green-700">+ {fmtMoney(totalCobrado)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">− Pagado a trabajadores</span>
                    <span className="font-medium text-red-600">− {fmtMoney(totalPagadoTrabajadores)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">− Materiales comprados por mí</span>
                    <span className="font-medium text-red-600">− {fmtMoney(totalMaterialesCompradosPorMi)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">− Reintegros a trabajadores</span>
                    <span className="font-medium text-red-600">− {fmtMoney(totalReintegros)}</span>
                  </div>
                  <Separator className="my-1.5" />
                  <div className="flex justify-between text-base font-bold">
                    <span>Ganancia Bruta</span>
                    <span className={gananciaBruta >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                      {fmtMoney(gananciaBruta)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
