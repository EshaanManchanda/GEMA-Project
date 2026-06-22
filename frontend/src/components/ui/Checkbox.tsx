import React, { forwardRef } from 'react';
import { clsx } from 'clsx';

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({ label, error, className, ...props }, ref) => {
  return (
    <div className={clsx('flex items-center space-x-2', className)}>
      <input
        type="checkbox"
        ref={ref}
        className={clsx('h-4 w-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500')}
        {...props}
      />
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
});

Checkbox.displayName = 'Checkbox';
export default Checkbox;
