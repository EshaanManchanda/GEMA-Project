import mongoose from "mongoose";
import ExamTemplate from "./exam-template.model";
import Question from "./question.model";
import QuestionBank from "./question-bank.model";
import ExamAttempt, { ExamAttemptStatus } from "./exam-attempt.model";
import ExamSession from "./exam-session.model";
import ExamInvitation from "./exam-invitation.model";
import ExamAnalytics from "./exam-analytics.model";
import ExamReview from "./exam-review.model";
import { AppError } from "../../middleware/index";
import crypto from "crypto";

export interface CreateExamTemplateInput {
  courseId?: string;
  schoolId?: string;
  teacherId: string;
  title: string;
  description?: string;
  type: string;
  difficulty?: string;
  totalPoints?: number;
  passingScore?: number;
  timeLimit?: number;
  attemptsAllowed?: number;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  showResults?: boolean;
  showCorrectAnswers?: boolean;
  requireWebcam?: boolean;
  requireScreenShare?: boolean;
  allowCopyPaste?: boolean;
  allowTabSwitch?: boolean;
  maxTabSwitches?: number;
  scheduledAt?: string;
  closesAt?: string;
  tags?: string[];
}

export interface CreateQuestionInput {
  examTemplateId?: string;
  questionBankId?: string;
  text: string;
  type: string;
  points?: number;
  options?: string[];
  correctAnswer: any;
  explanation?: string;
  difficulty?: string;
  tags?: string[];
  mediaUrl?: string;
  order?: number;
}

export interface SubmitExamInput {
  answers: Array<{
    questionId: string;
    answer: any;
    timeSpent?: number;
  }>;
  tabSwitches?: number;
  copyPasteEvents?: number;
}

class ExaminationsService {
  // Exam Templates
  async createExamTemplate(input: CreateExamTemplateInput) {
    const slug = input.title.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-") + "-" + Date.now();
    const template = await ExamTemplate.create({ ...input, slug });
    return template;
  }

  async getExamTemplate(id: string) {
    const template = await ExamTemplate.findById(id).populate("teacherId", "firstName lastName").populate("courseId", "title").populate("schoolId", "schoolName");
    if (!template) throw new AppError("Exam template not found", 404);
    return template;
  }

  async getExamTemplates(query: any) {
    const { page = 1, limit = 20, teacherId, courseId, schoolId, type, difficulty, isPublished } = query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const filter: any = {};
    if (teacherId) filter.teacherId = teacherId;
    if (courseId) filter.courseId = courseId;
    if (schoolId) filter.schoolId = schoolId;
    if (type) filter.type = type;
    if (difficulty) filter.difficulty = difficulty;
    if (isPublished !== undefined) filter.isPublished = isPublished === "true";

    const [templates, total] = await Promise.all([
      ExamTemplate.find(filter).populate("teacherId", "firstName lastName").sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      ExamTemplate.countDocuments(filter),
    ]);

    return { templates, pagination: { currentPage: pageNum, totalPages: Math.ceil(total / limitNum), total } };
  }

  async updateExamTemplate(id: string, input: Partial<CreateExamTemplateInput>) {
    const template = await ExamTemplate.findByIdAndUpdate(id, input, { new: true, runValidators: true });
    if (!template) throw new AppError("Exam template not found", 404);
    return template;
  }

  async deleteExamTemplate(id: string) {
    const template = await ExamTemplate.findByIdAndDelete(id);
    if (!template) throw new AppError("Exam template not found", 404);
    await Question.deleteMany({ examTemplateId: id });
    return template;
  }

  // Questions
  async createQuestion(input: CreateQuestionInput) {
    const question = await Question.create(input);
    if (input.examTemplateId) {
      await ExamTemplate.findByIdAndUpdate(input.examTemplateId, { $inc: { totalPoints: input.points || 1 } });
    }
    if (input.questionBankId) {
      await QuestionBank.findByIdAndUpdate(input.questionBankId, { $inc: { questionCount: 1 } });
    }
    return question;
  }

  async getQuestions(examTemplateId: string, includeAnswers = false) {
    const query: any = { examTemplateId };
    const select = includeAnswers ? "" : "-correctAnswer -explanation";
    return Question.find(query).select(select).sort({ order: 1 });
  }

  async updateQuestion(id: string, input: Partial<CreateQuestionInput>) {
    const question = await Question.findByIdAndUpdate(id, input, { new: true, runValidators: true });
    if (!question) throw new AppError("Question not found", 404);
    return question;
  }

  async deleteQuestion(id: string) {
    const question = await Question.findById(id);
    if (!question) throw new AppError("Question not found", 404);
    if (question.examTemplateId) {
      await ExamTemplate.findByIdAndUpdate(question.examTemplateId, { $inc: { totalPoints: -(question.points || 1) } });
    }
    await Question.findByIdAndDelete(id);
    return question;
  }

  // Question Banks
  async createQuestionBank(input: { name: string; description?: string; teacherId: string; courseId?: string; schoolId?: string; tags?: string[] }) {
    return QuestionBank.create(input);
  }

  async getQuestionBanks(query: any) {
    const { page = 1, limit = 20, teacherId, courseId } = query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const filter: any = { isActive: true };
    if (teacherId) filter.teacherId = teacherId;
    if (courseId) filter.courseId = courseId;

    const [banks, total] = await Promise.all([
      QuestionBank.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      QuestionBank.countDocuments(filter),
    ]);

    return { banks, pagination: { currentPage: pageNum, totalPages: Math.ceil(total / limitNum), total } };
  }

  // Exam Attempts
  async startExam(examTemplateId: string, studentId: string, ipAddress: string, userAgent: string) {
    const template = await ExamTemplate.findById(examTemplateId);
    if (!template) throw new AppError("Exam template not found", 404);
    if (!template.isPublished) throw new AppError("Exam is not published", 400);

    const existingAttempts = await ExamAttempt.countDocuments({ examTemplateId, studentId });
    if (existingAttempts >= template.attemptsAllowed) throw new AppError("Maximum attempts reached", 400);

    const existing = await ExamAttempt.findOne({ examTemplateId, studentId, status: "in_progress" });
    if (existing) return existing;

    const attempt = await ExamAttempt.create({
      examTemplateId,
      studentId,
      status: "in_progress",
      maxScore: template.totalPoints,
      attemptNumber: existingAttempts + 1,
      ipAddress,
      userAgent,
    });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = template.timeLimit ? new Date(Date.now() + template.timeLimit * 60 * 1000) : new Date(Date.now() + 24 * 60 * 60 * 1000);

    await ExamSession.create({
      examTemplateId,
      studentId,
      attemptId: attempt._id,
      token,
      expiresAt,
      ipAddress,
      deviceInfo: { browser: userAgent.split(" ")[0], os: "unknown", screenResolution: "unknown" },
      proctoringData: {
        webcamEnabled: template.requireWebcam,
        screenShareEnabled: template.requireScreenShare,
        tabSwitchCount: 0,
        copyPasteCount: 0,
        idleTime: 0,
        suspiciousActivityCount: 0,
        snapshots: [],
      },
    });

    return { attempt, sessionToken: token, timeLimit: template.timeLimit };
  }

  async submitExam(attemptId: string, input: SubmitExamInput) {
    const attempt = await ExamAttempt.findById(attemptId).populate("examTemplateId");
    if (!attempt) throw new AppError("Exam attempt not found", 404);
    if (attempt.status !== "in_progress") throw new AppError("Exam already submitted", 400);

    const template = attempt.examTemplateId as any;
    const questions = await Question.find({ examTemplateId: template._id });
    const questionMap = new Map(questions.map((q) => [q._id.toString(), q]));

    let totalScore = 0;
    const answers = input.answers.map((a) => {
      const question = questionMap.get(a.questionId);
      if (!question) return { ...a, isCorrect: false, pointsEarned: 0 };

      let isCorrect = false;
      if (Array.isArray(question.correctAnswer)) {
        isCorrect = JSON.stringify([...(a.answer as string[])].sort()) === JSON.stringify([...question.correctAnswer].sort());
      } else {
        isCorrect = JSON.stringify(a.answer) === JSON.stringify(question.correctAnswer);
      }

      const pointsEarned = isCorrect ? question.points : 0;
      totalScore += pointsEarned;
      return { ...a, isCorrect, pointsEarned };
    });

    const percentage = template.totalPoints > 0 ? Math.round((totalScore / template.totalPoints) * 100) : 0;
    const passed = percentage >= template.passingScore;
    const timeSpent = Math.round((Date.now() - attempt.startedAt.getTime()) / 1000);

    // Anti-cheat checks
    const flagged = input.tabSwitches > template.maxTabSwitches || input.copyPasteEvents > 10;
    const flagReasons: string[] = [];
    if (input.tabSwitches > template.maxTabSwitches) flagReasons.push(`Excessive tab switches: ${input.tabSwitches}`);
    if (input.copyPasteEvents > 10) flagReasons.push(`Excessive copy-paste events: ${input.copyPasteEvents}`);

    attempt.answers = answers as any;
    attempt.totalScore = totalScore;
    attempt.percentage = percentage;
    attempt.passed = passed;
    attempt.submittedAt = new Date();
    attempt.timeSpent = timeSpent;
    attempt.status = flagged ? ExamAttemptStatus.FLAGGED : ExamAttemptStatus.SUBMITTED;
    attempt.tabSwitches = input.tabSwitches || 0;
    attempt.copyPasteEvents = input.copyPasteEvents || 0;
    attempt.flagged = flagged;
    attempt.flagReasons = flagReasons;
    await attempt.save();

    // Update session
    await ExamSession.findOneAndUpdate({ attemptId }, { status: "completed" });

    // Update analytics
    await this.updateExamAnalytics(template._id);

    // Update exam template stats
    await ExamTemplate.findByIdAndUpdate(template._id, {
      $inc: { "stats.totalAttempts": 1 },
      $set: {
        "stats.averageScore": ((template.stats.averageScore * (template.stats.totalAttempts - 1) + percentage) / template.stats.totalAttempts),
        "stats.passRate": ((template.stats.passRate * (template.stats.totalAttempts - 1) + (passed ? 100 : 0)) / template.stats.totalAttempts),
      },
    });

    return { attempt: { ...attempt.toObject(), showCorrectAnswers: template.showCorrectAnswers ? answers : undefined } };
  }

  async reportTabSwitch(sessionToken: string) {
    const session = await ExamSession.findOne({ token: sessionToken, status: "active" });
    if (!session) return;
    session.proctoringData.tabSwitchCount += 1;
    session.lastActivityAt = new Date();
    if (session.proctoringData.tabSwitchCount >= 5) {
      session.proctoringData.suspiciousActivityCount += 1;
      session.proctoringData.snapshots.push({ timestamp: new Date(), reason: "Excessive tab switching" });
    }
    await session.save();
  }

  async getStudentAttempts(studentId: string, query: any) {
    const { page = 1, limit = 20, courseId } = query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const filter: any = { studentId };
    if (courseId) filter.courseId = courseId;

    const [attempts, total] = await Promise.all([
      ExamAttempt.find(filter).populate("examTemplateId", "title type difficulty").sort({ startedAt: -1 }).skip(skip).limit(limitNum),
      ExamAttempt.countDocuments(filter),
    ]);

    return { attempts, pagination: { currentPage: pageNum, totalPages: Math.ceil(total / limitNum), total } };
  }

  async getExamAnalytics(examTemplateId: string) {
    let analytics = await ExamAnalytics.findOne({ examTemplateId });
    if (!analytics) {
      analytics = await this.updateExamAnalytics(examTemplateId);
    }
    return analytics;
  }

  private async updateExamAnalytics(examTemplateId: string) {
    const attempts = await ExamAttempt.find({ examTemplateId, status: { $in: ["submitted", "graded"] } });
    if (attempts.length === 0) {
      return ExamAnalytics.findOneAndUpdate(
        { examTemplateId },
        { examTemplateId, updatedAt: new Date() },
        { upsert: true, new: true },
      );
    }

    const scores = attempts.map((a) => a.percentage);
    const sorted = [...scores].sort((a, b) => a - b);
    const median = sorted.length % 2 === 0 ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2 : sorted[Math.floor(sorted.length / 2)];

    const distribution = { "0-20": 0, "21-40": 0, "41-60": 0, "61-80": 0, "81-100": 0 };
    scores.forEach((s) => {
      if (s <= 20) distribution["0-20"]++;
      else if (s <= 40) distribution["21-40"]++;
      else if (s <= 60) distribution["41-60"]++;
      else if (s <= 80) distribution["61-80"]++;
      else distribution["81-100"]++;
    });

    return ExamAnalytics.findOneAndUpdate(
      { examTemplateId },
      {
        examTemplateId,
        totalAttempts: attempts.length,
        completedAttempts: attempts.filter((a) => a.status === "submitted" || a.status === "graded").length,
        averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
        medianScore: median,
        highestScore: Math.max(...scores),
        lowestScore: Math.min(...scores),
        passRate: (attempts.filter((a) => a.passed).length / attempts.length) * 100,
        averageTimeSpent: attempts.reduce((a, b) => a + b.timeSpent, 0) / attempts.length,
        flaggedAttempts: attempts.filter((a) => a.flagged).length,
        scoreDistribution: distribution,
        updatedAt: new Date(),
      },
      { upsert: true, new: true },
    );
  }

  // Exam Reviews
  async createExamReview(input: { examAttemptId: string; examTemplateId: string; studentId: string; reviewerId: string; originalScore: number; feedback?: string }) {
    return ExamReview.create(input);
  }

  async getExamReviews(examTemplateId: string, query: any) {
    const { page = 1, limit = 20, status } = query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const filter: any = { examTemplateId };
    if (status) filter.status = status;

    const [reviews, total] = await Promise.all([
      ExamReview.find(filter).populate("studentId", "firstName lastName").populate("reviewerId", "firstName lastName").sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      ExamReview.countDocuments(filter),
    ]);

    return { reviews, pagination: { currentPage: pageNum, totalPages: Math.ceil(total / limitNum), total } };
  }

  async updateExamReview(id: string, input: { adjustedScore?: number; feedback?: string; resolution?: string; status?: string; resolvedBy?: string }) {
    const review = await ExamReview.findByIdAndUpdate(id, {
      ...input,
      resolvedAt: input.status === "resolved" ? new Date() : undefined,
      resolvedBy: input.resolvedBy ? new mongoose.Types.ObjectId(input.resolvedBy) : undefined,
    }, { new: true });
    if (!review) throw new AppError("Exam review not found", 404);
    return review;
  }
}

export const examinationsService = new ExaminationsService();
