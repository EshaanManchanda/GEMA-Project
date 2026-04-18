import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { UserRole } from "../../models/index";
import {
  getStudentDashboard,
  getParentDashboard,
  getEnrollments,
  getCertificates,
  getAttendance,
  getGrades,
  getChildren,
} from "./portal.controller";

const router = Router();

router.use(authenticate);

// Student routes
router.get("/student/dashboard", authorize([UserRole.STUDENT, UserRole.ADMIN]), getStudentDashboard);
router.get("/student/enrollments", authorize([UserRole.STUDENT, UserRole.ADMIN]), getEnrollments);
router.get("/student/certificates", authorize([UserRole.STUDENT, UserRole.ADMIN, UserRole.TEACHER]), getCertificates);
router.get("/student/attendance", authorize([UserRole.STUDENT, UserRole.ADMIN, UserRole.TEACHER]), getAttendance);
router.get("/student/grades", authorize([UserRole.STUDENT, UserRole.ADMIN, UserRole.TEACHER]), getGrades);

// Parent routes
router.get("/parent/dashboard", authorize([UserRole.PARENT, UserRole.ADMIN]), getParentDashboard);
router.get("/parent/children", authorize([UserRole.PARENT, UserRole.ADMIN]), getChildren);
router.get("/parent/children/:childId/enrollments", authorize([UserRole.PARENT, UserRole.ADMIN]), getEnrollments);
router.get("/parent/children/:childId/certificates", authorize([UserRole.PARENT, UserRole.ADMIN, UserRole.TEACHER]), getCertificates);
router.get("/parent/children/:childId/attendance", authorize([UserRole.PARENT, UserRole.ADMIN, UserRole.TEACHER]), getAttendance);
router.get("/parent/children/:childId/grades", authorize([UserRole.PARENT, UserRole.ADMIN, UserRole.TEACHER]), getGrades);

export default router;
