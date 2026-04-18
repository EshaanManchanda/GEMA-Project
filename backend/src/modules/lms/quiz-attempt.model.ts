import mongoose, { Schema, model, Document } from "mongoose";

export interface IQuizAttempt extends Document {
  quizId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  answers: Array<{
    questionIndex: number;
    answer: string | string[];
    isCorrect?: boolean;
    pointsEarned: number;
  }>;
  totalScore: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  startedAt: Date;
  submittedAt?: Date;
  timeTaken?: number;
  attemptNumber: number;
  createdAt: Date;
  updatedAt: Date;
}

const QuizAttemptSchema = new Schema<IQuizAttempt>(
  {
    quizId: { type: Schema.Types.ObjectId, ref: "Quiz", required: true },
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    answers: [
      {
        questionIndex: { type: Number, required: true },
        answer: { type: Schema.Types.Mixed, required: true },
        isCorrect: Boolean,
        pointsEarned: { type: Number, default: 0 },
      },
    ],
    totalScore: { type: Number, default: 0 },
    maxScore: { type: Number, required: true },
    percentage: { type: Number, default: 0 },
    passed: { type: Boolean, default: false },
    startedAt: { type: Date, default: Date.now },
    submittedAt: Date,
    timeTaken: Number,
    attemptNumber: { type: Number, default: 1 },
  },
  { timestamps: true },
);

QuizAttemptSchema.index({ quizId: 1, studentId: 1 });
QuizAttemptSchema.index({ studentId: 1 });

const QuizAttempt = model<IQuizAttempt>("QuizAttempt", QuizAttemptSchema);
export default QuizAttempt;
