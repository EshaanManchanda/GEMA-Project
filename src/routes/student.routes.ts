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
} from "../controllers/student.controller";
import { authenticate, authorize } from "../middleware/auth";
import { uploadCSV } from "../middleware/upload";

const router = Router();

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
    query("schoolId").optional().isMongoId(),
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
