import { Router } from "express";
import { getMyAssignedEvents, getMyReports } from "../controllers/employee.controller";
import { authenticate, authorize } from "../middleware/auth";
import { UserRole } from "../models/User";

// The logged-in employee's own data. Employee management lives under
// /api/vendors/employees and /api/admin/employees.
const router = Router();

router.use(authenticate, authorize([UserRole.EMPLOYEE]));

router.get("/assigned-events", getMyAssignedEvents);
router.get("/my-reports", getMyReports);

export default router;
