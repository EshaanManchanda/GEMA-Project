import Course from "./course.model";
import Lesson from "./lesson.model";
import Quiz from "./quiz.model";
import QuizAttempt from "./quiz-attempt.model";
import Assignment from "./assignment.model";
import AssignmentSubmission from "./assignment-submission.model";
import CourseEnrollment from "./course-enrollment.model";
import { AppError } from "../../middleware/index";

export interface CreateCourseInput {
  schoolId?: string;
  teacherId: string;
  title: string;
  description: string;
  category: string;
  gradeLevel: string;
  credits?: number;
  duration?: { weeks: number; hoursPerWeek: number };
  pricing?: { type: string; amount?: number; currency?: string };
  enrollment: { maxStudents?: number; startDate: string; endDate: string; enrollmentOpen?: boolean };
}

export interface CreateLessonInput {
  courseId: string;
  moduleId?: string;
  title: string;
  description?: string;
  type: string;
  content: any;
  order: number;
  isPreview?: boolean;
  isPublished?: boolean;
  duration?: number;
}

export interface CreateQuizInput {
  courseId: string;
  lessonId?: string;
  title: string;
  description?: string;
  type: string;
  questions: any[];
  totalPoints?: number;
  passingScore?: number;
  timeLimit?: number;
  attemptsAllowed?: number;
}

export interface CreateAssignmentInput {
  courseId: string;
  lessonId?: string;
  title: string;
  description: string;
  instructions?: string;
  dueDate: string;
  maxScore?: number;
  attachments?: Array<{ name: string; url: string }>;
  allowLateSubmission?: boolean;
  latePenalty?: number;
}

class LMSService {
  // Course CRUD
  async createCourse(input: CreateCourseInput) {
    const slug = input.title.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
    const existing = await Course.findOne({ slug });
    if (existing) throw new AppError("Course with this title already exists", 400);

    const course = await Course.create({
      ...input,
      slug,
      enrollment: { ...input.enrollment, startDate: new Date(input.enrollment.startDate), endDate: new Date(input.enrollment.endDate) },
    });
    return course;
  }

  async getCourseById(id: string) {
    const course = await Course.findById(id).populate("teacherId", "firstName lastName").populate("schoolId", "schoolName");
    if (!course) throw new AppError("Course not found", 404);
    return course;
  }

  async getCourses(query: any) {
    const { page = 1, limit = 20, search, category, gradeLevel, status, teacherId, schoolId } = query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const filter: any = {};
    if (search) filter.title = { $regex: search, $options: "i" };
    if (category) filter.category = category;
    if (gradeLevel) filter.gradeLevel = gradeLevel;
    if (status) filter.status = status;
    if (teacherId) filter.teacherId = teacherId;
    if (schoolId) filter.schoolId = schoolId;

    const [courses, total] = await Promise.all([
      Course.find(filter).populate("teacherId", "firstName lastName").sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      Course.countDocuments(filter),
    ]);

    return { courses, pagination: { currentPage: pageNum, totalPages: Math.ceil(total / limitNum), total } };
  }

  async updateCourse(id: string, input: Partial<CreateCourseInput>) {
    const course = await Course.findByIdAndUpdate(id, input, { new: true, runValidators: true });
    if (!course) throw new AppError("Course not found", 404);
    return course;
  }

  async deleteCourse(id: string) {
    const course = await Course.findByIdAndUpdate(id, { status: "archived" }, { new: true });
    if (!course) throw new AppError("Course not found", 404);
    return course;
  }

  // Enrollment
  async enrollStudent(courseId: string, studentId: string, paymentStatus: string = "free") {
    const course = await Course.findById(courseId);
    if (!course) throw new AppError("Course not found", 404);
    if (course.enrollment.maxStudents && course.enrollment.enrolledCount >= course.enrollment.maxStudents) {
      throw new AppError("Course is full", 400);
    }

    const existing = await CourseEnrollment.findOne({ courseId, studentId });
    if (existing) throw new AppError("Student is already enrolled", 400);

    const enrollment = await CourseEnrollment.create({ courseId, studentId, paymentStatus });
    await Course.findByIdAndUpdate(courseId, { $inc: { "enrollment.enrolledCount": 1, "stats.totalStudents": 1 } });
    return enrollment;
  }

  async getEnrollments(courseId: string, query: any) {
    const { page = 1, limit = 20, status } = query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const filter: any = { courseId };
    if (status) filter.status = status;

    const [enrollments, total] = await Promise.all([
      CourseEnrollment.find(filter).populate("studentId", "firstName lastName studentId grade").sort({ enrolledAt: -1 }).skip(skip).limit(limitNum),
      CourseEnrollment.countDocuments(filter),
    ]);

    return { enrollments, pagination: { currentPage: pageNum, totalPages: Math.ceil(total / limitNum), total } };
  }

  // Lessons
  async createLesson(input: CreateLessonInput) {
    const lesson = await Lesson.create(input);
    return lesson;
  }

  async getLessons(courseId: string) {
    return Lesson.find({ courseId, isPublished: true }).sort({ order: 1 });
  }

  async updateLesson(id: string, input: Partial<CreateLessonInput>) {
    const lesson = await Lesson.findByIdAndUpdate(id, input, { new: true, runValidators: true });
    if (!lesson) throw new AppError("Lesson not found", 404);
    return lesson;
  }

  async deleteLesson(id: string) {
    const lesson = await Lesson.findByIdAndDelete(id);
    if (!lesson) throw new AppError("Lesson not found", 404);
    return lesson;
  }

  // Quizzes
  async createQuiz(input: CreateQuizInput) {
    const totalPoints = input.questions.reduce((sum, q) => sum + (q.points || 1), 0);
    const quiz = await Quiz.create({ ...input, totalPoints });
    return quiz;
  }

  async getQuizzes(courseId: string) {
    return Quiz.find({ courseId, isPublished: true });
  }

  async submitQuiz(quizId: string, studentId: string, answers: any[]) {
    const quiz = await Quiz.findById(quizId);
    if (!quiz) throw new AppError("Quiz not found", 404);

    const attemptCount = await QuizAttempt.countDocuments({ quizId, studentId });
    if (attemptCount >= quiz.attemptsAllowed) throw new AppError("Maximum attempts reached", 400);

    let totalScore = 0;
    const gradedAnswers = answers.map((a) => {
      const question = quiz.questions[a.questionIndex];
      if (!question) return { ...a, isCorrect: false, pointsEarned: 0 };

      const isCorrect = Array.isArray(question.correctAnswer)
        ? JSON.stringify([...a.answer].sort()) === JSON.stringify([...question.correctAnswer].sort())
        : a.answer === question.correctAnswer;

      const pointsEarned = isCorrect ? question.points : 0;
      totalScore += pointsEarned;
      return { ...a, isCorrect, pointsEarned };
    });

    const percentage = quiz.totalPoints > 0 ? Math.round((totalScore / quiz.totalPoints) * 100) : 0;
    const passed = percentage >= quiz.passingScore;

    const attempt = await QuizAttempt.create({
      quizId,
      studentId,
      answers: gradedAnswers,
      totalScore,
      maxScore: quiz.totalPoints,
      percentage,
      passed,
      submittedAt: new Date(),
      attemptNumber: attemptCount + 1,
    });

    return attempt;
  }

  // Assignments
  async createAssignment(input: CreateAssignmentInput) {
    const assignment = await Assignment.create({ ...input, dueDate: new Date(input.dueDate) });
    return assignment;
  }

  async getAssignments(courseId: string) {
    return Assignment.find({ courseId }).sort({ dueDate: 1 });
  }

  async submitAssignment(assignmentId: string, studentId: string, content?: string, attachments?: any[]) {
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) throw new AppError("Assignment not found", 404);

    const existing = await AssignmentSubmission.findOne({ assignmentId, studentId });
    if (existing) throw new AppError("Assignment already submitted", 400);

    const isLate = new Date() > assignment.dueDate;
    const submission = await AssignmentSubmission.create({
      assignmentId,
      studentId,
      content,
      attachments,
      status: isLate && !assignment.allowLateSubmission ? "not_submitted" : isLate ? "late" : "submitted",
      submittedAt: new Date(),
      isLate,
    });

    return submission;
  }

  async gradeSubmission(submissionId: string, score: number, gradedBy: string, feedback?: string) {
    const submission = await AssignmentSubmission.findByIdAndUpdate(
      submissionId,
      { score, feedback, gradedBy, gradedAt: new Date(), status: "graded" },
      { new: true },
    );
    if (!submission) throw new AppError("Submission not found", 404);
    return submission;
  }

  // Progress
  async getStudentProgress(courseId: string, studentId: string) {
    const enrollment = await CourseEnrollment.findOne({ courseId, studentId });
    if (!enrollment) throw new AppError("Not enrolled in this course", 404);

    const totalLessons = await Lesson.countDocuments({ courseId, isPublished: true });
    const completedQuizzes = await QuizAttempt.countDocuments({ studentId, quizId: { $in: (await Quiz.find({ courseId }).distinct("_id")) } });

    return {
      enrollment,
      totalLessons,
      completedQuizzes,
      progress: enrollment.progress,
      grade: enrollment.grade,
    };
  }
}

export const lmsService = new LMSService();
