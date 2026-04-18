import { Router } from "express";
import { body, param, query } from "express-validator";
import { authenticate, authorize } from "../../middleware/auth";
import { validateRequest } from "../../middleware/validation";
import { UserRole } from "../../models/index";
import {
  createExamTemplate, getExamTemplates, getExamTemplate, updateExamTemplate, deleteExamTemplate,
  createQuestion, getQuestions, updateQuestion, deleteQuestion,
  createQuestionBank, getQuestionBanks,
  startExam, submitExam, getStudentAttempts, reportTabSwitch,
  getExamAnalytics,
  createExamReview, getExamReviews, updateExamReview,
} from "./examinations.controller";

const router = Router();

// Public — view published exams
router.get("/templates", getExamTemplates);
router.get("/templates/:id", getExamTemplate);

// Authenticated routes
router.use(authenticate);

// Teacher/School/ADMIN — Exam Templates
router.post(
  "/templates",
  authorize([UserRole.TEACHER, UserRole.SCHOOL, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  [body("title").trim().notEmpty().withMessage("Title is required"), body("type").isString().withMessage("Type is required")],
  validateRequest,
  createExamTemplate,
);

router.put(
  "/templates/:id",
  authorize([UserRole.TEACHER, UserRole.SCHOOL, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  [param("id").isMongoId().withMessage("Invalid exam template ID")],
  validateRequest,
  updateExamTemplate,
);

router.delete(
  "/templates/:id",
  authorize([UserRole.TEACHER, UserRole.SCHOOL, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  [param("id").isMongoId().withMessage("Invalid exam template ID")],
  validateRequest,
  deleteExamTemplate,
);

// Questions
router.post(
  "/questions",
  authorize([UserRole.TEACHER, UserRole.SCHOOL, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  [body("text").trim().notEmpty().withMessage("Question text is required"), body("type").isString().withMessage("Type is required"), body("correctAnswer").exists().withMessage("Correct answer is required")],
  validateRequest,
  createQuestion,
);

router.get("/templates/:examTemplateId/questions", getQuestions);

router.put(
  "/questions/:id",
  authorize([UserRole.TEACHER, UserRole.SCHOOL, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  [param("id").isMongoId().withMessage("Invalid question ID")],
  validateRequest,
  updateQuestion,
);

router.delete(
  "/questions/:id",
  authorize([UserRole.TEACHER, UserRole.SCHOOL, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  [param("id").isMongoId().withMessage("Invalid question ID")],
  validateRequest,
  deleteQuestion,
);

// Question Banks
router.post(
  "/question-banks",
  authorize([UserRole.TEACHER, UserRole.SCHOOL, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  [body("name").trim().notEmpty().withMessage("Name is required")],
  validateRequest,
  createQuestionBank,
);

router.get("/question-banks", getQuestionBanks);

// Exam Attempts (Student)
router.post(
  "/templates/:examTemplateId/start",
  authorize([UserRole.STUDENT, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  [param("examTemplateId").isMongoId().withMessage("Invalid exam template ID")],
  validateRequest,
  startExam,
);

router.post(
  "/attempts/:attemptId/submit",
  authorize([UserRole.STUDENT, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  [param("attemptId").isMongoId().withMessage("Invalid attempt ID"), body("answers").isArray({ min: 1 }).withMessage("Answers are required")],
  validateRequest,
  submitExam,
);

router.get("/my-attempts", getStudentAttempts);

// Anti-cheat
router.post(
  "/anti-cheat/tab-switch",
  [body("sessionToken").trim().notEmpty().withMessage("Session token is required")],
  validateRequest,
  reportTabSwitch,
);

// Analytics
router.get("/templates/:examTemplateId/analytics", authorize([UserRole.TEACHER, UserRole.SCHOOL, UserRole.ADMIN, UserRole.SUPER_ADMIN]), getExamAnalytics);

// Exam Reviews
router.post(
  "/reviews",
  authorize([UserRole.STUDENT, UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  [body("examAttemptId").isMongoId().withMessage("Invalid attempt ID"), body("originalScore").isNumeric().withMessage("Original score is required")],
  validateRequest,
  createExamReview,
);

router.get("/templates/:examTemplateId/reviews", authorize([UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN]), getExamReviews);

router.put(
  "/reviews/:id",
  authorize([UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  [param("id").isMongoId().withMessage("Invalid review ID")],
  validateRequest,
  updateExamReview,
);

export default router;
