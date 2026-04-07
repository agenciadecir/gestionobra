'use client';

import { useState } from 'react';
import type { Project, Invoice, Payment, Material } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
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
import {
  Plus,
  Trash2,
  FileText,
  DollarSign,
  CreditCard,
  ChevronDown,
  ChevronUp,
  Package,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

interface InvoicesTabProps {
  project: Project;
  onRefresh: () => void;
}

const formatMoney = (amount: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(
    amount
  );

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

const statusConfig: Record<
  Invoice['status'],
  { label: string; className: string }
> = {
  PENDIENTE: {
    label: 'Pendiente',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  },
  PAGADA_PARCIALMENTE: {
    label: 'Pagada Parcialmente',
    className: 'bg-orange-100 text-orange-800 border-orange-300',
  },
  PAGADA: {
    label: 'Pagada',
    className: 'bg-green-100 text-green-800 border-green-300',
  },
  ANULADA: {
    label: 'Anulada',
    className: 'bg-red-100 text-red-800 border-red-300',
  },
};

const conceptConfig: Record<
  Invoice['concept'],
  { label: string; className: string }
> = {
  MANO_DE_OBRA: {
    label: 'Mano de Obra',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  },
  MATERIAL: {
    label: 'Material',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  },
  MIXTO: {
    label: 'Mixto',
    className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  },
};

const methodLabels: Record<Payment['method'], string> = {
  EFECTIVO: 'Efectivo',
  TRANSFERENCIA: 'Transferencia',
  CHEQUE: 'Cheque',
  OTRO: 'Otro',
};

const purchasedByLabels: Record<Material['purchasedBy'], string> = {
  YO: 'Yo',
  CLIENTE: 'Cliente',
  TRABAJADOR: 'Trabajador',
};

const purchasedByBadgeClass: Record<Material['purchasedBy'], string> = {
  YO: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400',
  CLIENTE: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  TRABAJADOR: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400',
};

export default function InvoicesTab({ project, onRefresh }: InvoicesTabProps) {
  const invoices = project.invoices ?? [];

  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);

  // Nueva Factura dialog
  const [showNewInvoiceDialog, setShowNewInvoiceDialog] = useState(false);
  const [newInvoice, setNewInvoice] = useState({
    number: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    concept: 'MIXTO' as Invoice['concept'],
    notes: '',
  });

  // Editar Factura dialog
  const [showEditInvoiceDialog, setShowEditInvoiceDialog] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [editInvoiceForm, setEditInvoiceForm] = useState({
    number: '',
    amount: '',
    status: '' as Invoice['status'] | '',
    concept: 'MIXTO' as Invoice['concept'] | '',
    notes: '',
  });

  // Eliminar Factura dialog
  const [showDeleteInvoiceDialog, setShowDeleteInvoiceDialog] = useState(false);
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null);

  // Agregar Pago dialog
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentInvoiceId, setPaymentInvoiceId] = useState<string | null>(null);
  const [newPayment, setNewPayment] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    method: '' as Payment['method'] | '',
    notes: '',
  });

  // Eliminar Pago dialog
  const [showDeletePaymentDialog, setShowDeletePaymentDialog] = useState(false);
  const [deletingPayment, setDeletingPayment] = useState<Payment | null>(null);

  // ── Summary calculations ──
  const totalFacturado = invoices
    .filter((inv) => inv.status !== 'ANULADA')
    .reduce((sum, inv) => sum + inv.amount, 0);

  const totalCobrado = invoices
    .filter((inv) => inv.status !== 'ANULADA')
    .reduce((sum, inv) => {
      const paymentsTotal = (inv.payments ?? []).reduce(
        (pSum, p) => pSum + p.amount,
        0
      );
      return sum + paymentsTotal;
    }, 0);

  const totalMaterialesEnFacturas = invoices
    .filter((inv) => inv.status !== 'ANULADA')
    .reduce((sum, inv) => {
      const materialsTotal = (inv.materials ?? []).reduce(
        (mSum, m) => mSum + m.totalCost,
        0
      );
      return sum + materialsTotal;
    }, 0);

  const totalACobrarConMateriales = totalFacturado + totalMaterialesEnFacturas;

  const saldoPendiente = totalACobrarConMateriales - totalCobrado;

  // Subtotals by concept
  const subtotalByConcept = (
    concept: Invoice['concept']
  ) =>
    invoices
      .filter((inv) => inv.status !== 'ANULADA' && inv.concept === concept)
      .reduce((sum, inv) => sum + inv.amount, 0);

  // ── Helpers ──
  const getInvoiceMaterialsTotal = (invoice: Invoice) =>
    (invoice.materials ?? []).reduce((sum, m) => sum + m.totalCost, 0);

  // ── Handlers ──
  const handleCreateInvoice = async () => {
    if (!newInvoice.number.trim() || !newInvoice.amount) {
      toast.error('Completá el número y monto de la factura');
      return;
    }
    try {
      const res = await fetch(`/api/projects/${project.id}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: newInvoice.number.trim(),
          amount: parseFloat(newInvoice.amount),
          concept: newInvoice.concept,
          date: newInvoice.date || undefined,
          notes: newInvoice.notes.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error('Error al crear factura');
      toast.success('Factura creada correctamente');
      setShowNewInvoiceDialog(false);
      setNewInvoice({ number: '', amount: '', date: new Date().toISOString().split('T')[0], concept: 'MIXTO', notes: '' });
      onRefresh();
    } catch {
      toast.error('Error al crear factura');
    }
  };

  const handleEditInvoice = async () => {
    if (!editingInvoice) return;
    if (!editInvoiceForm.number.trim() || !editInvoiceForm.amount || !editInvoiceForm.status || !editInvoiceForm.concept) {
      toast.error('Completá todos los campos requeridos');
      return;
    }
    try {
      const res = await fetch(`/api/invoices/${editingInvoice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: editInvoiceForm.number.trim(),
          amount: parseFloat(editInvoiceForm.amount),
          status: editInvoiceForm.status,
          concept: editInvoiceForm.concept,
          notes: editInvoiceForm.notes.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error('Error al editar factura');
      toast.success('Factura actualizada correctamente');
      setShowEditInvoiceDialog(false);
      setEditingInvoice(null);
      onRefresh();
    } catch {
      toast.error('Error al editar factura');
    }
  };

  const handleDeleteInvoice = async () => {
    if (!deletingInvoice) return;
    try {
      const res = await fetch(`/api/invoices/${deletingInvoice.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Error al eliminar factura');
      toast.success('Factura eliminada correctamente');
      setShowDeleteInvoiceDialog(false);
      setDeletingInvoice(null);
      setExpandedInvoiceId(null);
      onRefresh();
    } catch {
      toast.error('Error al eliminar factura');
    }
  };

  const handleCreatePayment = async () => {
    if (!paymentInvoiceId || !newPayment.amount || !newPayment.method) {
      toast.error('Completá el monto y método de pago');
      return;
    }
    try {
      const res = await fetch(`/api/invoices/${paymentInvoiceId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(newPayment.amount),
          date: newPayment.date || undefined,
          method: newPayment.method,
          notes: newPayment.notes.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error('Error al agregar pago');
      toast.success('Pago registrado correctamente');
      setShowPaymentDialog(false);
      setPaymentInvoiceId(null);
      setNewPayment({ amount: '', date: new Date().toISOString().split('T')[0], method: '', notes: '' });
      onRefresh();
    } catch {
      toast.error('Error al agregar pago');
    }
  };

  const handleDeletePayment = async () => {
    if (!deletingPayment) return;
    try {
      const res = await fetch(`/api/payments/${deletingPayment.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Error al eliminar pago');
      toast.success('Pago eliminado correctamente');
      setShowDeletePaymentDialog(false);
      setDeletingPayment(null);
      onRefresh();
    } catch {
      toast.error('Error al eliminar pago');
    }
  };

  const openEditInvoice = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setEditInvoiceForm({
      number: invoice.number,
      amount: String(invoice.amount),
      status: invoice.status,
      concept: invoice.concept,
      notes: invoice.notes ?? '',
    });
    setShowEditInvoiceDialog(true);
  };

  const openDeleteInvoice = (invoice: Invoice) => {
    setDeletingInvoice(invoice);
    setShowDeleteInvoiceDialog(true);
  };

  const openPaymentDialog = (invoiceId: string) => {
    setPaymentInvoiceId(invoiceId);
    setNewPayment({ amount: '', date: new Date().toISOString().split('T')[0], method: '', notes: '' });
    setShowPaymentDialog(true);
  };

  const openDeletePayment = (payment: Payment) => {
    setDeletingPayment(payment);
    setShowDeletePaymentDialog(true);
  };

  const toggleExpand = (invoiceId: string) => {
    setExpandedInvoiceId((prev) => (prev === invoiceId ? null : invoiceId));
  };

  return (
    <div className="space-y-6">
      {/* ── Summary row ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-0">
            <div className="flex size-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
              <FileText className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Facturado (solo servicios)</p>
              <p className="text-lg font-bold">{formatMoney(totalFacturado)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-0">
            <div className="flex size-10 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
              <Package className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Materiales en Facturas</p>
              <p className="text-lg font-bold">{formatMoney(totalMaterialesEnFacturas)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-0">
            <div className="flex size-10 items-center justify-center rounded-lg bg-green-100 text-green-700">
              <CreditCard className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Cobrado</p>
              <p className="text-lg font-bold">{formatMoney(totalCobrado)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-0">
            <div className={`flex size-10 items-center justify-center rounded-lg ${saldoPendiente > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              <DollarSign className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Saldo Pendiente al Cliente</p>
              <p className={`text-lg font-bold ${saldoPendiente > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatMoney(saldoPendiente)}
              </p>
              <p className="text-xs text-muted-foreground">
                = facturado + materiales − cobrado
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Subtotals by concept ── */}
      {invoices.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-3 pt-0">
              <Badge className={conceptConfig.MANO_DE_OBRA.className}>
                {conceptConfig.MANO_DE_OBRA.label}
              </Badge>
              <span className="text-sm font-semibold">
                {formatMoney(subtotalByConcept('MANO_DE_OBRA'))}
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-0">
              <Badge className={conceptConfig.MATERIAL.className}>
                {conceptConfig.MATERIAL.label}
              </Badge>
              <span className="text-sm font-semibold">
                {formatMoney(subtotalByConcept('MATERIAL'))}
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-0">
              <Badge className={conceptConfig.MIXTO.className}>
                {conceptConfig.MIXTO.label}
              </Badge>
              <span className="text-sm font-semibold">
                {formatMoney(subtotalByConcept('MIXTO'))}
              </span>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Header with button ── */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Facturas</h2>
        <Button onClick={() => setShowNewInvoiceDialog(true)}>
          <Plus className="size-4" />
          Nueva Factura
        </Button>
      </div>

      {/* ── Invoice list ── */}
      {invoices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="mb-3 size-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">No hay facturas registradas</p>
            <p className="text-sm text-muted-foreground/70">
              Hacé clic en &quot;Nueva Factura&quot; para agregar una
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {invoices.map((invoice) => {
            const payments = invoice.payments ?? [];
            const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
            const paymentPercent =
              invoice.amount > 0 ? Math.min((totalPaid / invoice.amount) * 100, 100) : 0;
            const isExpanded = expandedInvoiceId === invoice.id;
            const isAnulada = invoice.status === 'ANULADA';
            const materials = invoice.materials ?? [];
            const materialsTotal = getInvoiceMaterialsTotal(invoice);
            const hasMaterials = materials.length > 0;
            const totalACobrar = invoice.amount + materialsTotal;

            return (
              <Card key={invoice.id} className={isAnulada ? 'opacity-60' : ''}>
                <CardHeader>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="font-bold">{invoice.number}</CardTitle>
                      <Badge className={conceptConfig[invoice.concept].className}>
                        {conceptConfig[invoice.concept].label}
                      </Badge>
                      <Badge className={statusConfig[invoice.status].className}>
                        {statusConfig[invoice.status].label}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(invoice.date)}
                      </span>
                      {hasMaterials && (
                        <Badge variant="outline" className="gap-1">
                          <Package className="size-3" />
                          {materials.length} material{materials.length !== 1 ? 'es' : ''}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold">
                        {formatMoney(invoice.amount)}
                      </span>
                      {!isAnulada && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPaymentDialog(invoice.id)}
                        >
                          <Plus className="size-3.5" />
                          Pago
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditInvoice(invoice)}
                      >
                        <FileText className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => openDeleteInvoice(invoice)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {!isAnulada && (
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Cobrado: {formatMoney(totalPaid)} de {formatMoney(invoice.amount)}
                      </span>
                      <span className="font-medium">{paymentPercent.toFixed(0)}%</span>
                    </div>
                    <Progress value={paymentPercent} />

                    {payments.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 w-full justify-between"
                        onClick={() => toggleExpand(invoice.id)}
                      >
                        <span className="text-sm">
                          {payments.length} pago{payments.length !== 1 ? 's' : ''}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="size-4" />
                        ) : (
                          <ChevronDown className="size-4" />
                        )}
                      </Button>
                    )}

                    {isExpanded && payments.length > 0 && (
                      <div className="mt-2 space-y-2 rounded-lg border p-3">
                        {payments.map((payment, idx) => {
                          const runningTotal = payments
                            .slice(0, idx + 1)
                            .reduce((sum, p) => sum + p.amount, 0);
                          return (
                            <div key={payment.id}>
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-medium">
                                      {formatDate(payment.date)}
                                    </span>
                                    <Badge variant="secondary" className="text-xs">
                                      {methodLabels[payment.method]}
                                    </Badge>
                                    <span className="font-semibold">
                                      {formatMoney(payment.amount)}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      (Acum: {formatMoney(runningTotal)})
                                    </span>
                                  </div>
                                  {payment.notes && (
                                    <p className="text-sm text-muted-foreground">
                                      {payment.notes}
                                    </p>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7 shrink-0 text-destructive hover:text-destructive"
                                  onClick={() => openDeletePayment(payment)}
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </div>
                              {idx < payments.length - 1 && (
                                <Separator className="my-2" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* ── Materiales vinculados section ── */}
                    <div className="mt-3 rounded-lg border border-dashed border-orange-200 bg-orange-50/50 p-3 dark:border-orange-800/40 dark:bg-orange-950/20">
                      <div className="mb-2 flex items-center gap-2">
                        <Package className="size-4 text-orange-600 dark:text-orange-400" />
                        <span className="text-sm font-semibold text-orange-700 dark:text-orange-300">
                          Materiales vinculados
                        </span>
                      </div>

                      {hasMaterials ? (
                        <div className="space-y-2">
                          {materials.map((material, idx) => (
                            <div key={material.id}>
                              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-medium">
                                    {material.description}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {material.quantity} × {material.unit}
                                  </span>
                                  <Badge
                                    variant="secondary"
                                    className={`text-xs ${purchasedByBadgeClass[material.purchasedBy]}`}
                                  >
                                    {purchasedByLabels[material.purchasedBy]}
                                  </Badge>
                                </div>
                                <span className="text-sm font-semibold">
                                  {formatMoney(material.totalCost)}
                                </span>
                              </div>
                              {idx < materials.length - 1 && (
                                <Separator className="my-1.5" />
                              )}
                            </div>
                          ))}

                          <Separator className="my-1.5" />
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-orange-700 dark:text-orange-300">
                              Total materiales
                            </span>
                            <span className="text-sm font-bold">
                              {formatMoney(materialsTotal)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm italic text-muted-foreground">
                          Sin materiales vinculados
                        </p>
                      )}
                    </div>

                    {/* ── Monto vs Materiales comparison ── */}
                    {hasMaterials && (
                      <div className="mt-2 rounded-lg border bg-muted/30 p-3">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Monto facturado (mano de obra/otros)</span>
                            <span className="font-semibold">{formatMoney(invoice.amount)}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">+ Materiales vinculados</span>
                            <span className="font-semibold">{formatMoney(materialsTotal)}</span>
                          </div>
                          <Separator />
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-bold">Total a cobrar al cliente</span>
                            <span className="font-bold text-green-600 dark:text-green-400">
                              {formatMoney(totalACobrar)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {invoice.notes && (
                      <p className="mt-2 text-sm text-muted-foreground italic">
                        {invoice.notes}
                      </p>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════ */}
      {/* Nueva Factura Dialog */}
      {/* ════════════════════════════════════════════════════════════ */}
      <Dialog open={showNewInvoiceDialog} onOpenChange={setShowNewInvoiceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Factura</DialogTitle>
            <DialogDescription>
              Agregá una nueva factura al proyecto.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inv-number">
                Número de Factura <span className="text-destructive">*</span>
              </Label>
              <Input
                id="inv-number"
                placeholder="Ej: 001-00012345"
                value={newInvoice.number}
                onChange={(e) =>
                  setNewInvoice({ ...newInvoice, number: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inv-amount">
                Monto <span className="text-destructive">*</span>
              </Label>
              <Input
                id="inv-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={newInvoice.amount}
                onChange={(e) =>
                  setNewInvoice({ ...newInvoice, amount: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inv-concept">
                Concepto <span className="text-destructive">*</span>
              </Label>
              <Select
                value={newInvoice.concept}
                onValueChange={(value) =>
                  setNewInvoice({
                    ...newInvoice,
                    concept: value as Invoice['concept'],
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccioná un concepto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANO_DE_OBRA">Mano de Obra</SelectItem>
                  <SelectItem value="MATERIAL">Material</SelectItem>
                  <SelectItem value="MIXTO">Mixto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="inv-date">Fecha</Label>
              <Input
                id="inv-date"
                type="date"
                value={newInvoice.date}
                onChange={(e) =>
                  setNewInvoice({ ...newInvoice, date: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inv-notes">Notas</Label>
              <Textarea
                id="inv-notes"
                placeholder="Notas opcionales..."
                value={newInvoice.notes}
                onChange={(e) =>
                  setNewInvoice({ ...newInvoice, notes: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNewInvoiceDialog(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreateInvoice}>Crear Factura</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* Editar Factura Dialog */}
      {/* ════════════════════════════════════════════════════════════ */}
      <Dialog open={showEditInvoiceDialog} onOpenChange={setShowEditInvoiceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Factura</DialogTitle>
            <DialogDescription>
              Modificá los datos de la factura.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-inv-number">
                Número de Factura <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-inv-number"
                value={editInvoiceForm.number}
                onChange={(e) =>
                  setEditInvoiceForm({ ...editInvoiceForm, number: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-inv-amount">
                Monto <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-inv-amount"
                type="number"
                step="0.01"
                min="0"
                value={editInvoiceForm.amount}
                onChange={(e) =>
                  setEditInvoiceForm({ ...editInvoiceForm, amount: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-inv-concept">
                Concepto <span className="text-destructive">*</span>
              </Label>
              <Select
                value={editInvoiceForm.concept}
                onValueChange={(value) =>
                  setEditInvoiceForm({
                    ...editInvoiceForm,
                    concept: value as Invoice['concept'],
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccioná un concepto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANO_DE_OBRA">Mano de Obra</SelectItem>
                  <SelectItem value="MATERIAL">Material</SelectItem>
                  <SelectItem value="MIXTO">Mixto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-inv-status">
                Estado <span className="text-destructive">*</span>
              </Label>
              <Select
                value={editInvoiceForm.status}
                onValueChange={(value) =>
                  setEditInvoiceForm({
                    ...editInvoiceForm,
                    status: value as Invoice['status'],
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccioná un estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                  <SelectItem value="PAGADA_PARCIALMENTE">
                    Pagada Parcialmente
                  </SelectItem>
                  <SelectItem value="PAGADA">Pagada</SelectItem>
                  <SelectItem value="ANULADA">Anulada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-inv-notes">Notas</Label>
              <Textarea
                id="edit-inv-notes"
                value={editInvoiceForm.notes}
                onChange={(e) =>
                  setEditInvoiceForm({ ...editInvoiceForm, notes: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditInvoiceDialog(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleEditInvoice}>Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* Eliminar Factura AlertDialog */}
      {/* ════════════════════════════════════════════════════════════ */}
      <AlertDialog
        open={showDeleteInvoiceDialog}
        onOpenChange={setShowDeleteInvoiceDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar factura?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará la factura{' '}
              <span className="font-semibold">{deletingInvoice?.number}</span> y
              todos sus pagos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleDeleteInvoice}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* Agregar Pago Dialog */}
      {/* ════════════════════════════════════════════════════════════ */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Pago</DialogTitle>
            <DialogDescription>
              Registrá un nuevo pago para la factura.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pay-amount">
                Monto <span className="text-destructive">*</span>
              </Label>
              <Input
                id="pay-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={newPayment.amount}
                onChange={(e) =>
                  setNewPayment({ ...newPayment, amount: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-date">Fecha</Label>
              <Input
                id="pay-date"
                type="date"
                value={newPayment.date}
                onChange={(e) =>
                  setNewPayment({ ...newPayment, date: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-method">
                Método de Pago <span className="text-destructive">*</span>
              </Label>
              <Select
                value={newPayment.method}
                onValueChange={(value) =>
                  setNewPayment({
                    ...newPayment,
                    method: value as Payment['method'],
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccioná un método" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                  <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                  <SelectItem value="CHEQUE">Cheque</SelectItem>
                  <SelectItem value="OTRO">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-notes">Notas</Label>
              <Textarea
                id="pay-notes"
                placeholder="Notas opcionales..."
                value={newPayment.notes}
                onChange={(e) =>
                  setNewPayment({ ...newPayment, notes: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPaymentDialog(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreatePayment}>Registrar Pago</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* Eliminar Pago AlertDialog */}
      {/* ════════════════════════════════════════════════════════════ */}
      <AlertDialog
        open={showDeletePaymentDialog}
        onOpenChange={setShowDeletePaymentDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar pago?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará el pago de{' '}
              <span className="font-semibold">
                {formatMoney(deletingPayment?.amount ?? 0)}
              </span>{' '}
              registrado el{' '}
              <span className="font-semibold">
                {deletingPayment ? formatDate(deletingPayment.date) : ''}
              </span>
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleDeletePayment}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
