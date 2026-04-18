import { Request, Response } from "express";
import Conversation from "./conversation.model";
import Message from "./message.model";
import { catchAsync, AppError } from "../../middleware/index";
import { AuthRequest } from "../../types/index";

export const createConversation = catchAsync(async (req: AuthRequest, res: Response) => {
  const { participantIds, isGroup, groupName } = req.body;
  if (!isGroup && participantIds?.length === 1) {
    const existing = await Conversation.findOne({
      isGroup: false,
      participants: { $all: [req.user?._id, participantIds[0]], $size: 2 },
    });
    if (existing) return res.json({ success: true, data: { conversation: existing } });
  }
  const conversation = await Conversation.create({
    participants: [req.user?._id, ...(participantIds || [])],
    isGroup: isGroup || false,
    groupName,
  });
  res.status(201).json({ success: true, message: "Conversation created", data: { conversation } });
});

export const getConversations = catchAsync(async (req: AuthRequest, res: Response) => {
  const conversations = await Conversation.find({ participants: req.user?._id, isActive: true })
    .populate("participants", "firstName lastName avatar")
    .populate("lastMessage")
    .sort({ lastMessageAt: -1 });
  res.json({ success: true, data: { conversations } });
});

export const sendMessage = catchAsync(async (req: AuthRequest, res: Response) => {
  const { conversationId, content, type, attachments } = req.body;
  const message = await Message.create({
    conversationId,
    senderId: req.user?._id,
    content,
    type: type || "text",
    attachments,
  });
  await Conversation.findByIdAndUpdate(conversationId, { lastMessage: message._id, lastMessageAt: new Date() });
  res.status(201).json({ success: true, message: "Message sent", data: { message } });
});

export const getMessages = catchAsync(async (req: Request, res: Response) => {
  const { page = 1, limit = 50 } = req.query;
  const pageNum = parseInt(String(page));
  const limitNum = parseInt(String(limit));
  const skip = (pageNum - 1) * limitNum;
  const messages = await Message.find({ conversationId: req.params.conversationId })
    .populate("senderId", "firstName lastName avatar")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);
  const total = await Message.countDocuments({ conversationId: req.params.conversationId });
  res.json({ success: true, messages, pagination: { currentPage: pageNum, totalPages: Math.ceil(total / limitNum), total } });
});

export const markAsRead = catchAsync(async (req: AuthRequest, res: Response) => {
  await Message.updateMany(
    { conversationId: req.params.conversationId, senderId: { $ne: req.user?._id }, readBy: { $ne: req.user?._id } },
    { $addToSet: { readBy: req.user?._id }, isRead: true },
  );
  res.json({ success: true, message: "Messages marked as read" });
});

export const deleteMessage = catchAsync(async (req: AuthRequest, res: Response) => {
  await Message.findByIdAndUpdate(req.params.messageId, { $addToSet: { deletedBy: req.user?._id } });
  res.json({ success: true, message: "Message deleted" });
});
