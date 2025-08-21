import React from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

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
      <DotLottieReact
        src={src}
        loop={loop}
        autoplay={autoplay}
        onComplete={onComplete}
      />
    </div>
  );
};

export default LottieAnimation;