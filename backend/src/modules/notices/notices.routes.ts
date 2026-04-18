import { Router } from "express";
import { body, param, query } from "express-validator";
import { authenticate, authorize } from "../../middleware/auth";
import { validateRequest } from "../../middleware/validation";
import { UserRole } from "../../models/index";
import { createNotice, getNotices, updateNotice, deleteNotice } from "./notices.controller";

const router = Router();
router.use(authenticate);

router.post(
  "/",
  authorize([UserRole.SCHOOL, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.TEACHER]),
  [body("title").trim().notEmpty().withMessage("Title is required"), body("content").trim().notEmpty().withMessage("Content is required")],
  validateRequest,
  createNotice,
);

router.get("/", getNotices);

router.put(
  "/:id",
  authorize([UserRole.SCHOOL, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.TEACHER]),
  [param("id").isMongoId().withMessage("Invalid notice ID")],
  validateRequest,
  updateNotice,
);

router.delete(
  "/:id",
  authorize([UserRole.SCHOOL, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  [param("id").isMongoId().withMessage("Invalid notice ID")],
  validateRequest,
  deleteNotice,
);

export default router;
