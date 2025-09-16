import React from 'react';
import { Check, Circle } from 'lucide-react';

interface BookingStepsProps {
  currentStep: 'details' | 'participants' | 'payment' | 'confirmation';
  onStepClick: (step: 'details' | 'participants' | 'payment' | 'confirmation') => void;
  isStepComplete: (step: 'details' | 'participants' | 'payment' | 'confirmation') => boolean;
}

const BookingSteps: React.FC<BookingStepsProps> = ({ 
  currentStep, 
  onStepClick, 
  isStepComplete 
}) => {
  const steps = [
    { key: 'details' as const, label: 'Event Details', number: 1 },
    { key: 'participants' as const, label: 'Participants', number: 2 },
    { key: 'payment' as const, label: 'Payment', number: 3 },
    { key: 'confirmation' as const, label: 'Confirmation', number: 4 },
  ];

  const getStepIndex = (step: string) => steps.findIndex(s => s.key === step);
  const currentIndex = getStepIndex(currentStep);

  return (
    <div className="flex items-center justify-between max-w-2xl mx-auto">
      {steps.map((step, index) => {
        const isComplete = isStepComplete(step.key);
        const isCurrent = step.key === currentStep;
        const isPast = index < currentIndex;
        const isClickable = isPast || isCurrent;

        return (
          <div key={step.key} className="flex items-center">
            {/* Step Circle */}
            <button
              onClick={() => isClickable && onStepClick(step.key)}
              disabled={!isClickable}
              className={`
                relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200
                ${isComplete && !isCurrent
                  ? 'bg-green-500 border-green-500 text-white hover:bg-green-600'
                  : isCurrent
                  ? 'bg-primary border-primary text-white'
                  : isPast
                  ? 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200 cursor-pointer'
                  : 'bg-gray-50 border-gray-200 text-gray-400'
                }
                ${isClickable && !isCurrent ? 'hover:scale-105' : ''}
                ${!isClickable ? 'cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {isComplete && !isCurrent ? (
                <Check className="w-5 h-5" />
              ) : (
                <span className="text-sm font-semibold">{step.number}</span>
              )}

              {/* Current step indicator */}
              {isCurrent && (
                <div className="absolute -inset-1 rounded-full border-2 border-primary opacity-30 animate-pulse" />
              )}
            </button>

            {/* Step Label */}
            <div className="ml-3 min-w-0">
              <p className={`
                text-sm font-medium truncate
                ${isCurrent 
                  ? 'text-primary' 
                  : isComplete 
                  ? 'text-green-600' 
                  : isPast 
                  ? 'text-gray-600' 
                  : 'text-gray-400'
                }
              `}>
                {step.label}
              </p>
            </div>

            {/* Connecting Line */}
            {index < steps.length - 1 && (
              <div className={`
                flex-1 mx-4 h-0.5 transition-colors duration-200
                ${index < currentIndex || (index === currentIndex - 1 && isComplete)
                  ? 'bg-green-500'
                  : index === currentIndex
                  ? 'bg-primary'
                  : 'bg-gray-200'
                }
              `} />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default BookingSteps;