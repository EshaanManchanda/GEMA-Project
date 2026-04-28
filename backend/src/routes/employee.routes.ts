import { Router } from "express";
import {
  createEmployee,
  getEmployeeDetails,
  updateEmployee,
  deleteEmployee,
  assignEmployeeToEvent,
  removeEmployeeFromEvent,
} from "../controllers/employee.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

// Protect all routes with authentication and authorization middleware
router.use(authenticate);

// Create Employee (Vendor/Admin only)
router.post("/", authorize(["vendor", "admin"]), createEmployee);

// Get Employee Details (Vendor/Admin, or employee themselves)
router.get(
  "/:employeeId",
  authorize(["vendor", "admin", "employee"]),
  getEmployeeDetails,
);

// Update Employee (Vendor/Admin, or employee themselves)
router.put(
  "/:employeeId",
  authorize(["vendor", "admin", "employee"]),
  updateEmployee,
);

// Delete Employee (Vendor/Admin only)
router.delete("/:employeeId", authorize(["vendor", "admin"]), deleteEmployee);

// Assign Employee to Event (Vendor/Admin only)
router.post(
  "/assign-event",
  authorize(["vendor", "admin"]),
  assignEmployeeToEvent,
);

// Remove Employee from Event (Vendor/Admin only)
router.post(
  "/remove-event",
  authorize(["vendor", "admin"]),
  removeEmployeeFromEvent,
);

export default router;
