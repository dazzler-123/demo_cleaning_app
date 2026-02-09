import { Agent, User } from '../../shared/models/index.js';

export const agentsRepository = {
  async findById(id: string) {
    return Agent.findById(id).populate('userId', 'name email role status');
  },

  async findByUserId(userId: string) {
    return Agent.findOne({ userId }).populate('userId', 'name email role status');
  },

  async findMany(filters: {
    availability?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const query: Record<string, unknown> = {};
    if (filters.availability) query.availability = filters.availability;
    if (filters.status) query.status = filters.status;
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Agent.find(query)
        .populate('userId', 'name email role status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Agent.countDocuments(query),
    ]);
    return { items, total, page, limit };
  },

  async create(data: {
    userId: string;
    phone?: string;
    skills?: string[];
    dailyCapacity?: number;
    experience?: string;
  }) {
    return Agent.create(data);
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
    }>
  ) {
    return Agent.findByIdAndUpdate(id, { $set: data }, { new: true }).populate(
      'userId',
      'name email role status'
    );
  },

  async delete(id: string) {
    return Agent.findByIdAndDelete(id);
  },
};
