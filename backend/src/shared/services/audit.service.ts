import { prisma } from '../../config/database.js';

export async function createAuditLog(params: {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId,
      details: params.details ? JSON.stringify(params.details) : null,
      ip: params.ip,
      userAgent: params.userAgent,
    },
  });
}
