import { Router } from 'express';
import { checkInTicket, getCheckinLogs, getCheckinSummary } from '../controllers/checkin.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Protect all routes with authentication and authorization middleware
router.use(authenticate);

// Check-in Ticket (Employee only)
router.post('/', authorize(['employee']), checkInTicket);

// Get Check-in Logs (Vendor/Admin/Employee with permission)
router.get('/logs', authorize(['vendor', 'admin', 'employee']), getCheckinLogs);

// Get Check-in Summary (Vendor/Admin)
router.get('/summary', authorize(['vendor', 'admin']), getCheckinSummary);

export default router;