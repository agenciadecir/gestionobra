export type Client = {
  id: string;
  name: string;
  type: 'PARTICULAR' | 'CONSORCIO';
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  _count?: { projects: number };
  projects?: Project[];
};

export type Worker = {
  id: string;
  name: string;
  phone?: string;
  specialty?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  _count?: { laborCosts: number; tasks: number };
  laborCosts?: LaborCost[];
  tasks?: Task[];
};

export type Project = {
  id: string;
  title: string;
  description?: string;
  clientId: string;
  address?: string;
  status: 'PRESUPUESTO' | 'EN_CURSO' | 'PAUSADA' | 'FINALIZADA' | 'CANCELADA';
  startDate?: string;
  endDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  client?: Client;
  budgets?: Budget[];
  invoices?: Invoice[];
  materials?: Material[];
  laborCosts?: LaborCost[];
  workerPayments?: WorkerPayment[];
  tasks?: Task[];
  _count?: { budgets: number; invoices: number; tasks: number };
};

export type BudgetItem = {
  id: string;
  budgetId: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  category: 'MANO_DE_OBRA' | 'MATERIAL' | 'OTRO';
};

export type Budget = {
  id: string;
  projectId: string;
  date: string;
  description?: string;
  status: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
  totalAmount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  items?: BudgetItem[];
};

export type Invoice = {
  id: string;
  projectId: string;
  number: string;
  date: string;
  amount: number;
  concept: 'MANO_DE_OBRA' | 'MATERIAL' | 'MIXTO';
  status: 'PENDIENTE' | 'PAGADA_PARCIALMENTE' | 'PAGADA' | 'ANULADA';
  notes?: string;
  createdAt: string;
  updatedAt: string;
  payments?: Payment[];
  materials?: Material[];
  laborCosts?: LaborCost[];
};

export type Payment = {
  id: string;
  invoiceId: string;
  date: string;
  amount: number;
  method: 'EFECTIVO' | 'TRANSFERENCIA' | 'CHEQUE' | 'OTRO';
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type Material = {
  id: string;
  projectId: string;
  invoiceId?: string;
  description: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  purchasedBy: 'YO' | 'CLIENTE' | 'TRABAJADOR';
  reimbursed: boolean;
  invoiceNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  invoice?: Invoice;
};

export type LaborCost = {
  id: string;
  projectId: string;
  workerId: string;
  invoiceId?: string;
  description: string;
  workerPrice: number; // Costo real que se le paga al trabajador
  notes?: string;
  createdAt: string;
  updatedAt: string;
  worker?: Worker;
  invoice?: Invoice;
  workerPayments?: WorkerPayment[];
};

export type WorkerPayment = {
  id: string;
  projectId: string;
  laborCostId: string;
  date: string;
  amount: number;
  concept: 'ADELANTO' | 'PARCIAL' | 'FINAL' | 'REINTEGRO_MATERIAL';
  method: 'EFECTIVO' | 'TRANSFERENCIA' | 'CHEQUE' | 'OTRO';
  notes?: string;
  createdAt: string;
  updatedAt: string;
  laborCost?: LaborCost;
};

export type Task = {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: 'PENDIENTE' | 'EN_CURSO' | 'COMPLETADA';
  priority: 'BAJA' | 'MEDIA' | 'ALTA' | 'URGENTE';
  workerId?: string;
  dueDate?: string;
  completedDate?: string;
  createdAt: string;
  updatedAt: string;
  worker?: Worker;
};

export type DashboardStats = {
  activeProjects: number;
  totalClients: number;
  totalWorkers: number;
  totalPendingAmount: number;
  totalCollected: number;
  totalRevenue: number;
  recentProjects: Project[];
  pendingTasks: number;
  totalPendingLaborCosts: number;
};

export type AppView =
  | 'dashboard'
  | 'clients'
  | 'workers'
  | 'projects'
  | 'project-detail';
