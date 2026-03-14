import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { validateRequest } from "../middleware/validation";
import {
  submitContact,
  getAllContacts,
  getContactById,
  markAsRead,
  markAsResponded,
  deleteContact,
  getContactStats,
} from "../controllers/contact.controller";
import {
  submitContactValidation,
  getAllContactsValidation,
  getContactByIdValidation,
  markAsReadValidation,
  markAsRespondedValidation,
  deleteContactValidation,
} from "../validators/contact.validator";

const router = Router();

// Public route - Submit contact form
router.post("/", submitContactValidation, validateRequest, submitContact);

// Protected admin routes
router.use(authenticate); // All routes below require authentication

// Get all contact submissions (admin only)
router.get("/", getAllContactsValidation, validateRequest, getAllContacts);

// Get contact statistics (admin only)
router.get("/stats", getContactStats);

// Get single contact by ID (admin only)
router.get("/:id", getContactByIdValidation, validateRequest, getContactById);

// Mark contact as read (admin only)
router.patch("/:id/read", markAsReadValidation, validateRequest, markAsRead);

// Mark contact as responded (admin only)
router.patch(
  "/:id/responded",
  markAsRespondedValidation,
  validateRequest,
  markAsResponded,
);

// Delete contact submission (admin only)
router.delete("/:id", deleteContactValidation, validateRequest, deleteContact);

export default router;
