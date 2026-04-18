import { Router } from "express";
import { authenticate, authorize, adminLimiter } from "../../middleware/index";
import { UserRole } from "../../models/index";
import {
  getAllEmployees,
  getEmployeeStats,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  bulkUpdateEmployees,
} from "./admin-employees.controller";

const router = Router();

router.use(authenticate);
router.use(authorize([UserRole.ADMIN]));
router.use(adminLimiter);

router.get("/stats", getEmployeeStats);

router.get("/", getAllEmployees);

router.get("/:id", getEmployeeById);

router.post("/", createEmployee);

router.put("/:id", updateEmployee);

router.delete("/:id", deleteEmployee);

router.patch("/bulk", bulkUpdateEmployees);

export default router;
