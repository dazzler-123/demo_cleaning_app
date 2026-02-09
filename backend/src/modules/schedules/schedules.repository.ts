import { Schedule } from '../../shared/models/index.js';

export const schedulesRepository = {
  async findById(id: string) {
    return Schedule.findById(id).populate('leadId');
  },

  async findByLeadId(leadId: string) {
    return Schedule.find({ leadId }).populate('leadId').sort({ date: 1 });
  },

  async findMany(filters: {
    leadId?: string;
    fromDate?: Date;
    toDate?: Date;
    page?: number;
    limit?: number;
    activeOnly?: boolean;
  }) {
    const query: Record<string, unknown> = {};
    if (filters.leadId) query.leadId = filters.leadId;
    if (filters.activeOnly !== false) query.isActive = true;
    if (filters.fromDate || filters.toDate) {
      query.date = {};
      if (filters.fromDate) (query.date as Record<string, Date>).$gte = filters.fromDate;
      if (filters.toDate) (query.date as Record<string, Date>).$lte = filters.toDate;
    }
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 50, 100);
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Schedule.find(query)
        .populate('leadId')
        .sort({ date: 1, timeSlot: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Schedule.countDocuments(query),
    ]);
    return { items, total, page, limit };
  },

  async create(data: { leadId: string; date: Date; timeSlot: string; duration: number; notes?: string }) {
    return Schedule.create(data);
  },

  async deactivateByLeadId(leadId: string) {
    return Schedule.updateMany({ leadId }, { $set: { isActive: false } });
  },

  async findActiveByLeadId(leadId: string) {
    return Schedule.findOne({ leadId, isActive: true });
  },

  async update(id: string, data: Partial<{ date: Date; timeSlot: string; duration: number; notes: string }>) {
    return Schedule.findByIdAndUpdate(id, { $set: data }, { new: true }).populate('leadId');
  },

  async delete(id: string) {
    return Schedule.findByIdAndDelete(id);
  },
};
