export type UserRole = 'super_admin' | 'admin' | 'agent';

/** Role constants – use these for route/layout checks to avoid typos. */
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  AGENT: 'agent',
} as const satisfies Record<string, UserRole>;

export type UserStatus = 'active' | 'inactive' | 'suspended';

export type TaskStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'rescheduled'
  | 'cancelled'
  | 'on_hold';

export interface User {
  _id: string;
  id?: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ClientInfo {
  companyName: string;
  contactPerson: string;
  phone?: string;
  email?: string;
}

export interface Location {
  address?: string;
  city: string;
  state?: string;
  pincode?: string;
  geoCoordinates?: { lat: number; lng: number };
}

export interface CleaningDetails {
  cleaningType: string;
  category: string;
  areaSize?: string;
  rooms?: number;
  washrooms?: number;
  floorType?: string;
  frequency?: string;
}

export interface Resources {
  materials?: string[];
  machines?: string[];
  safetyGear?: string[];
  powerAvailable?: boolean;
  waterAvailable?: boolean;
}

export type LeadStatus = 'created' | 'in_progress' | 'confirm' | 'follow_up' | 'completed' | 'cancelled';
export type ScheduleStatus = 'not_scheduled' | 'scheduled';
export type AssignmentStatus = 'not_assigned' | 'assigned';

export type LeadType = 'facebook' | 'instagram' | 'google' | 'website' | 'referral' | 'walk_in' | 'phone_call' | 'email' | 'other';

export interface Lead {
  _id: string;
  client: ClientInfo;
  location: Location;
  cleaningDetails: CleaningDetails;
  resources?: Resources;
  images?: string[];
  slaPriority: string;
  leadType?: LeadType;
  status: LeadStatus;
  scheduleStatus?: ScheduleStatus;
  assignmentStatus?: AssignmentStatus;
  quotedAmount?: number; // General quoted amount
  confirmedAmount?: number; // Confirmed amount when status is 'confirm'
  createdBy: { _id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
}

export interface Schedule {
  _id: string;
  leadId: Lead | string;
  date: string;
  timeSlot: string;
  duration: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Agent {
  _id: string;
  userId: { _id: string; name: string; email: string; role: string; status: string };
  phone?: string;
  skills: string[];
  availability: 'available' | 'busy' | 'off_duty';
  dailyCapacity: number;
  experience?: string;
  status: string;
}

export interface Assignment {
  _id: string;
  leadId: Lead;
  scheduleId: Schedule;
  agentId: Agent;
  status: TaskStatus;
  isActive?: boolean;
  assignedBy: { _id: string; name: string; email: string };
  assignedAt: string;
  startedAt?: string;
  completedAt?: string;
  notes?: string;
  completionImages?: string[];
}

export interface TaskLog {
  _id: string;
  assignmentId: string;
  fromStatus: TaskStatus;
  toStatus: TaskStatus;
  changedBy: { _id: string; name: string; email: string };
  reason?: string;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
