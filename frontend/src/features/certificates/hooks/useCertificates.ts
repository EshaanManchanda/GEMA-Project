import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import certificateAPI from '@services/api/certificateAPI';

export function useCertificates(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['certificates', params],
    queryFn: () => certificateAPI.getCertificates(params),
  });
}

export function useCertificate(id: string) {
  return useQuery({
    queryKey: ['certificates', id],
    queryFn: () => certificateAPI.getCertificateById(id),
    enabled: !!id,
  });
}

export function useMyCertificates(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['certificates', 'my', params],
    queryFn: () => certificateAPI.getMyCertificates(params),
  });
}

export function useVerifyCertificate() {
  return useMutation({
    mutationFn: (certificateNumber: string) => certificateAPI.verifyCertificate(certificateNumber),
  });
}

export function useGenerateCertificate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => certificateAPI.generateCertificate(data as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['certificates'] }),
  });
}

export function useDownloadCertificate() {
  return useMutation({
    mutationFn: (id: string) => certificateAPI.downloadCertificate(id),
  });
}

export function useRevokeCertificate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      certificateAPI.revokeCertificate(id, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['certificates'] }),
  });
}
