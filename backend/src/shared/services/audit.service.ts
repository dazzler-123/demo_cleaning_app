import { AuditLog } from '../models/index.js';

export async function createAuditLog(params: {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}): Promise<void> {
  await AuditLog.create(params);
}
