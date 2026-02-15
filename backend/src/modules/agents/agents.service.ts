import { ApiError } from '../../shared/utils/ApiError.js';
import { prisma } from '../../config/database.js';
import { agentsRepository } from './agents.repository.js';
import { createAuditLog } from '../../shared/services/audit.service.js';

export const agentsService = {
  async getById(id: string) {
    const agent = await agentsRepository.findById(id);
    if (!agent) throw new ApiError(404, 'Agent not found');
    return agent;
  },

  async getByUserId(userId: string) {
    const agent = await agentsRepository.findByUserId(userId);
    if (!agent) throw new ApiError(404, 'Agent profile not found');
    return agent;
  },

  async list(filters: {
    availability?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    return agentsRepository.findMany(filters);
  },

  /** Users with role agent who do not yet have an agent profile (for create-agent dropdown). */
  async getAvailableUsersForProfile() {
    const [agentRoleUsers, existingAgents] = await Promise.all([
      prisma.user.findMany({
        where: { role: 'agent' },
        select: { id: true, name: true, email: true },
      }),
      prisma.agent.findMany({
        select: { userId: true },
      }),
    ]);
    
    const existingAgentUserIds = new Set(existingAgents.map(a => a.userId));
    const available = agentRoleUsers.filter(u => !existingAgentUserIds.has(u.id));
    
    return available.map(u => ({ 
      _id: u.id, 
      id: u.id,
      name: u.name, 
      email: u.email 
    }));
  },

  async create(
    data: {
      userId: string;
      phone?: string;
      skills?: string[];
      dailyCapacity?: number;
      experience?: string;
    },
    actorId: string
  ) {
    const existing = await prisma.agent.findUnique({ where: { userId: data.userId } });
    if (existing) throw new ApiError(400, 'Agent profile already exists for this user');
    
    const user = await prisma.user.findUnique({ where: { id: data.userId } });
    if (!user || user.role !== 'agent') throw new ApiError(400, 'User must have agent role');
    
    const agent = await agentsRepository.create(data);
    
    const agentId = (agent as any)._id?.toString() || (agent as any).id;
    await createAuditLog({
      userId: actorId,
      action: 'create',
      resource: 'agent',
      resourceId: agentId,
    });
    
    return agentsRepository.findById(agentId);
  },

  async update(
    id: string,
    data: Partial<{
      phone: string;
      skills: string[];
      availability: string;
      dailyCapacity: number;
      experience: string;
      status: string;
    }>,
    actorId: string
  ) {
    const agent = await agentsRepository.update(id, data);
    if (!agent) throw new ApiError(404, 'Agent not found');
    await createAuditLog({
      userId: actorId,
      action: 'update',
      resource: 'agent',
      resourceId: id,
      details: data,
    });
    return agent;
  },

  async delete(id: string, actorId: string) {
    const agent = await agentsRepository.delete(id);
    if (!agent) throw new ApiError(404, 'Agent not found');
    await createAuditLog({
      userId: actorId,
      action: 'delete',
      resource: 'agent',
      resourceId: id,
    });
    return { deleted: true };
  },
};
