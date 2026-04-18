import mongoose, { Schema, model, Document } from "mongoose";

export interface IExamAnalytics extends Document {
  examTemplateId: mongoose.Types.ObjectId;
  courseId?: mongoose.Types.ObjectId;
  totalAttempts: number;
  completedAttempts: number;
  averageScore: number;
  medianScore: number;
  highestScore: number;
  lowestScore: number;
  passRate: number;
  averageTimeSpent: number;
  flaggedAttempts: number;
  questionAnalytics: Array<{
    questionId: mongoose.Types.ObjectId;
    correctAnswers: number;
    incorrectAnswers: number;
    averageTimeSpent: number;
    difficulty: "easy" | "medium" | "hard";
  }>;
  scoreDistribution: {
    "0-20": number;
    "21-40": number;
    "41-60": number;
    "61-80": number;
    "81-100": number;
  };
  updatedAt: Date;
}

const ExamAnalyticsSchema = new Schema<IExamAnalytics>(
  {
    examTemplateId: { type: Schema.Types.ObjectId, ref: "ExamTemplate", required: true, unique: true },
    courseId: { type: Schema.Types.ObjectId, ref: "Course" },
    totalAttempts: { type: Number, default: 0 },
    completedAttempts: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 },
    medianScore: { type: Number, default: 0 },
    highestScore: { type: Number, default: 0 },
    lowestScore: { type: Number, default: 0 },
    passRate: { type: Number, default: 0 },
    averageTimeSpent: { type: Number, default: 0 },
    flaggedAttempts: { type: Number, default: 0 },
    questionAnalytics: [
      {
        questionId: { type: Schema.Types.ObjectId, ref: "Question" },
        correctAnswers: { type: Number, default: 0 },
        incorrectAnswers: { type: Number, default: 0 },
        averageTimeSpent: { type: Number, default: 0 },
        difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "medium" },
      },
    ],
    scoreDistribution: {
      "0-20": { type: Number, default: 0 },
      "21-40": { type: Number, default: 0 },
      "41-60": { type: Number, default: 0 },
      "61-80": { type: Number, default: 0 },
      "81-100": { type: Number, default: 0 },
    },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

ExamAnalyticsSchema.index({ examTemplateId: 1 });
ExamAnalyticsSchema.index({ courseId: 1 });

const ExamAnalytics = model<IExamAnalytics>("ExamAnalytics", ExamAnalyticsSchema);
export default ExamAnalytics;
