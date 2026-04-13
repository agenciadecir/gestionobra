'use client';

import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import type { Worker } from '@/lib/types';
import { useAppStore } from '@/lib/store';
import { Plus, Search, Pencil, Trash2, HardHat, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';

const workerSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  specialty: z.string().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

type WorkerFormValues = z.infer<typeof workerSchema>;

export default function WorkersView() {
  const { setSelectedWorker } = useAppStore();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingWorker, setDeletingWorker] = useState<Worker | null>(null);

  const form = useForm<WorkerFormValues>({
    resolver: zodResolver(workerSchema),
    defaultValues: {
      name: '',
      specialty: '',
      phone: '',
      notes: '',
    },
  });

  const fetchWorkers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/workers');
      if (res.ok) {
        const data = await res.json();
        setWorkers(data);
      }
    } catch {
      toast.error('Error al cargar los trabajadores');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkers();
  }, [fetchWorkers]);

  const filteredWorkers = workers.filter(
    (w) =>
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      (w.specialty ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (w.phone ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const openCreateDialog = () => {
    setEditingWorker(null);
    form.reset({
      name: '',
      specialty: '',
      phone: '',
      notes: '',
    });
    setDialogOpen(true);
  };

  const openEditDialog = (worker: Worker) => {
    setEditingWorker(worker);
    form.reset({
      name: worker.name,
      specialty: worker.specialty ?? '',
      phone: worker.phone ?? '',
      notes: worker.notes ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: WorkerFormValues) => {
    try {
      const body = {
        ...values,
        specialty: values.specialty || undefined,
        phone: values.phone || undefined,
        notes: values.notes || undefined,
      };

      const res = editingWorker
        ? await fetch(`/api/workers/${editingWorker.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
        : await fetch('/api/workers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });

      if (res.ok) {
        toast.success(editingWorker ? 'Trabajador actualizado' : 'Trabajador creado');
        setDialogOpen(false);
        fetchWorkers();
      } else {
        const err = await res.json();
        toast.error(err.error ?? 'Error al guardar');
      }
    } catch {
      toast.error('Error de conexión');
    }
  };

  const handleDelete = async () => {
    if (!deletingWorker) return;
    try {
      const res = await fetch(`/api/workers/${deletingWorker.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Trabajador eliminado');
        fetchWorkers();
      } else {
        const err = await res.json();
        toast.error(err.error ?? 'Error al eliminar');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setDeleteDialogOpen(false);
      setDeletingWorker(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trabajadores</h1>
          <p className="text-muted-foreground">
            Gestión del equipo de trabajo
          </p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="size-4" />
          Nuevo Trabajador
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar trabajadores..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : filteredWorkers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <HardHat className="mb-3 size-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {search
                ? 'No se encontraron trabajadores con esa búsqueda.'
                : 'No hay trabajadores registrados todavía.'}
            </p>
            {!search && (
              <Button variant="link" size="sm" onClick={openCreateDialog} className="mt-1">
                Crear primer trabajador
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Especialidad</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead className="text-center">Costos MO</TableHead>
                  <TableHead className="text-center">Tareas</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWorkers.map((worker) => (
                  <TableRow key={worker.id}>
                    <TableCell className="font-medium">{worker.name}</TableCell>
                    <TableCell>{worker.specialty ?? '-'}</TableCell>
                    <TableCell>{worker.phone ?? '-'}</TableCell>
                    <TableCell className="text-center">
                      {worker._count?.laborCosts ?? 0}
                    </TableCell>
                    <TableCell className="text-center">
                      {worker._count?.tasks ?? 0}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => setSelectedWorker(worker.id)}
                          title="Ver detalle"
                        >
                          <Eye className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => openEditDialog(worker)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:text-destructive"
                          onClick={() => {
                            setDeletingWorker(worker);
                            setDeleteDialogOpen(true);
                          }}
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

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {filteredWorkers.map((worker) => (
              <Card
                key={worker.id}
                className="cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setSelectedWorker(worker.id)}
              >
                <CardContent className="flex items-start justify-between pt-6">
                  <div className="space-y-1">
                    <span className="font-medium">{worker.name}</span>
                    {worker.specialty && (
                      <p className="text-sm text-muted-foreground">{worker.specialty}</p>
                    )}
                    {worker.phone && (
                      <p className="text-sm text-muted-foreground">{worker.phone}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {worker._count?.laborCosts ?? 0} costo(s) · {worker._count?.tasks ?? 0} tarea(s)
                    </p>
                  </div>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => openEditDialog(worker)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive hover:text-destructive"
                      onClick={() => {
                        setDeletingWorker(worker);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingWorker ? 'Editar Trabajador' : 'Nuevo Trabajador'}
            </DialogTitle>
            <DialogDescription>
              {editingWorker
                ? 'Modifica los datos del trabajador.'
                : 'Completa los datos para agregar un nuevo trabajador.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre del trabajador" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="specialty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Especialidad</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Albañil, Electricista, Plomero..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl>
                      <Input placeholder="11 1234-5678" {...field} />
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
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingWorker ? 'Guardar Cambios' : 'Crear Trabajador'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Trabajador</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar a{' '}
              <strong>{deletingWorker?.name}</strong>? Esta acción no se puede deshacer.
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
