import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export interface FormCheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const FormCheckbox = forwardRef<HTMLInputElement, FormCheckboxProps>(
  ({ label, error, helperText, className, id, ...props }, ref) => {
    const checkboxId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        <div className="flex items-start gap-3">
          <input
            ref={ref}
            id={checkboxId}
            type="checkbox"
            className={cn(
              'mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error && 'border-danger',
              className,
            )}
            aria-invalid={!!error}
            {...props}
          />
          {label && (
            <label htmlFor={checkboxId} className="text-sm text-gray-700 cursor-pointer">
              {label}
            </label>
          )}
        </div>
        {error && <p className="mt-1 text-xs text-danger" role="alert">{error}</p>}
        {helperText && !error && <p className="mt-1 text-xs text-gray-500 ml-7">{helperText}</p>}
      </div>
    );
  },
);

FormCheckbox.displayName = 'FormCheckbox';
