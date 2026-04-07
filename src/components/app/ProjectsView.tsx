'use client';

import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useAppStore } from '@/lib/store';
import type { Project, Client } from '@/lib/types';
import {
  Plus,
  Search,
  Building2,
  MapPin,
  FileText,
  ClipboardList,
  CircleDot,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardDescription,
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
import { Textarea } from '@/components/ui/textarea';

const projectSchema = z.object({
  title: z.string().min(1, 'El título es obligatorio'),
  description: z.string().optional(),
  clientId: z.string().min(1, 'Debes seleccionar un cliente'),
  address: z.string().optional(),
  status: z.enum(['PRESUPUESTO', 'EN_CURSO', 'PAUSADA', 'FINALIZADA', 'CANCELADA']),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  notes: z.string().optional(),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

type StatusFilter = 'TODAS' | 'PRESUPUESTO' | 'EN_CURSO' | 'PAUSADA' | 'FINALIZADA' | 'CANCELADA';

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: 'TODAS', label: 'Todas' },
  { value: 'PRESUPUESTO', label: 'Presupuesto' },
  { value: 'EN_CURSO', label: 'En Curso' },
  { value: 'PAUSADA', label: 'Pausada' },
  { value: 'FINALIZADA', label: 'Finalizada' },
  { value: 'CANCELADA', label: 'Cancelada' },
];

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

export default function ProjectsView() {
  const { setSelectedProject } = useAppStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('TODAS');
  const [dialogOpen, setDialogOpen] = useState(false);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      title: '',
      description: '',
      clientId: '',
      address: '',
      status: 'PRESUPUESTO',
      startDate: '',
      endDate: '',
      notes: '',
    },
  });

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch {
      toast.error('Error al cargar las obras');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch('/api/clients');
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    fetchProjects();
    fetchClients();
  }, [fetchProjects, fetchClients]);

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.client?.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (p.address ?? '').toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'TODAS' || p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const openCreateDialog = () => {
    form.reset({
      title: '',
      description: '',
      clientId: '',
      address: '',
      status: 'PRESUPUESTO',
      startDate: '',
      endDate: '',
      notes: '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: ProjectFormValues) => {
    try {
      const body = {
        ...values,
        description: values.description || undefined,
        address: values.address || undefined,
        startDate: values.startDate || undefined,
        endDate: values.endDate || undefined,
        notes: values.notes || undefined,
      };

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success('Obra creada');
        setDialogOpen(false);
        fetchProjects();
      } else {
        const err = await res.json();
        toast.error(err.error ?? 'Error al crear la obra');
      }
    } catch {
      toast.error('Error de conexión');
    }
  };

  const handleCardClick = (project: Project) => {
    setSelectedProject(project.id);
  };

  const formatDate = (date?: string) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('es-AR');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Obras</h1>
          <p className="text-muted-foreground">
            Gestión de obras y proyectos
          </p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="size-4" />
          Nueva Obra
        </Button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar obras..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {statusFilters.map((sf) => (
            <Button
              key={sf.value}
              variant={statusFilter === sf.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(sf.value)}
            >
              {sf.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Building2 className="mb-3 size-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {search || statusFilter !== 'TODAS'
                ? 'No se encontraron obras con los filtros aplicados.'
                : 'No hay obras registradas todavía.'}
            </p>
            {!search && statusFilter === 'TODAS' && (
              <Button variant="link" size="sm" onClick={openCreateDialog} className="mt-1">
                Crear primera obra
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <Card
              key={project.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => handleCardClick(project)}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-snug">{project.title}</CardTitle>
                  <Badge
                    variant="secondary"
                    className={statusColors[project.status] ?? 'shrink-0'}
                  >
                    {statusLabels[project.status] ?? project.status}
                  </Badge>
                </div>
                {project.client && (
                  <CardDescription>{project.client.name}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {project.address && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="size-3.5 shrink-0" />
                    <span className="truncate">{project.address}</span>
                  </div>
                )}
                {project.startDate && (
                  <p className="text-xs text-muted-foreground">
                    Inicio: {formatDate(project.startDate)}
                    {project.endDate ? ` — Fin: ${formatDate(project.endDate)}` : ''}
                  </p>
                )}
                <div className="flex items-center gap-4 pt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <FileText className="size-3.5" />
                    {project._count?.budgets ?? 0} presup.
                  </span>
                  <span className="flex items-center gap-1">
                    <CircleDot className="size-3.5" />
                    {project._count?.invoices ?? 0} fact.
                  </span>
                  <span className="flex items-center gap-1">
                    <ClipboardList className="size-3.5" />
                    {project._count?.tasks ?? 0} tareas
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Project Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Obra</DialogTitle>
            <DialogDescription>
              Completa los datos para crear una nueva obra.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título *</FormLabel>
                    <FormControl>
                      <Input placeholder="Título de la obra" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Seleccionar cliente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients.length === 0 ? (
                          <SelectItem value="__none" disabled>
                            No hay clientes
                          </SelectItem>
                        ) : (
                          clients.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
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
                      <Textarea placeholder="Descripción de la obra..." rows={3} {...field} />
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
                      <Input placeholder="Dirección de la obra" {...field} />
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Seleccionar estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PRESUPUESTO">Presupuesto</SelectItem>
                        <SelectItem value="EN_CURSO">En Curso</SelectItem>
                        <SelectItem value="PAUSADA">Pausada</SelectItem>
                        <SelectItem value="FINALIZADA">Finalizada</SelectItem>
                        <SelectItem value="CANCELADA">Cancelada</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de Inicio</FormLabel>
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
                      <FormLabel>Fecha de Fin</FormLabel>
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
                <Button type="submit">Crear Obra</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
