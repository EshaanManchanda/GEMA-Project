import mongoose, { Schema, model, Document } from "mongoose";

export enum QuizType {
  MULTIPLE_CHOICE = "multiple_choice",
  TRUE_FALSE = "true_false",
  SHORT_ANSWER = "short_answer",
  ESSAY = "essay",
  FILL_BLANK = "fill_blank",
}

export interface IQuiz extends Document {
  courseId: mongoose.Types.ObjectId;
  lessonId?: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  type: QuizType;
  questions: Array<{
    question: string;
    type: QuizType;
    options?: string[];
    correctAnswer: string | string[];
    points: number;
    explanation?: string;
  }>;
  totalPoints: number;
  passingScore: number;
  timeLimit?: number;
  attemptsAllowed: number;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const QuizSchema = new Schema<IQuiz>(
  {
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    lessonId: { type: Schema.Types.ObjectId, ref: "Lesson" },
    title: { type: String, required: true, trim: true },
    description: String,
    type: { type: String, enum: Object.values(QuizType), required: true },
    questions: [
      {
        question: { type: String, required: true },
        type: { type: String, enum: Object.values(QuizType), required: true },
        options: [String],
        correctAnswer: { type: Schema.Types.Mixed, required: true },
        points: { type: Number, default: 1 },
        explanation: String,
      },
    ],
    totalPoints: { type: Number, default: 0 },
    passingScore: { type: Number, default: 70 },
    timeLimit: Number,
    attemptsAllowed: { type: Number, default: 1 },
    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true },
);

QuizSchema.index({ courseId: 1 });
QuizSchema.index({ lessonId: 1 });

const Quiz = model<IQuiz>("Quiz", QuizSchema);
export default Quiz;
