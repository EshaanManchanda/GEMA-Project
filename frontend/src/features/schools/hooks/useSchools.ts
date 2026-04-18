import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import schoolAPI from '@services/api/schoolAPI';

export function useSchools(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['schools', params],
    queryFn: () => schoolAPI.getSchools(params),
  });
}

export function useSchool(id: string) {
  return useQuery({
    queryKey: ['schools', id],
    queryFn: () => schoolAPI.getSchoolById(id),
    enabled: !!id,
  });
}

export function useMySchool() {
  return useQuery({
    queryKey: ['schools', 'my'],
    queryFn: () => schoolAPI.getMySchool(),
  });
}

export function useSchoolTeachers(schoolId: string, params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['schools', schoolId, 'teachers', params],
    queryFn: () => schoolAPI.getSchoolTeachers(schoolId, params),
    enabled: !!schoolId,
  });
}

export function useSchoolStudents(schoolId: string, params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['schools', schoolId, 'students', params],
    queryFn: () => schoolAPI.getSchoolStudents(schoolId, params),
    enabled: !!schoolId,
  });
}

export function useCreateSchool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => schoolAPI.createSchool(data as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schools'] }),
  });
}

export function useUpdateSchool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      schoolAPI.updateSchool(id, data as any),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['schools'] });
      qc.invalidateQueries({ queryKey: ['schools', id] });
    },
  });
}

export function useDeleteSchool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => schoolAPI.deleteSchool(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schools'] }),
  });
}
