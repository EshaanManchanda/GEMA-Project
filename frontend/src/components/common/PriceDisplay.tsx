import React from 'react';
import { useCurrencyContext } from '../../contexts/CurrencyContext';

interface PriceDisplayProps {
  amount: number;
  fromCurrency?: 'INR' | 'AED' | 'USD' | 'EUR' | 'GBP';
  showConversionNote?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  bold?: boolean;
}

const PriceDisplay: React.FC<PriceDisplayProps> = ({
  amount,
  fromCurrency = 'INR',
  showConversionNote = true,
  className = '',
  size = 'md',
  bold = false,
}) => {
  const { formatPrice, formatPriceWithConversion, currentCurrency, currencyInfo } = useCurrencyContext();

  // Size mappings
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  };

  const conversionNoteSizeClasses = {
    sm: 'text-xs',
    md: 'text-xs',
    lg: 'text-sm',
    xl: 'text-sm',
  };

  const displayAmount = formatPrice(amount, fromCurrency);
  const showNote = showConversionNote && currentCurrency !== 'INR' && fromCurrency === 'INR';

  return (
    <div className={`inline-flex flex-col ${className}`}>
      <span className={`${sizeClasses[size]} ${bold ? 'font-bold' : 'font-semibold'} text-gray-900`}>
        {displayAmount}
      </span>
      {showNote && (
        <span className={`${conversionNoteSizeClasses[size]} text-gray-500 mt-0.5`}>
          (~₹{amount.toFixed(2)} will be charged)
        </span>
      )}
    </div>
  );
};

export default PriceDisplay;
