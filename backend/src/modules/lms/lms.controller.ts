import { Request, Response } from "express";
import { lmsService } from "./lms.service";
import { catchAsync } from "../../middleware/index";
import { AuthRequest } from "../../types/index";
import Student from "../students/student.model";

// Course
export const createCourse = catchAsync(async (req: AuthRequest, res: Response) => {
  const course = await lmsService.createCourse({ ...req.body, teacherId: req.user?._id.toString() || "" });
  res.status(201).json({ success: true, message: "Course created", data: { course } });
});

export const getCourses = catchAsync(async (req: Request, res: Response) => {
  const result = await lmsService.getCourses(req.query);
  res.json({ success: true, ...result });
});

export const getCourse = catchAsync(async (req: Request, res: Response) => {
  const course = await lmsService.getCourseById(req.params.id);
  res.json({ success: true, data: { course } });
});

export const updateCourse = catchAsync(async (req: AuthRequest, res: Response) => {
  const course = await lmsService.updateCourse(req.params.id, req.body);
  res.json({ success: true, message: "Course updated", data: { course } });
});

export const deleteCourse = catchAsync(async (req: AuthRequest, res: Response) => {
  await lmsService.deleteCourse(req.params.id);
  res.json({ success: true, message: "Course archived" });
});

// Enrollment
export const enrollInCourse = catchAsync(async (req: AuthRequest, res: Response) => {
  const student = await Student.findOne({ userId: req.user?._id });
  if (!student) throw new Error("Student profile not found");
  const enrollment = await lmsService.enrollStudent(req.params.courseId, student._id.toString());
  res.status(201).json({ success: true, message: "Enrolled successfully", data: { enrollment } });
});

export const getCourseEnrollments = catchAsync(async (req: Request, res: Response) => {
  const result = await lmsService.getEnrollments(req.params.courseId, req.query);
  res.json({ success: true, ...result });
});

// Lessons
export const createLesson = catchAsync(async (req: AuthRequest, res: Response) => {
  const lesson = await lmsService.createLesson(req.body);
  res.status(201).json({ success: true, message: "Lesson created", data: { lesson } });
});

export const getLessons = catchAsync(async (req: Request, res: Response) => {
  const lessons = await lmsService.getLessons(req.params.courseId);
  res.json({ success: true, data: { lessons } });
});

export const updateLesson = catchAsync(async (req: AuthRequest, res: Response) => {
  const lesson = await lmsService.updateLesson(req.params.id, req.body);
  res.json({ success: true, message: "Lesson updated", data: { lesson } });
});

export const deleteLesson = catchAsync(async (req: AuthRequest, res: Response) => {
  await lmsService.deleteLesson(req.params.id);
  res.json({ success: true, message: "Lesson deleted" });
});

// Quizzes
export const createQuiz = catchAsync(async (req: AuthRequest, res: Response) => {
  const quiz = await lmsService.createQuiz(req.body);
  res.status(201).json({ success: true, message: "Quiz created", data: { quiz } });
});

export const getQuizzes = catchAsync(async (req: Request, res: Response) => {
  const quizzes = await lmsService.getQuizzes(req.params.courseId);
  res.json({ success: true, data: { quizzes } });
});

export const submitQuiz = catchAsync(async (req: AuthRequest, res: Response) => {
  const student = await Student.findOne({ userId: req.user?._id });
  if (!student) throw new Error("Student profile not found");
  const attempt = await lmsService.submitQuiz(req.params.quizId, student._id.toString(), req.body.answers);
  res.json({ success: true, message: `Quiz submitted: ${attempt.percentage}% ${attempt.passed ? "(Passed)" : "(Failed)"}`, data: { attempt } });
});

// Assignments
export const createAssignment = catchAsync(async (req: AuthRequest, res: Response) => {
  const assignment = await lmsService.createAssignment(req.body);
  res.status(201).json({ success: true, message: "Assignment created", data: { assignment } });
});

export const getAssignments = catchAsync(async (req: Request, res: Response) => {
  const assignments = await lmsService.getAssignments(req.params.courseId);
  res.json({ success: true, data: { assignments } });
});

export const submitAssignment = catchAsync(async (req: AuthRequest, res: Response) => {
  const student = await Student.findOne({ userId: req.user?._id });
  if (!student) throw new Error("Student profile not found");
  const submission = await lmsService.submitAssignment(req.params.assignmentId, student._id.toString(), req.body.content, req.body.attachments);
  res.status(201).json({ success: true, message: "Assignment submitted", data: { submission } });
});

export const gradeSubmission = catchAsync(async (req: AuthRequest, res: Response) => {
  const { score, feedback } = req.body;
  const submission = await lmsService.gradeSubmission(req.params.submissionId, score, req.user?._id.toString() || "", feedback);
  res.json({ success: true, message: "Submission graded", data: { submission } });
});

// Progress
export const getStudentProgress = catchAsync(async (req: AuthRequest, res: Response) => {
  const student = await Student.findOne({ userId: req.user?._id });
  if (!student) throw new Error("Student profile not found");
  const progress = await lmsService.getStudentProgress(req.params.courseId, student._id.toString());
  res.json({ success: true, data: { progress } });
});
