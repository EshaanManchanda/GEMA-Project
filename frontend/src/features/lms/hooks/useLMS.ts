import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import lmsAPI from '@services/api/lmsAPI';

export function useCourses(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['courses', params],
    queryFn: () => lmsAPI.getCourses(params),
  });
}

export function useCourse(id: string) {
  return useQuery({
    queryKey: ['courses', id],
    queryFn: () => lmsAPI.getCourseById(id),
    enabled: !!id,
  });
}

export function useCourseBySlug(slug: string) {
  return useQuery({
    queryKey: ['courses', 'slug', slug],
    queryFn: () => lmsAPI.getCourseBySlug(slug),
    enabled: !!slug,
  });
}

export function useLessons(courseId: string) {
  return useQuery({
    queryKey: ['courses', courseId, 'lessons'],
    queryFn: () => lmsAPI.getLessons(courseId),
    enabled: !!courseId,
  });
}

export function useMyEnrollments(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['courses', 'enrollments', 'my', params],
    queryFn: () => lmsAPI.getMyEnrollments(params),
  });
}

export function useCreateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => lmsAPI.createCourse(data as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['courses'] }),
  });
}

export function useUpdateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      lmsAPI.updateCourse(id, data as any),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['courses'] });
      qc.invalidateQueries({ queryKey: ['courses', id] });
    },
  });
}

export function useDeleteCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => lmsAPI.deleteCourse(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['courses'] }),
  });
}

export function useCreateLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ courseId, data }: { courseId: string; data: Record<string, unknown> }) =>
      lmsAPI.createLesson(courseId, data as any),
    onSuccess: (_, { courseId }) => qc.invalidateQueries({ queryKey: ['courses', courseId, 'lessons'] }),
  });
}

export function useUpdateLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ courseId, lessonId, data }: { courseId: string; lessonId: string; data: Record<string, unknown> }) =>
      lmsAPI.updateLesson(courseId, lessonId, data as any),
    onSuccess: (_, { courseId }) => qc.invalidateQueries({ queryKey: ['courses', courseId, 'lessons'] }),
  });
}

export function useDeleteLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ courseId, lessonId }: { courseId: string; lessonId: string }) =>
      lmsAPI.deleteLesson(courseId, lessonId),
    onSuccess: (_, { courseId }) => qc.invalidateQueries({ queryKey: ['courses', courseId, 'lessons'] }),
  });
}

export function useEnrollInCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (courseId: string) => lmsAPI.enrollInCourse(courseId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['courses', 'enrollments', 'my'] });
    },
  });
}

export function useUpdateProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ courseId, lessonId, progress }: { courseId: string; lessonId: string; progress: number }) =>
      lmsAPI.updateProgress(courseId, lessonId, progress),
    onSuccess: (_, { courseId }) => {
      qc.invalidateQueries({ queryKey: ['courses', courseId] });
      qc.invalidateQueries({ queryKey: ['courses', 'enrollments', 'my'] });
    },
  });
}

export function useSubmitQuiz() {
  return useMutation({
    mutationFn: ({ quizId, answers }: { quizId: string; answers: { questionId: string; answer: string }[] }) =>
      lmsAPI.submitQuiz(quizId, answers),
  });
}
