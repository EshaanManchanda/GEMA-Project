import { Router } from "express";
import {
  createEmployee,
  getEmployeeDetails,
  updateEmployee,
  deleteEmployee,
  assignEmployeeToEvent,
  removeEmployeeFromEvent,
} from "./employees.controller";
import { authenticate, authorize } from "../../middleware/auth";

const router = Router();

router.use(authenticate);

router.post("/", authorize(["vendor", "admin"]), createEmployee);

router.get(
  "/:employeeId",
  authorize(["vendor", "admin", "employee"]),
  getEmployeeDetails,
);

router.put(
  "/:employeeId",
  authorize(["vendor", "admin", "employee"]),
  updateEmployee,
);

router.delete("/:employeeId", authorize(["vendor", "admin"]), deleteEmployee);

router.post(
  "/assign-event",
  authorize(["vendor", "admin"]),
  assignEmployeeToEvent,
);

router.post(
  "/remove-event",
  authorize(["vendor", "admin"]),
  removeEmployeeFromEvent,
);

export default router;
