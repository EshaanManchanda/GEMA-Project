import React, { ReactNode } from 'react';
import { useSpring, animated, config } from '@react-spring/web';

// Hover Card Animation
export const HoverCard: React.FC<{
  children: ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  const [props, api] = useSpring(() => ({
    transform: 'scale(1)',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    config: config.gentle
  }));

  return (
    <animated.div
      className={className}
      style={props}
      onMouseEnter={() => api.start({
        transform: 'scale(1.03)',
        boxShadow: '0 10px 20px rgba(0, 0, 0, 0.15)'
      })}
      onMouseLeave={() => api.start({
        transform: 'scale(1)',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      })}
    >
      {children}
    </animated.div>
  );
};

// Button Animation
export const AnimatedButton: React.FC<{
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}> = ({ children, onClick, className = '' }) => {
  const [props, api] = useSpring(() => ({
    transform: 'scale(1)',
    config: { tension: 300, friction: 10 }
  }));

  return (
    <animated.button
      className={className}
      style={props}
      onClick={onClick}
      onMouseEnter={() => api.start({ transform: 'scale(1.05)' })}
      onMouseLeave={() => api.start({ transform: 'scale(1)' })}
      onMouseDown={() => api.start({ transform: 'scale(0.95)' })}
      onMouseUp={() => api.start({ transform: 'scale(1.05)' })}
    >
      {children}
    </animated.button>
  );
};

// Scroll Reveal Animation
export const ScrollReveal: React.FC<{
  children: ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      {
        threshold: 0.1,
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, []);

  const props = useSpring({
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? 'translateY(0)' : 'translateY(50px)',
    config: config.gentle,
  });

  return (
    <animated.div ref={ref} style={props} className={className}>
      {children}
    </animated.div>
  );
};

// Number Counter Animation
export const NumberCounter: React.FC<{
  to: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}> = ({ to, duration = 2000, className = '', prefix = '', suffix = '' }) => {
  // Use primitive value instead of object
  const props = useSpring({
    from: { value: 0 },
    to: { value: to },
    config: { duration },
  });

  return (
    <animated.span className={className}>
      {prefix}
      {props.value.to((val: number) => Math.floor(val).toLocaleString()).toString()}
      {suffix}
    </animated.span>
  );
};