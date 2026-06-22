import React, { forwardRef, TextareaHTMLAttributes } from 'react';
import { clsx } from 'clsx';

interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  rows?: number;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

const textareaSizes = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-4 py-3 text-base',
};

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      helperText,
      rows = 3,
      size = 'md',
      fullWidth = true,
      className,
      ...props
    },
    ref
  ) => {
    const hasError = !!error;
    const baseClasses = clsx(
      'block w-full rounded-xl border border-gray-300 bg-white transition-colors focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-400',
      textareaSizes[size],
      hasError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'focus:border-primary-400',
      fullWidth ? 'w-full' : '',
      className
    );

    return (
      <div className={clsx('space-y-1', fullWidth ? 'w-full' : '')}>
        {label && (
          <label className={clsx('block text-sm font-medium', hasError ? 'text-red-700' : 'text-gray-700')}>{label}</label>
        )}
        <textarea ref={ref} rows={rows} className={baseClasses} {...props} />
        {(error || helperText) && (
          <p className={clsx('text-xs', hasError ? 'text-red-600' : 'text-gray-500')}>{error || helperText}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
export default Textarea;
