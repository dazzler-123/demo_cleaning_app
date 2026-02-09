import { api } from './client';
import { useAuthStore } from '@/store/authStore';
import { useAuthStore } from '@/store/authStore';
import type {
  AuthResponse,
  User,
  Lead,
  Schedule,
  Agent,
  Assignment,
  TaskLog,
  PaginatedResponse,
  ClientInfo,
  Location,
  CleaningDetails,
  Resources,
} from '@/types';

export const authApi = {
  login: (email: string, password: string) =>
    api<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (data: { name: string; email: string; password: string; role: string }) =>
    api<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  me: () => api<User>('/auth/me'),
};

export const usersApi = {
  list: (params?: { role?: string; status?: string; page?: number; limit?: number }) => {
    const filtered: Record<string, string | number> = {};
    if (params) {
      if (params.page != null) filtered.page = params.page;
      if (params.limit != null) filtered.limit = params.limit;
      if (params.role != null && params.role !== '') filtered.role = params.role;
      if (params.status != null && params.status !== '') filtered.status = params.status;
    }
    const q = new URLSearchParams(filtered as Record<string, string>).toString();
    return api<PaginatedResponse<User>>(q ? `/users?${q}` : '/users');
  },
  get: (id: string) => api<User>(`/users/${id}`),
  create: (data: { name: string; email: string; password: string; role: string }) =>
    api<User>('/users', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { name?: string; status?: string }) =>
    api<User>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    api<{ deleted: boolean }>(`/users/${id}`, { method: 'DELETE' }),
};

export const leadsApi = {
  list: (params?: { status?: string; scheduleStatus?: string; assignmentStatus?: string; search?: string; page?: number; limit?: number; excludeCancelled?: boolean }) => {
    const filtered: Record<string, string | number | boolean> = {};
    if (params) {
      if (params.page != null) filtered.page = params.page;
      if (params.limit != null) filtered.limit = params.limit;
      if (params.search != null && params.search.trim() !== '') filtered.search = params.search.trim();
      if (params.status != null && params.status !== '') filtered.status = params.status;
      if (params.scheduleStatus != null && params.scheduleStatus !== '') filtered.scheduleStatus = params.scheduleStatus;
      if (params.assignmentStatus != null && params.assignmentStatus !== '') filtered.assignmentStatus = params.assignmentStatus;
      if (params.excludeCancelled === true) filtered.excludeCancelled = true;
    }
    const q = new URLSearchParams(filtered as Record<string, string>).toString();
    return api<PaginatedResponse<Lead>>(q ? `/leads?${q}` : '/leads');
  },
  get: (id: string) => api<Lead>(`/leads/${id}`),
  getConfirmed: (params?: { search?: string; page?: number; limit?: number; scheduleStatus?: string; assignmentStatus?: string; sortField?: string; sortDirection?: 'asc' | 'desc' }) => {
    const filtered: Record<string, string | number> = {};
    if (params) {
      if (params.page != null) filtered.page = params.page;
      if (params.limit != null) filtered.limit = params.limit;
      if (params.search != null && params.search.trim() !== '') filtered.search = params.search.trim();
      if (params.scheduleStatus) filtered.scheduleStatus = params.scheduleStatus;
      if (params.assignmentStatus) filtered.assignmentStatus = params.assignmentStatus;
      if (params.sortField) filtered.sortField = params.sortField;
      if (params.sortDirection) filtered.sortDirection = params.sortDirection;
    }
    const q = new URLSearchParams(filtered as Record<string, string>).toString();
    return api<PaginatedResponse<Lead>>(q ? `/leads/scheduled?${q}` : '/leads/scheduled');
  },
  uploadImages: async (files: File[]): Promise<{ images: string[] }> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('images', file);
    });
    const token = useAuthStore.getState().token ?? localStorage.getItem('token');
    const headers: HeadersInit = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch('/api/leads/upload-images', {
      method: 'POST',
      headers,
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 401) {
        useAuthStore.getState().clearAuth();
      }
      throw new Error(data?.message ?? 'Upload failed');
    }
    return data.data;
  },
  create: (data: {
    client: ClientInfo;
    location: Location;
    cleaningDetails: CleaningDetails;
    resources?: Resources;
    images?: string[];
    slaPriority?: string;
  }) => api<Lead>('/leads', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Lead>) =>
    api<Lead>(`/leads/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  cancel: (id: string) =>
    api<Lead>(`/leads/${id}/cancel`, { method: 'POST' }),
  delete: (id: string) =>
    api<{ deleted: boolean }>(`/leads/${id}`, { method: 'DELETE' }),
};

export const schedulesApi = {
  list: (params?: { leadId?: string; fromDate?: string; toDate?: string; page?: number; limit?: number }) => {
    const filtered: Record<string, string> = {};
    if (params) {
      if (params.page != null) filtered.page = String(params.page);
      if (params.limit != null) filtered.limit = String(params.limit);
      if (params.leadId) filtered.leadId = params.leadId;
      if (params.fromDate) filtered.fromDate = params.fromDate;
      if (params.toDate) filtered.toDate = params.toDate;
    }
    const q = new URLSearchParams(filtered).toString();
    return api<PaginatedResponse<Schedule>>(q ? `/schedules?${q}` : '/schedules');
  },
  getByLead: (leadId: string) => api<Schedule[]>(`/schedules/lead/${leadId}`),
  get: (id: string) => api<Schedule>(`/schedules/${id}`),
  create: (data: { leadId: string; date: string; timeSlot: string; duration: number; notes?: string }) =>
    api<Schedule>('/schedules', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<{ date: string; timeSlot: string; duration: number; notes: string }>) =>
    api<Schedule>(`/schedules/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    api<{ deleted: boolean }>(`/schedules/${id}`, { method: 'DELETE' }),
};

export const agentsApi = {
  getAvailableUsers: () =>
    api<{ _id: string; name: string; email: string }[]>('/agents/available-users'),
  list: (params?: { availability?: string; status?: string; page?: number; limit?: number }) => {
    const filtered: Record<string, string | number> = {};
    if (params) {
      if (params.page != null) filtered.page = params.page;
      if (params.limit != null) filtered.limit = params.limit;
      if (params.availability != null && params.availability !== '') filtered.availability = params.availability;
      if (params.status != null && params.status !== '') filtered.status = params.status;
    }
    const q = new URLSearchParams(filtered as Record<string, string>).toString();
    return api<PaginatedResponse<Agent>>(q ? `/agents?${q}` : '/agents');
  },
  get: (id: string) => api<Agent>(`/agents/${id}`),
  getMe: () => api<Agent>('/agents/me'),
  getByUserId: (userId: string) => api<Agent>(`/agents/user/${userId}`),
  create: (data: { userId: string; phone?: string; skills?: string[]; dailyCapacity?: number; experience?: string }) =>
    api<Agent>('/agents', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Agent>) =>
    api<Agent>(`/agents/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    api<{ deleted: boolean }>(`/agents/${id}`, { method: 'DELETE' }),
};

function toQueryString(params: Record<string, string | number | undefined | null>): string {
  const filtered: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      filtered[k] = String(v);
    }
  }
  const q = new URLSearchParams(filtered).toString();
  return q ? `?${q}` : '';
}

export const assignmentsApi = {
  list: (params?: { leadId?: string; agentId?: string; scheduleId?: string; status?: string; search?: string; page?: number; limit?: number }) => {
    const query = toQueryString((params ?? {}) as Record<string, string | number | undefined>);
    return api<PaginatedResponse<Assignment>>(`/assignments${query}`);
  },
  getMyTasks: (params?: { status?: string; fromDate?: string; toDate?: string }) => {
    const query = toQueryString((params ?? {}) as Record<string, string | undefined>);
    return api<Assignment[]>(`/assignments/my-tasks${query}`);
  },
  getAgentTasks: (agentId: string, params?: { status?: string; fromDate?: string; toDate?: string; page?: number; limit?: number }) => {
    const query = toQueryString((params ?? {}) as Record<string, string | number | undefined>);
    return api<PaginatedResponse<AgentTask>>(`/assignments/agent/${agentId}/tasks${query}`);
  },
  getBySchedule: (scheduleId: string) =>
    api<Assignment[]>(`/assignments/schedule/${scheduleId}`),
  getEligibleAgents: (scheduleId: string) =>
    api<{ eligibleAgentIds: string[] }>(`/assignments/eligible-agents?scheduleId=${encodeURIComponent(scheduleId)}`),
  get: (id: string) => api<Assignment>(`/assignments/${id}`),
  create: (data: { leadId: string; scheduleId: string; agentId: string; notes?: string }) =>
    api<Assignment>('/assignments', { method: 'POST', body: JSON.stringify(data) }),
  updateStatus: (id: string, data: { status: string; reason?: string; notes?: string }, images?: File[]) => {
    const formData = new FormData();
    formData.append('status', data.status);
    if (data.reason) formData.append('reason', data.reason);
    if (data.notes) formData.append('notes', data.notes);
    if (images && images.length > 0) {
      images.forEach((img) => formData.append('images', img));
    }
    const token = useAuthStore.getState().token ?? localStorage.getItem('token');
    return fetch(`/api/assignments/${id}/status`, {
      method: 'PATCH',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? 'Request failed');
      return data as ApiResponse<Assignment>;
    });
  },
  delete: (id: string) =>
    api<{ deleted: boolean }>(`/assignments/${id}`, { method: 'DELETE' }),
};

export const taskLogsApi = {
  getByAssignment: (assignmentId: string) =>
    api<TaskLog[]>(`/task-logs/assignment/${assignmentId}`),
};

export const dashboardApi = {
  overview: (params?: { fromDate?: string; toDate?: string; days?: number }) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return api<DashboardOverview>(`/dashboard/overview?${q}`);
  },
  agentOverview: (params?: { fromDate?: string; toDate?: string; days?: number }) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return api<AgentDashboardOverview>(`/dashboard/agent/overview?${q}`);
  },
  agentReport: (agentId: string, params?: { fromDate?: string; toDate?: string; days?: number }) => {
    const queryParams = { agentId, ...params } as Record<string, string>;
    const q = new URLSearchParams(queryParams).toString();
    return api<AgentReport>(`/dashboard/agent/report?${q}`);
  },
};

export interface DashboardOverview {
  leads: { total: number; byStatus: { _id: string; count: number }[] };
  assignments: { total: number; byStatus: { _id: string; count: number }[] };
  agents: { total: number; available: number; busy: number };
  jobTrends: { _id: string; total: number; completed: number }[];
  leadsByDay?: { _id: string; count: number; cancelled: number }[];
  slaCompliance: { completed: number; total: number; compliance: number };
  users: { total: number; byRole: { _id: string; count: number }[] };
  leadsScheduledToday?: number;
  leadsAssignedToday?: number;
  jobsInProgress?: number;
  jobsCompleted?: number;
  agentWorkload?: { agentId: string; agentName?: string; agentPhone?: string; count: number }[];
  leadsByType?: { _id: string | null; count: number }[];
}

export const auditApi = {
  list: (params?: { userId?: string; resource?: string; action?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return api<PaginatedResponse<AuditLogEntry>>(`/audit?${q}`);
  },
};

export interface AuditLogEntry {
  _id: string;
  userId: { _id: string; name: string; email: string; role: string };
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

export interface AgentDashboardOverview {
  assignmentStats: {
    total: number;
    byStatus: { _id: string; count: number }[];
  };
  taskTrends: {
    _id: string;
    assigned: number;
    completed: number;
  }[];
  completionRate: {
    total: number;
    completed: number;
    completionRate: number;
  };
}

export interface AgentTask {
  _id: string;
  status: string;
  assignedAt: string;
  completedAt?: string;
  startedAt?: string;
  leadId?: {
    _id: string;
    client: { companyName: string; contactPerson: string; email: string; phone: string };
    cleaningDetails: { cleaningType: string; category: string; areaSize?: string };
    status: string;
  } | null;
  scheduleId?: {
    _id: string;
    date: string;
    timeSlot: string;
    duration: number;
  } | null;
}

export interface AgentReport {
  agent: Agent;
  assignmentStats: {
    total: number;
    byStatus: { _id: string; count: number }[];
  };
  taskTrends: {
    _id: string;
    assigned: number;
    completed: number;
  }[];
  completionRate: {
    total: number;
    completed: number;
    completionRate: number;
  };
}
