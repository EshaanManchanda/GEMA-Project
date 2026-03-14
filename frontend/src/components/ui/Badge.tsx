import React from 'react';

type BadgeVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'error'
  | 'danger'
  | 'outline'
  | 'featured'
  | 'outdoor'
  | 'indoor';

type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: React.ReactNode;
}

const getVariantClasses = (variant: BadgeVariant): string => {
  const variants = {
    default: 'border-transparent bg-primary-600 text-white hover:bg-primary-700',
    primary: 'border-transparent bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'border-transparent bg-gray-100 text-gray-900 hover:bg-gray-200',
    success: 'border-transparent bg-green-100 text-green-800 hover:bg-green-200',
    warning: 'border-transparent bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
    error: 'border-transparent bg-red-100 text-red-800 hover:bg-red-200',
    danger: 'border-transparent bg-red-600 text-white hover:bg-red-700',
    outline: 'border-gray-200 text-gray-900 hover:bg-gray-100',
    featured: 'border-transparent bg-gradient-to-r from-orange-400 to-pink-400 text-white hover:from-orange-500 hover:to-pink-500',
    outdoor: 'border-transparent bg-green-500 text-white hover:bg-green-600',
    indoor: 'border-transparent bg-blue-500 text-white hover:bg-blue-600',
  };
  return variants[variant];
};

const getSizeClasses = (size: BadgeSize): string => {
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm',
  };
  return sizes[size];
};

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className = '', variant = 'default', size = 'md', icon, children, ...props }, ref) => {
    const baseClasses = 'inline-flex items-center rounded-full border font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2';
    const variantClasses = getVariantClasses(variant);
    const sizeClasses = getSizeClasses(size);
    
    const combinedClasses = `${baseClasses} ${variantClasses} ${sizeClasses} ${className}`.trim();
    
    return (
      <div
        ref={ref}
        className={combinedClasses}
        {...props}
      >
        {icon && <span className="mr-1">{icon}</span>}
        {children}
      </div>
    );
  }
);

Badge.displayName = 'Badge';

export default Badge;