import { Assignment } from '../../shared/models/index.js';
import { PipelineStage } from 'mongoose';


export const assignmentsRepository = {
  async findById(id: string) {
    return Assignment.findById(id)
      .populate('leadId')
      .populate('scheduleId')
      .populate({
        path: 'agentId',
        populate: {
          path: 'userId',
          select: 'name email',
        },
      })
      .populate('assignedBy', 'name email');
  },

  async findByAgentId(agentId: string, filters?: { status?: string; fromDate?: Date; toDate?: Date; activeOnly?: boolean }) {
    const query: Record<string, unknown> = { agentId };
    if (filters?.activeOnly !== false) query.isActive = true;
    if (filters?.status) query.status = filters.status;
    if (filters?.fromDate || filters?.toDate) {
      query.assignedAt = {};
      if (filters?.fromDate) (query.assignedAt as Record<string, Date>).$gte = filters.fromDate;
      if (filters?.toDate) (query.assignedAt as Record<string, Date>).$lte = filters.toDate;
    }
    return Assignment.find(query)
      .populate('leadId')
      .populate('scheduleId')
      .populate({
        path: 'agentId',
        populate: {
          path: 'userId',
          select: 'name email',
        },
      })
      .populate('assignedBy', 'name email')
      .sort({ assignedAt: -1 })
      .lean();
  },

  async findAgentTasksPaginated(agentId: string, filters?: { status?: string; fromDate?: Date; toDate?: Date; page?: number; limit?: number }) {
    const query: Record<string, unknown> = { agentId };
    if (filters?.status) query.status = filters.status;
    if (filters?.fromDate || filters?.toDate) {
      query.assignedAt = {};
      if (filters?.fromDate) (query.assignedAt as Record<string, Date>).$gte = filters.fromDate;
      if (filters?.toDate) (query.assignedAt as Record<string, Date>).$lte = filters.toDate;
    }
    const page = filters?.page ?? 1;
    const limit = Math.min(filters?.limit ?? 20, 100);
    const skip = (page - 1) * limit;
    
    const [items, total] = await Promise.all([
      Assignment.find(query)
        .populate('leadId', 'client cleaningDetails status')
        .populate('scheduleId', 'date timeSlot duration')
        .sort({ assignedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Assignment.countDocuments(query),
    ]);
    
    return { items, total, page, limit };
  },

  async findByScheduleId(scheduleId: string) {
    return Assignment.find({ scheduleId })
      .populate({
        path: 'agentId',
        populate: {
          path: 'userId',
          select: 'name email',
        },
      })
      .populate('assignedBy', 'name email')
      .lean();
  },

  async findMany(filters: {
    leadId?: string;
    agentId?: string;
    scheduleId?: string;
    status?: string;
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const query: Record<string, unknown> = {};
    if (filters.leadId) query.leadId = filters.leadId;
    if (filters.agentId) query.agentId = filters.agentId;
    if (filters.scheduleId) query.scheduleId = filters.scheduleId;
    if (filters.status) query.status = filters.status;
    if (filters.isActive !== undefined) query.isActive = filters.isActive;
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);
    const skip = (page - 1) * limit;
    const search = filters.search?.trim();

    if (search) {
      const regex = new RegExp(search, 'i');
      
const pipeline: PipelineStage[] = [
        { $match: query },
        {
          $lookup: {
            from: 'leads',
            localField: 'leadId',
            foreignField: '_id',
            as: 'leadId',
          },
        },
        { $unwind: { path: '$leadId', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'schedules',
            localField: 'scheduleId',
            foreignField: '_id',
            as: 'scheduleId',
          },
        },
        { $unwind: { path: '$scheduleId', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'agents',
            localField: 'agentId',
            foreignField: '_id',
            as: 'agentId',
          },
        },
        { $unwind: { path: '$agentId', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'users',
            localField: 'agentId.userId',
            foreignField: '_id',
            as: 'agentUser',
          },
        },
        { $unwind: { path: '$agentUser', preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            'agentId.userId': '$agentUser',
          },
        },
        {
          $match: {
            $or: [
              { 'leadId.client.companyName': { $regex: regex } },
              { 'leadId.client.contactPerson': { $regex: regex } },
              { 'leadId.client.email': { $regex: regex } },
              { 'agentUser.name': { $regex: regex } },
              { 'agentUser.email': { $regex: regex } },
            ],
          },
        },
        { $sort: { assignedAt: -1 } },
        {
          $facet: {
            items: [{ $skip: skip }, { $limit: limit }],
            total: [{ $count: 'count' }],
          },
        },
      ];

      const [result] = await Assignment.aggregate(pipeline);
      const items = result?.items ?? [];
      const total = result?.total?.[0]?.count ?? 0;
      return { items, total, page, limit };
    }
    const [items, total] = await Promise.all([
      Assignment.find(query)
        .populate('leadId')
        .populate('scheduleId')
        .populate({
          path: 'agentId',
          populate: {
            path: 'userId',
            select: 'name email',
          },
        })
        .populate('assignedBy', 'name email')
        .sort({ assignedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Assignment.countDocuments(query),
    ]);
    return { items, total, page, limit };
  },

  async create(data: {
    leadId: string;
    scheduleId: string;
    agentId: string;
    assignedBy: string;
    status?: string;
    notes?: string;
  }) {
    return Assignment.create({ ...data, isActive: true });
  },

  async findActiveByLeadId(leadId: string) {
    return Assignment.findOne({ leadId, isActive: true });
  },

  async updateStatus(id: string, status: string, completedAt?: Date, startedAt?: Date, notes?: string, completionImages?: string[]) {
    const update: Record<string, unknown> = { status };
    if (completedAt) update.completedAt = completedAt;
    if (startedAt !== undefined) update.startedAt = startedAt;
    if (notes !== undefined) update.notes = notes;
    if (completionImages !== undefined) update.completionImages = completionImages;
    return Assignment.findByIdAndUpdate(id, { $set: update }, { new: true })
      .populate('leadId')
      .populate('scheduleId')
      .populate({
        path: 'agentId',
        populate: {
          path: 'userId',
          select: 'name email',
        },
      })
      .populate('assignedBy', 'name email');
  },

  async delete(id: string) {
    return Assignment.findByIdAndDelete(id);
  },
};
