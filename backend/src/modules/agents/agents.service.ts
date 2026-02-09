import { ApiError } from '../../shared/utils/ApiError.js';
import { Agent, User } from '../../shared/models/index.js';
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
    const [agentRoleUsers, existingAgentUserIds] = await Promise.all([
      User.find({ role: 'agent' }).select('_id name email').lean(),
      Agent.find({}).select('userId').lean().then((docs) =>
        new Set(docs.map((d) => (d.userId != null ? String(d.userId) : '')).filter(Boolean))
      ),
    ]);
    const available = agentRoleUsers.filter((u) => u._id && !existingAgentUserIds.has(u._id.toString()));
    return available.map((u) => ({ _id: u._id.toString(), name: u.name, email: u.email }));
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
    const existing = await Agent.findOne({ userId: data.userId });
    if (existing) throw new ApiError(400, 'Agent profile already exists for this user');
    const user = await User.findById(data.userId);
    if (!user || user.role !== 'agent') throw new ApiError(400, 'User must have agent role');
    const agent = await agentsRepository.create(data);
    await createAuditLog({
      userId: actorId,
      action: 'create',
      resource: 'agent',
      resourceId: agent._id.toString(),
    });
    return agentsRepository.findById(agent._id.toString());
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
