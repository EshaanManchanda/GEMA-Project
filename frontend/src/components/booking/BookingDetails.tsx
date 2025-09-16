import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { format, parseISO, isValid } from 'date-fns';
import { Calendar, Clock, MapPin, Users, Plus, Minus, Tag } from 'lucide-react';
import toast from 'react-hot-toast';

import { AppDispatch } from '../../store';
import { setBookingParticipants, addParticipant, setCouponCode, selectBookingFlow } from '../../store/slices/bookingsSlice';
import { Event, EventDateSchedule } from '../../types/event';

import Button from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import EventDatePicker from '../ui/EventDatePicker';
import Badge from '../ui/Badge';

interface BookingDetailsProps {
  event: Event;
  initialData?: {
    quantity?: number;
    selectedDate?: string;
    schedule?: EventDateSchedule;
    totalPrice?: string;
    currency?: string;
  } | null;
  onNext: () => void;
}

// Safe date formatting helper to prevent "Invalid time value" errors
const formatSafeDate = (dateValue: string | null | undefined, formatStr: string): string => {
  if (!dateValue) return 'TBD';

  try {
    const date = new Date(dateValue);
    if (!isValid(date)) return 'Invalid date';
    return format(date, formatStr);
  } catch (error) {
    console.warn('Date formatting error:', error);
    return 'Date unavailable';
  }
};

const BookingDetails: React.FC<BookingDetailsProps> = ({
  event,
  initialData,
  onNext
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const bookingFlow = useSelector(selectBookingFlow);

  // Local state with safe date parsing
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
    if (!initialData?.selectedDate) return null;
    try {
      const parsedDate = parseISO(initialData.selectedDate);
      return isValid(parsedDate) ? parsedDate : null;
    } catch (error) {
      console.warn('Error parsing initial selected date:', error);
      return null;
    }
  });
  const [selectedSchedule, setSelectedSchedule] = useState<EventDateSchedule | null>(
    initialData?.schedule || null
  );
  const [quantity, setQuantity] = useState(initialData?.quantity || 1);
  const [couponCode, setCouponCodeLocal] = useState(bookingFlow.couponCode || '');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0);

  // Initialize participants based on quantity
  useEffect(() => {
    if (quantity !== bookingFlow.participants.length) {
      const participants = Array.from({ length: quantity }, (_, index) => ({
        id: `participant-${index + 1}`,
        name: '',
        email: '',
        phone: '',
        age: undefined,
        gender: undefined as 'male' | 'female' | 'other' | undefined,
        emergencyContact: undefined,
        specialRequirements: '',
        dietaryRestrictions: [],
      }));
      dispatch(setBookingParticipants(participants));
    }
  }, [quantity, dispatch, bookingFlow.participants.length]);

  // Handle date selection with safe date parsing
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);

    // Find the corresponding schedule with safe date parsing
    const schedule = event.dateSchedule.find(s => {
      if (!s.date) return false;
      try {
        const scheduleDate = new Date(s.date);
        if (!isValid(scheduleDate)) return false;
        return scheduleDate.toDateString() === date.toDateString();
      } catch (error) {
        console.warn('Error parsing schedule date:', error);
        return false;
      }
    });

    if (schedule) {
      setSelectedSchedule(schedule);
    } else {
      setSelectedSchedule(null);
    }
  };

  // Handle quantity change
  const handleQuantityChange = (newQuantity: number) => {
    const maxSeats = selectedSchedule?.availableSeats || 10;
    if (newQuantity < 1) return;
    if (newQuantity > maxSeats) {
      toast.error(`Only ${maxSeats} seats available for this date`);
      return;
    }
    if (newQuantity > 10) {
      toast.error('Maximum 10 tickets per booking');
      return;
    }
    
    setQuantity(newQuantity);
  };

  // Handle coupon code application
  const handleApplyCoupon = () => {
    if (!couponCode.trim()) {
      setCouponError('Please enter a coupon code');
      return;
    }

    // Mock coupon validation - in real app, this would be an API call
    const validCoupons = {
      'WELCOME10': 10,
      'SAVE20': 20,
      'EARLYBIRD': 15,
    };

    const discount = validCoupons[couponCode.toUpperCase() as keyof typeof validCoupons];
    
    if (discount) {
      setAppliedDiscount(discount);
      dispatch(setCouponCode(couponCode.toUpperCase()));
      setCouponError(null);
      toast.success(`${discount}% discount applied!`);
    } else {
      setCouponError('Invalid coupon code');
      setAppliedDiscount(0);
      dispatch(setCouponCode(''));
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCodeLocal('');
    setCouponError(null);
    setAppliedDiscount(0);
    dispatch(setCouponCode(''));
    toast.success('Coupon removed');
  };

  // Calculate total price
  const calculateTotal = () => {
    const basePrice = selectedSchedule?.price || event.price;
    const subtotal = basePrice * quantity;
    const discountAmount = appliedDiscount > 0 ? (subtotal * appliedDiscount / 100) : 0;
    const total = subtotal - discountAmount;
    return { subtotal, discountAmount, total };
  };

  const { subtotal, discountAmount, total } = calculateTotal();

  // Check if can proceed to next step
  const canProceed = selectedDate && selectedSchedule && quantity > 0;

  const handleNext = () => {
    if (!canProceed) {
      toast.error('Please select a date and specify the number of participants');
      return;
    }
    
    if (selectedSchedule && quantity > selectedSchedule.availableSeats) {
      toast.error(`Only ${selectedSchedule.availableSeats} seats available for this date`);
      return;
    }

    onNext();
  };

  return (
    <div className="space-y-6">
      {/* Event Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Event Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start space-x-4">
            <img 
              src={event.images?.[0] || '/placeholder-event.jpg'} 
              alt={event.title}
              className="w-24 h-24 object-cover rounded-lg"
            />
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900 mb-2">{event.title}</h3>
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-2" />
                  {event.location.city}, {event.location.address}
                </div>
                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-2" />
                  Ages {event.ageRange[0]} - {event.ageRange[1]} years
                </div>
              </div>
              <div className="flex items-center space-x-2 mt-3">
                <Badge variant="primary">{event.category}</Badge>
                <Badge variant="secondary">{event.type}</Badge>
                <Badge variant="outline">{event.venueType}</Badge>
                {event.isFeatured && <Badge variant="success">Featured</Badge>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Date Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Select Date
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EventDatePicker 
            event={event}
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
          />
          
          {selectedSchedule && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center text-blue-800">
                    <Clock className="w-4 h-4 mr-2" />
                    <span className="font-medium">
                      {formatSafeDate(selectedSchedule.startDateTime, 'PPP p')} -
                      {formatSafeDate(selectedSchedule.endDateTime, 'p')}
                    </span>
                  </div>
                  <p className="text-sm text-blue-600 mt-1">
                    {selectedSchedule.availableSeats} seats available
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-800">
                    {event.currency} {selectedSchedule.price || event.price}
                  </div>
                  <div className="text-xs text-blue-600">per person</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quantity Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Number of Participants
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuantityChange(quantity - 1)}
              disabled={quantity <= 1}
              leftIcon={<Minus className="w-4 h-4" />}
            >
              Decrease
            </Button>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">{quantity}</div>
              <div className="text-sm text-gray-500">
                {quantity === 1 ? 'participant' : 'participants'}
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuantityChange(quantity + 1)}
              disabled={quantity >= (selectedSchedule?.availableSeats || 10)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Increase
            </Button>
          </div>
          
          <div className="mt-4 text-center text-sm text-gray-600">
            Maximum {selectedSchedule?.availableSeats || 10} participants allowed for this date
          </div>
        </CardContent>
      </Card>

      {/* Coupon Code */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Tag className="w-5 h-5 mr-2" />
            Promotional Code
          </CardTitle>
        </CardHeader>
        <CardContent>
          {appliedDiscount > 0 ? (
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-3">
                  <Tag className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="font-medium text-green-800">
                    {bookingFlow.couponCode} Applied
                  </div>
                  <div className="text-sm text-green-600">
                    {appliedDiscount}% discount on your booking
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemoveCoupon}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                Remove
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Enter coupon code"
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCodeLocal(e.target.value);
                    setCouponError(null);
                  }}
                  className={`
                    flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary
                    ${couponError ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'}
                  `}
                />
                <Button
                  variant="outline"
                  onClick={handleApplyCoupon}
                  disabled={!couponCode.trim()}
                >
                  Apply
                </Button>
              </div>
              {couponError && (
                <p className="text-sm text-red-600">{couponError}</p>
              )}
              <div className="text-xs text-gray-500">
                Try: WELCOME10, SAVE20, or EARLYBIRD for discounts
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Price Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Booking Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>{quantity} × {event.currency} {selectedSchedule?.price || event.price}</span>
              <span>{event.currency} {subtotal.toFixed(2)}</span>
            </div>
            {appliedDiscount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount ({appliedDiscount}%)</span>
                <span>-{event.currency} {discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="border-t pt-2">
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>{event.currency} {total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <div></div> {/* Spacer for next button alignment */}
        <Button
          variant="primary"
          onClick={handleNext}
          disabled={!canProceed}
          size="lg"
        >
          Continue to Participants
        </Button>
      </div>
    </div>
  );
};

export default BookingDetails;