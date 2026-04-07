'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { Project, Budget, BudgetItem } from '@/lib/types';
import {
  Plus,
  Trash2,
  FileText,
  ChevronDown,
  ChevronUp,
  Check,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface BudgetsTabProps {
  project: Project;
  mode?: 'resumen' | 'full';
  onRefresh?: () => void;
}

interface BudgetFormItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  category: 'MANO_DE_OBRA' | 'MATERIAL' | 'OTRO';
}

interface BudgetFormData {
  description: string;
  notes: string;
  status: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
  items: BudgetFormItem[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  Budget['status'],
  { label: string; className: string }
> = {
  PENDIENTE: {
    label: 'Pendiente',
    className:
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  APROBADO: {
    label: 'Aprobado',
    className:
      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  },
  RECHAZADO: {
    label: 'Rechazado',
    className:
      'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  },
};

const CATEGORY_CONFIG: Record<
  BudgetItem['category'],
  { label: string; className: string }
> = {
  MANO_DE_OBRA: {
    label: 'Mano de Obra',
    className:
      'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  },
  MATERIAL: {
    label: 'Material',
    className:
      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  },
  OTRO: {
    label: 'Otro',
    className:
      'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  },
};

const UNIT_OPTIONS = ['un', 'm2', 'ml', 'kg', 'hs'];

const EMPTY_FORM: BudgetFormData = {
  description: '',
  notes: '',
  status: 'PENDIENTE',
  items: [],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  }).format(amount);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function createEmptyItem(): BudgetFormItem {
  return {
    id: crypto.randomUUID(),
    description: '',
    quantity: 0,
    unit: 'un',
    unitPrice: 0,
    category: 'MATERIAL',
  };
}

function budgetToFormData(budget: Budget): BudgetFormData {
  return {
    description: budget.description ?? '',
    notes: budget.notes ?? '',
    status: budget.status,
    items: (budget.items ?? []).map((item) => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      category: item.category,
    })),
  };
}

function getSubtotalsByCategory(items: BudgetFormItem[]) {
  const subtotals: Record<string, number> = {};
  for (const item of items) {
    const total = item.quantity * item.unitPrice;
    subtotals[item.category] = (subtotals[item.category] ?? 0) + total;
  }
  return subtotals;
}

function getRunningTotal(items: BudgetFormItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BudgetsTab({ project, mode = 'full', onRefresh }: BudgetsTabProps) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingBudget, setDeletingBudget] = useState<Budget | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState<BudgetFormData>(EMPTY_FORM);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/budgets`);
      if (res.ok) {
        const data = await res.json();
        setBudgets(data);
      }
    } catch {
      toast.error('Error al cargar los presupuestos');
    } finally {
      setLoading(false);
    }
  }, [project.id]);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  // ── Form helpers ──────────────────────────────────────────────────────────

  const updateFormField = <K extends keyof BudgetFormData>(
    key: K,
    value: BudgetFormData[K],
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const updateItem = (itemId: string, field: keyof BudgetFormItem, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === itemId ? { ...item, [field]: value } : item,
      ),
    }));
  };

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, createEmptyItem()],
    }));
  };

  const removeItem = (itemId: string) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== itemId),
    }));
  };

  // ── Create ────────────────────────────────────────────────────────────────

  const openCreateDialog = () => {
    setFormData(EMPTY_FORM);
    setCreateDialogOpen(true);
  };

  const handleCreate = async () => {
    const validItems = formData.items.filter((i) => i.description.trim() !== '');
    if (!formData.description.trim()) {
      toast.error('La descripcion es obligatoria');
      return;
    }
    if (validItems.length === 0) {
      toast.error('Agrega al menos un item al presupuesto');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/budgets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: formData.description,
          notes: formData.notes || undefined,
          status: formData.status,
          items: validItems.map((item) => ({
            description: item.description,
            quantity: Number(item.quantity) || 0,
            unit: item.unit,
            unitPrice: Number(item.unitPrice) || 0,
            category: item.category,
          })),
        }),
      });

      if (res.ok) {
        toast.success('Presupuesto creado');
        setCreateDialogOpen(false);
        fetchBudgets();
        onRefresh?.();
      } else {
        const err = await res.json();
        toast.error(err.error ?? 'Error al crear el presupuesto');
      }
    } catch {
      toast.error('Error de conexion');
    } finally {
      setSaving(false);
    }
  };

  // ── Edit ──────────────────────────────────────────────────────────────────

  const openEditDialog = (budget: Budget) => {
    setEditingBudget(budget);
    setFormData(budgetToFormData(budget));
    setEditDialogOpen(true);
  };

  const handleEdit = async () => {
    if (!editingBudget) return;
    const validItems = formData.items.filter((i) => i.description.trim() !== '');
    if (!formData.description.trim()) {
      toast.error('La descripcion es obligatoria');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/budgets/${editingBudget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: formData.description,
          notes: formData.notes || undefined,
          status: formData.status,
          items: validItems.map((item) => ({
            description: item.description,
            quantity: Number(item.quantity) || 0,
            unit: item.unit,
            unitPrice: Number(item.unitPrice) || 0,
            category: item.category,
          })),
        }),
      });

      if (res.ok) {
        toast.success('Presupuesto actualizado');
        setEditDialogOpen(false);
        setEditingBudget(null);
        fetchBudgets();
        onRefresh?.();
      } else {
        const err = await res.json();
        toast.error(err.error ?? 'Error al actualizar el presupuesto');
      }
    } catch {
      toast.error('Error de conexion');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const openDeleteDialog = (budget: Budget) => {
    setDeletingBudget(budget);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingBudget) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/budgets/${deletingBudget.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Presupuesto eliminado');
        setDeleteDialogOpen(false);
        setDeletingBudget(null);
        fetchBudgets();
        onRefresh?.();
      } else {
        const err = await res.json();
        toast.error(err.error ?? 'Error al eliminar el presupuesto');
      }
    } catch {
      toast.error('Error de conexion');
    } finally {
      setSaving(false);
    }
  };

  // ── Quick status update ───────────────────────────────────────────────────

  const handleQuickStatus = async (budget: Budget, newStatus: Budget['status']) => {
    try {
      const res = await fetch(`/api/budgets/${budget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: budget.description,
          notes: budget.notes,
          status: newStatus,
          items: (budget.items ?? []).map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            category: item.category,
          })),
        }),
      });

      if (res.ok) {
        toast.success(`Estado cambiado a ${STATUS_CONFIG[newStatus].label}`);
        fetchBudgets();
        onRefresh?.();
      } else {
        const err = await res.json();
        toast.error(err.error ?? 'Error al cambiar el estado');
      }
    } catch {
      toast.error('Error de conexion');
    }
  };

  // ── Render: Summary Mode ──────────────────────────────────────────────────

  if (mode === 'resumen') {
    return (
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : budgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileText className="mb-2 size-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No hay presupuestos para esta obra.
            </p>
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Descripcion</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {budgets.map((budget) => (
                    <TableRow key={budget.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(budget.date)}
                      </TableCell>
                      <TableCell>{budget.description ?? '-'}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={STATUS_CONFIG[budget.status].className}
                        >
                          {STATUS_CONFIG[budget.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatMoney(budget.totalAmount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={3} className="font-semibold">
                      Total General
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {formatMoney(
                        budgets.reduce((sum, b) => sum + b.totalAmount, 0),
                      )}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // ── Render: Full Mode ─────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Presupuestos</h2>
          <p className="text-sm text-muted-foreground">
            {budgets.length} presupuesto{budgets.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="size-4" />
          Nuevo Presupuesto
        </Button>
      </div>

      {/* Budgets List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-6 w-20" />
                </div>
                <Skeleton className="h-4 w-32" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : budgets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="mb-3 size-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No hay presupuestos para esta obra.
            </p>
            <Button
              variant="link"
              size="sm"
              onClick={openCreateDialog}
              className="mt-1"
            >
              Crear primer presupuesto
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" className="space-y-2">
          {budgets.map((budget, index) => (
            <AccordionItem
              key={budget.id}
              value={budget.id}
              className="rounded-lg border px-4"
            >
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex flex-1 items-center justify-between gap-4 pr-2">
                  <div className="flex items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
                      {index + 1}
                    </span>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {formatDate(budget.date)}
                        </span>
                        <Badge
                          variant="secondary"
                          className={STATUS_CONFIG[budget.status].className}
                        >
                          {STATUS_CONFIG[budget.status].label}
                        </Badge>
                      </div>
                      {budget.description && (
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {budget.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 text-base font-semibold">
                    {formatMoney(budget.totalAmount)}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  {/* Budget items table */}
                  {!budget.items || budget.items.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      No hay items en este presupuesto.
                    </p>
                  ) : (
                    <>
                      <Card>
                        <CardContent className="p-0">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Descripcion</TableHead>
                                <TableHead className="text-right w-20">Cantidad</TableHead>
                                <TableHead className="text-center w-16">Unidad</TableHead>
                                <TableHead className="text-right w-28">Precio Unit.</TableHead>
                                <TableHead className="text-right w-28">Subtotal</TableHead>
                                <TableHead className="text-center w-32">Categoria</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {budget.items.map((item) => (
                                <TableRow key={item.id}>
                                  <TableCell>{item.description}</TableCell>
                                  <TableCell className="text-right">
                                    {item.quantity}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {item.unit}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {formatMoney(item.unitPrice)}
                                  </TableCell>
                                  <TableCell className="text-right font-medium">
                                    {formatMoney(item.totalPrice)}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Badge
                                      variant="secondary"
                                      className={CATEGORY_CONFIG[item.category].className}
                                    >
                                      {CATEGORY_CONFIG[item.category].label}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                            <TableFooter>
                              <TableRow>
                                <TableCell
                                  colSpan={4}
                                  className="font-semibold text-right"
                                >
                                  Total
                                </TableCell>
                                <TableCell className="text-right font-bold">
                                  {formatMoney(budget.totalAmount)}
                                </TableCell>
                                <TableCell />
                              </TableRow>
                            </TableFooter>
                          </Table>
                        </CardContent>
                      </Card>

                      {/* Subtotals by category */}
                      <div className="flex flex-wrap gap-3">
                        {(() => {
                          const subtotals: Record<string, number> = {};
                          for (const item of budget.items!) {
                            subtotals[item.category] =
                              (subtotals[item.category] ?? 0) + item.totalPrice;
                          }
                          return Object.entries(subtotals).map(
                            ([cat, total]) => (
                              <Badge
                                key={cat}
                                variant="outline"
                                className={CATEGORY_CONFIG[cat as BudgetItem['category']].className + ' gap-1.5 px-3 py-1'}
                              >
                                {CATEGORY_CONFIG[cat as BudgetItem['category']].label}
                                <span className="font-semibold">
                                  {formatMoney(total)}
                                </span>
                              </Badge>
                            ),
                          );
                        })()}
                      </div>
                    </>
                  )}

                  {/* Notes */}
                  {budget.notes && (
                    <div className="rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                      {budget.notes}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                    {/* Quick status buttons */}
                    <span className="text-xs text-muted-foreground mr-1">Estado:</span>
                    {(Object.keys(STATUS_CONFIG) as Budget['status'][]).map(
                      (status) => (
                        <Button
                          key={status}
                          variant={
                            budget.status === status ? 'default' : 'outline'
                          }
                          size="sm"
                          className="h-7 gap-1 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (budget.status !== status) {
                              handleQuickStatus(budget, status);
                            }
                          }}
                        >
                          {budget.status === status && (
                            <Check className="size-3" />
                          )}
                          {STATUS_CONFIG[status].label}
                        </Button>
                      ),
                    )}

                    <div className="flex-1" />

                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditDialog(budget);
                      }}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="gap-1.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeleteDialog(budget);
                      }}
                    >
                      <Trash2 className="size-3.5" />
                      Eliminar
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {/* ── Create Budget Dialog ────────────────────────────────────────────── */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo Presupuesto</DialogTitle>
            <DialogDescription>
              Completa los datos para crear un nuevo presupuesto.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="create-description">Descripcion *</Label>
              <Input
                id="create-description"
                placeholder="Descripcion del presupuesto"
                value={formData.description}
                onChange={(e) => updateFormField('description', e.target.value)}
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={formData.status}
                onValueChange={(v) =>
                  updateFormField('status', v as BudgetFormData['status'])
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                  <SelectItem value="APROBADO">Aprobado</SelectItem>
                  <SelectItem value="RECHAZADO">Rechazado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="create-notes">Notas</Label>
              <Textarea
                id="create-notes"
                placeholder="Notas adicionales..."
                rows={2}
                value={formData.notes}
                onChange={(e) => updateFormField('notes', e.target.value)}
              />
            </div>

            {/* Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Items</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={addItem}
                >
                  <Plus className="size-3.5" />
                  Agregar Item
                </Button>
              </div>

              {formData.items.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No hay items. Hacé clic en &quot;Agregar Item&quot; para comenzar.
                </p>
              )}

              {formData.items.map((item, idx) => (
                <Card key={item.id} className="p-3">
                  <div className="grid grid-cols-12 gap-2 items-end">
                    {/* Description */}
                    <div className="col-span-12 sm:col-span-5 space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Descripcion
                      </Label>
                      <Input
                        placeholder="Descripcion del item"
                        value={item.description}
                        onChange={(e) =>
                          updateItem(item.id, 'description', e.target.value)
                        }
                      />
                    </div>

                    {/* Quantity */}
                    <div className="col-span-4 sm:col-span-1 space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Cant.
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={item.quantity || ''}
                        onChange={(e) =>
                          updateItem(
                            item.id,
                            'quantity',
                            parseFloat(e.target.value) || 0,
                          )
                        }
                      />
                    </div>

                    {/* Unit */}
                    <div className="col-span-4 sm:col-span-1 space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Unidad
                      </Label>
                      <Select
                        value={item.unit}
                        onValueChange={(v) => updateItem(item.id, 'unit', v)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {UNIT_OPTIONS.map((u) => (
                            <SelectItem key={u} value={u}>
                              {u}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Unit Price */}
                    <div className="col-span-4 sm:col-span-2 space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Precio Unit.
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={item.unitPrice || ''}
                        onChange={(e) =>
                          updateItem(
                            item.id,
                            'unitPrice',
                            parseFloat(e.target.value) || 0,
                          )
                        }
                      />
                    </div>

                    {/* Category */}
                    <div className="col-span-8 sm:col-span-2 space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Categoria
                      </Label>
                      <Select
                        value={item.category}
                        onValueChange={(v) =>
                          updateItem(
                            item.id,
                            'category',
                            v as BudgetFormItem['category'],
                          )
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MANO_DE_OBRA">Mano de Obra</SelectItem>
                          <SelectItem value="MATERIAL">Material</SelectItem>
                          <SelectItem value="OTRO">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Total + Remove */}
                    <div className="col-span-4 sm:col-span-1 flex items-center gap-1 justify-end">
                      <span className="text-xs font-medium whitespace-nowrap">
                        {formatMoney(item.quantity * item.unitPrice)}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive hover:text-destructive shrink-0"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Running total */}
            {formData.items.length > 0 && (
              <div className="flex items-center justify-between rounded-lg border bg-muted/50 px-4 py-3">
                <span className="text-sm font-medium">Total Estimado</span>
                <span className="text-lg font-bold">
                  {formatMoney(getRunningTotal(formData.items))}
                </span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? 'Guardando...' : 'Crear Presupuesto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Budget Dialog ─────────────────────────────────────────────── */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Presupuesto</DialogTitle>
            <DialogDescription>
              Modifica los datos del presupuesto.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="edit-description">Descripcion *</Label>
              <Input
                id="edit-description"
                placeholder="Descripcion del presupuesto"
                value={formData.description}
                onChange={(e) => updateFormField('description', e.target.value)}
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={formData.status}
                onValueChange={(v) =>
                  updateFormField('status', v as BudgetFormData['status'])
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                  <SelectItem value="APROBADO">Aprobado</SelectItem>
                  <SelectItem value="RECHAZADO">Rechazado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notas</Label>
              <Textarea
                id="edit-notes"
                placeholder="Notas adicionales..."
                rows={2}
                value={formData.notes}
                onChange={(e) => updateFormField('notes', e.target.value)}
              />
            </div>

            {/* Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Items</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={addItem}
                >
                  <Plus className="size-3.5" />
                  Agregar Item
                </Button>
              </div>

              {formData.items.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No hay items. Hacé clic en &quot;Agregar Item&quot; para comenzar.
                </p>
              )}

              {formData.items.map((item) => (
                <Card key={item.id} className="p-3">
                  <div className="grid grid-cols-12 gap-2 items-end">
                    {/* Description */}
                    <div className="col-span-12 sm:col-span-5 space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Descripcion
                      </Label>
                      <Input
                        placeholder="Descripcion del item"
                        value={item.description}
                        onChange={(e) =>
                          updateItem(item.id, 'description', e.target.value)
                        }
                      />
                    </div>

                    {/* Quantity */}
                    <div className="col-span-4 sm:col-span-1 space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Cant.
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={item.quantity || ''}
                        onChange={(e) =>
                          updateItem(
                            item.id,
                            'quantity',
                            parseFloat(e.target.value) || 0,
                          )
                        }
                      />
                    </div>

                    {/* Unit */}
                    <div className="col-span-4 sm:col-span-1 space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Unidad
                      </Label>
                      <Select
                        value={item.unit}
                        onValueChange={(v) => updateItem(item.id, 'unit', v)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {UNIT_OPTIONS.map((u) => (
                            <SelectItem key={u} value={u}>
                              {u}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Unit Price */}
                    <div className="col-span-4 sm:col-span-2 space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Precio Unit.
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={item.unitPrice || ''}
                        onChange={(e) =>
                          updateItem(
                            item.id,
                            'unitPrice',
                            parseFloat(e.target.value) || 0,
                          )
                        }
                      />
                    </div>

                    {/* Category */}
                    <div className="col-span-8 sm:col-span-2 space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Categoria
                      </Label>
                      <Select
                        value={item.category}
                        onValueChange={(v) =>
                          updateItem(
                            item.id,
                            'category',
                            v as BudgetFormItem['category'],
                          )
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MANO_DE_OBRA">Mano de Obra</SelectItem>
                          <SelectItem value="MATERIAL">Material</SelectItem>
                          <SelectItem value="OTRO">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Total + Remove */}
                    <div className="col-span-4 sm:col-span-1 flex items-center gap-1 justify-end">
                      <span className="text-xs font-medium whitespace-nowrap">
                        {formatMoney(item.quantity * item.unitPrice)}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive hover:text-destructive shrink-0"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Running total */}
            {formData.items.length > 0 && (
              <div className="flex items-center justify-between rounded-lg border bg-muted/50 px-4 py-3">
                <span className="text-sm font-medium">Total Estimado</span>
                <span className="text-lg font-bold">
                  {formatMoney(getRunningTotal(formData.items))}
                </span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={handleEdit} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ─────────────────────────────────────── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Presupuesto</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingBudget
                ? `Estas seguro de que queres eliminar el presupuesto del dia ${formatDate(deletingBudget.date)}${deletingBudget.description ? ` (${deletingBudget.description})` : ''}? Esta accion no se puede deshacer.`
                : 'Esta accion no se puede deshacer.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={saving}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {saving ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
