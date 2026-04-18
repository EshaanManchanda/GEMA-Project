import mongoose, { Schema, model, Document } from "mongoose";

export enum ExamType {
  MULTIPLE_CHOICE = "multiple_choice",
  TRUE_FALSE = "true_false",
  SHORT_ANSWER = "short_answer",
  ESSAY = "essay",
  FILL_BLANK = "fill_blank",
  MATCHING = "matching",
  ORDERING = "ordering",
}

export enum ExamDifficulty {
  EASY = "easy",
  MEDIUM = "medium",
  HARD = "hard",
}

export interface IExamTemplate extends Document {
  courseId?: mongoose.Types.ObjectId;
  schoolId?: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;
  title: string;
  slug: string;
  description?: string;
  type: ExamType;
  difficulty: ExamDifficulty;
  totalPoints: number;
  passingScore: number;
  timeLimit?: number; // minutes
  attemptsAllowed: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showResults: boolean;
  showCorrectAnswers: boolean;
  requireWebcam: boolean;
  requireScreenShare: boolean;
  allowCopyPaste: boolean;
  allowTabSwitch: boolean;
  maxTabSwitches: number;
  isPublished: boolean;
  scheduledAt?: Date;
  closesAt?: Date;
  tags: string[];
  stats: {
    totalAttempts: number;
    averageScore: number;
    passRate: number;
    averageTimeSpent: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ExamTemplateSchema = new Schema<IExamTemplate>(
  {
    courseId: { type: Schema.Types.ObjectId, ref: "Course" },
    schoolId: { type: Schema.Types.ObjectId, ref: "School" },
    teacherId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: String,
    type: { type: String, enum: Object.values(ExamType), required: true },
    difficulty: { type: String, enum: Object.values(ExamDifficulty), default: ExamDifficulty.MEDIUM },
    totalPoints: { type: Number, default: 0 },
    passingScore: { type: Number, default: 70 },
    timeLimit: Number,
    attemptsAllowed: { type: Number, default: 1 },
    shuffleQuestions: { type: Boolean, default: false },
    shuffleOptions: { type: Boolean, default: false },
    showResults: { type: Boolean, default: true },
    showCorrectAnswers: { type: Boolean, default: false },
    requireWebcam: { type: Boolean, default: false },
    requireScreenShare: { type: Boolean, default: false },
    allowCopyPaste: { type: Boolean, default: true },
    allowTabSwitch: { type: Boolean, default: true },
    maxTabSwitches: { type: Number, default: 5 },
    isPublished: { type: Boolean, default: false },
    scheduledAt: Date,
    closesAt: Date,
    tags: [String],
    stats: {
      totalAttempts: { type: Number, default: 0 },
      averageScore: { type: Number, default: 0 },
      passRate: { type: Number, default: 0 },
      averageTimeSpent: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

ExamTemplateSchema.index({ teacherId: 1, isPublished: 1 });
ExamTemplateSchema.index({ courseId: 1, isPublished: 1 });
ExamTemplateSchema.index({ schoolId: 1, isPublished: 1 });
ExamTemplateSchema.index({ slug: 1 });
ExamTemplateSchema.index({ difficulty: 1, type: 1 });

const ExamTemplate = model<IExamTemplate>("ExamTemplate", ExamTemplateSchema);
export default ExamTemplate;
