import { Request, Response } from "express";
import { examinationsService } from "./examinations.service";
import { catchAsync } from "../../middleware/index";
import { AuthRequest } from "../../types/index";

// Exam Templates
export const createExamTemplate = catchAsync(async (req: AuthRequest, res: Response) => {
  const template = await examinationsService.createExamTemplate({ ...req.body, teacherId: req.user?._id.toString() || "" });
  res.status(201).json({ success: true, message: "Exam template created", data: { template } });
});

export const getExamTemplates = catchAsync(async (req: Request, res: Response) => {
  const result = await examinationsService.getExamTemplates(req.query);
  res.json({ success: true, ...result });
});

export const getExamTemplate = catchAsync(async (req: Request, res: Response) => {
  const template = await examinationsService.getExamTemplate(req.params.id);
  res.json({ success: true, data: { template } });
});

export const updateExamTemplate = catchAsync(async (req: AuthRequest, res: Response) => {
  const template = await examinationsService.updateExamTemplate(req.params.id, req.body);
  res.json({ success: true, message: "Exam template updated", data: { template } });
});

export const deleteExamTemplate = catchAsync(async (req: AuthRequest, res: Response) => {
  await examinationsService.deleteExamTemplate(req.params.id);
  res.json({ success: true, message: "Exam template deleted" });
});

// Questions
export const createQuestion = catchAsync(async (req: AuthRequest, res: Response) => {
  const question = await examinationsService.createQuestion(req.body);
  res.status(201).json({ success: true, message: "Question created", data: { question } });
});

export const getQuestions = catchAsync(async (req: Request, res: Response) => {
  const includeAnswers = req.query.includeAnswers === "true";
  const questions = await examinationsService.getQuestions(req.params.examTemplateId, includeAnswers);
  res.json({ success: true, data: { questions } });
});

export const updateQuestion = catchAsync(async (req: AuthRequest, res: Response) => {
  const question = await examinationsService.updateQuestion(req.params.id, req.body);
  res.json({ success: true, message: "Question updated", data: { question } });
});

export const deleteQuestion = catchAsync(async (req: AuthRequest, res: Response) => {
  await examinationsService.deleteQuestion(req.params.id);
  res.json({ success: true, message: "Question deleted" });
});

// Question Banks
export const createQuestionBank = catchAsync(async (req: AuthRequest, res: Response) => {
  const bank = await examinationsService.createQuestionBank({ ...req.body, teacherId: req.user?._id.toString() || "" });
  res.status(201).json({ success: true, message: "Question bank created", data: { bank } });
});

export const getQuestionBanks = catchAsync(async (req: Request, res: Response) => {
  const result = await examinationsService.getQuestionBanks(req.query);
  res.json({ success: true, ...result });
});

// Exam Attempts
export const startExam = catchAsync(async (req: AuthRequest, res: Response) => {
  const result = await examinationsService.startExam(req.params.examTemplateId, req.user?._id.toString() || "", req.ip || "", req.headers["user-agent"] || "");
  res.json({ success: true, message: "Exam started", data: result });
});

export const submitExam = catchAsync(async (req: AuthRequest, res: Response) => {
  const result = await examinationsService.submitExam(req.params.attemptId, req.body);
  res.json({ success: true, message: "Exam submitted", data: result });
});

export const getStudentAttempts = catchAsync(async (req: AuthRequest, res: Response) => {
  const result = await examinationsService.getStudentAttempts(req.user?._id.toString() || "", req.query);
  res.json({ success: true, ...result });
});

// Anti-cheat
export const reportTabSwitch = catchAsync(async (req: AuthRequest, res: Response) => {
  await examinationsService.reportTabSwitch(req.body.sessionToken);
  res.json({ success: true });
});

// Analytics
export const getExamAnalytics = catchAsync(async (req: Request, res: Response) => {
  const analytics = await examinationsService.getExamAnalytics(req.params.examTemplateId);
  res.json({ success: true, data: { analytics } });
});

// Exam Reviews
export const createExamReview = catchAsync(async (req: AuthRequest, res: Response) => {
  const review = await examinationsService.createExamReview({ ...req.body, reviewerId: req.user?._id.toString() || "" });
  res.status(201).json({ success: true, message: "Exam review created", data: { review } });
});

export const getExamReviews = catchAsync(async (req: Request, res: Response) => {
  const result = await examinationsService.getExamReviews(req.params.examTemplateId, req.query);
  res.json({ success: true, ...result });
});

export const updateExamReview = catchAsync(async (req: AuthRequest, res: Response) => {
  const review = await examinationsService.updateExamReview(req.params.id, { ...req.body, resolvedBy: req.user?._id.toString() || "" });
  res.json({ success: true, message: "Exam review updated", data: { review } });
});
