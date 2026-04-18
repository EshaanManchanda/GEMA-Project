import { Router } from "express";
import { body, param, query } from "express-validator";
import { authenticate, authorize } from "../../middleware/auth";
import { validateRequest } from "../../middleware/validation";
import { UserRole } from "../../models/index";
import {
  createInvoice, getInvoices, updateInvoiceStatus, payInvoice,
  createStaff, getStaff,
  markAttendance, getAttendance,
  createLeaveRequest, getLeaveRequests, approveLeaveRequest, rejectLeaveRequest,
  createPayrollRun, getPayrollRuns,
  generateFinancialReport, getFinancialReports,
} from "./erp.controller";

const router = Router();
router.use(authenticate);

// Invoices
router.post(
  "/schools/:schoolId/invoices",
  authorize([UserRole.SCHOOL, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  [
    param("schoolId").isMongoId().withMessage("Invalid school ID"),
    body("type").isIn(["tuition", "event", "transport", "uniform", "other"]).withMessage("Invalid invoice type"),
    body("items").isArray({ min: 1 }).withMessage("At least one item is required"),
    body("dueDate").isISO8601().withMessage("Valid due date is required"),
  ],
  validateRequest,
  createInvoice,
);

router.get(
  "/schools/:schoolId/invoices",
  authorize([UserRole.SCHOOL, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.PARENT]),
  getInvoices,
);

router.put(
  "/invoices/:id/status",
  authorize([UserRole.SCHOOL, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  [param("id").isMongoId().withMessage("Invalid invoice ID"), body("status").isIn(["draft", "sent", "paid", "overdue", "cancelled"]).withMessage("Invalid status")],
  validateRequest,
  updateInvoiceStatus,
);

router.post(
  "/invoices/:id/pay",
  authorize([UserRole.SCHOOL, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.PARENT]),
  [param("id").isMongoId().withMessage("Invalid invoice ID"), body("amount").isNumeric().withMessage("Amount is required"), body("paymentMethod").isIn(["cash", "card", "bank_transfer", "online", "cheque"]).withMessage("Invalid payment method")],
  validateRequest,
  payInvoice,
);

// Staff
router.post(
  "/schools/:schoolId/staff",
  authorize([UserRole.SCHOOL, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  [param("schoolId").isMongoId().withMessage("Invalid school ID"), body("firstName").trim().notEmpty().withMessage("First name is required"), body("lastName").trim().notEmpty().withMessage("Last name is required"), body("email").isEmail().withMessage("Valid email is required"), body("position").trim().notEmpty().withMessage("Position is required"), body("hireDate").isISO8601().withMessage("Valid hire date is required")],
  validateRequest,
  createStaff,
);

router.get(
  "/schools/:schoolId/staff",
  authorize([UserRole.SCHOOL, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  getStaff,
);

// Attendance
router.post(
  "/schools/:schoolId/attendance",
  authorize([UserRole.SCHOOL, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  [param("schoolId").isMongoId().withMessage("Invalid school ID"), body("staffId").isMongoId().withMessage("Valid staff ID is required"), body("date").isISO8601().withMessage("Valid date is required")],
  validateRequest,
  markAttendance,
);

router.get(
  "/schools/:schoolId/attendance",
  authorize([UserRole.SCHOOL, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  getAttendance,
);

// Leave Requests
router.post(
  "/schools/:schoolId/leave-requests",
  authorize([UserRole.SCHOOL, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  [param("schoolId").isMongoId().withMessage("Invalid school ID"), body("staffId").isMongoId().withMessage("Valid staff ID is required"), body("type").isIn(["sick", "annual", "personal", "maternity", "paternity", "unpaid", "other"]).withMessage("Invalid leave type"), body("startDate").isISO8601().withMessage("Valid start date is required"), body("endDate").isISO8601().withMessage("Valid end date is required"), body("reason").trim().notEmpty().withMessage("Reason is required")],
  validateRequest,
  createLeaveRequest,
);

router.get(
  "/schools/:schoolId/leave-requests",
  authorize([UserRole.SCHOOL, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  getLeaveRequests,
);

router.post(
  "/leave-requests/:id/approve",
  authorize([UserRole.SCHOOL, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  [param("id").isMongoId().withMessage("Invalid leave request ID")],
  validateRequest,
  approveLeaveRequest,
);

router.post(
  "/leave-requests/:id/reject",
  authorize([UserRole.SCHOOL, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  [param("id").isMongoId().withMessage("Invalid leave request ID"), body("reason").trim().notEmpty().withMessage("Rejection reason is required")],
  validateRequest,
  rejectLeaveRequest,
);

// Payroll
router.post(
  "/schools/:schoolId/payroll",
  authorize([UserRole.SCHOOL, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  [param("schoolId").isMongoId().withMessage("Invalid school ID"), body("periodStart").isISO8601().withMessage("Valid period start is required"), body("periodEnd").isISO8601().withMessage("Valid period end is required"), body("entries").isArray({ min: 1 }).withMessage("At least one entry is required")],
  validateRequest,
  createPayrollRun,
);

router.get(
  "/schools/:schoolId/payroll",
  authorize([UserRole.SCHOOL, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  getPayrollRuns,
);

// Financial Reports
router.post(
  "/schools/:schoolId/reports/financial",
  authorize([UserRole.SCHOOL, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  [param("schoolId").isMongoId().withMessage("Invalid school ID"), body("type").isIn(["monthly", "quarterly", "annual", "custom"]).withMessage("Invalid report type"), body("periodStart").isISO8601().withMessage("Valid period start is required"), body("periodEnd").isISO8601().withMessage("Valid period end is required")],
  validateRequest,
  generateFinancialReport,
);

router.get(
  "/schools/:schoolId/reports/financial",
  authorize([UserRole.SCHOOL, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  getFinancialReports,
);

export default router;
