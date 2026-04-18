export { default as Course, CourseStatus, CoursePricingType } from "./course.model";
export type { ICourse } from "./course.model";

export { default as Lesson, LessonType } from "./lesson.model";
export type { ILesson } from "./lesson.model";

export { default as CourseEnrollment, EnrollmentStatus } from "./course-enrollment.model";
export type { ICourseEnrollment } from "./course-enrollment.model";

export { default as Quiz, QuizType } from "./quiz.model";
export type { IQuiz } from "./quiz.model";

export { default as QuizAttempt } from "./quiz-attempt.model";
export type { IQuizAttempt } from "./quiz-attempt.model";

export { default as Assignment, AssignmentStatus } from "./assignment.model";
export type { IAssignment } from "./assignment.model";

export { default as AssignmentSubmission, SubmissionStatus } from "./assignment-submission.model";
export type { IAssignmentSubmission } from "./assignment-submission.model";

export { lmsService } from "./lms.service";
export type { CreateCourseInput, CreateLessonInput, CreateQuizInput, CreateAssignmentInput } from "./lms.service";

export { default as lmsRoutes } from "./lms.routes";
