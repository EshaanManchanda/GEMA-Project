import { Router } from "express";
import { body, param, query } from "express-validator";
import { authenticate, authorize } from "../../middleware/auth";
import { validateRequest } from "../../middleware/validation";
import { UserRole } from "../../models/index";
import {
  createStudent,
  getStudent,
  getStudents,
  updateStudent,
  bulkCreateStudents,
  transferStudent,
  deleteStudent,
} from "./students.controller";

const router = Router();

router.use(authenticate);

router.get(
  "/schools/:schoolId/students",
  authorize([UserRole.SCHOOL, UserRole.ADMIN, UserRole.TEACHER]),
  [
    param("schoolId").isMongoId().withMessage("Invalid school ID"),
    query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
    query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100"),
  ],
  validateRequest,
  getStudents,
);

router.post(
  "/schools/:schoolId/students",
  authorize([UserRole.SCHOOL, UserRole.ADMIN]),
  [
    param("schoolId").isMongoId().withMessage("Invalid school ID"),
    body("userId").isMongoId().withMessage("Valid user ID is required"),
    body("firstName").trim().notEmpty().withMessage("First name is required"),
    body("lastName").trim().notEmpty().withMessage("Last name is required"),
    body("dateOfBirth").isISO8601().withMessage("Valid date of birth is required"),
    body("studentId").trim().notEmpty().withMessage("Student ID is required"),
    body("grade").trim().notEmpty().withMessage("Grade is required"),
  ],
  validateRequest,
  createStudent,
);

router.post(
  "/schools/:schoolId/students/bulk",
  authorize([UserRole.SCHOOL, UserRole.ADMIN]),
  [param("schoolId").isMongoId().withMessage("Invalid school ID"), body("students").isArray({ min: 1 }).withMessage("Students array is required")],
  validateRequest,
  bulkCreateStudents,
);

router.get("/:id", authorize([UserRole.SCHOOL, UserRole.ADMIN, UserRole.TEACHER, UserRole.PARENT, UserRole.STUDENT]), getStudent);

router.put(
  "/:id",
  authorize([UserRole.SCHOOL, UserRole.ADMIN]),
  [param("id").isMongoId().withMessage("Invalid student ID")],
  validateRequest,
  updateStudent,
);

router.post(
  "/:id/transfer",
  authorize([UserRole.SCHOOL, UserRole.ADMIN]),
  [param("id").isMongoId().withMessage("Invalid student ID"), body("newSchoolId").isMongoId().withMessage("New school ID is required")],
  validateRequest,
  transferStudent,
);

router.delete(
  "/:id",
  authorize([UserRole.SCHOOL, UserRole.ADMIN]),
  [param("id").isMongoId().withMessage("Invalid student ID")],
  validateRequest,
  deleteStudent,
);

export default router;
