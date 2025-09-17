import { Router } from 'express';
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
  generateMissingTickets
} from '../controllers/ticket.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Protect all routes with authentication and authorization middleware
router.use(authenticate);

// Generate Tickets (Vendor/Admin only)
router.post('/generate', authorize(['vendor', 'admin']), generateTickets);

// Generate Missing Tickets (User/Customer for their own orders)
router.post('/generate-missing', authorize(['user', 'customer', 'vendor', 'admin']), generateMissingTickets);

// QR Code Verification (Employee/Vendor/Admin only)
router.post('/verify-qr/:eventId?', authorize(['employee', 'vendor', 'admin']), verifyTicketQR);

// Check-in Ticket (Employee/Vendor/Admin only)
router.post('/:ticketId/checkin', authorize(['employee', 'vendor', 'admin']), checkInTicket);

// Get Event Tickets (Employee/Vendor/Admin only)
router.get('/event/:eventId', authorize(['employee', 'vendor', 'admin']), getEventTickets);

// Get User's Tickets (Customer portal)
router.get('/user/my-tickets', authorize(['user', 'customer']), getUserTickets);

// Get Tickets by Order ID (Customer portal)
router.get('/order/:orderId', authorize(['user', 'customer']), getTicketsByOrder);

// Download Ticket PDF (Ticket owner only)
router.get('/:ticketId/download', authorize(['user', 'customer']), downloadTicketPDF);

// Get Ticket Details (Authenticated user, or employee with permission)
router.get('/:ticketId', authorize(['user', 'customer', 'employee', 'vendor', 'admin']), getTicketDetails);

// Transfer Ticket (Authenticated user)
router.post('/:ticketId/transfer', authorize(['user', 'customer']), transferTicket);

// Resend Ticket (Authenticated user)
router.post('/:ticketId/resend', authorize(['user', 'customer']), resendTicket);

export default router;