import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { User, Phone, Mail, Calendar, Heart, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

import { AppDispatch } from '../../store';
import {
  updateParticipant,
  updateParticipantRegistrationData,
  selectBookingParticipants
} from '../../store/slices/bookingsSlice';
import { Event } from '../../types/event';
import { BookingParticipant } from '../../services/api/bookingAPI';

import Button from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import DynamicRegistrationForm from './DynamicRegistrationForm';

interface ParticipantFormProps {
  event: Event;
  onNext: () => void;
  onPrev: () => void;
}

const ParticipantForm: React.FC<ParticipantFormProps> = ({
  event,
  onNext,
  onPrev
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const participants = useSelector(selectBookingParticipants);

  const [errors, setErrors] = useState<Record<number, Record<string, string>>>({});
  const [dynamicRegistrationData, setDynamicRegistrationData] = useState<Record<number, any>>({});

  // Debug logging for registration config
  useEffect(() => {
    console.log('🔍 ParticipantForm Debug:', {
      hasEvent: !!event,
      hasRegistrationConfig: !!event?.registrationConfig,
      isEnabled: event?.registrationConfig?.enabled,
      fieldsCount: event?.registrationConfig?.fields?.length || 0,
      fields: event?.registrationConfig?.fields,
      fullRegistrationConfig: event?.registrationConfig
    });
  }, [event]);

  // Validate participant data
  const validateParticipant = (participant: BookingParticipant, index: number): boolean => {
    const participantErrors: Record<string, string> = {};

    if (!participant.name.trim()) {
      participantErrors.name = 'Name is required';
    }

    if (!participant.email.trim()) {
      participantErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(participant.email)) {
      participantErrors.email = 'Please enter a valid email address';
    }

    if (participant.phone && participant.phone.length < 10) {
      participantErrors.phone = 'Please enter a valid phone number';
    }

    if (participant.age && (participant.age < event.ageRange[0] || participant.age > event.ageRange[1])) {
      participantErrors.age = `Age must be between ${event.ageRange[0]} and ${event.ageRange[1]} years`;
    }

    if (participant.emergencyContact?.name && !participant.emergencyContact.phone) {
      participantErrors.emergencyPhone = 'Emergency contact phone is required';
    }

    setErrors(prev => ({
      ...prev,
      [index]: participantErrors
    }));

    return Object.keys(participantErrors).length === 0;
  };

  // Validate all participants
  const validateAllParticipants = (): boolean => {
    let allValid = true;
    
    participants.forEach((participant, index) => {
      const isValid = validateParticipant(participant, index);
      if (!isValid) allValid = false;
    });

    return allValid;
  };

  // Handle form input changes
  const handleInputChange = (
    index: number, 
    field: keyof BookingParticipant, 
    value: string | number
  ) => {
    const updatedParticipant: Partial<BookingParticipant> = {
      [field]: value
    };

    dispatch(updateParticipant({ index, participant: updatedParticipant }));

    // Clear errors for this field
    setErrors(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        [field]: ''
      }
    }));
  };

  // Handle emergency contact changes
  const handleEmergencyContactChange = (
    index: number,
    field: 'name' | 'phone' | 'relationship',
    value: string
  ) => {
    const participant = participants[index];
    const updatedParticipant: Partial<BookingParticipant> = {
      emergencyContact: {
        name: participant.emergencyContact?.name || '',
        phone: participant.emergencyContact?.phone || '',
        relationship: participant.emergencyContact?.relationship || '',
        ...{ [field]: value }
      }
    };

    dispatch(updateParticipant({ index, participant: updatedParticipant }));
  };

  // Handle dietary restrictions
  const handleDietaryRestrictionChange = (
    index: number,
    restriction: string,
    checked: boolean
  ) => {
    const participant = participants[index];
    const currentRestrictions = participant.dietaryRestrictions || [];

    let updatedRestrictions: string[];
    if (checked) {
      updatedRestrictions = [...currentRestrictions, restriction];
    } else {
      updatedRestrictions = currentRestrictions.filter(r => r !== restriction);
    }

    const updatedParticipant: Partial<BookingParticipant> = {
      dietaryRestrictions: updatedRestrictions
    };

    dispatch(updateParticipant({ index, participant: updatedParticipant }));
  };

  // Handle dynamic registration data change
  // Wrapped in useCallback to prevent infinite loop in DynamicRegistrationForm
  const handleDynamicDataChange = useCallback((participantIndex: number, data: Record<string, any>) => {
    // Store in local state for real-time updates
    setDynamicRegistrationData(prev => ({
      ...prev,
      [participantIndex]: data
    }));

    // Also store in Redux for persistence across navigation
    dispatch(updateParticipantRegistrationData({
      index: participantIndex,
      registrationData: data
    }));
  }, [dispatch]);

  const handleNext = () => {
    if (!validateAllParticipants()) {
      toast.error('Please fill in all required fields correctly');
      return;
    }
    onNext();
  };

  const commonDietaryRestrictions = [
    'Vegetarian',
    'Vegan',
    'Gluten-Free',
    'Dairy-Free',
    'Nut Allergies',
    'Halal',
    'Kosher',
    'Other'
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Participant Information</h2>
        <p className="text-gray-600">
          Please provide details for all participants attending this event
        </p>
      </div>

      {participants.map((participant, index) => (
        <Card key={participant.id} className="overflow-hidden">
          <CardHeader className="bg-gray-50">
            <CardTitle className="flex items-center text-lg">
              <User className="w-5 h-5 mr-2" />
              Participant {index + 1}
              {participants.length > 1 && index === 0 && (
                <span className="ml-2 text-sm bg-primary text-white px-2 py-1 rounded-full">
                  Primary
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Enter full name"
                    value={participant.name}
                    onChange={(e) => handleInputChange(index, 'name', e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                      errors[index]?.name 
                        ? 'border-red-300 focus:ring-red-500' 
                        : 'border-gray-300 focus:ring-primary'
                    }`}
                  />
                </div>
                {errors[index]?.name && (
                  <p className="mt-1 text-sm text-red-600">{errors[index].name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="email"
                    placeholder="Enter email address"
                    value={participant.email}
                    onChange={(e) => handleInputChange(index, 'email', e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                      errors[index]?.email 
                        ? 'border-red-300 focus:ring-red-500' 
                        : 'border-gray-300 focus:ring-primary'
                    }`}
                  />
                </div>
                {errors[index]?.email && (
                  <p className="mt-1 text-sm text-red-600">{errors[index].email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="tel"
                    placeholder="Enter phone number"
                    value={participant.phone || ''}
                    onChange={(e) => handleInputChange(index, 'phone', e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                      errors[index]?.phone 
                        ? 'border-red-300 focus:ring-red-500' 
                        : 'border-gray-300 focus:ring-primary'
                    }`}
                  />
                </div>
                {errors[index]?.phone && (
                  <p className="mt-1 text-sm text-red-600">{errors[index].phone}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Age
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="number"
                    placeholder={`${event.ageRange[0]}-${event.ageRange[1]} years`}
                    value={participant.age || ''}
                    onChange={(e) => handleInputChange(index, 'age', parseInt(e.target.value) || 0)}
                    min={event.ageRange[0]}
                    max={event.ageRange[1]}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                      errors[index]?.age 
                        ? 'border-red-300 focus:ring-red-500' 
                        : 'border-gray-300 focus:ring-primary'
                    }`}
                  />
                </div>
                {errors[index]?.age && (
                  <p className="mt-1 text-sm text-red-600">{errors[index].age}</p>
                )}
              </div>
            </div>

            {/* Gender Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gender
              </label>
              <div className="flex space-x-4">
                {['male', 'female', 'other'].map((gender) => (
                  <label key={gender} className="flex items-center">
                    <input
                      type="radio"
                      name={`gender-${index}`}
                      value={gender}
                      checked={participant.gender === gender}
                      onChange={(e) => handleInputChange(index, 'gender', e.target.value)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700 capitalize">{gender}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <Heart className="w-4 h-4 mr-2 text-red-500" />
                Emergency Contact (Recommended)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="Contact name"
                  value={participant.emergencyContact?.name || ''}
                  onChange={(e) => handleEmergencyContactChange(index, 'name', e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <input
                  type="tel"
                  placeholder="Contact phone"
                  value={participant.emergencyContact?.phone || ''}
                  onChange={(e) => handleEmergencyContactChange(index, 'phone', e.target.value)}
                  className={`px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    errors[index]?.emergencyPhone 
                      ? 'border-red-300 focus:ring-red-500' 
                      : 'border-gray-300 focus:ring-primary'
                  }`}
                />
                <select
                  value={participant.emergencyContact?.relationship || ''}
                  onChange={(e) => handleEmergencyContactChange(index, 'relationship', e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Relationship</option>
                  <option value="parent">Parent</option>
                  <option value="guardian">Guardian</option>
                  <option value="sibling">Sibling</option>
                  <option value="spouse">Spouse</option>
                  <option value="friend">Friend</option>
                  <option value="other">Other</option>
                </select>
              </div>
              {errors[index]?.emergencyPhone && (
                <p className="mt-1 text-sm text-red-600">{errors[index].emergencyPhone}</p>
              )}
            </div>

            {/* Dietary Restrictions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dietary Restrictions & Allergies
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {commonDietaryRestrictions.map((restriction) => (
                  <label key={restriction} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={participant.dietaryRestrictions?.includes(restriction) || false}
                      onChange={(e) => handleDietaryRestrictionChange(index, restriction, e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">{restriction}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Special Requirements */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Special Requirements
              </label>
              <textarea
                placeholder="Any special accommodations, medical conditions, or other requirements we should know about?"
                value={participant.specialRequirements || ''}
                onChange={(e) => handleInputChange(index, 'specialRequirements', e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Dynamic Registration Form - Custom fields defined by vendor */}
            {event.registrationConfig?.enabled && event.registrationConfig.fields.length > 0 && (
              <div className="border-t pt-4 mt-4">
                <DynamicRegistrationForm
                  config={event.registrationConfig}
                  participantIndex={index}
                  onDataChange={handleDynamicDataChange}
                  initialData={dynamicRegistrationData[index]}
                />
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Important Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-yellow-800 mb-1">Important Notice</h4>
            <p className="text-sm text-yellow-700">
              Please ensure all information is accurate as it will be used for registration, 
              safety purposes, and emergency contact if needed. You can update participant 
              information up to 24 hours before the event starts.
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={onPrev}
          leftIcon={<ChevronLeft className="w-4 h-4" />}
        >
          Back to Details
        </Button>
        <Button
          variant="primary"
          onClick={handleNext}
          rightIcon={<ChevronRight className="w-4 h-4" />}
        >
          Continue to Payment
        </Button>
      </div>
    </div>
  );
};

export default ParticipantForm;