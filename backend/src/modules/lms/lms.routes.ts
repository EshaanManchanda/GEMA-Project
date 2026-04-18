import { Router } from "express";
import { body, param } from "express-validator";
import { authenticate, authorize } from "../../middleware/auth";
import { validateRequest } from "../../middleware/validation";
import { UserRole } from "../../models/index";
import {
  createCourse,
  getCourses,
  getCourse,
  updateCourse,
  deleteCourse,
  enrollInCourse,
  getCourseEnrollments,
  createLesson,
  getLessons,
  updateLesson,
  deleteLesson,
  createQuiz,
  getQuizzes,
  submitQuiz,
  createAssignment,
  getAssignments,
  submitAssignment,
  gradeSubmission,
  getStudentProgress,
} from "./lms.controller";

const router = Router();

// Public course listing
router.get("/courses", getCourses);
router.get("/courses/:id", getCourse);

// Authenticated routes
router.use(authenticate);

// Course management (teacher, school, admin)
router.post(
  "/courses",
  authorize([UserRole.TEACHER, UserRole.SCHOOL, UserRole.ADMIN]),
  [
    body("title").trim().notEmpty().withMessage("Title is required"),
    body("description").trim().notEmpty().withMessage("Description is required"),
    body("category").trim().notEmpty().withMessage("Category is required"),
    body("gradeLevel").trim().notEmpty().withMessage("Grade level is required"),
    body("enrollment.startDate").isISO8601().withMessage("Start date is required"),
    body("enrollment.endDate").isISO8601().withMessage("End date is required"),
  ],
  validateRequest,
  createCourse,
);

router.put(
  "/courses/:id",
  authorize([UserRole.TEACHER, UserRole.SCHOOL, UserRole.ADMIN]),
  [param("id").isMongoId().withMessage("Invalid course ID")],
  validateRequest,
  updateCourse,
);

router.delete(
  "/courses/:id",
  authorize([UserRole.TEACHER, UserRole.SCHOOL, UserRole.ADMIN]),
  [param("id").isMongoId().withMessage("Invalid course ID")],
  validateRequest,
  deleteCourse,
);

// Enrollment
router.post(
  "/courses/:courseId/enroll",
  authorize([UserRole.STUDENT, UserRole.PARENT, UserRole.ADMIN]),
  [param("courseId").isMongoId().withMessage("Invalid course ID")],
  validateRequest,
  enrollInCourse,
);

router.get(
  "/courses/:courseId/enrollments",
  authorize([UserRole.TEACHER, UserRole.SCHOOL, UserRole.ADMIN]),
  getCourseEnrollments,
);

// Lessons
router.post(
  "/courses/:courseId/lessons",
  authorize([UserRole.TEACHER, UserRole.SCHOOL, UserRole.ADMIN]),
  [
    param("courseId").isMongoId().withMessage("Invalid course ID"),
    body("title").trim().notEmpty().withMessage("Title is required"),
    body("type").isIn(["video", "text", "pdf", "quiz", "assignment", "live"]).withMessage("Invalid lesson type"),
    body("order").isInt({ min: 0 }).withMessage("Order is required"),
  ],
  validateRequest,
  createLesson,
);

router.get("/courses/:courseId/lessons", getLessons);

router.put(
  "/lessons/:id",
  authorize([UserRole.TEACHER, UserRole.SCHOOL, UserRole.ADMIN]),
  [param("id").isMongoId().withMessage("Invalid lesson ID")],
  validateRequest,
  updateLesson,
);

router.delete(
  "/lessons/:id",
  authorize([UserRole.TEACHER, UserRole.SCHOOL, UserRole.ADMIN]),
  [param("id").isMongoId().withMessage("Invalid lesson ID")],
  validateRequest,
  deleteLesson,
);

// Quizzes
router.post(
  "/courses/:courseId/quizzes",
  authorize([UserRole.TEACHER, UserRole.SCHOOL, UserRole.ADMIN]),
  [
    param("courseId").isMongoId().withMessage("Invalid course ID"),
    body("title").trim().notEmpty().withMessage("Title is required"),
    body("type").isIn(["multiple_choice", "true_false", "short_answer", "essay", "fill_blank"]).withMessage("Invalid quiz type"),
    body("questions").isArray({ min: 1 }).withMessage("At least one question is required"),
  ],
  validateRequest,
  createQuiz,
);

router.get("/courses/:courseId/quizzes", authorize([UserRole.STUDENT, UserRole.TEACHER, UserRole.ADMIN]), getQuizzes);

router.post(
  "/quizzes/:quizId/submit",
  authorize([UserRole.STUDENT, UserRole.ADMIN]),
  [param("quizId").isMongoId().withMessage("Invalid quiz ID"), body("answers").isArray({ min: 1 }).withMessage("Answers are required")],
  validateRequest,
  submitQuiz,
);

// Assignments
router.post(
  "/courses/:courseId/assignments",
  authorize([UserRole.TEACHER, UserRole.SCHOOL, UserRole.ADMIN]),
  [
    param("courseId").isMongoId().withMessage("Invalid course ID"),
    body("title").trim().notEmpty().withMessage("Title is required"),
    body("description").trim().notEmpty().withMessage("Description is required"),
    body("dueDate").isISO8601().withMessage("Due date is required"),
  ],
  validateRequest,
  createAssignment,
);

router.get("/courses/:courseId/assignments", authorize([UserRole.STUDENT, UserRole.TEACHER, UserRole.ADMIN]), getAssignments);

router.post(
  "/assignments/:assignmentId/submit",
  authorize([UserRole.STUDENT, UserRole.ADMIN]),
  [param("assignmentId").isMongoId().withMessage("Invalid assignment ID")],
  validateRequest,
  submitAssignment,
);

router.post(
  "/submissions/:submissionId/grade",
  authorize([UserRole.TEACHER, UserRole.SCHOOL, UserRole.ADMIN]),
  [
    param("submissionId").isMongoId().withMessage("Invalid submission ID"),
    body("score").isNumeric().withMessage("Score is required"),
  ],
  validateRequest,
  gradeSubmission,
);

// Progress
router.get(
  "/courses/:courseId/progress",
  authorize([UserRole.STUDENT, UserRole.TEACHER, UserRole.PARENT, UserRole.ADMIN]),
  getStudentProgress,
);

export default router;
