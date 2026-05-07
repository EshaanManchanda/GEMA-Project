import React from 'react';

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  src?: string;
  alt?: string;
  fallback?: string;
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className = '', size = 'md', src, alt, fallback, children, ...props }, ref) => {
    const getSizeClasses = () => {
      switch (size) {
        case 'sm':
          return 'h-8 w-8 text-xs';
        case 'lg':
          return 'h-12 w-12 text-lg';
        case 'xl':
          return 'h-16 w-16 text-xl';
        default:
          return 'h-10 w-10 text-sm';
      }
    };

    const combinedClasses = `
      relative flex shrink-0 overflow-hidden rounded-full
      ${getSizeClasses()}
      ${className}
    `.trim().replace(/\s+/g, ' ');

    const getInitials = (name: string) => {
      return name
        .split(' ')
        .map(part => part.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);
    };

    return (
      <div ref={ref} className={combinedClasses} {...props}>
        {src ? (
          <img
            src={src}
            alt={alt || 'Avatar'}
            className="aspect-square h-full w-full object-cover"
            onError={(e) => {
              // Hide broken image and show fallback
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : null}
        
        {/* Fallback when no image or image fails to load */}
        <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white font-semibold">
          {fallback ? getInitials(fallback) : children || '?'}
        </div>
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';

export default Avatar;