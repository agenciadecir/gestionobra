'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import type { Project, LaborCost, Worker, WorkerPayment, Invoice } from '@/lib/types';
import {
  Plus,
  Trash2,
  HardHat,
  CircleDot,
  Edit,
  Banknote,
  Link2,
  Unlink,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function getInvoiceLabel(invoice: Invoice): string {
  return `#${invoice.number}`;
}

const CONCEPT_CONFIG: Record<
  WorkerPayment['concept'],
  { label: string; className: string }
> = {
  ADELANTO: {
    label: 'Adelanto',
    className:
      'bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900/40 dark:text-blue-400',
  },
  PARCIAL: {
    label: 'Parcial',
    className:
      'bg-gray-100 text-gray-800 hover:bg-gray-100 dark:bg-gray-900/40 dark:text-gray-400',
  },
  FINAL: {
    label: 'Final',
    className:
      'bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/40 dark:text-green-400',
  },
  REINTEGRO_MATERIAL: {
    label: 'Reintegro Material',
    className:
      'bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/40 dark:text-amber-400',
  },
};

const METHOD_LABELS: Record<WorkerPayment['method'], string> = {
  EFECTIVO: 'Efectivo',
  TRANSFERENCIA: 'Transferencia',
  CHEQUE: 'Cheque',
  OTRO: 'Otro',
};

// ── Component ────────────────────────────────────────────────────────────────

export default function LaborCostsTab({ project, onRefresh }: LaborCostsTabProps) {
  const [laborCosts, setLaborCosts] = useState<LaborCost[]>(project.laborCosts ?? []);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [workerPayments, setWorkerPayments] = useState<WorkerPayment[]>(
    project.workerPayments ?? []
  );
  const [workersLoading, setWorkersLoading] = useState(true);
  const [paymentsLoading, setPaymentsLoading] = useState(true);

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [editingCost, setEditingCost] = useState<LaborCost | null>(null);
  const [deleteCostDialogOpen, setDeleteCostDialogOpen] = useState(false);
  const [deletingCost, setDeletingCost] = useState<LaborCost | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentCost, setPaymentCost] = useState<LaborCost | null>(null);
  const [deletePaymentDialogOpen, setDeletePaymentDialogOpen] = useState(false);
  const [deletingPayment, setDeletingPayment] = useState<WorkerPayment | null>(null);

  // Link dialog state
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkingCost, setLinkingCost] = useState<LaborCost | null>(null);
  const [linkInvoiceId, setLinkInvoiceId] = useState<string>('__none');
  const [linking, setLinking] = useState(false);

  // Create/Edit form state
  const [formDescription, setFormDescription] = useState('');
  const [formWorkerId, setFormWorkerId] = useState('');
  const [formWorkerPrice, setFormWorkerPrice] = useState('');
  const [formInvoiceId, setFormInvoiceId] = useState('__none');
  const [formNotes, setFormNotes] = useState('');

  // Payment form state
  const [payAmount, setPayAmount] = useState('');
  const [payConcept, setPayConcept] = useState<WorkerPayment['concept'] | ''>('');
  const [payMethod, setPayMethod] = useState<WorkerPayment['method'] | ''>('');
  const [payDate, setPayDate] = useState(todayISO());
  const [payNotes, setPayNotes] = useState('');

  // ── Available invoices (not ANULADA) for linking ────────────────────────────

  const availableInvoices = useMemo(() => {
    const invoices = project.invoices ?? [];
    return invoices.filter((inv) => inv.status !== 'ANULADA');
  }, [project.invoices]);

  // Map invoice id -> invoice for quick lookup
  const invoiceMap = useMemo(() => {
    const map = new Map<string, Invoice>();
    (project.invoices ?? []).forEach((inv) => map.set(inv.id, inv));
    return map;
  }, [project.invoices]);

  // ── Helpers per labor cost ──────────────────────────────────────────────────

  const getPaymentsForCost = useCallback(
    (costId: string) =>
      workerPayments.filter((p) => p.laborCostId === costId),
    [workerPayments]
  );

  const getTotalPaidForCost = useCallback(
    (costId: string) =>
      workerPayments
        .filter((p) => p.laborCostId === costId)
        .reduce((sum, p) => sum + p.amount, 0),
    [workerPayments]
  );

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

  // ── Fetch worker payments ──────────────────────────────────────────────────

  const fetchWorkerPayments = useCallback(async () => {
    setPaymentsLoading(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/worker-payments`);
      if (res.ok) {
        const data = await res.json();
        setWorkerPayments(data);
      }
    } catch {
      // silent – we fall back to project.workerPayments
    } finally {
      setPaymentsLoading(false);
    }
  }, [project.id]);

  // ── Init ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchWorkers();
    fetchWorkerPayments();
  }, [fetchWorkers, fetchWorkerPayments]);

  // Keep laborCosts in sync when project prop refreshes
  useEffect(() => {
    setLaborCosts(project.laborCosts ?? []);
  }, [project.laborCosts]);

  useEffect(() => {
    setWorkerPayments(project.workerPayments ?? []);
  }, [project.workerPayments]);

  // ── Summary calculations ───────────────────────────────────────────────────

  const summary = useMemo(() => {
    const totalCostoMO = laborCosts.reduce((s, c) => s + c.workerPrice, 0);
    const totalPagado = workerPayments.reduce((s, p) => s + p.amount, 0);
    const saldoPendiente = totalCostoMO - totalPagado;
    return { totalCostoMO, totalPagado, saldoPendiente };
  }, [laborCosts, workerPayments]);

  // Unbilled labor costs (no invoiceId)
  const unbilledCosts = useMemo(
    () => laborCosts.filter((c) => !c.invoiceId),
    [laborCosts]
  );

  const totalUnbilled = useMemo(
    () => unbilledCosts.reduce((s, c) => s + c.workerPrice, 0),
    [unbilledCosts]
  );

  // ── Reset forms ────────────────────────────────────────────────────────────

  const resetForm = useCallback(() => {
    setFormDescription('');
    setFormWorkerId('');
    setFormWorkerPrice('');
    setFormInvoiceId('__none');
    setFormNotes('');
    setEditingCost(null);
  }, []);

  const resetPaymentForm = useCallback(() => {
    setPayAmount('');
    setPayConcept('');
    setPayMethod('');
    setPayDate(todayISO());
    setPayNotes('');
    setPaymentCost(null);
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
    setFormInvoiceId(cost.invoiceId ?? '__none');
    setFormNotes(cost.notes ?? '');
    setFormOpen(true);
  };

  const openPaymentDialog = (cost: LaborCost) => {
    setPaymentCost(cost);
    setPayAmount('');
    setPayConcept('');
    setPayMethod('');
    setPayDate(todayISO());
    setPayNotes('');
    setPaymentDialogOpen(true);
  };

  const openDeleteCostDialog = (cost: LaborCost) => {
    setDeletingCost(cost);
    setDeleteCostDialogOpen(true);
  };

  const openDeletePaymentDialog = (payment: WorkerPayment) => {
    setDeletingPayment(payment);
    setDeletePaymentDialogOpen(true);
  };

  // Quick link dialog
  const openLinkDialog = (cost: LaborCost) => {
    setLinkingCost(cost);
    setLinkInvoiceId('__none');
    setLinkDialogOpen(true);
  };

  // ── Submit create / edit labor cost ────────────────────────────────────────

  const handleSubmit = async () => {
    if (!formDescription.trim()) {
      toast.error('La descripción es obligatoria');
      return;
    }
    if (!formWorkerPrice || parseFloat(formWorkerPrice) <= 0) {
      toast.error('El precio del trabajador es obligatorio');
      return;
    }

    const invoiceId =
      formInvoiceId && formInvoiceId !== '__none' ? formInvoiceId : null;

    const body = {
      description: formDescription.trim(),
      workerId: formWorkerId || undefined,
      invoiceId: invoiceId ?? undefined,
      workerPrice: parseFloat(formWorkerPrice),
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

  // ── Submit worker payment ──────────────────────────────────────────────────

  const handlePaymentSubmit = async () => {
    if (!paymentCost) return;
    if (!payAmount || parseFloat(payAmount) <= 0) {
      toast.error('El monto es obligatorio y debe ser mayor a 0');
      return;
    }
    if (!payConcept) {
      toast.error('Seleccioná un concepto de pago');
      return;
    }
    if (!payMethod) {
      toast.error('Seleccioná un método de pago');
      return;
    }

    try {
      const res = await fetch(`/api/projects/${project.id}/worker-payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          laborCostId: paymentCost.id,
          amount: parseFloat(payAmount),
          concept: payConcept,
          method: payMethod,
          date: payDate || todayISO(),
          notes: payNotes.trim() || undefined,
        }),
      });

      if (res.ok) {
        toast.success('Pago registrado');
        setPaymentDialogOpen(false);
        resetPaymentForm();
        onRefresh();
        fetchWorkerPayments();
      } else {
        const err = await res.json();
        toast.error(err.error ?? 'Error al registrar el pago');
      }
    } catch {
      toast.error('Error de conexión');
    }
  };

  // ── Delete labor cost ──────────────────────────────────────────────────────

  const handleDeleteCost = async () => {
    if (!deletingCost) return;
    try {
      const res = await fetch(`/api/labor-costs/${deletingCost.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Costo eliminado');
        setDeleteCostDialogOpen(false);
        setDeletingCost(null);
        onRefresh();
        fetchWorkerPayments();
      } else {
        const err = await res.json();
        toast.error(err.error ?? 'Error al eliminar');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setDeleteCostDialogOpen(false);
      setDeletingCost(null);
    }
  };

  // ── Delete worker payment ──────────────────────────────────────────────────

  const handleDeletePayment = async () => {
    if (!deletingPayment) return;
    try {
      const res = await fetch(`/api/worker-payments/${deletingPayment.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Pago eliminado');
        setDeletePaymentDialogOpen(false);
        setDeletingPayment(null);
        onRefresh();
        fetchWorkerPayments();
      } else {
        const err = await res.json();
        toast.error(err.error ?? 'Error al eliminar el pago');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setDeletePaymentDialogOpen(false);
      setDeletingPayment(null);
    }
  };

  // ── Link invoice to labor cost (quick link dialog) ────────────────────────

  const handleLinkInvoice = async () => {
    if (!linkingCost) return;
    const invoiceId =
      linkInvoiceId && linkInvoiceId !== '__none' ? linkInvoiceId : null;

    if (!invoiceId) {
      toast.error('Seleccioná una factura para vincular');
      return;
    }

    setLinking(true);
    try {
      const res = await fetch(`/api/labor-costs/${linkingCost.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId }),
      });
      if (res.ok) {
        const invoice = invoiceMap.get(invoiceId);
        toast.success(
          `Costo vinculado a factura ${invoice ? `#${invoice.number}` : ''}`
        );
        setLinkDialogOpen(false);
        setLinkingCost(null);
        onRefresh();
      } else {
        const err = await res.json();
        toast.error(err.error ?? 'Error al vincular la factura');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setLinking(false);
    }
  };

  // ── Unlink invoice from labor cost ─────────────────────────────────────────

  const handleUnlinkInvoice = async (cost: LaborCost) => {
    try {
      const res = await fetch(`/api/labor-costs/${cost.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: null }),
      });
      if (res.ok) {
        toast.success('Factura desvinculada del costo');
        onRefresh();
      } else {
        const err = await res.json();
        toast.error(err.error ?? 'Error al desvincular la factura');
      }
    } catch {
      toast.error('Error de conexión');
    }
  };

  // ── Remaining amount for payment cost (for validation hints) ───────────────

  const remainingForCost = paymentCost
    ? Math.max(0, paymentCost.workerPrice - getTotalPaidForCost(paymentCost.id))
    : 0;

  // ── Can link / unlink helpers ──────────────────────────────────────────────

  const canLink = (c: LaborCost) => !c.invoiceId;
  const canUnlink = (c: LaborCost) => !!c.invoiceId;

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
            Gestión de costos laborales y pagos a trabajadores
          </p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="size-4" />
          Nuevo Costo
        </Button>
      </div>

      {/* ── Alert Banner for Unbilled Labor Costs ───────────────────────────── */}
      {unbilledCosts.length > 0 && (
        <Alert className="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-200">
          <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
          <AlertTitle>Costos de MO pendientes de facturar</AlertTitle>
          <AlertDescription>
            ⚠️ Tenés <strong>{unbilledCosts.length}</strong> costo{unbilledCosts.length > 1 ? 's' : ''} de mano de obra ({formatARS(totalUnbilled)}) sin vincular a ninguna factura. Vinculalos para un mejor seguimiento.
          </AlertDescription>
        </Alert>
      )}

      {/* ── Summary Cards ────────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Costo MO */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400">
                <HardHat className="size-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Costo MO</p>
                <p className="text-lg font-semibold">
                  {formatARS(summary.totalCostoMO)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Total pagado a trabajadores */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
                <Banknote className="size-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total pagado a trabajadores</p>
                <p className="text-lg font-semibold">
                  {formatARS(summary.totalPagado)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Saldo pendiente */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400">
                <CircleDot className="size-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Saldo pendiente</p>
                <p className={`text-lg font-semibold ${summary.saldoPendiente > 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                  {formatARS(summary.saldoPendiente)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Pendiente de facturar */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`flex size-10 items-center justify-center rounded-lg ${totalUnbilled > 0 ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-400'}`}>
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pendiente de facturar</p>
                <p className={`text-lg font-semibold ${totalUnbilled > 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                  {formatARS(totalUnbilled)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Labor Costs Table (Accordion) ───────────────────────────────────── */}
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
        <>
          {/* Column headers */}
          <div className="hidden lg:grid lg:grid-cols-[2fr_1fr_1fr_0.9fr_0.9fr_1fr_auto] gap-2 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <span>Descripción</span>
            <span className="text-right">Trabajador</span>
            <span className="text-right">Costo MO</span>
            <span className="text-right">Pagado</span>
            <span className="text-right">Pendiente</span>
            <span className="text-right">Factura</span>
            <span className="text-right">Acciones</span>
          </div>

          <Accordion type="multiple" className="space-y-2">
            {laborCosts.map((cost) => {
              const payments = getPaymentsForCost(cost.id);
              const totalPaid = getTotalPaidForCost(cost.id);
              const pending = Math.max(0, cost.workerPrice - totalPaid);
              const progressPct =
                cost.workerPrice > 0
                  ? Math.min(100, (totalPaid / cost.workerPrice) * 100)
                  : 0;
              const isFullyPaid = pending <= 0;
              const linkedInvoice = cost.invoiceId ? invoiceMap.get(cost.invoiceId) : null;

              return (
                <AccordionItem
                  key={cost.id}
                  value={cost.id}
                  className="rounded-lg border bg-card"
                >
                  {/* ── Accordion Trigger (row) ──────────────────────────────── */}
                  <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30 rounded-t-lg">
                    <div className="grid w-full grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_0.9fr_0.9fr_1fr_auto] gap-2 items-center text-sm text-left">
                      {/* Description */}
                      <span className="font-medium truncate">{cost.description}</span>

                      {/* Worker */}
                      <span className="text-right hidden lg:block">
                        {cost.worker?.name ?? '-'}
                      </span>

                      {/* Costo MO */}
                      <span className="text-right whitespace-nowrap hidden lg:block">
                        {formatARS(cost.workerPrice)}
                      </span>

                      {/* Paid */}
                      <span className="text-right whitespace-nowrap hidden lg:block">
                        {formatARS(totalPaid)}
                      </span>

                      {/* Pending */}
                      <span className="text-right whitespace-nowrap hidden lg:block">
                        {isFullyPaid ? (
                          <Badge
                            variant="secondary"
                            className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/40 dark:text-green-400"
                          >
                            Liquidado
                          </Badge>
                        ) : (
                          <span className="text-red-600 dark:text-red-400 font-medium">
                            {formatARS(pending)}
                          </span>
                        )}
                      </span>

                      {/* Factura Vinculada */}
                      <span className="hidden lg:block">
                        {cost.invoiceId ? (
                          <Badge className="gap-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            <Link2 className="size-3" />
                            {linkedInvoice ? getInvoiceLabel(linkedInvoice) : 'Factura'}
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                            Sin facturar
                          </Badge>
                        )}
                      </span>

                      {/* Actions */}
                      <div className="hidden lg:flex justify-end gap-1">
                        {canLink(cost) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                            onClick={(e) => {
                              e.stopPropagation();
                              openLinkDialog(cost);
                            }}
                            title="Vincular a factura"
                          >
                            <Link2 className="size-4" />
                          </Button>
                        )}
                        {canUnlink(cost) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUnlinkInvoice(cost);
                            }}
                            title="Desvincular factura"
                          >
                            <Unlink className="size-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            openPaymentDialog(cost);
                          }}
                          title="Registrar Pago"
                        >
                          <Banknote className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditDialog(cost);
                          }}
                          title="Editar"
                        >
                          <Edit className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDeleteCostDialog(cost);
                          }}
                          title="Eliminar"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </AccordionTrigger>

                  {/* ── Accordion Content (expanded) ──────────────────────────── */}
                  <AccordionContent className="px-4 pb-4">
                    {/* Mobile-only details */}
                    <div className="lg:hidden grid grid-cols-2 gap-2 text-sm mb-4">
                      <div>
                        <span className="text-muted-foreground">Trabajador: </span>
                        <span className="font-medium">{cost.worker?.name ?? '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Costo MO: </span>
                        <span className="font-medium">{formatARS(cost.workerPrice)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Pagado: </span>
                        <span className="font-medium">{formatARS(totalPaid)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Pendiente: </span>
                        {isFullyPaid ? (
                          <Badge
                            variant="secondary"
                            className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/40 dark:text-green-400"
                          >
                            Liquidado
                          </Badge>
                        ) : (
                          <span className="font-medium text-red-600 dark:text-red-400">
                            {formatARS(pending)}
                          </span>
                        )}
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Factura Vinculada: </span>
                        {cost.invoiceId ? (
                          <Badge className="gap-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            <Link2 className="size-3" />
                            {linkedInvoice ? getInvoiceLabel(linkedInvoice) : 'Factura'}
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                            Sin facturar
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Mobile actions */}
                    <div className="lg:hidden flex flex-wrap gap-2 mb-4">
                      {canLink(cost) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-amber-600 border-amber-300 hover:bg-amber-50 dark:border-amber-800 dark:hover:bg-amber-900/20"
                          onClick={() => openLinkDialog(cost)}
                        >
                          <Link2 className="size-3.5" />
                          Vincular Factura
                        </Button>
                      )}
                      {canUnlink(cost) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-muted-foreground"
                          onClick={() => handleUnlinkInvoice(cost)}
                        >
                          <Unlink className="size-3.5" />
                          Desvincular
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-green-600 border-green-300 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-900/20"
                        onClick={() => openPaymentDialog(cost)}
                      >
                        <Banknote className="size-3.5" />
                        Registrar Pago
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => openEditDialog(cost)}
                      >
                        <Edit className="size-3.5" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5"
                        onClick={() => openDeleteCostDialog(cost)}
                      >
                        <Trash2 className="size-3.5" />
                        Eliminar
                      </Button>
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Progreso de pago: {formatARS(totalPaid)} / {formatARS(cost.workerPrice)}
                        </span>
                        <span className={`font-medium ${isFullyPaid ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                          {progressPct.toFixed(1)}%
                        </span>
                      </div>
                      <Progress
                        value={progressPct}
                        className={`h-3 ${isFullyPaid ? '[&>div]:bg-green-500' : ''}`}
                      />
                    </div>

                    {/* Payment History */}
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Historial de Pagos</h4>
                      {payments.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">
                          No hay pagos registrados para este costo.
                        </p>
                      ) : (
                        <div className="overflow-x-auto rounded-lg border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead className="text-right">Monto</TableHead>
                                <TableHead>Concepto</TableHead>
                                <TableHead>Método</TableHead>
                                <TableHead>Notas</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {payments.map((payment) => {
                                const cfg = CONCEPT_CONFIG[payment.concept];
                                return (
                                  <TableRow key={payment.id}>
                                    <TableCell className="whitespace-nowrap">
                                      {formatDate(payment.date)}
                                    </TableCell>
                                    <TableCell className="text-right font-medium whitespace-nowrap">
                                      {formatARS(payment.amount)}
                                    </TableCell>
                                    <TableCell>
                                      <Badge
                                        variant="secondary"
                                        className={cfg.className}
                                      >
                                        {cfg.label}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      {METHOD_LABELS[payment.method]}
                                    </TableCell>
                                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                                      {payment.notes || '-'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-7 text-destructive hover:text-destructive"
                                        onClick={() => openDeletePaymentDialog(payment)}
                                        title="Eliminar pago"
                                      >
                                        <Trash2 className="size-3.5" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </>
      )}

      {/* ── Create / Edit Labor Cost Dialog ──────────────────────────────────── */}
      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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
                        {w.name}
                        {w.specialty ? ` – ${w.specialty}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Worker Price */}
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

            {/* Invoice selector */}
            <div className="space-y-2">
              <Label htmlFor="lc-invoice">Factura Vinculada</Label>
              <Select value={formInvoiceId} onValueChange={setFormInvoiceId}>
                <SelectTrigger id="lc-invoice" className="w-full">
                  <SelectValue placeholder="Seleccionar factura" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">
                    Sin factura (pendiente)
                  </SelectItem>
                  {availableInvoices.map((inv) => (
                    <SelectItem key={inv.id} value={inv.id}>
                      #{inv.number} — {formatARS(inv.amount)}{' '}
                      <span className="text-muted-foreground">
                        ({inv.status})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFormOpen(false);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={handleSubmit}>
              {editingCost ? 'Guardar Cambios' : 'Crear Costo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Register Worker Payment Dialog ───────────────────────────────────── */}
      <Dialog
        open={paymentDialogOpen}
        onOpenChange={(open) => {
          setPaymentDialogOpen(open);
          if (!open) resetPaymentForm();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
            <DialogDescription>
              Registrar pago para{' '}
              <strong>{paymentCost?.description}</strong>
              {paymentCost?.worker?.name
                ? ` – ${paymentCost.worker.name}`
                : ''}
              .
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Remaining info */}
            <div className="rounded-lg border bg-muted/50 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Precio trabajador:</span>
                <span className="font-medium">
                  {formatARS(paymentCost?.workerPrice ?? 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ya pagado:</span>
                <span className="font-medium">
                  {formatARS(
                    paymentCost
                      ? getTotalPaidForCost(paymentCost.id)
                      : 0
                  )}
                </span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Saldo pendiente:</span>
                <span
                  className={
                    remainingForCost > 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-green-600 dark:text-green-400'
                  }
                >
                  {formatARS(remainingForCost)}
                </span>
              </div>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="pay-amount">Monto *</Label>
              <Input
                id="pay-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
              />
            </div>

            {/* Concept */}
            <div className="space-y-2">
              <Label htmlFor="pay-concept">Concepto *</Label>
              <Select
                value={payConcept}
                onValueChange={(v) =>
                  setPayConcept(v as WorkerPayment['concept'])
                }
              >
                <SelectTrigger id="pay-concept" className="w-full">
                  <SelectValue placeholder="Seleccionar concepto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADELANTO">Adelanto</SelectItem>
                  <SelectItem value="PARCIAL">Parcial</SelectItem>
                  <SelectItem value="FINAL">Final</SelectItem>
                  <SelectItem value="REINTEGRO_MATERIAL">Reintegro Material</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Method */}
            <div className="space-y-2">
              <Label htmlFor="pay-method">Método de pago *</Label>
              <Select
                value={payMethod}
                onValueChange={(v) =>
                  setPayMethod(v as WorkerPayment['method'])
                }
              >
                <SelectTrigger id="pay-method" className="w-full">
                  <SelectValue placeholder="Seleccionar método" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                  <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                  <SelectItem value="CHEQUE">Cheque</SelectItem>
                  <SelectItem value="OTRO">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="pay-date">Fecha *</Label>
              <Input
                id="pay-date"
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="pay-notes">Notas</Label>
              <Textarea
                id="pay-notes"
                placeholder="Notas adicionales..."
                rows={2}
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPaymentDialogOpen(false);
                resetPaymentForm();
              }}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={handlePaymentSubmit}>
              Registrar Pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Labor Cost Confirmation Dialog ────────────────────────────── */}
      <AlertDialog open={deleteCostDialogOpen} onOpenChange={setDeleteCostDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar costo de mano de obra</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar{' '}
              <strong>{deletingCost?.description}</strong>? Esta acción no se
              puede deshacer y también se eliminarán los pagos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteCostDialogOpen(false);
                setDeletingCost(null);
              }}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCost}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete Worker Payment Confirmation Dialog ────────────────────────── */}
      <AlertDialog open={deletePaymentDialogOpen} onOpenChange={setDeletePaymentDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar pago</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar este pago de{' '}
              <strong>{formatARS(deletingPayment?.amount ?? 0)}</strong>? Esta
              acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeletePaymentDialogOpen(false);
                setDeletingPayment(null);
              }}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePayment}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Quick Link to Invoice Dialog ─────────────────────────────────────── */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Vincular costo a factura</DialogTitle>
            <DialogDescription>
              Seleccioná la factura a la que querés vincular{' '}
              <strong>{linkingCost?.description}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={linkInvoiceId} onValueChange={setLinkInvoiceId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar factura" />
              </SelectTrigger>
              <SelectContent>
                {availableInvoices.map((inv) => (
                  <SelectItem key={inv.id} value={inv.id}>
                    #{inv.number} — {formatARS(inv.amount)}{' '}
                    <span className="text-muted-foreground">({inv.status})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {availableInvoices.length === 0 && (
              <p className="text-sm text-muted-foreground italic">
                No hay facturas disponibles (no anuladas) para vincular. Creá una factura primero.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setLinkDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleLinkInvoice}
              disabled={linking || linkInvoiceId === '__none' || availableInvoices.length === 0}
            >
              {linking ? 'Vinculando...' : 'Vincular'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
