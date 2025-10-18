import React, { useState, useRef, KeyboardEvent, ClipboardEvent, ChangeEvent } from 'react';
import { motion } from 'framer-motion';

interface OTPInputProps {
  length?: number;
  value?: string;
  onChange: (otp: string) => void;
  onComplete?: (otp: string) => void;
  disabled?: boolean;
  error?: boolean;
  autoFocus?: boolean;
}

/**
 * OTPInput Component
 * A reusable component for entering OTP codes
 * Features:
 * - Auto-focus next input on entry
 * - Auto-focus previous input on backspace
 * - Paste support for entire OTP
 * - Keyboard navigation
 * - Visual feedback for errors
 */
const OTPInput: React.FC<OTPInputProps> = ({
  length = 4,
  value = '',
  onChange,
  onComplete,
  disabled = false,
  error = false,
  autoFocus = true,
}) => {
  const [otp, setOtp] = useState<string[]>(value.split('').slice(0, length));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Initialize OTP array
  React.useEffect(() => {
    if (value) {
      setOtp(value.split('').slice(0, length));
    }
  }, [value, length]);

  const handleChange = (index: number, e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;

    // Only allow numbers
    if (val && !/^\d$/.test(val)) {
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = val;
    setOtp(newOtp);

    const otpString = newOtp.join('');
    onChange(otpString);

    // Auto-focus next input
    if (val && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Call onComplete if all inputs are filled
    if (val && newOtp.every(digit => digit !== '') && newOtp.length === length) {
      onComplete?.(otpString);
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        // If current input is empty, focus previous input
        inputRefs.current[index - 1]?.focus();
      } else {
        // Clear current input
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
        onChange(newOtp.join(''));
      }
    }
    // Handle arrow keys
    else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').slice(0, length);

    // Only allow numbers
    if (!/^\d+$/.test(pastedData)) {
      return;
    }

    const newOtp = pastedData.split('');
    while (newOtp.length < length) {
      newOtp.push('');
    }

    setOtp(newOtp);
    onChange(pastedData);

    // Focus the last filled input or the first empty one
    const focusIndex = Math.min(pastedData.length, length - 1);
    inputRefs.current[focusIndex]?.focus();

    // Call onComplete if all inputs are filled
    if (newOtp.every(digit => digit !== '') && newOtp.length === length) {
      onComplete?.(pastedData);
    }
  };

  const handleFocus = (index: number) => {
    inputRefs.current[index]?.select();
  };

  return (
    <div className="flex gap-3 justify-center">
      {Array.from({ length }).map((_, index) => (
        <motion.input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={otp[index] || ''}
          onChange={(e) => handleChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={() => handleFocus(index)}
          disabled={disabled}
          autoFocus={autoFocus && index === 0}
          className={`
            w-12 h-14 text-center text-2xl font-bold rounded-xl border-2
            transition-all duration-200 focus:outline-none
            ${
              error
                ? 'border-red-500 bg-red-50 text-red-900 focus:border-red-600 focus:ring-2 focus:ring-red-200'
                : disabled
                ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
            }
            ${otp[index] ? 'border-blue-500' : ''}
          `}
          whileFocus={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        />
      ))}
    </div>
  );
};

export default OTPInput;
