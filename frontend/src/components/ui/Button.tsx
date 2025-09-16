import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { clsx } from 'clsx';
import LoadingSpinner from '../common/LoadingSpinner';

// Button variants
type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'size'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  rounded?: boolean;
  animated?: boolean;
  gradient?: boolean;
}

const buttonVariants = {
  primary: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-white shadow-sm',
  secondary: 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500 text-white shadow-sm',
  outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-blue-500 bg-transparent',
  ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500 bg-transparent',
  danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white shadow-sm',
  success: 'bg-green-600 hover:bg-green-700 focus:ring-green-500 text-white shadow-sm',
};

const gradientVariants = {
  primary: 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700',
  secondary: 'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800',
  outline: 'bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent border-2 border-transparent bg-gradient-to-r from-blue-600 to-purple-600',
  ghost: 'text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 hover:bg-gray-100',
  danger: 'bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700',
  success: 'bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700',
};

const buttonSizes = {
  sm: 'px-3 py-1.5 text-sm font-medium',
  md: 'px-4 py-2 text-sm font-medium',
  lg: 'px-6 py-3 text-base font-medium',
  xl: 'px-8 py-4 text-lg font-semibold',
};

const iconSizes = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-5 w-5',
  xl: 'h-6 w-6',
};

const motionVariants = {
  initial: { scale: 1 },
  hover: { scale: 1.02 },
  tap: { scale: 0.98 },
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      rounded = false,
      animated = true,
      gradient = false,
      disabled,
      className,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    const baseClasses = clsx(
      // Base styles
      'inline-flex items-center justify-center font-medium transition-colors duration-200',
      'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-opacity-50',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      
      // Variant styles
      gradient ? gradientVariants[variant] : buttonVariants[variant],
      
      // Size styles
      buttonSizes[size],
      
      // Shape styles
      rounded ? 'rounded-full' : 'rounded-lg',
      
      // Width styles
      fullWidth && 'w-full',
      
      // Custom classes
      className
    );

    const iconSize = iconSizes[size];

    const buttonContent = (
      <>
        {loading && (
          <LoadingSpinner 
            size={size === 'sm' ? 'small' : size === 'lg' || size === 'xl' ? 'medium' : 'small'} 
            className={clsx('mr-2', iconSize)}
          />
        )}
        {!loading && leftIcon && (
          <span className={clsx('mr-2', iconSize)}>{leftIcon}</span>
        )}
        <span className={loading ? 'opacity-0' : ''}>{children}</span>
        {!loading && rightIcon && (
          <span className={clsx('ml-2', iconSize)}>{rightIcon}</span>
        )}
      </>
    );

    if (animated && !isDisabled) {
      return (
        <motion.button
          ref={ref}
          className={baseClasses}
          disabled={isDisabled}
          variants={motionVariants}
          initial="initial"
          whileHover="hover"
          whileTap="tap"
          {...props}
        >
          {buttonContent}
        </motion.button>
      );
    }

    return (
      <button
        ref={ref}
        className={baseClasses}
        disabled={isDisabled}
        {...props}
      >
        {buttonContent}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;