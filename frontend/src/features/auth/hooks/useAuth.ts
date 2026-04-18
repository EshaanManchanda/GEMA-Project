import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authService } from '../services/auth.service';
import type { LoginCredentials, RegisterData, User } from '../types/auth.types';

const AUTH_KEYS = {
  me: ['auth', 'me'] as const,
  roles: ['auth', 'roles'] as const,
};

export function useCurrentUser() {
  return useQuery({
    queryKey: AUTH_KEYS.me,
    queryFn: () => authService.getCurrentUser().then((r) => r.data?.data),
    retry: false,
  });
}

export function useAvailableRoles() {
  return useQuery({
    queryKey: AUTH_KEYS.roles,
    queryFn: () => authService.getAvailableRoles().then((r) => r.data),
    enabled: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: LoginCredentials) => authService.login(data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTH_KEYS.me });
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (data: RegisterData) => authService.register(data).then((r) => r.data),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => authService.forgotPassword(email).then((r) => r.data),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) =>
      authService.resetPassword(token, password).then((r) => r.data),
  });
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: ({ otp, email }: { otp: string; email: string }) =>
      authService.verifyEmail(otp, email).then((r) => r.data),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => authService.logout().then((r) => r.data),
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<User>) => authService.updateProfile(data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTH_KEYS.me });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      authService.changePassword(currentPassword, newPassword).then((r) => r.data),
  });
}

export function useSwitchRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (role: string) => authService.switchRole(role).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTH_KEYS.me });
    },
  });
}
