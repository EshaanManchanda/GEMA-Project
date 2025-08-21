import { Schema, model, Document, Types } from 'mongoose';

export interface ICheckinLog extends Document {
  ticketId: Types.ObjectId;
  eventId: Types.ObjectId;
  employeeId: Types.ObjectId;
  customerId: Types.ObjectId;
  scanResult: 'success' | 'invalid' | 'duplicate' | 'expired' | 'unauthorized';
  scanTime: Date;
  location?: string;
  deviceInfo?: {
    deviceId?: string;
    deviceName?: string;
    appVersion?: string;
    osVersion?: string;
  };
  geoLocation?: {
    latitude?: number;
    longitude?: number;
    accuracy?: number;
  };
  notes?: string;
  createdAt: Date;
}

const CheckinLogSchema = new Schema<ICheckinLog>({
  ticketId: { type: Schema.Types.ObjectId, ref: 'Ticket', required: true },
  eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  scanResult: { type: String, enum: ['success', 'invalid', 'duplicate', 'expired', 'unauthorized'], required: true },
  scanTime: { type: Date, default: Date.now, required: true },
  location: { type: String },
  deviceInfo: {
    deviceId: { type: String },
    deviceName: { type: String },
    appVersion: { type: String },
    osVersion: { type: String },
  },
  geoLocation: {
    latitude: { type: Number },
    longitude: { type: Number },
    accuracy: { type: Number },
  },
  notes: { type: String },
}, { timestamps: true });

const CheckinLog = model<ICheckinLog>('CheckinLog', CheckinLogSchema);

export default CheckinLog;