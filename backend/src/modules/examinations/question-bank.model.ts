import mongoose, { Schema, model, Document } from "mongoose";

export interface IQuestionBank extends Document {
  name: string;
  description?: string;
  courseId?: mongoose.Types.ObjectId;
  schoolId?: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;
  tags: string[];
  questionCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionBankSchema = new Schema<IQuestionBank>(
  {
    name: { type: String, required: true, trim: true },
    description: String,
    courseId: { type: Schema.Types.ObjectId, ref: "Course" },
    schoolId: { type: Schema.Types.ObjectId, ref: "School" },
    teacherId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tags: [String],
    questionCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

QuestionBankSchema.index({ teacherId: 1, isActive: 1 });
QuestionBankSchema.index({ courseId: 1 });
QuestionBankSchema.index({ schoolId: 1 });
QuestionBankSchema.index({ tags: 1 });

const QuestionBank = model<IQuestionBank>("QuestionBank", QuestionBankSchema);
export default QuestionBank;
