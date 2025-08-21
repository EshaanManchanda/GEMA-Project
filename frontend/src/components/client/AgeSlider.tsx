import React from 'react';
import ReactSlider from 'react-slider';

interface AgeSliderProps {
  value: [number, number];
  onChange: (value: [number, number]) => void;
  min?: number;
  max?: number;
}

const AgeSlider: React.FC<AgeSliderProps> = ({
  value,
  onChange,
  min = 0,
  max = 18,
}) => {
  return (
    <div className="w-full">
      <h3 className="font-medium mb-2">Age Range</h3>

      <ReactSlider
        className="h-2 bg-gray-200 rounded-md"
        thumbClassName="h-4 w-4 bg-primary rounded-full cursor-pointer focus:outline-none shadow"
        trackClassName="bg-primary h-2 rounded-md"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(val) => onChange(val as [number, number])}
        ariaLabel={['Minimum age', 'Maximum age']}
        pearling
        minDistance={1}
      />

      <div className="flex justify-between text-sm text-gray-600 mt-2">
        <span>{value[0]}+</span>
        <span>{value[1] === max ? 'Adult' : value[1]}</span>
      </div>
    </div>
  );
};

export default AgeSlider;
