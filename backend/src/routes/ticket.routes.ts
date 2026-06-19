import { Router } from "express";
import {
  generateTickets,
  getTicketDetails,
  transferTicket,
  resendTicket,
  verifyTicketQR,
  checkInTicket,
  getEventTickets,
  getUserTickets,
  getTicketsByOrder,
  downloadTicketPDF,
  generateMissingTickets,
} from "../controllers/ticket.controller";
import { authenticate, authorize } from "../middleware/auth";
import { param } from "express-validator";
import { validateRequest } from "../middleware/validation";

const router = Router();

// Protect all routes with authentication and authorization middleware
router.use(authenticate);

// Generate Tickets (Vendor/Admin only)
router.post("/generate", authorize(["vendor", "admin"]), generateTickets);

// Generate Missing Tickets (any authenticated user — controller checks order ownership)
router.post("/generate-missing", generateMissingTickets);

// QR Code Verification (Employee/Vendor/Admin only)
router.post(
  "/verify-qr/:eventId?",
  [param("eventId").optional().isMongoId().withMessage("Invalid event ID")],
  validateRequest,
  authorize(["employee", "vendor", "admin"]),
  verifyTicketQR,
);

// Check-in Ticket (Employee/Vendor/Admin only)
router.post(
  "/:ticketId/checkin",
  [param("ticketId").isMongoId().withMessage("Invalid ticket ID")],
  validateRequest,
  authorize(["employee", "vendor", "admin"]),
  checkInTicket,
);

// Get Event Tickets (Employee/Vendor/Admin only)
router.get(
  "/event/:eventId",
  [param("eventId").isMongoId().withMessage("Invalid event ID")],
  validateRequest,
  authorize(["employee", "vendor", "admin"]),
  getEventTickets,
);

// Get User's Tickets — any authenticated user (controller scopes by userId)
router.get("/user/my-tickets", getUserTickets);

// Get Tickets by Order ID — any authenticated user (controller verifies ownership)
router.get(
  "/order/:orderId",
  [param("orderId").isMongoId().withMessage("Invalid order ID")],
  validateRequest,
  getTicketsByOrder,
);

// Download Ticket PDF — any authenticated user (controller checks ticket ownership)
router.get(
  "/:ticketId/download",
  [param("ticketId").isMongoId().withMessage("Invalid ticket ID")],
  validateRequest,
  downloadTicketPDF,
);

// Get Ticket Details — any authenticated user or staff
router.get(
  "/:ticketId",
  [param("ticketId").isMongoId().withMessage("Invalid ticket ID")],
  validateRequest,
  getTicketDetails,
);

// Transfer Ticket — any authenticated user (controller checks ticket ownership)
router.post(
  "/:ticketId/transfer",
  [param("ticketId").isMongoId().withMessage("Invalid ticket ID")],
  validateRequest,
  transferTicket,
);

// Resend Ticket — any authenticated user (controller checks ticket ownership)
router.post(
  "/:ticketId/resend",
  [param("ticketId").isMongoId().withMessage("Invalid ticket ID")],
  validateRequest,
  resendTicket,
);

export default router;
