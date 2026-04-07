'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import type { Project, LaborCost, Worker } from '@/lib/types';
import {
  Plus,
  Trash2,
  HardHat,
  DollarSign,
  CheckCircle,
  Edit,
  CircleDot,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

// ── Props ────────────────────────────────────────────────────────────────────

interface LaborCostsTabProps {
  project: Project;
  onRefresh: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatARS(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  }).format(amount);
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

// ── Component ────────────────────────────────────────────────────────────────

export default function LaborCostsTab({ project, onRefresh }: LaborCostsTabProps) {
  const [laborCosts, setLaborCosts] = useState<LaborCost[]>(project.laborCosts ?? []);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(false);
  const [workersLoading, setWorkersLoading] = useState(true);

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [editingCost, setEditingCost] = useState<LaborCost | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCost, setDeletingCost] = useState<LaborCost | null>(null);
  const [paidDialogOpen, setPaidDialogOpen] = useState(false);
  const [markingPaidCost, setMarkingPaidCost] = useState<LaborCost | null>(null);

  // Form state (plain – no react-hook-form needed for this small form)
  const [formDescription, setFormDescription] = useState('');
  const [formWorkerId, setFormWorkerId] = useState('');
  const [formWorkerPrice, setFormWorkerPrice] = useState('');
  const [formMarkupPercentage, setFormMarkupPercentage] = useState('20');
  const [formNotes, setFormNotes] = useState('');

  // Paid dialog date
  const [paidDate, setPaidDate] = useState(todayISO());

  // ── Derived values ─────────────────────────────────────────────────────────

  const parsedWorkerPrice = parseFloat(formWorkerPrice) || 0;
  const parsedMarkup = parseFloat(formMarkupPercentage) || 0;
  const computedMarkupAmount = parsedWorkerPrice * parsedMarkup / 100;
  const computedFinalPrice = parsedWorkerPrice + computedMarkupAmount;

  // ── Fetch workers ──────────────────────────────────────────────────────────

  const fetchWorkers = useCallback(async () => {
    setWorkersLoading(true);
    try {
      const res = await fetch('/api/workers');
      if (res.ok) {
        const data = await res.json();
        setWorkers(data);
      }
    } catch {
      toast.error('Error al cargar los trabajadores');
    } finally {
      setWorkersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkers();
  }, [fetchWorkers]);

  // Keep laborCosts in sync when project prop refreshes
  useEffect(() => {
    setLaborCosts(project.laborCosts ?? []);
  }, [project.laborCosts]);

  // ── Summary calculations ───────────────────────────────────────────────────

  const summary = useMemo(() => {
    const costs = laborCosts;
    const totalPaidToWorkers = costs
      .filter((c) => c.paidToWorker)
      .reduce((sum, c) => sum + c.workerPrice, 0);
    const totalPendingWorkers = costs
      .filter((c) => !c.paidToWorker)
      .reduce((sum, c) => sum + c.workerPrice, 0);
    const totalMarkupGain = costs.reduce((sum, c) => sum + c.markupAmount, 0);
    const totalBilled = costs.reduce((sum, c) => sum + c.finalPrice, 0);
    return { totalPaidToWorkers, totalPendingWorkers, totalMarkupGain, totalBilled };
  }, [laborCosts]);

  // ── Reset form ─────────────────────────────────────────────────────────────

  const resetForm = useCallback(() => {
    setFormDescription('');
    setFormWorkerId('');
    setFormWorkerPrice('');
    setFormMarkupPercentage('20');
    setFormNotes('');
    setEditingCost(null);
  }, []);

  // ── Open dialogs ───────────────────────────────────────────────────────────

  const openCreateDialog = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEditDialog = (cost: LaborCost) => {
    setEditingCost(cost);
    setFormDescription(cost.description);
    setFormWorkerId(cost.workerId);
    setFormWorkerPrice(String(cost.workerPrice));
    setFormMarkupPercentage(String(cost.markupPercentage));
    setFormNotes(cost.notes ?? '');
    setFormOpen(true);
  };

  const openPaidDialog = (cost: LaborCost) => {
    setMarkingPaidCost(cost);
    setPaidDate(todayISO());
    setPaidDialogOpen(true);
  };

  const openDeleteDialog = (cost: LaborCost) => {
    setDeletingCost(cost);
    setDeleteDialogOpen(true);
  };

  // ── Submit (create / edit) ─────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!formDescription.trim()) {
      toast.error('La descripción es obligatoria');
      return;
    }
    if (!formWorkerPrice || parseFloat(formWorkerPrice) <= 0) {
      toast.error('El precio del trabajador es obligatorio');
      return;
    }
    if (!formMarkupPercentage && formMarkupPercentage !== '0') {
      toast.error('El porcentaje de markup es obligatorio');
      return;
    }

    const body = {
      description: formDescription.trim(),
      workerId: formWorkerId || undefined,
      workerPrice: parseFloat(formWorkerPrice),
      markupPercentage: parseFloat(formMarkupPercentage),
      notes: formNotes.trim() || undefined,
    };

    try {
      const url = editingCost
        ? `/api/labor-costs/${editingCost.id}`
        : `/api/projects/${project.id}/labor-costs`;

      const res = await fetch(url, {
        method: editingCost ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success(editingCost ? 'Costo actualizado' : 'Costo creado');
        setFormOpen(false);
        resetForm();
        onRefresh();
      } else {
        const err = await res.json();
        toast.error(err.error ?? 'Error al guardar');
      }
    } catch {
      toast.error('Error de conexión');
    }
  };

  // ── Mark as paid ───────────────────────────────────────────────────────────

  const handleMarkPaid = async () => {
    if (!markingPaidCost) return;
    try {
      const res = await fetch(`/api/labor-costs/${markingPaidCost.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paidToWorker: true,
          paidDate: paidDate || todayISO(),
        }),
      });

      if (res.ok) {
        toast.success('Marcar como pagado');
        setPaidDialogOpen(false);
        setMarkingPaidCost(null);
        onRefresh();
      } else {
        const err = await res.json();
        toast.error(err.error ?? 'Error al actualizar');
      }
    } catch {
      toast.error('Error de conexión');
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deletingCost) return;
    try {
      const res = await fetch(`/api/labor-costs/${deletingCost.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Costo eliminado');
        setDeleteDialogOpen(false);
        setDeletingCost(null);
        onRefresh();
      } else {
        const err = await res.json();
        toast.error(err.error ?? 'Error al eliminar');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setDeleteDialogOpen(false);
      setDeletingCost(null);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Costos de Mano de Obra
          </h2>
          <p className="text-muted-foreground">
            Gestión de costos laborales del proyecto
          </p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="size-4" />
          Nuevo Costo
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
                <CheckCircle className="size-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total pagado a trabajadores</p>
                <p className="text-lg font-semibold">{formatARS(summary.totalPaidToWorkers)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400">
                <CircleDot className="size-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total pendiente a pagar</p>
                <p className="text-lg font-semibold">{formatARS(summary.totalPendingWorkers)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
                <DollarSign className="size-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ganancia por markup</p>
                <p className="text-lg font-semibold">{formatARS(summary.totalMarkupGain)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400">
                <DollarSign className="size-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total facturado al cliente</p>
                <p className="text-lg font-semibold">{formatARS(summary.totalBilled)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table / Empty state */}
      {laborCosts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <HardHat className="mb-3 size-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No hay costos de mano de obra registrados todavía.
            </p>
            <Button
              variant="link"
              size="sm"
              onClick={openCreateDialog}
              className="mt-1"
            >
              Agregar primer costo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descripción</TableHead>
                <TableHead>Trabajador</TableHead>
                <TableHead className="text-right">Precio Trabajador</TableHead>
                <TableHead className="text-right">Markup %</TableHead>
                <TableHead className="text-right">Valor Agregado</TableHead>
                <TableHead className="text-right">Precio Final</TableHead>
                <TableHead>Estado Pago</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {laborCosts.map((cost) => (
                <TableRow key={cost.id}>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {cost.description}
                  </TableCell>
                  <TableCell>
                    {cost.worker?.name ?? '-'}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {formatARS(cost.workerPrice)}
                  </TableCell>
                  <TableCell className="text-right">{cost.markupPercentage}%</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {formatARS(cost.markupAmount)}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap font-semibold">
                    {formatARS(cost.finalPrice)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      {cost.paidToWorker ? (
                        <Badge variant="default" className="bg-green-600 hover:bg-green-700 w-fit">
                          Pagado
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-400 w-fit">
                          Pendiente
                        </Badge>
                      )}
                      {cost.paidDate && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(cost.paidDate).toLocaleDateString('es-AR')}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {!cost.paidToWorker && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                          onClick={() => openPaidDialog(cost)}
                          title="Marcar como pagado"
                        >
                          <CheckCircle className="size-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => openEditDialog(cost)}
                        title="Editar"
                      >
                        <Edit className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive"
                        onClick={() => openDeleteDialog(cost)}
                        title="Eliminar"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => {
        setFormOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCost ? 'Editar Costo MO' : 'Nuevo Costo MO'}
            </DialogTitle>
            <DialogDescription>
              {editingCost
                ? 'Modifica los datos del costo de mano de obra.'
                : 'Completa los datos para agregar un nuevo costo de mano de obra.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="lc-description">Descripción *</Label>
              <Input
                id="lc-description"
                placeholder="Ej: Instalación eléctrica"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>

            {/* Worker */}
            <div className="space-y-2">
              <Label htmlFor="lc-worker">Trabajador</Label>
              {workersLoading ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <Select value={formWorkerId} onValueChange={setFormWorkerId}>
                  <SelectTrigger id="lc-worker" className="w-full">
                    <SelectValue placeholder="Seleccionar trabajador" />
                  </SelectTrigger>
                  <SelectContent>
                    {workers.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}{w.specialty ? ` – ${w.specialty}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Worker Price & Markup */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lc-worker-price">Precio Trabajador *</Label>
                <Input
                  id="lc-worker-price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formWorkerPrice}
                  onChange={(e) => setFormWorkerPrice(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lc-markup">Markup % *</Label>
                <Input
                  id="lc-markup"
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="20"
                  value={formMarkupPercentage}
                  onChange={(e) => setFormMarkupPercentage(e.target.value)}
                />
              </div>
            </div>

            {/* Auto-calculated preview */}
            {(parsedWorkerPrice > 0 || parsedMarkup > 0) && (
              <div className="rounded-lg border bg-muted/50 p-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor agregado:</span>
                  <span className="font-medium">{formatARS(computedMarkupAmount)}</span>
                </div>
                <div className="flex justify-between text-base">
                  <span className="font-medium">Precio final:</span>
                  <span className="font-bold">{formatARS(computedFinalPrice)}</span>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="lc-notes">Notas</Label>
              <Textarea
                id="lc-notes"
                placeholder="Notas adicionales..."
                rows={3}
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => {
              setFormOpen(false);
              resetForm();
            }}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSubmit}>
              {editingCost ? 'Guardar Cambios' : 'Crear Costo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark as Paid Dialog */}
      <Dialog open={paidDialogOpen} onOpenChange={setPaidDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Marcar como Pagado</DialogTitle>
            <DialogDescription>
              Se registrará el pago de <strong>{formatARS(markingPaidCost?.workerPrice ?? 0)}</strong> a{' '}
              <strong>{markingPaidCost?.worker?.name ?? 'trabajador'}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="paid-date">Fecha de pago</Label>
              <Input
                id="paid-date"
                type="date"
                value={paidDate}
                onChange={(e) => setPaidDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaidDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleMarkPaid} className="gap-2">
              <CheckCircle className="size-4" />
              Confirmar Pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Costo</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar{' '}
              <strong>{deletingCost?.description}</strong>? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
