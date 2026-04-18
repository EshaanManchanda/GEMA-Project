import mongoose, { Schema, model, Document } from "mongoose";

export interface IConversation extends Document {
  participants: mongoose.Types.ObjectId[];
  lastMessage?: mongoose.Types.ObjectId;
  lastMessageAt?: Date;
  isGroup: boolean;
  groupName?: string;
  groupAvatar?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    participants: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
    lastMessage: { type: Schema.Types.ObjectId, ref: "Message" },
    lastMessageAt: Date,
    isGroup: { type: Boolean, default: false },
    groupName: String,
    groupAvatar: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ lastMessageAt: -1 });

const Conversation = model<IConversation>("Conversation", ConversationSchema);
export default Conversation;
