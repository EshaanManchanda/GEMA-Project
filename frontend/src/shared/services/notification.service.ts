import toast, { ToastOptions } from 'react-hot-toast';

const defaultOptions: ToastOptions = {
  duration: 4000,
  position: 'top-right',
};

export const notification = {
  success: (message: string, options?: ToastOptions) =>
    toast.success(message, { ...defaultOptions, ...options }),

  error: (message: string, options?: ToastOptions) =>
    toast.error(message, { ...defaultOptions, ...options }),

  info: (message: string, options?: ToastOptions) =>
    toast(message, { ...defaultOptions, icon: 'ℹ️', ...options }),

  warning: (message: string, options?: ToastOptions) =>
    toast(message, { ...defaultOptions, icon: '⚠️', ...options }),

  promise: <T>(
    promise: Promise<T>,
    messages: { loading: string; success: string; error: string },
    options?: ToastOptions,
  ) =>
    toast.promise(promise, messages, { ...defaultOptions, ...options }),

  dismiss: (id?: string) => toast.dismiss(id),
};
