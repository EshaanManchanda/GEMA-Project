import { Router } from "express";
import { param, body, query } from "express-validator";
import {
  createStudent,
  listStudents,
  getStudentsByParentEmail,
  getMyChildren,
  getStudent,
  updateStudent,
  deleteStudent,
  bulkImportStudents,
  publicStudentRegistration,
} from "../controllers/student.controller";
import { authenticate, authenticateOptional, authorize } from "../middleware/auth";
import { validate } from "../middleware/validation";
import { publicFormLimiter } from "../middleware/rateLimiter";
import { uploadCSV } from "../middleware/upload";

const router = Router();

router.post(
  "/public-register",
  publicFormLimiter,
  authenticateOptional, // a logged-in parent may add a child to their own account
  [
    body("studentName").trim().notEmpty().isLength({ max: 100 }).withMessage("Student name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body(["grade", "schoolName", "location", "phone", "interest"]).optional().isString().isLength({ max: 200 }),
  ],
  validate,
  publicStudentRegistration
);

router.use(authenticate);

router.post("/bulk-import", authorize(["admin"]), uploadCSV.single("csv"), bulkImportStudents);

router.get("/me/children", getMyChildren);

router.get(
  "/by-email/:email",
  authorize(["admin"]),
  [param("email").isEmail().withMessage("Valid email required")],
  getStudentsByParentEmail,
);

router.get(
  "/",
  authorize(["admin"]),
  [
    query("parentUserId").optional().isMongoId(),
    query("email").optional().isEmail(),
    query("schoolId").optional().isString(),
    query("status").optional().isIn(["active", "inactive"]),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
  ],
  listStudents,
);

router.post(
  "/",
  authorize(["admin"]),
  [
    body("firstName").notEmpty().withMessage("First name required"),
    body("lastName").notEmpty().withMessage("Last name required"),
    body("email").isEmail().withMessage("Valid student email required"),
    body("parentEmail").optional().isEmail(),
    body("parentUserId").optional().isMongoId(),
  ],
  createStudent,
);

router.get("/:id", [param("id").isMongoId().withMessage("Invalid student ID")], getStudent);

router.put(
  "/:id",
  authorize(["admin"]),
  [param("id").isMongoId().withMessage("Invalid student ID")],
  updateStudent,
);

router.delete(
  "/:id",
  authorize(["admin"]),
  [param("id").isMongoId().withMessage("Invalid student ID")],
  deleteStudent,
);

export default router;
