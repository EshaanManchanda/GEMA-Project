import { ApiService } from '../api';

export interface Course {
  _id: string;
  title: string;
  slug: string;
  description: string;
  instructorId: string;
  thumbnail?: string;
  price: number;
  currency: string;
  status: 'draft' | 'published' | 'archived';
  lessons: Lesson[];
  enrolledStudents: number;
  rating: number;
  reviewsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Lesson {
  _id: string;
  courseId: string;
  title: string;
  description?: string;
  type: 'video' | 'text' | 'quiz' | 'assignment';
  content?: string;
  videoUrl?: string;
  duration?: number;
  order: number;
  isPreview: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Quiz {
  _id: string;
  courseId: string;
  lessonId?: string;
  title: string;
  questions: QuizQuestion[];
  timeLimit?: number;
  passingScore: number;
  attempts: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuizQuestion {
  _id: string;
  question: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  options?: string[];
  correctAnswer: string;
  points: number;
}

export interface Enrollment {
  _id: string;
  courseId: string;
  userId: string;
  progress: number;
  completedLessons: string[];
  status: 'active' | 'completed' | 'dropped';
  enrolledAt: string;
  completedAt?: string;
}

const lmsAPI = {
  // Courses
  getCourses: async (params?: { page?: number; limit?: number; search?: string; category?: string }) => {
    try {
      const response = await ApiService.get('/courses', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getCourseById: async (id: string) => {
    try {
      const response = await ApiService.get(`/courses/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getCourseBySlug: async (slug: string) => {
    try {
      const response = await ApiService.get(`/courses/slug/${slug}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  createCourse: async (courseData: Partial<Course>) => {
    try {
      const response = await ApiService.post('/courses', courseData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateCourse: async (id: string, courseData: Partial<Course>) => {
    try {
      const response = await ApiService.put(`/courses/${id}`, courseData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deleteCourse: async (id: string) => {
    try {
      const response = await ApiService.delete(`/courses/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Lessons
  getLessons: async (courseId: string) => {
    try {
      const response = await ApiService.get(`/courses/${courseId}/lessons`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getLessonById: async (courseId: string, lessonId: string) => {
    try {
      const response = await ApiService.get(`/courses/${courseId}/lessons/${lessonId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  createLesson: async (courseId: string, lessonData: Partial<Lesson>) => {
    try {
      const response = await ApiService.post(`/courses/${courseId}/lessons`, lessonData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateLesson: async (courseId: string, lessonId: string, lessonData: Partial<Lesson>) => {
    try {
      const response = await ApiService.put(`/courses/${courseId}/lessons/${lessonId}`, lessonData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deleteLesson: async (courseId: string, lessonId: string) => {
    try {
      const response = await ApiService.delete(`/courses/${courseId}/lessons/${lessonId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Quizzes
  getQuizzes: async (courseId: string) => {
    try {
      const response = await ApiService.get(`/courses/${courseId}/quizzes`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  createQuiz: async (courseId: string, quizData: Partial<Quiz>) => {
    try {
      const response = await ApiService.post(`/courses/${courseId}/quizzes`, quizData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  submitQuiz: async (quizId: string, answers: { questionId: string; answer: string }[]) => {
    try {
      const response = await ApiService.post(`/quizzes/${quizId}/submit`, { answers });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Enrollments
  enrollInCourse: async (courseId: string) => {
    try {
      const response = await ApiService.post(`/courses/${courseId}/enroll`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getMyEnrollments: async (params?: { page?: number; limit?: number }) => {
    try {
      const response = await ApiService.get('/courses/enrollments/my', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateProgress: async (courseId: string, lessonId: string, progress: number) => {
    try {
      const response = await ApiService.put(`/courses/${courseId}/progress`, { lessonId, progress });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default lmsAPI;
