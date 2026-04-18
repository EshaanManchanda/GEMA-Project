import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import vendorAPI from '@services/api/vendorAPI';

export function useVendors(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['vendors', params],
    queryFn: () => vendorAPI.getAllVendors(params),
  });
}

export function useVendor(id: string) {
  return useQuery({
    queryKey: ['vendors', id],
    queryFn: () => vendorAPI.getVendorById(id),
    enabled: !!id,
  });
}

export function usePublicVendorProfile(id: string) {
  return useQuery({
    queryKey: ['vendors', 'public', id],
    queryFn: () => vendorAPI.getPublicVendorProfile(id),
    enabled: !!id,
  });
}

export function useFeaturedVendors() {
  return useQuery({
    queryKey: ['vendors', 'featured'],
    queryFn: () => vendorAPI.getFeaturedVendors(),
  });
}

export function useVendorProfile() {
  return useQuery({
    queryKey: ['vendors', 'profile'],
    queryFn: () => vendorAPI.getVendorProfile(),
  });
}

export function useVendorStats() {
  return useQuery({
    queryKey: ['vendors', 'stats'],
    queryFn: () => vendorAPI.getVendorStats(),
  });
}

export function useUpdateVendorProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => vendorAPI.updateVendorProfile(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendors', 'profile'] }),
  });
}

export function useApplyForVendor() {
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => vendorAPI.applyForVendor(data),
  });
}

export function useVendorBookings(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['vendors', 'bookings', params],
    queryFn: () => vendorAPI.getVendorBookings(params),
  });
}

export function useVendorEmployees(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['vendors', 'employees', params],
    queryFn: () => vendorAPI.getVendorEmployees(params),
  });
}

export function useCreateVendorEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => vendorAPI.createVendorEmployee(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendors', 'employees'] }),
  });
}

export function useUpdateVendorEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      vendorAPI.updateVendorEmployee(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendors', 'employees'] }),
  });
}

export function useDeleteVendorEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => vendorAPI.deleteVendorEmployee(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendors', 'employees'] }),
  });
}
