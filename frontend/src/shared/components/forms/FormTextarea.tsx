import { forwardRef, TextareaHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export interface FormTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ label, error, helperText, className, id, rows = 4, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          className={cn(
            'block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder-gray-400',
            'focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
            'disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed',
            'transition-colors duration-150 resize-y',
            error && 'border-danger focus:border-danger focus:ring-danger',
            className,
          )}
          aria-invalid={!!error}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-danger" role="alert">{error}</p>}
        {helperText && !error && <p className="mt-1 text-xs text-gray-500">{helperText}</p>}
      </div>
    );
  },
);

FormTextarea.displayName = 'FormTextarea';
