import { Router } from "express";
import { body, param, query } from "express-validator";
import { authenticate } from "../../middleware/auth";
import { validateRequest } from "../../middleware/validation";
import {
  createConversation, getConversations, sendMessage, getMessages, markAsRead, deleteMessage,
} from "./messaging.controller";

const router = Router();
router.use(authenticate);

router.post(
  "/conversations",
  [body("participantIds").optional().isArray(), body("isGroup").optional().isBoolean(), body("groupName").optional().isString()],
  validateRequest,
  createConversation,
);

router.get("/conversations", getConversations);

router.post(
  "/conversations/:conversationId/messages",
  [param("conversationId").isMongoId().withMessage("Invalid conversation ID"), body("content").trim().notEmpty().withMessage("Message content is required")],
  validateRequest,
  sendMessage,
);

router.get(
  "/conversations/:conversationId/messages",
  [param("conversationId").isMongoId().withMessage("Invalid conversation ID"), query("page").optional().isInt({ min: 1 }), query("limit").optional().isInt({ min: 1, max: 100 })],
  validateRequest,
  getMessages,
);

router.post(
  "/conversations/:conversationId/read",
  [param("conversationId").isMongoId().withMessage("Invalid conversation ID")],
  validateRequest,
  markAsRead,
);

router.delete(
  "/messages/:messageId",
  [param("messageId").isMongoId().withMessage("Invalid message ID")],
  validateRequest,
  deleteMessage,
);

export default router;
