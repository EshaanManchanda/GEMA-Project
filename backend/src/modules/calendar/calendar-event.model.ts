import mongoose, { Schema, model, Document } from "mongoose";

export enum CalendarEventType {
  HOLIDAY = "holiday",
  EXAM = "exam",
  EVENT = "event",
  MEETING = "meeting",
  DEADLINE = "deadline",
  OTHER = "other",
}

export interface ICalendarEvent extends Document {
  schoolId?: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  type: CalendarEventType;
  startDate: Date;
  endDate: Date;
  isAllDay: boolean;
  location?: string;
  color?: string;
  isRecurring: boolean;
  recurrencePattern?: {
    frequency: "daily" | "weekly" | "monthly" | "yearly";
    interval: number;
    endDate?: Date;
  };
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CalendarEventSchema = new Schema<ICalendarEvent>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: "School" },
    title: { type: String, required: true, trim: true },
    description: String,
    type: { type: String, enum: Object.values(CalendarEventType), default: CalendarEventType.EVENT },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isAllDay: { type: Boolean, default: false },
    location: String,
    color: String,
    isRecurring: { type: Boolean, default: false },
    recurrencePattern: {
      frequency: { type: String, enum: ["daily", "weekly", "monthly", "yearly"] },
      interval: { type: Number, default: 1 },
      endDate: Date,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

CalendarEventSchema.index({ schoolId: 1, startDate: 1 });
CalendarEventSchema.index({ type: 1, startDate: 1 });

const CalendarEvent = model<ICalendarEvent>("CalendarEvent", CalendarEventSchema);
export default CalendarEvent;
