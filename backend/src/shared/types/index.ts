export type UserRole = 'super_admin' | 'admin' | 'agent';
export type UserStatus = 'active' | 'inactive' | 'suspended';

export type TaskStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'rescheduled'
  | 'cancelled'
  | 'on_hold';

export type SLAPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
