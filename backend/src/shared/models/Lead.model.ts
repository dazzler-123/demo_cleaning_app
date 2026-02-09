import mongoose, { Schema, Document, Model } from 'mongoose';
import type { SLAPriority } from '../../shared/types/index.js';

export interface IClientInfo {
  companyName: string;
  contactPerson: string;
  phone?: string;
  email?: string;
}

export interface ILocation {
  address?: string;
  city: string;
  state?: string;
  pincode?: string;
  geoCoordinates?: { lat: number; lng: number };
}

export interface ICleaningDetails {
  cleaningType: string;
  category: string;
  areaSize?: string;
  rooms?: number;
  washrooms?: number;
  floorType?: string;
  frequency?: string;
}

export interface IResources {
  materials?: string[];
  machines?: string[];
  safetyGear?: string[];
  powerAvailable?: boolean;
  waterAvailable?: boolean;
}

export type LeadStatus = 'created' | 'in_progress' | 'confirm' | 'follow_up' | 'completed' | 'cancelled' | 'draft';
export type ScheduleStatus = 'not_scheduled' | 'scheduled';
export type AssignmentStatus = 'not_assigned' | 'assigned';

export type LeadType = 'facebook' | 'instagram' | 'google' | 'website' | 'referral' | 'walk_in' | 'phone_call' | 'email' | 'other';

export interface ILead extends Document {
  _id: mongoose.Types.ObjectId;
  client: IClientInfo;
  location: ILocation;
  cleaningDetails: ICleaningDetails;
  resources?: IResources;
  images?: string[];
  slaPriority: SLAPriority;
  leadType?: LeadType;
  status: LeadStatus;
  scheduleStatus: ScheduleStatus;
  assignmentStatus: AssignmentStatus;
  quotedAmount?: number; // General quoted amount
  confirmedAmount?: number; // Confirmed amount when status is 'confirm'
  createdBy: mongoose.Types.ObjectId;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const clientSchema = new Schema<IClientInfo>(
  {
    companyName: { type: String, required: true, trim: true },
    contactPerson: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true },
  },
  { _id: false }
);

const locationSchema = new Schema<ILocation>(
  {
    address: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true },
    geoCoordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },
  },
  { _id: false }
);

const cleaningDetailsSchema = new Schema<ICleaningDetails>(
  {
    cleaningType: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    areaSize: { type: String, trim: true },
    rooms: { type: Number },
    washrooms: { type: Number },
    floorType: { type: String },
    frequency: { type: String },
  },
  { _id: false }
);

const resourcesSchema = new Schema<IResources>(
  {
    materials: [String],
    machines: [String],
    safetyGear: [String],
    powerAvailable: { type: Boolean },
    waterAvailable: { type: Boolean },
  },
  { _id: false }
);

const leadSchema = new Schema<ILead>(
  {
    client: { type: clientSchema, required: true },
    location: { type: locationSchema, required: true },
    cleaningDetails: { type: cleaningDetailsSchema, required: true },
    resources: { type: resourcesSchema },
    images: { type: [String], default: [] },
    slaPriority: {
      type: String,
      default: 'medium',
      enum: ['low', 'medium', 'high', 'urgent'],
    },
    leadType: {
      type: String,
      enum: ['facebook', 'instagram', 'google', 'website', 'referral', 'walk_in', 'phone_call', 'email', 'other'],
      trim: true,
    },
    status: {
      type: String,
      default: 'created',
      enum: ['created', 'in_progress', 'confirm', 'follow_up', 'completed', 'cancelled', 'draft'],
      trim: true,
    },
    quotedAmount: {
      type: Number,
      min: 0,
    },
    confirmedAmount: {
      type: Number,
      min: 0,
    },
    scheduleStatus: {
      type: String,
      default: 'not_scheduled',
      enum: ['not_scheduled', 'scheduled'],
    },
    assignmentStatus: {
      type: String,
      default: 'not_assigned',
      enum: ['not_assigned', 'assigned'],
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

leadSchema.index({ 'client.companyName': 1 });
leadSchema.index({ status: 1 });
leadSchema.index({ scheduleStatus: 1, assignmentStatus: 1 });
leadSchema.index({ createdBy: 1 });
leadSchema.index({ deletedAt: 1 });

export const Lead: Model<ILead> = mongoose.model<ILead>('Lead', leadSchema);
