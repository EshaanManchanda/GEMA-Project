import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import studentAPI from '@services/api/studentAPI';

export function useStudents(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['students', params],
    queryFn: () => studentAPI.getStudents(params),
  });
}

export function useStudent(id: string) {
  return useQuery({
    queryKey: ['students', id],
    queryFn: () => studentAPI.getStudentById(id),
    enabled: !!id,
  });
}

export function useStudentProfile() {
  return useQuery({
    queryKey: ['students', 'profile'],
    queryFn: () => studentAPI.getMyProfile(),
  });
}

export function useStudentEnrollments(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['students', 'enrollments', params],
    queryFn: () => studentAPI.getEnrollments(params),
  });
}

export function useCreateStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => studentAPI.createStudent(data as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }),
  });
}

export function useUpdateStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      studentAPI.updateStudent(id, data as any),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['students', id] });
    },
  });
}

export function useDeleteStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => studentAPI.deleteStudent(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }),
  });
}
