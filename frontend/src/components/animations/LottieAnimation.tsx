import React, { lazy, Suspense } from 'react';

const DotLottieReact = lazy(() =>
  import('@lottiefiles/dotlottie-react').then(m => ({
    default: m.DotLottieReact
  }))
);

interface LottieAnimationProps {
  src: string;
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
  style?: React.CSSProperties;
  width?: number | string;
  height?: number | string;
  onComplete?: () => void;
}

const LottieAnimation: React.FC<LottieAnimationProps> = ({
  src,
  loop = true,
  autoplay = true,
  className = '',
  style = {},
  width = '100%',
  height = '100%',
  onComplete,
}) => {
  return (
    <div className={className} style={{ width, height, ...style }}>
      <Suspense fallback={<div style={{ width, height }} />}>
        <DotLottieReact
          src={src}
          loop={loop}
          autoplay={autoplay}
          onComplete={onComplete}
          {...{} as any}
        />
      </Suspense>
    </div>
  );
};

export default LottieAnimation;