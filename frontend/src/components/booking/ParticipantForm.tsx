import React, { useState, useEffect, useCallback, useContext } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  User,
  Phone,
  Mail,
  Calendar,
  Heart,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";

import { AppDispatch } from "../../store";
import {
  updateParticipant,
  updateParticipantRegistrationData,
  selectBookingParticipants,
} from "../../store/slices/bookingsSlice";
import { Event } from "../../types/event";
import { BookingParticipant } from "../../services/api/bookingAPI";
import logger from "../../utils/logger";
import { AuthContext } from "../../contexts/authContextDef";

import Button from "../ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import DynamicRegistrationForm from "./DynamicRegistrationForm";

interface ParticipantFormProps {
  event: Event;
  onNext: () => void;
  onPrev: () => void;
}

const ParticipantForm: React.FC<ParticipantFormProps> = ({
  event,
  onNext,
  onPrev,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const participants = useSelector(selectBookingParticipants);
  const authContext = useContext(AuthContext);
  const user = authContext?.user ?? null;

  const [errors, setErrors] = useState<Record<number, Record<string, string>>>(
    {},
  );
  const [dynamicRegistrationData, setDynamicRegistrationData] = useState<
    Record<number, any>
  >({});
  const [useMyDetails, setUseMyDetails] = useState(false);

  const getAgeFromDateOfBirth = (dateOfBirth?: string): number | undefined => {
    if (!dateOfBirth) return undefined;

    const dob = new Date(dateOfBirth);
    if (Number.isNaN(dob.getTime())) return undefined;

    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }

    return age > 0 ? age : undefined;
  };

  useEffect(() => {
    if (!useMyDetails || participants.length !== 1 || !user) return;

    const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
    const participantPatch: Partial<BookingParticipant> = {
      name: fullName,
      email: user.email || "",
      phone: user.phone || "",
    };

    const age = getAgeFromDateOfBirth(user.dateOfBirth);
    if (age) {
      participantPatch.age = age;
    }

    dispatch(updateParticipant({ index: 0, participant: participantPatch }));
  }, [useMyDetails, participants.length, user, dispatch]);

  // Debug logging for registration config
  useEffect(() => {
    logger.debug("ParticipantForm Debug", {
      hasEvent: !!event,
      hasRegistrationConfig: !!event?.registrationConfig,
      isEnabled: event?.registrationConfig?.enabled,
      fieldsCount: event?.registrationConfig?.fields?.length || 0,
      fields: event?.registrationConfig?.fields,
      fullRegistrationConfig: event?.registrationConfig,
    });
  }, [event]);

  // Validate participant data
  const validateParticipant = (
    participant: BookingParticipant,
    index: number,
  ): boolean => {
    const participantErrors: Record<string, string> = {};
    const participantName = participant.name?.trim?.() || "";
    const participantEmail = participant.email?.trim?.() || "";
    const participantPhone = participant.phone || "";
    const emergencyContact = participant.emergencyContact || {
      name: "",
      phone: "",
      relationship: "",
    };
    const registrationData = Array.isArray(participant.registrationData)
      ? participant.registrationData
      : [];

    if (!participantName) {
      participantErrors.name = "Name is required";
    }

    if (!participantEmail) {
      participantErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(participantEmail)) {
      participantErrors.email = "Please enter a valid email address";
    }

    if (participantPhone && participantPhone.length < 10) {
      participantErrors.phone = "Please enter a valid phone number";
    }

    // Age validation - only validate if ageRange is properly defined
    const rawMin = Number(event.ageRange?.[0]);
    const rawMax = Number(event.ageRange?.[1]);
    const isValidMin = !isNaN(rawMin) && event.ageRange?.[0] !== null && event.ageRange?.[0] !== undefined;
    const isValidMax = !isNaN(rawMax) && event.ageRange?.[1] !== null && event.ageRange?.[1] !== undefined;
    
    const minAge = isValidMin && isValidMax ? Math.min(rawMin, rawMax) : (isValidMin ? rawMin : undefined);
    const maxAge = isValidMin && isValidMax ? Math.max(rawMin, rawMax) : (isValidMax ? rawMax : undefined);
    
    const hasValidAgeRange =
      typeof minAge === "number" &&
      typeof maxAge === "number" &&
      maxAge >= minAge;

    if (!participant.age) {
      if (hasValidAgeRange) {
        participantErrors.age = "Age is required";
      }
    } else if (
      hasValidAgeRange &&
      (participant.age < minAge || participant.age > maxAge)
    ) {
      participantErrors.age = `Age must be between ${minAge} and ${maxAge} years`;
    }

    if (!isOnlineEvent) {
      if (
        emergencyContact.name &&
        !emergencyContact.phone
      ) {
        participantErrors.emergencyPhone = "Emergency contact phone is required";
      }
    } else {
      const rawSelectedDevices = registrationData
        .find((item) => item.fieldId === "deviceAccess")?.value;
      const selectedDevices = Array.isArray(rawSelectedDevices)
        ? rawSelectedDevices
        : [];
      const internetConfirmed = Boolean(
        registrationData.find(
          (item) => item.fieldId === "internetConfirmation",
        )?.value,
      );

      if (!selectedDevices || selectedDevices.length === 0) {
        participantErrors.deviceAccess = "Please select at least one device";
      }

      if (!internetConfirmed) {
        participantErrors.internetConfirmation = "Please confirm your internet connection";
      }

      if (isKidsEvent) {
        const guardianName = registrationData.find(
          (item) => item.fieldId === "guardianName",
        )?.value;
        const guardianEmail = registrationData.find(
          (item) => item.fieldId === "guardianEmail",
        )?.value;
        const guardianPhone = registrationData.find(
          (item) => item.fieldId === "guardianPhone",
        )?.value;
        const guardianRelationship = registrationData.find(
          (item) => item.fieldId === "guardianRelationship",
        )?.value;

        if (!guardianName) {
          participantErrors.guardianName = "Parent / Guardian name is required";
        }
        if (!guardianEmail) {
          participantErrors.guardianEmail = "Parent / Guardian email is required";
        }
        if (!guardianPhone) {
          participantErrors.guardianPhone = "Parent / Guardian phone is required";
        }
        if (!guardianRelationship) {
          participantErrors.guardianRelationship = "Relationship is required";
        }
      }
    }

    setErrors((prev) => ({
      ...prev,
      [index]: participantErrors,
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

    // Cross-participant duplicate check: same name + email = blocked
    const seen = new Map<string, number>();
    const duplicateIndices = new Set<number>();

    participants.forEach((p, index) => {
      const name = p.name.trim().toLowerCase();
      const email = p.email.trim().toLowerCase();
      if (name && email) {
        const key = `${name}|${email}`;
        if (seen.has(key)) {
          duplicateIndices.add(seen.get(key)!);
          duplicateIndices.add(index);
        } else {
          seen.set(key, index);
        }
      }
    });

    if (duplicateIndices.size > 0) {
      allValid = false;
      setErrors((prev) => {
        const next = { ...prev };
        duplicateIndices.forEach((idx) => {
          next[idx] = {
            ...(next[idx] || {}),
            name: "Duplicate: same name and email as another participant",
          };
        });
        return next;
      });
    }

    return allValid;
  };

  // Handle form input changes
  const handleInputChange = (
    index: number,
    field: keyof BookingParticipant,
    value: string | number,
  ) => {
    const updatedParticipant: Partial<BookingParticipant> = {
      [field]: value,
    };

    dispatch(updateParticipant({ index, participant: updatedParticipant }));

    // Clear errors for this field
    setErrors((prev) => ({
      ...prev,
      [index]: {
        ...prev[index],
        [field]: "",
      },
    }));
  };

  // Handle emergency contact changes
  const handleEmergencyContactChange = (
    index: number,
    field: "name" | "phone" | "relationship",
    value: string,
  ) => {
    const participant = participants[index];
    const updatedParticipant: Partial<BookingParticipant> = {
      emergencyContact: {
        name: participant.emergencyContact?.name || "",
        phone: participant.emergencyContact?.phone || "",
        relationship: participant.emergencyContact?.relationship || "",
        ...{ [field]: value },
      },
    };

    dispatch(updateParticipant({ index, participant: updatedParticipant }));
  };

  // Handle dietary restrictions
  const handleDietaryRestrictionChange = (
    index: number,
    restriction: string,
    checked: boolean,
  ) => {
    const participant = participants[index];
    const currentRestrictions = participant.dietaryRestrictions || [];

    let updatedRestrictions: string[];
    if (checked) {
      updatedRestrictions = [...currentRestrictions, restriction];
    } else {
      updatedRestrictions = currentRestrictions.filter(
        (r) => r !== restriction,
      );
    }

    const updatedParticipant: Partial<BookingParticipant> = {
      dietaryRestrictions: updatedRestrictions,
    };

    dispatch(updateParticipant({ index, participant: updatedParticipant }));
  };

  // Handle dynamic registration data change
  // Wrapped in useCallback to prevent infinite loop in DynamicRegistrationForm
  const handleDynamicDataChange = useCallback(
    (participantIndex: number, data: Record<string, any>) => {
      // Store in local state for real-time updates (can hold File objects)
      setDynamicRegistrationData((prev) => ({
        ...prev,
        [participantIndex]: data,
      }));

      // Transform record to array format for Redux
      // IMPORTANT: File objects are not serializable — store metadata only in Redux.
      // The actual File objects remain in dynamicRegistrationData local state and
      // will be collected from there when the form is submitted.
      if (event.registrationConfig?.fields) {
        const registrationDataArray = event.registrationConfig.fields
          .map((field) => {
            let value = data[field.id];

            // Replace File objects with serializable metadata
            if (value instanceof File) {
              value = {
                _isFile: true,
                name: value.name,
                size: value.size,
                type: value.type,
              };
            } else if (
              Array.isArray(value) &&
              value.some((v) => v instanceof File)
            ) {
              value = value.map((v) =>
                v instanceof File
                  ? { _isFile: true, name: v.name, size: v.size, type: v.type }
                  : v,
              );
            }

            return {
              fieldId: field.id,
              fieldLabel: field.label,
              fieldType: field.type,
              value,
            };
          })
          .filter((item) => item.value !== undefined);

        // Also store in Redux for persistence across navigation
        dispatch(
          updateParticipantRegistrationData({
            index: participantIndex,
            registrationData: registrationDataArray,
          }),
        );
      }
    },
    [dispatch, event.registrationConfig],
  );

  const isOnlineEvent = event.venueType === "Online";

  const sortedAgeRange = (() => {
    const rawMin = Number(event.ageRange?.[0]);
    const rawMax = Number(event.ageRange?.[1]);
    const isValidMin = !isNaN(rawMin) && event.ageRange?.[0] !== null && event.ageRange?.[0] !== undefined;
    const isValidMax = !isNaN(rawMax) && event.ageRange?.[1] !== null && event.ageRange?.[1] !== undefined;

    const minAge = isValidMin && isValidMax ? Math.min(rawMin, rawMax) : (isValidMin ? rawMin : undefined);
    const maxAge = isValidMin && isValidMax ? Math.max(rawMin, rawMax) : (isValidMax ? rawMax : undefined);

    return { minAge, maxAge };
  })();

  const isKidsEvent =
    isOnlineEvent &&
    typeof sortedAgeRange.maxAge === "number" &&
    sortedAgeRange.maxAge <= 14;

  const updateOnlineRegistrationData = (
    index: number,
    fieldId: string,
    fieldLabel: string,
    fieldType: string,
    value: any,
  ) => {
    const participant = participants[index];
    const existing = participant.registrationData || [];
    const nextRegistrationData = [
      ...existing.filter((item) => item.fieldId !== fieldId),
      { fieldId, fieldLabel, fieldType, value },
    ];

    dispatch(
      updateParticipantRegistrationData({
        index,
        registrationData: nextRegistrationData,
      }),
    );
  };

  const getRegistrationFieldValue = (index: number, fieldId: string) => {
    return (Array.isArray(participants[index]?.registrationData)
      ? participants[index]?.registrationData
      : []
    ).find(
      (item) => item.fieldId === fieldId,
    )?.value;
  };

  const handleNext = () => {
    if (!validateAllParticipants()) {
      toast.error("Please fill in all required fields correctly");
      return;
    }
    onNext();
  };

  const commonDietaryRestrictions = [
    "Vegetarian",
    "Vegan",
    "Gluten-Free",
    "Dairy-Free",
    "Nut Allergies",
    "Halal",
    "Kosher",
    "Other",
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {isOnlineEvent ? "Online Event Registration" : "Participant Information"}
        </h2>
        <p className="text-gray-600">
          {isOnlineEvent
            ? "Please provide the details needed for the live online session"
            : "Please provide details for all participants attending this event"}
        </p>
      </div>

      {participants.length === 1 && user && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={useMyDetails}
              onChange={(e) => setUseMyDetails(e.target.checked)}
              className="h-4 w-4 text-primary border-gray-300 rounded"
            />
            <div>
              <p className="text-sm font-semibold text-blue-800">Add your own details</p>
              <p className="text-xs text-blue-700">Auto-fill participant information from your account profile.</p>
            </div>
          </label>
        </div>
      )}

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
                    onChange={(e) =>
                      handleInputChange(index, "name", e.target.value)
                    }
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                      errors[index]?.name
                        ? "border-red-300 focus:ring-red-500"
                        : "border-gray-300 focus:ring-primary"
                    }`}
                  />
                </div>
                {errors[index]?.name && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors[index].name}
                  </p>
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
                    onChange={(e) =>
                      handleInputChange(index, "email", e.target.value)
                    }
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                      errors[index]?.email
                        ? "border-red-300 focus:ring-red-500"
                        : "border-gray-300 focus:ring-primary"
                    }`}
                  />
                </div>
                {errors[index]?.email && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors[index].email}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number{isOnlineEvent ? " (Optional)" : ""}
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="tel"
                    placeholder="Enter phone number"
                    value={participant.phone || ""}
                    onChange={(e) =>
                      handleInputChange(index, "phone", e.target.value)
                    }
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                      errors[index]?.phone
                        ? "border-red-300 focus:ring-red-500"
                        : "border-gray-300 focus:ring-primary"
                    }`}
                  />
                </div>
                {errors[index]?.phone && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors[index].phone}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isOnlineEvent ? "Age Group" : "Age"}{" "}
                  {sortedAgeRange.minAge !== undefined && sortedAgeRange.maxAge !== undefined
                    ? `(${sortedAgeRange.minAge}–${sortedAgeRange.maxAge} years)`
                    : ""}{" "}
                  *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="number"
                    placeholder={
                      sortedAgeRange.minAge !== undefined && sortedAgeRange.maxAge !== undefined
                        ? `${sortedAgeRange.minAge}–${sortedAgeRange.maxAge} years`
                        : "Enter age"
                    }
                    value={participant.age || ""}
                    onChange={(e) =>
                      handleInputChange(
                        index,
                        "age",
                        parseInt(e.target.value) || 0,
                      )
                    }
                    min={sortedAgeRange.minAge ?? 0}
                    max={sortedAgeRange.maxAge ?? 150}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                      errors[index]?.age
                        ? "border-red-300 focus:ring-red-500"
                        : "border-gray-300 focus:ring-primary"
                    }`}
                  />
                </div>
                {errors[index]?.age && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors[index].age}
                  </p>
                )}
              </div>
            </div>

            {/* Gender Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gender{isOnlineEvent ? " (Optional)" : ""}
              </label>
              <div className="flex space-x-4">
                {[
                  "male",
                  "female",
                  "other",
                  ...(isOnlineEvent ? ["prefer not to say"] : []),
                ].map((gender) => (
                  <label key={gender} className="flex items-center">
                    <input
                      type="radio"
                      name={`gender-${index}`}
                      value={gender}
                      checked={participant.gender === gender}
                      onChange={(e) =>
                        handleInputChange(index, "gender", e.target.value)
                      }
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700 capitalize">
                      {gender}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {isOnlineEvent ? (
              <>
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                    <Heart className="w-4 h-4 mr-2 text-blue-500" />
                    Online Access Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {["Laptop / Desktop", "Tablet", "Mobile Phone"].map((device) => {
                      const rawSelectedDevices = getRegistrationFieldValue(index, "deviceAccess");
                      const selectedDevices = Array.isArray(rawSelectedDevices)
                        ? rawSelectedDevices
                        : [];
                      const checked = selectedDevices.includes(device);

                      return (
                        <label key={device} className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const nextDevices = e.target.checked
                                ? [...selectedDevices, device]
                                : selectedDevices.filter((item) => item !== device);
                              updateOnlineRegistrationData(
                                index,
                                "deviceAccess",
                                "Device Access",
                                "checkbox",
                                nextDevices,
                              );
                            }}
                            className="h-4 w-4 text-primary border-gray-300 rounded"
                          />
                          <span className="text-sm text-gray-700">{device}</span>
                        </label>
                      );
                    })}
                  </div>
                  {errors[index]?.deviceAccess && (
                    <p className="mt-2 text-sm text-red-600">
                      {errors[index].deviceAccess}
                    </p>
                  )}
                  <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={Boolean(getRegistrationFieldValue(index, "internetConfirmation"))}
                        onChange={(e) =>
                          updateOnlineRegistrationData(
                            index,
                            "internetConfirmation",
                            "Internet Confirmation",
                            "checkbox",
                            e.target.checked,
                          )
                        }
                        className="mt-1 h-4 w-4 text-primary border-gray-300 rounded"
                      />
                      <span className="text-sm text-blue-900">
                        I have a stable internet connection for attending the live session.
                      </span>
                    </label>
                  </div>
                  {errors[index]?.internetConfirmation && (
                    <p className="mt-2 text-sm text-red-600">
                      {errors[index].internetConfirmation}
                    </p>
                  )}
                </div>

                {isKidsEvent && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                      <Users className="w-4 h-4 mr-2 text-green-500" />
                      Parent / Guardian Details
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="Parent / Guardian name"
                        value={(getRegistrationFieldValue(index, "guardianName") as string) || ""}
                        onChange={(e) =>
                          updateOnlineRegistrationData(
                            index,
                            "guardianName",
                            "Parent / Guardian Name",
                            "text",
                            e.target.value,
                          )
                        }
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      {errors[index]?.guardianName && (
                        <p className="-mt-2 text-sm text-red-600 md:col-span-2">
                          {errors[index].guardianName}
                        </p>
                      )}
                      <input
                        type="email"
                        placeholder="Parent / Guardian email"
                        value={(getRegistrationFieldValue(index, "guardianEmail") as string) || ""}
                        onChange={(e) =>
                          updateOnlineRegistrationData(
                            index,
                            "guardianEmail",
                            "Parent / Guardian Email",
                            "email",
                            e.target.value,
                          )
                        }
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      {errors[index]?.guardianEmail && (
                        <p className="-mt-2 text-sm text-red-600 md:col-span-2">
                          {errors[index].guardianEmail}
                        </p>
                      )}
                      <input
                        type="tel"
                        placeholder="Parent / Guardian phone"
                        value={(getRegistrationFieldValue(index, "guardianPhone") as string) || ""}
                        onChange={(e) =>
                          updateOnlineRegistrationData(
                            index,
                            "guardianPhone",
                            "Parent / Guardian Phone",
                            "tel",
                            e.target.value,
                          )
                        }
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      {errors[index]?.guardianPhone && (
                        <p className="-mt-2 text-sm text-red-600 md:col-span-2">
                          {errors[index].guardianPhone}
                        </p>
                      )}
                      <input
                        type="text"
                        placeholder="Relationship"
                        value={(getRegistrationFieldValue(index, "guardianRelationship") as string) || ""}
                        onChange={(e) =>
                          updateOnlineRegistrationData(
                            index,
                            "guardianRelationship",
                            "Parent / Guardian Relationship",
                            "text",
                            e.target.value,
                          )
                        }
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      {errors[index]?.guardianRelationship && (
                        <p className="-mt-2 text-sm text-red-600 md:col-span-2">
                          {errors[index].guardianRelationship}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Experience Level
                  </label>
                  <select
                    value={(getRegistrationFieldValue(index, "experienceLevel") as string) || ""}
                    onChange={(e) =>
                      updateOnlineRegistrationData(
                        index,
                        "experienceLevel",
                        "Experience Level",
                        "dropdown",
                        e.target.value,
                      )
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select your experience level</option>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Questions for Instructor
                  </label>
                  <textarea
                    placeholder="Anything you'd like the instructor to know?"
                    value={participant.specialRequirements || ""}
                    onChange={(e) =>
                      handleInputChange(
                        index,
                        "specialRequirements",
                        e.target.value,
                      )
                    }
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </>
            ) : (
              <>
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
                      value={participant.emergencyContact?.name || ""}
                      onChange={(e) =>
                        handleEmergencyContactChange(index, "name", e.target.value)
                      }
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <input
                      type="tel"
                      placeholder="Contact phone"
                      value={participant.emergencyContact?.phone || ""}
                      onChange={(e) =>
                        handleEmergencyContactChange(index, "phone", e.target.value)
                      }
                      className={`px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                        errors[index]?.emergencyPhone
                          ? "border-red-300 focus:ring-red-500"
                          : "border-gray-300 focus:ring-primary"
                      }`}
                    />
                    <select
                      value={participant.emergencyContact?.relationship || ""}
                      onChange={(e) =>
                        handleEmergencyContactChange(
                          index,
                          "relationship",
                          e.target.value,
                        )
                      }
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
                    <p className="mt-1 text-sm text-red-600">
                      {errors[index].emergencyPhone}
                    </p>
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
                          checked={
                            participant.dietaryRestrictions?.includes(
                              restriction,
                            ) || false
                          }
                          onChange={(e) =>
                            handleDietaryRestrictionChange(
                              index,
                              restriction,
                              e.target.checked,
                            )
                          }
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
                    value={participant.specialRequirements || ""}
                    onChange={(e) =>
                      handleInputChange(
                        index,
                        "specialRequirements",
                        e.target.value,
                      )
                    }
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </>
            )}

            {/* Dynamic Registration Form - Custom fields defined by vendor */}
            {event.registrationConfig?.enabled &&
              event.registrationConfig.fields?.length > 0 && (
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
            <h4 className="text-sm font-semibold text-yellow-800 mb-1">
              {isOnlineEvent ? "Online Session Notice" : "Important Notice"}
            </h4>
            <p className="text-sm text-yellow-700">
              {isOnlineEvent
                ? "Please ensure your device access and internet details are accurate so we can support your live session registration."
                : "Please ensure all information is accurate as it will be used for registration, safety purposes, and emergency contact if needed. You can update participant information up to 24 hours before the event starts."}
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
