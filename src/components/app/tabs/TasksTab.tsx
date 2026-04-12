'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import type { Project, Task, Worker } from '@/lib/types';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { useDroppable } from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import {
  Plus,
  Trash2,
  CheckCircle,
  Clock,
  AlertTriangle,
  Edit,
  GripVertical,
  User,
  Building2,
  Home,
  Key,
  Truck,
  ListChecks,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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

// ─── Types ────────────────────────────────────────────────────────────────────

type TaskStatus = Task['status'];
type TaskPriority = Task['priority'];
type AssigneeType = 'TRABAJADOR' | 'CLIENTE' | 'PROPIETARIO' | 'INQUILINO' | 'PROVEEDOR';

interface TasksTabProps {
  project: Project;
  onRefresh: () => void;
}

interface TaskFormData {
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  assigneeType: string;
  workerId: string;
  assigneeName: string;
  dueDate: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COLUMNS: { id: TaskStatus; label: string; color: string; bgColor: string; icon: typeof Clock }[] = [
  {
    id: 'PENDIENTE',
    label: 'Pendiente',
    color: 'border-t-gray-400',
    bgColor: 'bg-gray-50/80 dark:bg-gray-950/30',
    icon: Clock,
  },
  {
    id: 'EN_CURSO',
    label: 'En Curso',
    color: 'border-t-blue-500',
    bgColor: 'bg-blue-50/60 dark:bg-blue-950/20',
    icon: () => <span className="inline-block size-2 rounded-full bg-blue-500 animate-pulse" />,
  },
  {
    id: 'COMPLETADA',
    label: 'Completada',
    color: 'border-t-green-500',
    bgColor: 'bg-green-50/60 dark:bg-green-950/20',
    icon: CheckCircle,
  },
];

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  URGENTE: 0,
  ALTA: 1,
  MEDIA: 2,
  BAJA: 3,
};

const priorityColors: Record<TaskPriority, string> = {
  BAJA: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  MEDIA: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  ALTA: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  URGENTE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

const priorityLabels: Record<TaskPriority, string> = {
  BAJA: 'Baja',
  MEDIA: 'Media',
  ALTA: 'Alta',
  URGENTE: 'Urgente',
};

const ASSIGNEE_TYPES: { value: AssigneeType; label: string; icon: typeof User }[] = [
  { value: 'TRABAJADOR', label: 'Trabajador', icon: User },
  { value: 'CLIENTE', label: 'Cliente', icon: Building2 },
  { value: 'PROPIETARIO', label: 'Propietario', icon: Home },
  { value: 'INQUILINO', label: 'Inquilino', icon: Key },
  { value: 'PROVEEDOR', label: 'Proveedor', icon: Truck },
];

const assigneeBadgeClass: Record<AssigneeType, string> = {
  TRABAJADOR: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400',
  CLIENTE: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  PROPIETARIO: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  INQUILINO: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
  PROVEEDOR: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
};

const emptyFormData: TaskFormData = {
  title: '',
  description: '',
  priority: 'MEDIA',
  status: 'PENDIENTE',
  assigneeType: '',
  workerId: '',
  assigneeName: '',
  dueDate: '',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
  });
}

function isOverdue(dateStr: string, status: TaskStatus): boolean {
  if (status === 'COMPLETADA') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr + 'T00:00:00');
  return due < today;
}

function getAssigneeLabel(task: Task): { text: string; type?: AssigneeType } {
  if (task.assigneeType === 'TRABAJADOR' && task.worker) {
    return { text: task.worker.name, type: 'TRABAJADOR' };
  }
  if (task.assigneeType && task.assigneeName) {
    return { text: task.assigneeName, type: task.assigneeType };
  }
  if (task.assigneeType) {
    return { text: task.assigneeType.charAt(0) + task.assigneeType.slice(1).toLowerCase(), type: task.assigneeType };
  }
  if (task.worker) {
    return { text: task.worker.name, type: 'TRABAJADOR' };
  }
  return { text: '' };
}

// ─── Droppable Column ────────────────────────────────────────────────────────

function DroppableColumn({
  column,
  tasks,
  onAddTask,
  onEditTask,
  onDeleteTask,
}: {
  column: typeof COLUMNS[number];
  tasks: Task[];
  onAddTask: (status: TaskStatus) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: 'column', status: column.id },
  });

  const ColIcon = column.icon;

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-xl border ${column.color} border-t-4 ${
        isOver ? 'ring-2 ring-primary/30 bg-primary/5' : column.bgColor
      } transition-all duration-200`}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <ColIcon className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">{column.label}</h3>
          <span className="flex size-5 items-center justify-center rounded-full bg-muted text-xs font-medium">
            {tasks.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => onAddTask(column.id)}
        >
          <Plus className="size-3.5" />
        </Button>
      </div>

      {/* Cards */}
      <div className="flex-1 space-y-2 px-2 pb-2 min-h-[80px] max-h-[calc(100vh-280px)] overflow-y-auto">
        {tasks.length === 0 && (
          <div className="flex items-center justify-center py-6 text-xs text-muted-foreground/60">
            {isOver ? 'Soltá acá' : 'Sin tareas'}
          </div>
        )}
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onEdit={() => onEditTask(task)}
            onDelete={() => onDeleteTask(task)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Draggable Task Card ─────────────────────────────────────────────────────

function TaskCard({
  task,
  onEdit,
  onDelete,
  isDragging = false,
}: {
  task: Task;
  onEdit: () => void;
  onDelete: () => void;
  isDragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging: isCurrentlyDragging } = useDraggable({
    id: task.id,
    data: { type: 'task', task },
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  const overdue = task.dueDate && isOverdue(task.dueDate, task.status);
  const assignee = getAssigneeLabel(task);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group rounded-lg border bg-card p-3 space-y-2 shadow-sm transition-shadow hover:shadow-md ${
        isCurrentlyDragging || isDragging
          ? 'opacity-60 shadow-lg ring-2 ring-primary/40 rotate-1 scale-105'
          : ''
      } ${task.status === 'COMPLETADA' ? 'opacity-75' : ''}`}
    >
      {/* Top row: priority badge + actions */}
      <div className="flex items-start justify-between gap-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge
            variant="secondary"
            className={`text-[10px] px-1.5 py-0 ${priorityColors[task.priority]}`}
          >
            {task.priority === 'URGENTE' && <AlertTriangle className="size-2.5 mr-0.5" />}
            {priorityLabels[task.priority]}
          </Badge>
          {overdue && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
              Vencida
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="size-6" onClick={onEdit}>
            <Edit className="size-3" />
          </Button>
          <Button variant="ghost" size="icon" className="size-6 text-destructive hover:text-destructive" onClick={onDelete}>
            <Trash2 className="size-3" />
          </Button>
        </div>
      </div>

      {/* Drag handle + title */}
      <div className="flex items-start gap-1.5">
        <button
          className="mt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground/70 shrink-0 touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
        <div className="min-w-0 flex-1">
          <h4
            className={`text-sm font-medium leading-snug ${
              task.status === 'COMPLETADA' ? 'line-through text-muted-foreground' : ''
            }`}
          >
            {task.title}
          </h4>
          {task.description && (
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {task.description}
            </p>
          )}
        </div>
      </div>

      {/* Bottom row: assignee + due date */}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        {assignee.text ? (
          <Badge
            variant="secondary"
            className={`text-[10px] px-1.5 py-0 gap-1 ${
              assigneeBadgeClass[assignee.type as AssigneeType] ?? 'bg-muted text-muted-foreground'
            }`}
          >
            {assignee.text}
          </Badge>
        ) : (
          <span />
        )}
        {task.dueDate && (
          <span
            className={`flex items-center gap-1 text-[11px] ${
              overdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-muted-foreground'
            }`}
          >
            <Clock className="size-3" />
            {formatDate(task.dueDate)}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function TasksTab({ project, onRefresh }: TasksTabProps) {
  const tasks = project.tasks ?? [];
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loadingWorkers, setLoadingWorkers] = useState(true);

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState<TaskFormData>(emptyFormData);
  const [submitting, setSubmitting] = useState(false);

  // Delete dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);

  // DnD state
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

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

  // Organize tasks into columns
  const columns = useMemo(() => {
    const result: Record<TaskStatus, Task[]> = {
      PENDIENTE: [],
      EN_CURSO: [],
      COMPLETADA: [],
    };
    for (const task of tasks) {
      if (result[task.status]) {
        result[task.status].push(task);
      }
    }
    // Sort each column by priority then due date
    for (const status of Object.keys(result) as TaskStatus[]) {
      result[status].sort((a, b) => {
        const pA = PRIORITY_ORDER[a.priority];
        const pB = PRIORITY_ORDER[b.priority];
        if (pA !== pB) return pA - pB;
        if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return a.createdAt.localeCompare(b.createdAt);
      });
    }
    return result;
  }, [tasks]);

  const totalCount = tasks.length;
  const completadasCount = columns.COMPLETADA.length;
  const completionPercent = totalCount > 0 ? Math.round((completadasCount / totalCount) * 100) : 0;

  // ── DnD handlers ───────────────────────────────────────────────────────────

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    if (task) setActiveTask(task);
    setIsDragging(true);
  }, [tasks]);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setIsDragging(false);
      setActiveTask(null);
      const { active, over } = event;

      if (!over) return;

      // Determine target column status
      let targetStatus: TaskStatus | null = null;

      // Check if dropped on a column
      if (COLUMNS.some((c) => c.id === over.id)) {
        targetStatus = over.id as TaskStatus;
      }
      // Check if dropped on a task card that is inside a column
      else {
        const targetTask = tasks.find((t) => t.id === over.id);
        if (targetTask) {
          targetStatus = targetTask.status;
        }
      }

      if (!targetStatus) return;

      const draggedTask = tasks.find((t) => t.id === active.id);
      if (!draggedTask || draggedTask.status === targetStatus) return;

      // Update task status
      try {
        const res = await fetch(`/api/tasks/${draggedTask.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: targetStatus }),
        });

        if (res.ok) {
          toast.success(
            `«${draggedTask.title}» → ${COLUMNS.find((c) => c.id === targetStatus)?.label}`
          );
          onRefresh();
        } else {
          toast.error('Error al mover la tarea');
        }
      } catch {
        toast.error('Error de conexión');
      }
    },
    [tasks, onRefresh]
  );

  const handleDragOver = useCallback((_event: DragOverEvent) => {
    // We handle everything in DragEnd
  }, []);

  // ── Dialog handlers ────────────────────────────────────────────────────────

  const openCreateDialog = (status: TaskStatus = 'PENDIENTE') => {
    setEditingTask(null);
    setFormData({ ...emptyFormData, status });
    setDialogOpen(true);
  };

  const openEditDialog = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description ?? '',
      priority: task.priority,
      status: task.status,
      assigneeType: task.assigneeType ?? (task.workerId ? 'TRABAJADOR' : ''),
      workerId: task.workerId ?? '',
      assigneeName: task.assigneeName ?? '',
      dueDate: task.dueDate ?? '',
    });
    setDialogOpen(true);
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

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
      if (formData.dueDate) body.dueDate = formData.dueDate;

      if (formData.assigneeType) {
        body.assigneeType = formData.assigneeType;
        if (formData.assigneeType === 'TRABAJADOR') {
          if (formData.workerId && formData.workerId !== '__none') {
            body.workerId = formData.workerId;
          }
        } else {
          if (formData.assigneeName.trim()) {
            body.assigneeName = formData.assigneeName.trim();
          }
        }
      }

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

  // ── Delete ─────────────────────────────────────────────────────────────────

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

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
              <ListChecks className="size-5" />
              Tareas
            </h2>
            <p className="text-muted-foreground text-sm">
              {totalCount} tarea{totalCount !== 1 ? 's' : ''} · {completionPercent}% completado
            </p>
          </div>
        </div>
        <Button onClick={() => openCreateDialog()} className="gap-2">
          <Plus className="size-4" />
          Nueva Tarea
        </Button>
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-green-500 transition-all duration-500"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
            {completadasCount}/{totalCount}
          </span>
        </div>
      )}

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COLUMNS.map((col) => (
            <DroppableColumn
              key={col.id}
              column={col}
              tasks={columns[col.id]}
              onAddTask={openCreateDialog}
              onEditTask={openEditDialog}
              onDeleteTask={(task) => {
                setDeletingTask(task);
                setDeleteDialogOpen(true);
              }}
            />
          ))}
        </div>

        {/* Drag overlay */}
        <DragOverlay>
          {activeTask && isDragging ? (
            <div className="w-[300px]">
              <TaskCard task={activeTask} onEdit={() => {}} onDelete={() => {}} isDragging />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* ── Create/Edit Dialog ──────────────────────────────────────────────── */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) return;
          setDialogOpen(false);
        }}
      >
        <DialogContent
          className="max-w-md max-h-[90vh] overflow-y-auto"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
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

            {/* Priority + Status */}
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

            {/* Assignee Type */}
            <div className="space-y-2">
              <Label>Asignado a</Label>
              <Select
                value={formData.assigneeType || '__none'}
                onValueChange={(val) =>
                  setFormData((prev) => ({
                    ...prev,
                    assigneeType: val === '__none' ? '' : val,
                    workerId: '',
                    assigneeName: '',
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sin asignar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Sin asignar</SelectItem>
                  {ASSIGNEE_TYPES.map((at) => (
                    <SelectItem key={at.value} value={at.value}>
                      {at.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Conditional: Worker select (for TRABAJADOR) or Name input (for others) */}
            {formData.assigneeType === 'TRABAJADOR' && (
              <div className="space-y-2">
                <Label>Trabajador</Label>
                <Select
                  value={formData.workerId || '__none'}
                  onValueChange={(val) =>
                    setFormData((prev) => ({ ...prev, workerId: val }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar trabajador" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingWorkers ? (
                      <SelectItem value="__loading" disabled>Cargando...</SelectItem>
                    ) : workers.length === 0 ? (
                      <SelectItem value="__empty" disabled>No hay trabajadores</SelectItem>
                    ) : (
                      <>
                        <SelectItem value="__none">Sin asignar</SelectItem>
                        {workers.map((w) => (
                          <SelectItem key={w.id} value={w.id}>
                            {w.name}
                            {w.specialty ? ` · ${w.specialty}` : ''}
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.assigneeType && formData.assigneeType !== 'TRABAJADOR' && (
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  placeholder={`Nombre del ${ASSIGNEE_TYPES.find((a) => a.value === formData.assigneeType)?.label?.toLowerCase() ?? 'asignado'}`}
                  value={formData.assigneeName}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, assigneeName: e.target.value }))
                  }
                />
              </div>
            )}

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

      {/* ── Delete Confirmation Dialog ──────────────────────────────────────── */}
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
