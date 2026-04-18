import mongoose, { Schema, model, Document } from "mongoose";

export interface IMessage extends Document {
  conversationId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  content: string;
  type: "text" | "image" | "file" | "system";
  attachments?: Array<{ url: string; name: string; type: string; size: number }>;
  isRead: boolean;
  readBy: mongoose.Types.ObjectId[];
  deletedBy: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true },
    type: { type: String, enum: ["text", "image", "file", "system"], default: "text" },
    attachments: [{ url: String, name: String, type: String, size: Number }],
    isRead: { type: Boolean, default: false },
    readBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    deletedBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true },
);

MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1 });
MessageSchema.index({ isRead: 1 });

const Message = model<IMessage>("Message", MessageSchema);
export default Message;
