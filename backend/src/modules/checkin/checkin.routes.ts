import { Router } from "express";
import {
  checkInTicket,
  getCheckinLogs,
  getCheckinSummary,
} from "./checkin.controller";
import { authenticate, authorize } from "../../middleware/auth";

const router = Router();

router.use(authenticate);

router.post("/", authorize(["employee"]), checkInTicket);

router.get("/logs", authorize(["vendor", "admin", "employee"]), getCheckinLogs);

router.get("/summary", authorize(["vendor", "admin"]), getCheckinSummary);

export default router;
