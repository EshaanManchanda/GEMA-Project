import mongoose, { Schema, model, Document } from "mongoose";
import { ExamType } from "./exam-template.model";

export interface IQuestion extends Document {
  examTemplateId: mongoose.Types.ObjectId;
  questionBankId?: mongoose.Types.ObjectId;
  text: string;
  type: ExamType;
  points: number;
  options?: string[];
  correctAnswer: string | string[] | Record<string, string>;
  explanation?: string;
  difficulty: "easy" | "medium" | "hard";
  tags: string[];
  mediaUrl?: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema<IQuestion>(
  {
    examTemplateId: { type: Schema.Types.ObjectId, ref: "ExamTemplate", required: true, index: true },
    questionBankId: { type: Schema.Types.ObjectId, ref: "QuestionBank" },
    text: { type: String, required: true },
    type: { type: String, enum: Object.values(ExamType), required: true },
    points: { type: Number, default: 1 },
    options: [String],
    correctAnswer: { type: Schema.Types.Mixed, required: true },
    explanation: String,
    difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "medium" },
    tags: [String],
    mediaUrl: String,
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

QuestionSchema.index({ examTemplateId: 1, order: 1 });
QuestionSchema.index({ questionBankId: 1 });
QuestionSchema.index({ difficulty: 1, type: 1 });
QuestionSchema.index({ tags: 1 });

const Question = model<IQuestion>("Question", QuestionSchema);
export default Question;
