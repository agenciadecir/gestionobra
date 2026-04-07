'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import type { Project, Material } from '@/lib/types';
import { Plus, Trash2, Package, Edit, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

interface MaterialsTabProps {
  project: Project;
  onRefresh: () => void;
}

const UNITS = ['un', 'm2', 'ml', 'kg', 'lt', 'mts', 'rollo'] as const;

const purchasedByOptions = [
  { value: 'YO', label: 'Yo' },
  { value: 'CLIENTE', label: 'Cliente' },
  { value: 'TRABAJADOR', label: 'Trabajador' },
] as const;

const materialSchema = z.object({
  description: z.string().min(1, 'La descripción es obligatoria'),
  quantity: z.number().min(0.01, 'La cantidad debe ser mayor a 0'),
  unit: z.string().min(1, 'Selecciona una unidad'),
  unitCost: z.number().min(0, 'El costo unitario debe ser mayor o igual a 0'),
  purchasedBy: z.enum(['YO', 'CLIENTE', 'TRABAJADOR']),
  reimbursed: z.boolean(),
  invoiceNumber: z.string().optional(),
  notes: z.string().optional(),
});

type MaterialFormValues = z.infer<typeof materialSchema>;

const purchasedByBadgeClass: Record<string, string> = {
  YO: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  CLIENTE: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  TRABAJADOR: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
};

const purchasedByLabel: Record<string, string> = {
  YO: 'Yo',
  CLIENTE: 'Cliente',
  TRABAJADOR: 'Trabajador',
};

function formatMoney(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(value);
}

export default function MaterialsTab({ project, onRefresh }: MaterialsTabProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [deletingMaterial, setDeletingMaterial] = useState<Material | null>(null);
  const [markingReimbursed, setMarkingReimbursed] = useState<string | null>(null);

  const materials = useMemo(() => {
    const items = project.materials ?? [];
    return [...items].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [project.materials]);

  const totalCompradoPorMi = useMemo(
    () =>
      materials
        .filter((m) => m.purchasedBy === 'YO')
        .reduce((sum, m) => sum + m.totalCost, 0),
    [materials]
  );

  const totalCompradoPorCliente = useMemo(
    () =>
      materials
        .filter((m) => m.purchasedBy === 'CLIENTE')
        .reduce((sum, m) => sum + m.totalCost, 0),
    [materials]
  );

  const totalCompradoPorTrabajador = useMemo(
    () =>
      materials
        .filter((m) => m.purchasedBy === 'TRABAJADOR')
        .reduce((sum, m) => sum + m.totalCost, 0),
    [materials]
  );

  const totalPendienteReintegro = useMemo(
    () =>
      materials
        .filter((m) => m.purchasedBy === 'TRABAJADOR' && !m.reimbursed)
        .reduce((sum, m) => sum + m.totalCost, 0),
    [materials]
  );

  const form = useForm<MaterialFormValues>({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      description: '',
      quantity: 1,
      unit: 'un',
      unitCost: 0,
      purchasedBy: 'YO',
      reimbursed: false,
      invoiceNumber: '',
      notes: '',
    },
  });

  // Auto-calculate total cost preview from quantity * unitCost
  const quantity = form.watch('quantity');
  const unitCost = form.watch('unitCost');
  const purchasedBy = form.watch('purchasedBy');
  const reimbursed = form.watch('reimbursed');
  const totalPreview = (Number(quantity) || 0) * (Number(unitCost) || 0);

  // Reset form when dialog opens / closes
  const openCreateDialog = () => {
    setEditingMaterial(null);
    form.reset({
      description: '',
      quantity: 1,
      unit: 'un',
      unitCost: 0,
      purchasedBy: 'YO',
      reimbursed: false,
      invoiceNumber: '',
      notes: '',
    });
    setDialogOpen(true);
  };

  const openEditDialog = (material: Material) => {
    setEditingMaterial(material);
    form.reset({
      description: material.description,
      quantity: material.quantity,
      unit: material.unit,
      unitCost: material.unitCost,
      purchasedBy: material.purchasedBy,
      reimbursed: material.reimbursed,
      invoiceNumber: material.invoiceNumber ?? '',
      notes: material.notes ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: MaterialFormValues) => {
    try {
      const body = {
        ...values,
        totalCost: (Number(values.quantity) || 0) * (Number(values.unitCost) || 0),
        invoiceNumber: values.invoiceNumber || undefined,
        notes: values.notes || undefined,
      };

      let res: Response;

      if (editingMaterial) {
        res = await fetch(`/api/materials/${editingMaterial.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch(`/api/projects/${project.id}/materials`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }

      if (res.ok) {
        toast.success(editingMaterial ? 'Material actualizado' : 'Material creado');
        setDialogOpen(false);
        onRefresh();
      } else {
        const err = await res.json();
        toast.error(err.error ?? 'Error al guardar el material');
      }
    } catch {
      toast.error('Error de conexión');
    }
  };

  const handleDelete = async () => {
    if (!deletingMaterial) return;
    try {
      const res = await fetch(`/api/materials/${deletingMaterial.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('Material eliminado');
        setDeletingMaterial(null);
        onRefresh();
      } else {
        const err = await res.json();
        toast.error(err.error ?? 'Error al eliminar el material');
      }
    } catch {
      toast.error('Error de conexión');
    }
  };

  const handleMarkReimbursed = async (materialId: string) => {
    setMarkingReimbursed(materialId);
    try {
      const res = await fetch(`/api/materials/${materialId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reimbursed: true }),
      });
      if (res.ok) {
        toast.success('Material marcado como reintegrado');
        onRefresh();
      } else {
        const err = await res.json();
        toast.error(err.error ?? 'Error al actualizar el material');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setMarkingReimbursed(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Materiales</h2>
          <p className="text-muted-foreground text-sm">
            Gestión de materiales del proyecto
          </p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="size-4" />
          Nuevo Material
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Comprado por mí
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatMoney(totalCompradoPorMi)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Comprado por cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formatMoney(totalCompradoPorCliente)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Comprado por trabajador
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {formatMoney(totalCompradoPorTrabajador)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pendiente de reintegro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {formatMoney(totalPendienteReintegro)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Materials Table */}
      {materials.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="mb-3 size-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No hay materiales registrados todavía.
            </p>
            <Button
              variant="link"
              size="sm"
              onClick={openCreateDialog}
              className="mt-1"
            >
              Agregar primer material
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead>Unidad</TableHead>
                <TableHead className="text-right">Costo Unit.</TableHead>
                <TableHead className="text-right">Costo Total</TableHead>
                <TableHead>Comprado por</TableHead>
                <TableHead>Reintegro</TableHead>
                <TableHead>Factura N°</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {materials.map((material) => (
                <TableRow key={material.id}>
                  <TableCell className="font-medium">
                    {material.description}
                  </TableCell>
                  <TableCell className="text-right">{material.quantity}</TableCell>
                  <TableCell>{material.unit}</TableCell>
                  <TableCell className="text-right">
                    {formatMoney(material.unitCost)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatMoney(material.totalCost)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={purchasedByBadgeClass[material.purchasedBy]}
                    >
                      {purchasedByLabel[material.purchasedBy]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {material.purchasedBy === 'TRABAJADOR' ? (
                      material.reimbursed ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          Reintegrado
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                          Pendiente
                        </Badge>
                      )
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {material.invoiceNumber ?? '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {material.purchasedBy === 'TRABAJADOR' && !material.reimbursed && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-green-600 hover:text-green-700"
                          title="Marcar como Reintegrado"
                          disabled={markingReimbursed === material.id}
                          onClick={() => handleMarkReimbursed(material.id)}
                        >
                          <CheckCircle className="size-4" />
                          <span className="sr-only">Marcar como Reintegrado</span>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => openEditDialog(material)}
                      >
                        <Edit className="size-4" />
                        <span className="sr-only">Editar</span>
                      </Button>
                      <AlertDialog
                        open={deletingMaterial?.id === material.id}
                        onOpenChange={(open) => {
                          if (!open) setDeletingMaterial(null);
                        }}
                      >
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive hover:text-destructive"
                            onClick={() => setDeletingMaterial(material)}
                          >
                            <Trash2 className="size-4" />
                            <span className="sr-only">Eliminar</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Eliminar material</AlertDialogTitle>
                            <AlertDialogDescription>
                              ¿Estás seguro de que deseas eliminar{' '}
                              <strong>{material.description}</strong>? Esta acción no se
                              puede deshacer.
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingMaterial ? 'Editar Material' : 'Nuevo Material'}
            </DialogTitle>
            <DialogDescription>
              {editingMaterial
                ? 'Modifica los datos del material.'
                : 'Completa los datos para agregar un nuevo material.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Cemento Portland" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cantidad *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0.01"
                          step="any"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unidad *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {UNITS.map((u) => (
                            <SelectItem key={u} value={u}>
                              {u}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="unitCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Costo Unitario *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Auto-calculated total preview */}
              <div className="rounded-md border bg-muted/50 px-4 py-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Costo Total</span>
                  <span className="text-sm font-semibold">{formatMoney(totalPreview)}</span>
                </div>
              </div>
              <FormField
                control={form.control}
                name="purchasedBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comprado por *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {purchasedByOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {purchasedBy === 'TRABAJADOR' && (
                <FormField
                  control={form.control}
                  name="reimbursed"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3 space-y-0 rounded-md border p-3">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="cursor-pointer text-sm font-medium">
                        Reintegrado
                      </FormLabel>
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="invoiceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Factura N°</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: 0012-00345678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Notas adicionales..." rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingMaterial ? 'Guardar Cambios' : 'Crear Material'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
