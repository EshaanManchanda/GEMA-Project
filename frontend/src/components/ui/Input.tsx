import React, { InputHTMLAttributes, forwardRef, useState } from 'react';
import { clsx } from 'clsx';
import { Eye, EyeOff, AlertCircle, CheckCircle, X } from 'lucide-react';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'filled' | 'flushed';
  loading?: boolean;
  clearable?: boolean;
  onClear?: () => void;
  success?: boolean;
  fullWidth?: boolean;
}

const inputSizes = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-4 py-3 text-base',
};

const iconSizes = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      size = 'md',
      variant = 'default',
      type = 'text',
      className,
      loading = false,
      clearable = false,
      onClear,
      success = false,
      fullWidth = true,
      disabled,
      value,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const isPassword = type === 'password';
    const hasError = !!error;
    const hasValue = value !== undefined && value !== '';

    const handleClear = () => {
      if (onClear) {
        onClear();
      }
    };

    const togglePasswordVisibility = () => {
      setShowPassword(!showPassword);
    };

    // Input variants
    const inputVariants = {
      default: clsx(
        'border border-gray-300 rounded-lg bg-white',
        'focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20',
        hasError && 'border-red-500 focus:border-red-500 focus:ring-red-500',
        success && 'border-green-500 focus:border-green-500 focus:ring-green-500',
        disabled && 'bg-gray-50 border-gray-200 cursor-not-allowed'
      ),
      filled: clsx(
        'border border-transparent rounded-lg bg-gray-100',
        'focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20',
        hasError && 'bg-red-50 border-red-500 focus:border-red-500 focus:ring-red-500',
        success && 'bg-green-50 border-green-500 focus:border-green-500 focus:ring-green-500',
        disabled && 'bg-gray-50 border-gray-200 cursor-not-allowed'
      ),
      flushed: clsx(
        'border-0 border-b-2 border-gray-300 rounded-none bg-transparent px-0',
        'focus:border-blue-500 focus:ring-0',
        hasError && 'border-red-500 focus:border-red-500',
        success && 'border-green-500 focus:border-green-500',
        disabled && 'border-gray-200 cursor-not-allowed'
      ),
    };

    const baseInputClasses = clsx(
      'block w-full transition-all duration-200',
      'placeholder-gray-400 text-gray-900',
      'focus:outline-none',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      inputSizes[size],
      inputVariants[variant],
      fullWidth ? 'w-full' : '',
      className
    );

    const inputWrapperClasses = clsx(
      'relative',
      fullWidth ? 'w-full' : 'inline-block'
    );

    const iconSize = iconSizes[size];

    return (
      <div className={clsx('space-y-1', fullWidth ? 'w-full' : '')}>
        {/* Label */}
        {label && (
          <label className={clsx(
            'block text-sm font-medium',
            hasError ? 'text-red-700' : success ? 'text-green-700' : 'text-gray-700'
          )}>
            {label}
          </label>
        )}

        {/* Input Container */}
        <div className={inputWrapperClasses}>
          {/* Left Icon */}
          {leftIcon && (
            <div className={clsx(
              'absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none',
              hasError ? 'text-red-500' : success ? 'text-green-500' : 'text-gray-400'
            )}>
              <span className={iconSize}>{leftIcon}</span>
            </div>
          )}

          {/* Input Field */}
          <input
            ref={ref}
            type={isPassword ? (showPassword ? 'text' : 'password') : type}
            className={clsx(
              baseInputClasses,
              leftIcon && (variant === 'flushed' ? 'pl-6' : 'pl-10'),
              (rightIcon || isPassword || clearable || hasError || success || loading) && 'pr-10'
            )}
            disabled={disabled || loading}
            value={value}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            {...props}
          />

          {/* Right Side Icons */}
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
            {/* Loading Spinner */}
            {loading && (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
            )}

            {/* Success Icon */}
            {!loading && success && (
              <CheckCircle className={clsx(iconSize, 'text-green-500')} />
            )}

            {/* Error Icon */}
            {!loading && hasError && (
              <AlertCircle className={clsx(iconSize, 'text-red-500')} />
            )}

            {/* Clear Button */}
            {!loading && clearable && hasValue && !hasError && (
              <button
                type="button"
                onClick={handleClear}
                className="p-0.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              >
                <X className="h-3 w-3" />
              </button>
            )}

            {/* Password Toggle */}
            {!loading && isPassword && (
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="p-0.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <EyeOff className={iconSize} />
                ) : (
                  <Eye className={iconSize} />
                )}
              </button>
            )}

            {/* Custom Right Icon */}
            {!loading && rightIcon && !clearable && !isPassword && !hasError && !success && (
              <span className={clsx(iconSize, 'text-gray-400')}>
                {rightIcon}
              </span>
            )}
          </div>
        </div>

        {/* Helper Text or Error Message */}
        {(error || helperText) && (
          <p className={clsx(
            'text-xs',
            hasError ? 'text-red-600' : 'text-gray-500'
          )}>
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;