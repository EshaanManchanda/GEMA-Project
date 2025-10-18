import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { format, parseISO, isValid } from 'date-fns';
import { Calendar, Clock, MapPin, Users, Plus, Minus, Tag, Loader2, Sparkles, Gift, TrendingUp, X, Star, Check, ChevronRight, Ticket, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';

import { AppDispatch } from '../../store';
import { setBookingParticipants, addParticipant, setCouponCode, setBookingSchedule, selectBookingFlow } from '../../store/slices/bookingsSlice';
import { Event, EventDateSchedule } from '../../types/event';
import couponAPI, { CouponValidation } from '../../services/api/couponAPI';

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
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [validatedCoupon, setValidatedCoupon] = useState<CouponValidation | null>(null);

  // Initialize schedule from initialData if available
  useEffect(() => {
    if (initialData?.schedule && (initialData.schedule._id || initialData.schedule.id)) {
      const scheduleId = initialData.schedule._id || initialData.schedule.id;
      dispatch(setBookingSchedule(scheduleId));
    }
  }, [initialData?.schedule, dispatch]);

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
      // Save schedule ID to Redux for payment processing
      dispatch(setBookingSchedule(schedule._id || schedule.id));
    } else {
      setSelectedSchedule(null);
    }
  };

  // Handle quantity change
  const handleQuantityChange = (newQuantity: number) => {
    // For unlimited seats, use 100 as reasonable max for UI, otherwise use availableSeats
    const maxSeats = selectedSchedule?.unlimitedSeats ? 100 : (selectedSchedule?.availableSeats || 10);
    if (newQuantity < 1) return;
    if (newQuantity > maxSeats && !selectedSchedule?.unlimitedSeats) {
      toast.error(`Only ${maxSeats} seats available for this date`);
      return;
    }
    if (newQuantity > 10) {
      toast.error('Maximum 10 tickets per booking');
      return;
    }

    setQuantity(newQuantity);
  };

  // Handle coupon code application with backend validation
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError('Please enter a coupon code');
      return;
    }

    // Calculate current order amount (subtotal before service fee and tax)
    const basePrice = selectedSchedule?.price || event.price;
    const orderAmount = basePrice * quantity;

    setIsValidatingCoupon(true);
    setCouponError(null);

    try {
      // Call backend validation API
      const response = await couponAPI.validateCoupon(
        couponCode.trim(),
        orderAmount,
        [event._id] // Pass event ID for event-specific validation
      );

      if (response.success && response.data.isValid) {
        const validationData = response.data;

        // Store validated coupon data
        setValidatedCoupon(validationData);
        setAppliedDiscount(validationData.discountAmount);
        dispatch(setCouponCode(validationData.coupon.code));
        setCouponError(null);

        // Show success message with coupon details
        toast.success(
          `${validationData.coupon.name} applied! Saved ${event.currency} ${validationData.discountAmount.toFixed(2)}`
        );
      } else {
        // Validation failed
        setCouponError('Coupon validation failed');
        setAppliedDiscount(0);
        setValidatedCoupon(null);
        dispatch(setCouponCode(''));
      }
    } catch (error: any) {
      // Handle specific validation errors from backend
      let errorMessage = 'Invalid coupon code';

      if (error.response?.data?.message) {
        const backendMessage = error.response.data.message;

        // Map backend errors to user-friendly messages
        if (backendMessage.includes('not found') || backendMessage.includes('Invalid')) {
          errorMessage = 'Invalid coupon code. Please check and try again.';
        } else if (backendMessage.includes('expired')) {
          errorMessage = 'This coupon has expired.';
        } else if (backendMessage.includes('not valid for this user')) {
          errorMessage = 'You have already used this coupon or reached the usage limit.';
        } else if (backendMessage.includes('not applicable to this order')) {
          errorMessage = 'This coupon is not applicable to this event or does not meet minimum requirements.';
        } else if (backendMessage.includes('Authentication required')) {
          errorMessage = 'Please log in to apply coupons.';
        } else {
          errorMessage = backendMessage;
        }
      }

      setCouponError(errorMessage);
      setAppliedDiscount(0);
      setValidatedCoupon(null);
      dispatch(setCouponCode(''));
      toast.error(errorMessage);
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCodeLocal('');
    setCouponError(null);
    setAppliedDiscount(0);
    setValidatedCoupon(null);
    dispatch(setCouponCode(''));
    toast.success('Coupon removed');
  };

  // Quick apply suggested coupons
  const handleQuickApplyCoupon = async (code: string) => {
    setCouponCodeLocal(code);
    setCouponError(null);

    // Calculate current order amount (subtotal before service fee and tax)
    const basePrice = selectedSchedule?.price || event.price;
    const orderAmount = basePrice * quantity;

    setIsValidatingCoupon(true);

    try {
      // Call backend validation API with the suggested code
      const response = await couponAPI.validateCoupon(
        code.trim(),
        orderAmount,
        [event._id]
      );

      if (response.success && response.data.isValid) {
        const validationData = response.data;
        setValidatedCoupon(validationData);
        setAppliedDiscount(validationData.discountAmount);
        dispatch(setCouponCode(validationData.coupon.code));
        setCouponError(null);
        toast.success(
          `${validationData.coupon.name} applied! Saved ${event.currency} ${validationData.discountAmount.toFixed(2)}`
        );
      } else {
        setCouponError('Coupon validation failed');
        setAppliedDiscount(0);
        setValidatedCoupon(null);
        dispatch(setCouponCode(''));
      }
    } catch (error: any) {
      let errorMessage = 'Invalid coupon code';
      if (error.response?.data?.message) {
        const backendMessage = error.response.data.message;
        if (backendMessage.includes('not found') || backendMessage.includes('Invalid')) {
          errorMessage = 'Invalid coupon code. Please check and try again.';
        } else if (backendMessage.includes('expired')) {
          errorMessage = 'This coupon has expired.';
        } else if (backendMessage.includes('not valid for this user')) {
          errorMessage = 'You have already used this coupon or reached the usage limit.';
        } else if (backendMessage.includes('not applicable to this order')) {
          errorMessage = 'This coupon is not applicable to this event or does not meet minimum requirements.';
        } else if (backendMessage.includes('Authentication required')) {
          errorMessage = 'Please log in to apply coupons.';
        } else {
          errorMessage = backendMessage;
        }
      }
      setCouponError(errorMessage);
      setAppliedDiscount(0);
      setValidatedCoupon(null);
      dispatch(setCouponCode(''));
      toast.error(errorMessage);
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  // Calculate total price with backend-validated discount
  const calculateTotal = () => {
    const basePrice = selectedSchedule?.price || event.price;
    const subtotal = basePrice * quantity;
    // Use discount amount directly from backend validation (not percentage calculation)
    const discountAmount = appliedDiscount || 0;
    const total = Math.max(0, subtotal - discountAmount);
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

    // Skip seat validation for unlimited seats
    if (selectedSchedule && !selectedSchedule.unlimitedSeats && quantity > selectedSchedule.availableSeats) {
      toast.error(`Only ${selectedSchedule.availableSeats} seats available for this date`);
      return;
    }

    onNext();
  };

  return (
    <div className="space-y-6">
      {/* Event Overview - Enhanced */}
      <Card className="overflow-hidden border-2 border-primary/10 hover:border-primary/30 transition-all duration-300 hover:shadow-xl">
        <div className="relative h-48 overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600">
          <img
            src={event.images?.[0] || '/placeholder-event.jpg'}
            alt={event.title}
            className="w-full h-full object-cover opacity-60 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>

          {/* Featured Badge */}
          {event.isFeatured && (
            <div className="absolute top-4 right-4 px-3 py-1.5 bg-yellow-400 rounded-full flex items-center space-x-1 shadow-lg animate-pulse">
              <Star className="w-4 h-4 text-yellow-900 fill-yellow-900" />
              <span className="text-xs font-bold text-yellow-900">FEATURED</span>
            </div>
          )}

          {/* Event Title Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <h3 className="text-2xl font-bold text-white mb-2 drop-shadow-lg">
              {event.title}
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="primary" className="bg-white/20 backdrop-blur-sm text-white border-white/30">
                {event.category}
              </Badge>
              <Badge variant="secondary" className="bg-white/20 backdrop-blur-sm text-white border-white/30">
                {event.type}
              </Badge>
              <Badge variant="outline" className="bg-white/20 backdrop-blur-sm text-white border-white/30">
                {event.venueType}
              </Badge>
            </div>
          </div>
        </div>

        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Location */}
            <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Location</div>
                <div className="text-sm font-medium text-gray-900 truncate">{event.location.city}</div>
                <div className="text-xs text-gray-600 truncate">{event.location.address}</div>
              </div>
            </div>

            {/* Age Range */}
            <div className="flex items-start space-x-3 p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
              <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1">Age Range</div>
                <div className="text-sm font-medium text-gray-900">
                  {event.ageRange[0]} - {event.ageRange[1]} years old
                </div>
                <div className="text-xs text-gray-600">All ages welcome</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Date Selection - Enhanced */}
      <Card className="border-2 border-gray-100 hover:border-blue-200 transition-all duration-300 hover:shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
          <CardTitle className="flex items-center">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mr-3 shadow-md">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">Select Your Date</div>
              <div className="text-xs text-gray-500 font-normal">Choose when you'd like to attend</div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <EventDatePicker
            event={event}
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
          />

          {selectedSchedule && (
            <div className="mt-6 relative overflow-hidden rounded-xl border-2 border-blue-300 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 shadow-lg">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/10 rounded-full -mr-16 -mt-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-400/10 rounded-full -ml-12 -mb-12"></div>

              <div className="relative p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">
                      Available
                    </span>
                  </div>
                  <div className="px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-full shadow-md">
                    {selectedSchedule.unlimitedSeats ? '∞ Unlimited' : `${selectedSchedule.availableSeats} Seats Left`}
                  </div>
                </div>

                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center text-gray-700 mb-2">
                      <Clock className="w-5 h-5 mr-2 text-blue-600" />
                      <div>
                        <div className="font-semibold text-sm">
                          {formatSafeDate(selectedSchedule.startDateTime, 'PPP')}
                        </div>
                        <div className="text-xs text-gray-600">
                          {formatSafeDate(selectedSchedule.startDateTime, 'p')} - {formatSafeDate(selectedSchedule.endDateTime, 'p')}
                        </div>
                      </div>
                    </div>

                    {!selectedSchedule.unlimitedSeats && selectedSchedule.availableSeats <= 10 && (
                      <div className="flex items-center space-x-1 text-xs text-orange-600 font-medium">
                        <Sparkles className="w-3 h-3" />
                        <span>Filling up fast!</span>
                      </div>
                    )}
                  </div>

                  <div className="text-right bg-white/80 backdrop-blur-sm rounded-lg p-3 shadow-md border border-blue-200">
                    <div className="text-xs text-gray-500 mb-1">Price per person</div>
                    <div className="text-2xl font-bold text-blue-700">
                      {event.currency} {selectedSchedule.price || event.price}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quantity Selection - Enhanced */}
      <Card className="border-2 border-gray-100 hover:border-green-200 transition-all duration-300 hover:shadow-lg">
        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-100">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mr-3 shadow-md">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900">Number of Participants</div>
                <div className="text-xs text-gray-500 font-normal">How many people are attending?</div>
              </div>
            </div>
            <Ticket className="w-6 h-6 text-green-500" />
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <div className="max-w-md mx-auto">
            {/* Quantity Counter */}
            <div className="flex items-center justify-center space-x-6 mb-6">
              <button
                onClick={() => handleQuantityChange(quantity - 1)}
                disabled={quantity <= 1}
                className={`
                  w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-pink-500 text-white
                  flex items-center justify-center shadow-lg
                  hover:shadow-xl hover:scale-110 active:scale-95
                  transition-all duration-200
                  ${quantity <= 1 ? 'opacity-50 cursor-not-allowed' : 'hover:from-red-600 hover:to-pink-600'}
                `}
              >
                <Minus className="w-6 h-6" />
              </button>

              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl blur-lg opacity-30 animate-pulse"></div>
                <div className="relative bg-white border-4 border-green-400 rounded-2xl px-8 py-4 shadow-xl">
                  <div className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600 text-center">
                    {quantity}
                  </div>
                  <div className="text-xs text-gray-600 text-center mt-1 font-medium uppercase tracking-wide">
                    {quantity === 1 ? 'Ticket' : 'Tickets'}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleQuantityChange(quantity + 1)}
                disabled={quantity >= 10 || (!selectedSchedule?.unlimitedSeats && quantity >= (selectedSchedule?.availableSeats || 10))}
                className={`
                  w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 text-white
                  flex items-center justify-center shadow-lg
                  hover:shadow-xl hover:scale-110 active:scale-95
                  transition-all duration-200
                  ${(quantity >= 10 || (!selectedSchedule?.unlimitedSeats && quantity >= (selectedSchedule?.availableSeats || 10))) ? 'opacity-50 cursor-not-allowed' : 'hover:from-green-600 hover:to-emerald-600'}
                `}
              >
                <Plus className="w-6 h-6" />
              </button>
            </div>

            {/* Info Bar */}
            <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-200">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-gray-700 font-medium">
                    {selectedSchedule?.unlimitedSeats ? 'Capacity:' : 'Maximum capacity:'}
                  </span>
                </div>
                <span className="text-lg font-bold text-indigo-600">
                  {selectedSchedule?.unlimitedSeats ? '∞ Unlimited' : `${selectedSchedule?.availableSeats || 10} seats`}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="mt-3 bg-white/50 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-500 rounded-full"
                  style={{ width: `${(quantity / (selectedSchedule?.availableSeats || 10)) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Coupon Code - Enhanced UI */}
      <Card className="overflow-hidden border-2 border-dashed border-purple-200 bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mr-3 shadow-lg">
                <Gift className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900">Have a Promo Code?</div>
                <div className="text-xs text-gray-500 font-normal">Save more on your booking</div>
              </div>
            </div>
            {appliedDiscount > 0 && (
              <Sparkles className="w-5 h-5 text-yellow-500 animate-pulse" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {appliedDiscount > 0 && validatedCoupon ? (
            /* Applied Coupon Success State */
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-green-400/20 to-emerald-400/20 animate-pulse"></div>
              <div className="relative bg-white border-2 border-green-400 rounded-xl p-4 shadow-md">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                      <Tag className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-lg font-bold text-green-800">
                          {validatedCoupon.coupon.code}
                        </span>
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                          APPLIED
                        </span>
                      </div>
                      <div className="text-sm font-medium text-gray-700 mb-1">
                        {validatedCoupon.coupon.name}
                      </div>
                      {validatedCoupon.coupon.description && (
                        <div className="text-xs text-gray-600 mb-2">
                          {validatedCoupon.coupon.description}
                        </div>
                      )}
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-bold text-green-700">
                          You're saving {event.currency} {validatedCoupon.discountAmount.toFixed(2)}!
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleRemoveCoupon}
                    className="ml-2 p-1.5 hover:bg-red-50 rounded-lg transition-colors group flex-shrink-0"
                    title="Remove coupon"
                  >
                    <X className="w-5 h-5 text-gray-400 group-hover:text-red-600 transition-colors" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Input and Suggestions */
            <div className="space-y-4">
              {/* Input Field */}
              <div className="relative">
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Enter your promo code"
                      value={couponCode}
                      onChange={(e) => {
                        setCouponCodeLocal(e.target.value.toUpperCase());
                        setCouponError(null);
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && couponCode.trim() && !isValidatingCoupon) {
                          handleApplyCoupon();
                        }
                      }}
                      disabled={isValidatingCoupon}
                      className={`
                        w-full px-4 py-3 pr-10 border-2 rounded-xl font-mono font-semibold text-gray-800
                        focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                        transition-all duration-200
                        ${couponError ? 'border-red-300 bg-red-50 focus:ring-red-500' : 'border-gray-300 bg-white'}
                        ${isValidatingCoupon ? 'bg-gray-50 cursor-not-allowed' : ''}
                        placeholder:text-gray-400 placeholder:font-normal
                      `}
                    />
                    <Tag className={`absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 ${couponError ? 'text-red-400' : 'text-gray-400'}`} />
                  </div>
                  <Button
                    variant="primary"
                    onClick={handleApplyCoupon}
                    disabled={!couponCode.trim() || isValidatingCoupon}
                    leftIcon={isValidatingCoupon ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg"
                  >
                    {isValidatingCoupon ? 'Checking...' : 'Apply'}
                  </Button>
                </div>

                {/* Error Message */}
                {couponError && (
                  <div className="mt-2 flex items-start space-x-2 p-3 bg-red-50 border-l-4 border-red-400 rounded-r-lg animate-shake">
                    <X className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-800">{couponError}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Popular Offers Section */}
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200">
                <div className="flex items-center space-x-2 mb-3">
                  <Gift className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-semibold text-gray-700">Popular Offers</span>
                  <span className="text-xs text-gray-500">• Click to apply</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { code: 'WELCOME50', label: '50% OFF', color: 'from-purple-500 to-purple-600', textColor: 'text-purple-700' },
                    { code: 'FLAT20', label: 'AED 20 OFF', color: 'from-blue-500 to-blue-600', textColor: 'text-blue-700' },
                    { code: 'STUDENT25', label: '25% OFF', color: 'from-green-500 to-green-600', textColor: 'text-green-700' }
                  ].map((offer) => (
                    <button
                      key={offer.code}
                      onClick={() => handleQuickApplyCoupon(offer.code)}
                      disabled={isValidatingCoupon}
                      className={`
                        group relative px-4 py-2.5 bg-gradient-to-r ${offer.color} rounded-lg
                        hover:shadow-lg hover:scale-105 active:scale-95
                        transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                      `}
                    >
                      <div className="absolute inset-0 bg-white/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="relative flex items-center space-x-2">
                        <Tag className="w-3.5 h-3.5 text-white" />
                        <div className="text-left">
                          <div className="text-xs font-bold text-white leading-none mb-0.5">
                            {offer.code}
                          </div>
                          <div className="text-[10px] font-medium text-white/90 leading-none">
                            {offer.label}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-3 text-center">
                  💡 Tip: Discounts are validated instantly from our backend
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Price Summary - Enhanced */}
      <Card className="border-2 border-gray-200 hover:border-primary/30 transition-all duration-300 hover:shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                <DollarSign className="w-7 h-7 text-white" />
              </div>
              <div>
                <div className="text-xl font-bold text-white">Booking Summary</div>
                <div className="text-xs text-gray-400">Review your order details</div>
              </div>
            </div>
            <Ticket className="w-8 h-8 text-gray-600" />
          </div>
        </div>

        <CardContent className="p-6 space-y-4">
          {/* Subtotal */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div>
              <div className="text-sm font-medium text-gray-700">Subtotal</div>
              <div className="text-xs text-gray-500">
                {quantity} × {event.currency} {selectedSchedule?.price || event.price}
              </div>
            </div>
            <div className="text-lg font-bold text-gray-900">
              {event.currency} {subtotal.toFixed(2)}
            </div>
          </div>

          {/* Discount - if applied */}
          {appliedDiscount > 0 && validatedCoupon && (
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-green-400/20 to-emerald-400/20"></div>
              <div className="relative flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-300">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-md">
                    <Tag className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-green-800">
                      Discount Applied
                    </div>
                    <div className="text-xs text-green-600 font-medium">
                      {validatedCoupon.coupon.code}
                      {validatedCoupon.coupon.type === 'percentage' && ` (${validatedCoupon.coupon.value}% off)`}
                      {validatedCoupon.coupon.type === 'fixed_amount' && ' (Fixed amount)'}
                    </div>
                  </div>
                </div>
                <div className="text-lg font-bold text-green-700">
                  -{event.currency} {discountAmount.toFixed(2)}
                </div>
              </div>
            </div>
          )}

          {/* Separator */}
          <div className="border-t-2 border-dashed border-gray-300"></div>

          {/* Total */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-6 shadow-2xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>

            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-white/80 text-sm font-medium uppercase tracking-wider mb-1">
                    Total Amount
                  </div>
                  <div className="text-4xl font-bold text-white">
                    {event.currency} {total.toFixed(2)}
                  </div>
                </div>
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <Check className="w-8 h-8 text-white" />
                </div>
              </div>

              {appliedDiscount > 0 && (
                <div className="flex items-center space-x-2 mt-4 pt-4 border-t border-white/20">
                  <Sparkles className="w-4 h-4 text-yellow-300" />
                  <span className="text-sm font-semibold text-yellow-200">
                    You're saving {event.currency} {discountAmount.toFixed(2)}!
                  </span>
                </div>
              )}

              {/* Info Text */}
              <div className="mt-4 pt-4 border-t border-white/20 text-xs text-white/70">
                <div className="flex items-center justify-between">
                  <span>Payment due now</span>
                  <span className="font-semibold text-white">{event.currency} {total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
              <Check className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-700">Secure Payment</span>
            </div>
            <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg">
              <Check className="w-4 h-4 text-green-600" />
              <span className="text-xs font-medium text-green-700">Instant Confirmation</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons - Enhanced */}
      <div className="sticky bottom-0 bg-white border-t-2 border-gray-200 p-6 -mx-6 shadow-2xl">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Quick Summary */}
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-2 px-3 py-2 bg-blue-50 rounded-lg">
                <Ticket className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-blue-900">{quantity} {quantity === 1 ? 'Ticket' : 'Tickets'}</span>
              </div>
              <div className="flex items-center space-x-2 px-3 py-2 bg-green-50 rounded-lg">
                <DollarSign className="w-4 h-4 text-green-600" />
                <span className="font-semibold text-green-900">{event.currency} {total.toFixed(2)}</span>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={handleNext}
              disabled={!canProceed}
              className={`
                group relative px-8 py-4 rounded-xl font-bold text-lg
                transition-all duration-300 transform
                ${canProceed
                  ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-2xl hover:shadow-blue-500/50 hover:scale-105 active:scale-95'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400 to-purple-400 opacity-0 group-hover:opacity-20 transition-opacity blur"></div>
              <div className="relative flex items-center space-x-2">
                <span>Continue to Participants</span>
                <ChevronRight className={`w-6 h-6 transition-transform ${canProceed ? 'group-hover:translate-x-1' : ''}`} />
              </div>
            </button>
          </div>

          {/* Helper Text */}
          {!canProceed && (
            <div className="mt-4 flex items-center justify-center space-x-2 text-sm text-orange-600 bg-orange-50 rounded-lg p-3">
              <Sparkles className="w-4 h-4" />
              <span className="font-medium">
                Please select a date and number of participants to continue
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingDetails;