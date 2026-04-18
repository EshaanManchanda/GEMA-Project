import { Router } from "express";
import { body, query } from "express-validator";
import {
  getAllTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  softDeleteTeacher,
  toggleTeacherSuspension,
  toggleTeacherActiveStatus,
  updateTeacherPaymentMode,
  updateTeacherSubscriptionStatus,
  updateTeacherStatus,
  getTeacherStats,
} from "./admin-teachers.controller";
import { adminVerifyTeacherBank } from "../payments/teacher-payment.controller";

import { authenticate, authorize, validate, adminLimiter } from "../../middleware";
import { UserRole } from "../../models/index";

import { validateMongoId } from "../../validators/common.validator";
import {
  TeacherPaymentMode,
  TeacherVerificationStatus,
} from "../../models/index";
import { TeacherSubscriptionStatus } from "../../models/index";

const router = Router();

/**
 * ============================
 * MIDDLEWARE
 * ============================
 */
router.use(authenticate);
router.use(authorize([UserRole.ADMIN]));
router.use(adminLimiter);

/**
 * ============================
 * STATS
 * ============================
 */
router.get("/stats", getTeacherStats);

/**
 * ============================
 * LIST TEACHERS
 * ============================
 */
router.get(
  "/",
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 1000 }),
    query("search").optional().isString(),
    query("paymentMode").optional().isIn(Object.values(TeacherPaymentMode)),
    query("verificationStatus")
      .optional()
      .isIn(Object.values(TeacherVerificationStatus)),
    query("isActive").optional().isBoolean(),
    query("sortBy").optional().isString(),
    query("sortOrder").optional().isIn(["asc", "desc"]),
  ],
  validate,
  getAllTeachers,
);

/**
 * ============================
 * CREATE TEACHER
 * ============================
 */
router.post(
  "/",
  [
    body("userId").isMongoId(),
    body("fullName").notEmpty(),
    body("email").isEmail(),
    body("phone").notEmpty(),
    body("teachingMode").optional().isString(),
  ],
  validate,
  createTeacher,
);

/**
 * ============================
 * SINGLE TEACHER
 * ============================
 */
router.get("/:id", validateMongoId("id", "param"), validate, getTeacherById);

/**
 * ============================
 * UPDATE TEACHER PROFILE
 * ============================
 */
router.put(
  "/:id",
  [
    validateMongoId("id", "param"),
    body("fullName").optional().isString(),
    body("bio").optional().isString(),
    body("subjects").optional().isArray(),
    body("specialization").optional().isString(),
    body("languagesSpoken").optional().isArray(),
    body("yearsOfExperience").optional().isInt({ min: 0 }),
    body("teachingMode").optional().isString(),
  ],
  validate,
  updateTeacher,
);

/**
 * ============================
 * UPDATE TEACHER STATUS
 * ============================
 */
router.put(
  "/:id/status",
  [
    validateMongoId("id", "param"),
    body("isActive").optional().isBoolean(),
    body("isSuspended").optional().isBoolean(),
    body("verificationStatus")
      .optional()
      .isIn(Object.values(TeacherVerificationStatus)),
  ],
  validate,
  updateTeacherStatus,
);

/**
 * ============================
 * ACTIVATE / DEACTIVATE
 * ============================
 */
router.put(
  "/:id/active",
  [validateMongoId("id", "param"), body("isActive").isBoolean()],
  validate,
  toggleTeacherActiveStatus,
);

/**
 * ============================
 * SUSPEND / UNSUSPEND
 * ============================
 */
router.put(
  "/:id/suspend",
  [validateMongoId("id", "param"), body("isSuspended").isBoolean()],
  validate,
  toggleTeacherSuspension,
);

/**
 * ============================
 * PAYMENT MODE
 * ============================
 */
router.put(
  "/:id/payment-mode",
  [
    validateMongoId("id", "param"),
    body("paymentMode").isIn(Object.values(TeacherPaymentMode)),
    body("commissionRate").optional().isFloat({ min: 0, max: 100 }),
  ],
  validate,
  updateTeacherPaymentMode,
);

/**
 * ============================
 * SUBSCRIPTION
 * ============================
 */
router.put(
  "/:id/subscription-status",
  [
    validateMongoId("id", "param"),
    body("status").optional().isIn(Object.values(TeacherSubscriptionStatus)),
    body("endDate").optional().isISO8601(),
  ],
  validate,
  updateTeacherSubscriptionStatus,
);

/**
 * ============================
 * SOFT DELETE
 * ============================
 */
router.delete(
  "/:id",
  validateMongoId("id", "param"),
  validate,
  softDeleteTeacher,
);

/**
 * ============================
 * VERIFY BANK ACCOUNT
 * ============================
 */
router.patch(
  "/:teacherId/verify-bank",
  [
    validateMongoId("teacherId", "param"),
    body("verified").isBoolean().withMessage("verified must be a boolean"),
    body("reason").optional().isString().isLength({ max: 500 }),
  ],
  validate,
  adminVerifyTeacherBank,
);

export default router;
