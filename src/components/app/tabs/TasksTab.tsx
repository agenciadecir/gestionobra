'use client';

import { useEffect, useState, useMemo } from 'react';
import { toast } from 'sonner';
import type { Project, Task, Worker } from '@/lib/types';
import {
  Plus,
  Trash2,
  CheckCircle,
  Clock,
  AlertTriangle,
  Edit,
  Play,
  ChevronRight,
  ListChecks,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

type TaskStatus = Task['status'];
type TaskPriority = Task['priority'];
type FilterStatus = 'ALL' | TaskStatus;

interface TasksTabProps {
  project: Project;
  onRefresh: () => void;
}

interface TaskFormData {
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  workerId: string;
  dueDate: string;
  notes: string;
}

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  URGENTE: 0,
  ALTA: 1,
  MEDIA: 2,
  BAJA: 3,
};

const NEXT_STATUS: Record<TaskStatus, TaskStatus | null> = {
  PENDIENTE: 'EN_CURSO',
  EN_CURSO: 'COMPLETADA',
  COMPLETADA: null,
};

const priorityColors: Record<TaskPriority, string> = {
  BAJA: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  MEDIA: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  ALTA: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  URGENTE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

const statusColors: Record<TaskStatus, string> = {
  PENDIENTE: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  EN_CURSO: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  COMPLETADA: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
};

const statusLabels: Record<TaskStatus, string> = {
  PENDIENTE: 'Pendiente',
  EN_CURSO: 'En Curso',
  COMPLETADA: 'Completada',
};

const priorityLabels: Record<TaskPriority, string> = {
  BAJA: 'Baja',
  MEDIA: 'Media',
  ALTA: 'Alta',
  URGENTE: 'Urgente',
};

const emptyFormData: TaskFormData = {
  title: '',
  description: '',
  priority: 'MEDIA',
  status: 'PENDIENTE',
  workerId: '',
  dueDate: '',
  notes: '',
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function isOverdue(dateStr: string, status: TaskStatus): boolean {
  if (status === 'COMPLETADA') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr + 'T00:00:00');
  return due < today;
}

export default function TasksTab({ project, onRefresh }: TasksTabProps) {
  const tasks = project.tasks ?? [];
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loadingWorkers, setLoadingWorkers] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('ALL');

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState<TaskFormData>(emptyFormData);
  const [submitting, setSubmitting] = useState(false);

  // Delete dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch workers on mount
  useEffect(() => {
    async function fetchWorkers() {
      setLoadingWorkers(true);
      try {
        const res = await fetch('/api/workers');
        if (res.ok) {
          const data = await res.json();
          setWorkers(data);
        }
      } catch {
        toast.error('Error al cargar los trabajadores');
      } finally {
        setLoadingWorkers(false);
      }
    }
    fetchWorkers();
  }, []);

  // Summary counts
  const totalCount = tasks.length;
  const pendientesCount = tasks.filter((t) => t.status === 'PENDIENTE').length;
  const enCursoCount = tasks.filter((t) => t.status === 'EN_CURSO').length;
  const completadasCount = tasks.filter((t) => t.status === 'COMPLETADA').length;
  const completionPercent = totalCount > 0 ? Math.round((completadasCount / totalCount) * 100) : 0;

  // Filtered & sorted tasks
  const filteredTasks = useMemo(() => {
    let filtered = filter === 'ALL' ? tasks : tasks.filter((t) => t.status === filter);

    return [...filtered].sort((a, b) => {
      const pA = PRIORITY_ORDER[a.priority];
      const pB = PRIORITY_ORDER[b.priority];
      if (pA !== pB) return pA - pB;
      // Same priority: sort by dueDate (soonest first), then by createdAt
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return a.createdAt.localeCompare(b.createdAt);
    });
  }, [tasks, filter]);

  // Open create dialog
  const openCreateDialog = () => {
    setEditingTask(null);
    setFormData(emptyFormData);
    setDialogOpen(true);
  };

  // Open edit dialog
  const openEditDialog = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description ?? '',
      priority: task.priority,
      status: task.status,
      workerId: task.workerId ?? '',
      dueDate: task.dueDate ?? '',
      notes: '',
    });
    setDialogOpen(true);
  };

  // Submit create/edit
  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error('El título es obligatorio');
      return;
    }

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        title: formData.title.trim(),
        priority: formData.priority,
        status: formData.status,
      };

      if (formData.description.trim()) body.description = formData.description.trim();
      if (formData.workerId) body.workerId = formData.workerId;
      if (formData.dueDate) body.dueDate = formData.dueDate;
      if (formData.notes.trim()) body.notes = formData.notes.trim();

      let res: Response;
      if (editingTask) {
        res = await fetch(`/api/tasks/${editingTask.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch(`/api/projects/${project.id}/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }

      if (res.ok) {
        toast.success(editingTask ? 'Tarea actualizada' : 'Tarea creada');
        setDialogOpen(false);
        onRefresh();
      } else {
        const err = await res.json();
        toast.error(err.error ?? 'Error al guardar la tarea');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  // Quick status change
  const handleStatusChange = async (task: Task) => {
    const nextStatus = NEXT_STATUS[task.status];
    if (!nextStatus) return;

    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (res.ok) {
        const label = statusLabels[nextStatus];
        toast.success(`Tarea marcada como "${label}"`);
        onRefresh();
      } else {
        const err = await res.json();
        toast.error(err.error ?? 'Error al cambiar el estado');
      }
    } catch {
      toast.error('Error de conexión');
    }
  };

  // Delete task
  const handleDelete = async () => {
    if (!deletingTask) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/tasks/${deletingTask.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Tarea eliminada');
        onRefresh();
      } else {
        const err = await res.json();
        toast.error(err.error ?? 'Error al eliminar la tarea');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setDeletingTask(null);
    }
  };

  // Status change icon
  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'PENDIENTE':
        return <Clock className="size-4" />;
      case 'EN_CURSO':
        return <Play className="size-4" />;
      case 'COMPLETADA':
        return <CheckCircle className="size-4" />;
    }
  };

  const filterButtons: { label: string; value: FilterStatus; count: number }[] = [
    { label: 'Todas', value: 'ALL', count: totalCount },
    { label: 'Pendientes', value: 'PENDIENTE', count: pendientesCount },
    { label: 'En Curso', value: 'EN_CURSO', count: enCursoCount },
    { label: 'Completadas', value: 'COMPLETADA', count: completadasCount },
  ];

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <ListChecks className="size-4 text-muted-foreground" />
            <span className="font-medium">Total:</span>
            <span>{totalCount}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="size-4 text-gray-500" />
            <span className="text-muted-foreground">Pendientes:</span>
            <span className="font-medium">{pendientesCount}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Play className="size-4 text-blue-500" />
            <span className="text-muted-foreground">En Curso:</span>
            <span className="font-medium">{enCursoCount}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle className="size-4 text-green-500" />
            <span className="text-muted-foreground">Completadas:</span>
            <span className="font-medium">{completadasCount}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Progress value={completionPercent} className="flex-1" />
          <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
            {completionPercent}%
          </span>
        </div>
      </div>

      {/* Actions bar: Nueva Tarea + Filter buttons */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {filterButtons.map((btn) => (
            <Button
              key={btn.value}
              variant={filter === btn.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(btn.value)}
              className="gap-1.5"
            >
              {btn.label}
              <span className="text-xs opacity-70">({btn.count})</span>
            </Button>
          ))}
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="size-4" />
          Nueva Tarea
        </Button>
      </div>

      {/* Task list */}
      {filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <ListChecks className="mb-3 size-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {totalCount === 0
                ? 'No hay tareas registradas para este proyecto.'
                : 'No hay tareas con el filtro seleccionado.'}
            </p>
            {totalCount === 0 && (
              <Button
                variant="link"
                size="sm"
                onClick={openCreateDialog}
                className="mt-1"
              >
                Crear primera tarea
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredTasks.map((task) => {
            const nextStatus = NEXT_STATUS[task.status];
            const overdue = task.dueDate && isOverdue(task.dueDate, task.status);
            const worker = task.worker;

            return (
              <Card key={task.id} className="py-0 overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  {/* Top row: badges + actions */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={priorityColors[task.priority]}
                      >
                        {task.priority === 'URGENTE' && (
                          <AlertTriangle className="size-3 mr-0.5" />
                        )}
                        {priorityLabels[task.priority]}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className={statusColors[task.status]}
                      >
                        {getStatusIcon(task.status)}
                        <span className="ml-1">{statusLabels[task.status]}</span>
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      {nextStatus && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 text-xs"
                          onClick={() => handleStatusChange(task)}
                          title={`Marcar como ${statusLabels[nextStatus]}`}
                        >
                          {getStatusIcon(nextStatus)}
                          {statusLabels[nextStatus]}
                          <ChevronRight className="size-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => openEditDialog(task)}
                      >
                        <Edit className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive hover:text-destructive"
                        onClick={() => {
                          setDeletingTask(task);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Title & description */}
                  <div>
                    <h3
                      className={`font-semibold leading-snug ${
                        task.status === 'COMPLETADA'
                          ? 'line-through text-muted-foreground'
                          : ''
                      }`}
                    >
                      {task.title}
                    </h3>
                    {task.description && (
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                        {task.description}
                      </p>
                    )}
                  </div>

                  {/* Bottom row: worker + due date */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {worker && (
                      <span className="flex items-center gap-1">
                        <span className="font-medium text-foreground">
                          {worker.name}
                        </span>
                        {worker.specialty && (
                          <span>&middot; {worker.specialty}</span>
                        )}
                      </span>
                    )}
                    {task.dueDate && (
                      <span
                        className={`flex items-center gap-1 ${
                          overdue ? 'text-red-600 dark:text-red-400 font-medium' : ''
                        }`}
                      >
                        <Clock className="size-3" />
                        {overdue && 'Vencida: '}
                        {formatDate(task.dueDate)}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTask ? 'Editar Tarea' : 'Nueva Tarea'}
            </DialogTitle>
            <DialogDescription>
              {editingTask
                ? 'Modifica los datos de la tarea.'
                : 'Completa los datos para crear una nueva tarea.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="task-title">
                Título <span className="text-destructive">*</span>
              </Label>
              <Input
                id="task-title"
                placeholder="Título de la tarea"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="task-description">Descripción</Label>
              <Textarea
                id="task-description"
                placeholder="Describe la tarea..."
                rows={3}
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
              />
            </div>

            {/* Priority + Status row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prioridad</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(val) =>
                    setFormData((prev) => ({ ...prev, priority: val as TaskPriority }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Prioridad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BAJA">Baja</SelectItem>
                    <SelectItem value="MEDIA">Media</SelectItem>
                    <SelectItem value="ALTA">Alta</SelectItem>
                    <SelectItem value="URGENTE">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val) =>
                    setFormData((prev) => ({ ...prev, status: val as TaskStatus }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                    <SelectItem value="EN_CURSO">En Curso</SelectItem>
                    <SelectItem value="COMPLETADA">Completada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Worker */}
            <div className="space-y-2">
              <Label>Trabajador asignado</Label>
              <Select
                value={formData.workerId}
                onValueChange={(val) =>
                  setFormData((prev) => ({ ...prev, workerId: val }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sin asignar" />
                </SelectTrigger>
                <SelectContent>
                  {loadingWorkers ? (
                    <SelectItem value="__loading" disabled>
                      Cargando...
                    </SelectItem>
                  ) : workers.length === 0 ? (
                    <SelectItem value="__empty" disabled>
                      No hay trabajadores
                    </SelectItem>
                  ) : (
                    <>
                      <SelectItem value="">Sin asignar</SelectItem>
                      {workers.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name}
                          {w.specialty ? ` - ${w.specialty}` : ''}
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Due date */}
            <div className="space-y-2">
              <Label htmlFor="task-dueDate">Fecha límite</Label>
              <Input
                id="task-dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, dueDate: e.target.value }))
                }
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="task-notes">Notas</Label>
              <Textarea
                id="task-notes"
                placeholder="Notas adicionales..."
                rows={2}
                value={formData.notes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notes: e.target.value }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting
                ? 'Guardando...'
                : editingTask
                  ? 'Guardar Cambios'
                  : 'Crear Tarea'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Tarea</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar la tarea{' '}
              <strong>&ldquo;{deletingTask?.title}&rdquo;</strong>? Esta acción no se
              puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
