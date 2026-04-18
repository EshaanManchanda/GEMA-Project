export { default as ExamTemplate, ExamType, ExamDifficulty } from "./exam-template.model";
export type { IExamTemplate } from "./exam-template.model";

export { default as Question } from "./question.model";
export type { IQuestion } from "./question.model";

export { default as QuestionBank } from "./question-bank.model";
export type { IQuestionBank } from "./question-bank.model";

export { default as ExamAttempt, ExamAttemptStatus } from "./exam-attempt.model";
export type { IExamAttempt } from "./exam-attempt.model";

export { default as ExamSession } from "./exam-session.model";
export type { IExamSession } from "./exam-session.model";

export { default as ExamInvitation } from "./exam-invitation.model";
export type { IExamInvitation } from "./exam-invitation.model";

export { default as ExamAnalytics } from "./exam-analytics.model";
export type { IExamAnalytics } from "./exam-analytics.model";

export { default as ExamReview } from "./exam-review.model";
export type { IExamReview } from "./exam-review.model";

export { examinationsService } from "./examinations.service";
export type { CreateExamTemplateInput, CreateQuestionInput, SubmitExamInput } from "./examinations.service";

export { default as examinationsRoutes } from "./examinations.routes";
