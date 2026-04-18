import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import parentAPI from '@services/api/parentAPI';

export function useParents(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['parents', params],
    queryFn: () => parentAPI.getParents(params),
  });
}

export function useParent(id: string) {
  return useQuery({
    queryKey: ['parents', id],
    queryFn: () => parentAPI.getParentById(id),
    enabled: !!id,
  });
}

export function useParentProfile() {
  return useQuery({
    queryKey: ['parents', 'profile'],
    queryFn: () => parentAPI.getMyProfile(),
  });
}

export function useCreateParent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => parentAPI.createParent(data as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['parents'] }),
  });
}

export function useUpdateParent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      parentAPI.updateParent(id, data as any),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['parents'] });
      qc.invalidateQueries({ queryKey: ['parents', id] });
    },
  });
}

export function useDeleteParent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => parentAPI.deleteParent(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['parents'] }),
  });
}

export function useAddChild() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { studentId: string; relationship: string }) =>
      parentAPI.addChild(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['parents', 'profile'] }),
  });
}

export function useRemoveChild() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (studentId: string) => parentAPI.removeChild(studentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['parents', 'profile'] }),
  });
}
