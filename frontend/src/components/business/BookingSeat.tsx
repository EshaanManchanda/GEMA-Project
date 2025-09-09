import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';

interface Seat {
  id: string;
  row: string;
  number: number;
  section?: string;
  type: 'standard' | 'premium' | 'vip' | 'accessible';
  status: 'available' | 'selected' | 'reserved' | 'sold';
  price: number;
  x: number;
  y: number;
}

interface SeatSection {
  id: string;
  name: string;
  type: 'standard' | 'premium' | 'vip';
  color: string;
  seats: Seat[];
}

interface BookingSeatProps {
  eventId: string;
  venueId: string;
  dateScheduleId?: string;
  maxSeats?: number;
  onSeatsSelected?: (seats: Seat[]) => void;
  onPriceChange?: (totalPrice: number) => void;
  initialSelectedSeats?: string[];
  disabled?: boolean;
  showLegend?: boolean;
  showSummary?: boolean;
  className?: string;
}

const BookingSeat: React.FC<BookingSeatProps> = ({
  eventId,
  venueId,
  dateScheduleId,
  maxSeats = 8,
  onSeatsSelected,
  onPriceChange,
  initialSelectedSeats = [],
  disabled = false,
  showLegend = true,
  showSummary = true,
  className = ''
}) => {
  const [sections, setSections] = useState<SeatSection[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<string[]>(initialSelectedSeats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [hoveredSeat, setHoveredSeat] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 800, height: 600 });

  useEffect(() => {
    loadSeatMap();
  }, [eventId, venueId, dateScheduleId]);

  useEffect(() => {
    if (onSeatsSelected) {
      const seats = getAllSeats().filter(seat => selectedSeats.includes(seat.id));
      onSeatsSelected(seats);
    }
    
    if (onPriceChange) {
      const totalPrice = selectedSeats.reduce((sum, seatId) => {
        const seat = getAllSeats().find(s => s.id === seatId);
        return sum + (seat?.price || 0);
      }, 0);
      onPriceChange(totalPrice);
    }
  }, [selectedSeats, onSeatsSelected, onPriceChange]);

  const loadSeatMap = async () => {
    setLoading(true);
    setError('');

    try {
      // Mock data - replace with actual API call
      const mockSections: SeatSection[] = [
        {
          id: 'section-a',
          name: 'Section A - Premium',
          type: 'premium',
          color: '#f59e0b',
          seats: generateSeats('A', 10, 15, 150, 'premium', 100, 100)
        },
        {
          id: 'section-b',
          name: 'Section B - Standard',
          type: 'standard',
          color: '#3b82f6',
          seats: generateSeats('B', 15, 20, 100, 'standard', 100, 300)
        },
        {
          id: 'section-c',
          name: 'Section C - VIP',
          type: 'vip',
          color: '#dc2626',
          seats: generateSeats('C', 5, 8, 300, 'vip', 400, 150)
        }
      ];

      setSections(mockSections);
    } catch (error: any) {
      console.error('Failed to load seat map:', error);
      setError('Failed to load seat map');
      toast.error('Failed to load seat map');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to generate seats for a section
  const generateSeats = (
    rowPrefix: string,
    rows: number,
    seatsPerRow: number,
    price: number,
    type: Seat['type'],
    startX: number,
    startY: number
  ): Seat[] => {
    const seats: Seat[] = [];
    const seatSize = 25;
    const seatGap = 5;

    for (let row = 0; row < rows; row++) {
      for (let seatNum = 1; seatNum <= seatsPerRow; seatNum++) {
        const seatId = `${rowPrefix}${row + 1}-${seatNum}`;
        const randomStatus = Math.random();
        let status: Seat['status'] = 'available';
        
        if (randomStatus < 0.1) status = 'sold';
        else if (randomStatus < 0.15) status = 'reserved';

        seats.push({
          id: seatId,
          row: `${rowPrefix}${row + 1}`,
          number: seatNum,
          section: rowPrefix,
          type,
          status: selectedSeats.includes(seatId) ? 'selected' : status,
          price,
          x: startX + (seatNum - 1) * (seatSize + seatGap),
          y: startY + row * (seatSize + seatGap)
        });
      }
    }

    return seats;
  };

  // Get all seats from all sections
  const getAllSeats = useMemo(() => {
    return sections.flatMap(section => section.seats);
  }, [sections]);

  // Handle seat click
  const handleSeatClick = (seat: Seat) => {
    if (disabled || seat.status === 'sold' || seat.status === 'reserved') {
      return;
    }

    const isSelected = selectedSeats.includes(seat.id);
    let newSelectedSeats: string[];

    if (isSelected) {
      newSelectedSeats = selectedSeats.filter(id => id !== seat.id);
    } else {
      if (selectedSeats.length >= maxSeats) {
        toast.error(`You can select maximum ${maxSeats} seats`);
        return;
      }
      newSelectedSeats = [...selectedSeats, seat.id];
    }

    setSelectedSeats(newSelectedSeats);
  };

  // Get seat color based on status
  const getSeatColor = (seat: Seat) => {
    if (seat.status === 'selected') return '#10b981';
    if (seat.status === 'sold') return '#6b7280';
    if (seat.status === 'reserved') return '#f59e0b';
    if (hoveredSeat === seat.id) return '#3b82f6';
    
    switch (seat.type) {
      case 'vip': return '#dc2626';
      case 'premium': return '#f59e0b';
      case 'accessible': return '#8b5cf6';
      default: return '#e5e7eb';
    }
  };

  // Get seat border color
  const getSeatBorder = (seat: Seat) => {
    if (seat.status === 'selected') return '#065f46';
    if (seat.status === 'sold' || seat.status === 'reserved') return '#374151';
    return '#9ca3af';
  };

  // Format price
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
    }).format(price);
  };

  // Calculate totals
  const totalPrice = selectedSeats.reduce((sum, seatId) => {
    const seat = getAllSeats().find(s => s.id === seatId);
    return sum + (seat?.price || 0);
  }, 0);

  const selectedSeatDetails = getAllSeats().filter(seat => selectedSeats.includes(seat.id));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading seat map...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">{error}</p>
        <button
          onClick={loadSeatMap}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">Select Your Seats</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))}
              className="p-1 border rounded hover:bg-gray-50"
              disabled={zoomLevel <= 0.5}
            >
              -
            </button>
            <span className="text-sm text-gray-600">{Math.round(zoomLevel * 100)}%</span>
            <button
              onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.25))}
              className="p-1 border rounded hover:bg-gray-50"
              disabled={zoomLevel >= 2}
            >
              +
            </button>
          </div>
        </div>

        {/* Seat Map */}
        <div className="border rounded-lg overflow-auto" style={{ height: '400px' }}>
          <svg
            width={viewBox.width * zoomLevel}
            height={viewBox.height * zoomLevel}
            viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
            className="w-full h-full"
          >
            {/* Stage */}
            <rect
              x={viewBox.width / 2 - 100}
              y={50}
              width={200}
              height={30}
              fill="#4b5563"
              rx={5}
            />
            <text
              x={viewBox.width / 2}
              y={70}
              textAnchor="middle"
              fill="white"
              fontSize="14"
              fontWeight="bold"
            >
              STAGE
            </text>

            {/* Sections and Seats */}
            {sections.map(section => (
              <g key={section.id}>
                {/* Section Label */}
                <text
                  x={section.seats[0]?.x - 20}
                  y={section.seats[0]?.y - 10}
                  fill="#374151"
                  fontSize="12"
                  fontWeight="bold"
                >
                  {section.name}
                </text>

                {/* Seats */}
                {section.seats.map(seat => (
                  <g key={seat.id}>
                    <rect
                      x={seat.x}
                      y={seat.y}
                      width={20}
                      height={20}
                      fill={getSeatColor(seat)}
                      stroke={getSeatBorder(seat)}
                      strokeWidth={1}
                      rx={3}
                      className={`cursor-pointer transition-all ${
                        seat.status === 'sold' || seat.status === 'reserved' 
                          ? 'cursor-not-allowed opacity-60' 
                          : 'hover:opacity-80'
                      }`}
                      onClick={() => handleSeatClick(seat)}
                      onMouseEnter={() => setHoveredSeat(seat.id)}
                      onMouseLeave={() => setHoveredSeat(null)}
                    />
                    <text
                      x={seat.x + 10}
                      y={seat.y + 14}
                      textAnchor="middle"
                      fill={seat.status === 'selected' || seat.status === 'sold' ? 'white' : '#374151'}
                      fontSize="8"
                      fontWeight="bold"
                      className="pointer-events-none"
                    >
                      {seat.number}
                    </text>
                  </g>
                ))}
              </g>
            ))}
          </svg>
        </div>

        {/* Legend */}
        {showLegend && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-gray-200 border border-gray-400 rounded mr-2"></div>
              <span>Available</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-500 border border-green-600 rounded mr-2"></div>
              <span>Selected</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-gray-500 border border-gray-600 rounded mr-2"></div>
              <span>Sold</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-amber-500 border border-amber-600 rounded mr-2"></div>
              <span>Reserved</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-red-600 border border-red-700 rounded mr-2"></div>
              <span>VIP</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-purple-500 border border-purple-600 rounded mr-2"></div>
              <span>Accessible</span>
            </div>
          </div>
        )}

        {/* Summary */}
        {showSummary && selectedSeats.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Selected Seats</h4>
            <div className="space-y-2">
              {selectedSeatDetails.map(seat => (
                <div key={seat.id} className="flex justify-between text-sm">
                  <span>
                    {seat.section}{seat.row} - Seat {seat.number}
                    {seat.type !== 'standard' && (
                      <span className="ml-1 text-xs text-gray-500">({seat.type})</span>
                    )}
                  </span>
                  <span className="font-medium">{formatPrice(seat.price)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-blue-200 mt-3 pt-3">
              <div className="flex justify-between font-semibold">
                <span>Total ({selectedSeats.length} seats)</span>
                <span>{formatPrice(totalPrice)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Seat Selection Info */}
        <div className="mt-4 text-center text-sm text-gray-600">
          {selectedSeats.length === 0 ? (
            <p>Please select your seats to continue</p>
          ) : (
            <p>
              {selectedSeats.length} of {maxSeats} seats selected
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingSeat;