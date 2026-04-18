import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils/cn';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave';
}

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ variant = 'text', width, height, animation = 'pulse', className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'bg-gray-200',
          variant === 'circular' && 'rounded-full',
          variant === 'rectangular' && 'rounded-md',
          variant === 'text' && 'rounded',
          animation === 'pulse' && 'animate-pulse',
          className,
        )}
        style={{ width, height }}
        {...props}
      />
    );
  },
);

Skeleton.displayName = 'Skeleton';
