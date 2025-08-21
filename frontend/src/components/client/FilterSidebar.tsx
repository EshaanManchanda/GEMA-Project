import React from 'react';
import ReactSlider from 'react-slider';

interface FilterSidebarProps {
  ageRange: [number, number];
  setAgeRange: (range: [number, number]) => void;
  dateRange: string;
  setDateRange: (range: string) => void;
  selectedType: string;
  setSelectedType: (type: string) => void;
  selectedVenue: string;
  setSelectedVenue: (venue: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  categories: string[];
  onReset: () => void;
  onApply: () => void;
}

const FilterSidebar: React.FC<FilterSidebarProps> = ({
  ageRange,
  setAgeRange,
  dateRange,
  setDateRange,
  selectedType,
  setSelectedType,
  selectedVenue,
  setSelectedVenue,
  selectedCategory,
  setSelectedCategory,
  categories,
  onReset,
  onApply
}) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-md sticky top-6">
      <h2 className="text-2xl font-semibold mb-6">Filters</h2>

      {/* Age Range */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold mb-2">Age Range</h3>
        <ReactSlider
          className="h-2 bg-gray-200 rounded-full"
          thumbClassName="bg-orange-500 w-5 h-5 rounded-full shadow cursor-pointer -mt-1"
          trackClassName="bg-orange-300 h-2 rounded"
          value={ageRange}
          onChange={(val) => setAgeRange(val as [number, number])}
          min={0}
          max={18}
          step={1}
          pearling
          minDistance={1}
          renderThumb={(props, state) => (
            <div {...props}>
              <div className="text-xs absolute -top-6 left-1/2 transform -translate-x-1/2 bg-white px-2 py-1 rounded shadow">
                {state.valueNow}
              </div>
            </div>
          )}
        />
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>0</span>
          <span>Adult</span>
        </div>
      </div>

      {/* Date */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold mb-2">Dates</h3>
        {['all', 'today', 'this-week', 'this-month'].map((range) => (
          <label key={range} className="flex items-center mb-2 text-sm capitalize">
            <input
              type="radio"
              name="date"
              value={range}
              checked={dateRange === range}
              onChange={() => setDateRange(range)}
              className="mr-2 accent-orange-500"
            />
            {range.replace('-', ' ')}
          </label>
        ))}
      </div>

      {/* Type */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold mb-2">Type</h3>
        <div className="flex flex-wrap gap-2">
          {['Event', 'Venue', 'Courses'].map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-4 py-1 text-sm rounded-full border ${
                selectedType === type
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'text-gray-600 border-gray-300'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Category */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold mb-2">Category</h3>
        <select
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Venue Type */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold mb-2">Venue Type</h3>
        <div className="flex flex-wrap gap-2">
          {['Indoor', 'Outdoor'].map((venue) => (
            <button
              key={venue}
              onClick={() => setSelectedVenue(venue)}
              className={`px-4 py-1 text-sm rounded-full border ${
                selectedVenue === venue
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'text-gray-600 border-gray-300'
              }`}
            >
              {venue}
            </button>
          ))}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-col gap-3 mt-6">
        <button
          onClick={onApply}
          className="w-full bg-sky-500 hover:bg-sky-600 text-white py-2 rounded-lg transition-colors"
        >
          Apply Filter
        </button>
        <button
          onClick={onReset}
          className="w-full bg-orange-100 text-orange-600 py-2 rounded-lg hover:bg-orange-200 transition-colors"
        >
          Reset Filter
        </button>
      </div>
    </div>
  );
};

export default FilterSidebar;
