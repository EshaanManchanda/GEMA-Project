import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import adminAPI from "../../services/api/adminAPI";
import categoriesAPI from "../../services/api/categoriesAPI";
import { UploadAPI } from "../../services/api/uploadAPI";
import FormBuilder from "@/components/registration/FormBuilder";
import BasicInfoTab from "../../components/admin/BasicInfoTab";
import SchedulePricingTab from "../../components/admin/SchedulePricingTab";
import AdvancedTab from "../../components/admin/AdvancedTab";
import ReviewsTab from "../../components/admin/ReviewsTab";
import CertificateTypesTab from "../../components/admin/CertificateTypesTab";
import {
  Calendar,
  MapPin,
  Star,
  FileText,
  ArrowLeft,
  Save,
  CheckCircle2,
  Award,
} from "lucide-react";
import Badge from "../../components/ui/Badge";
import { MediaAsset } from "@/store/slices/mediaSlice";
import PrivatePageSEO from "@/components/common/PrivatePageSEO";
import { PastEventMemory } from "@/types/event";
import { eventsKeys, adminKeys } from "@/hooks/queries/queryKeys";
import logger from "@/utils/logger";

interface TimeSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  availableSeats: string;
  price: string;
}

interface Schedule {
  id: string;
  _id?: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  availableSeats: string;
  totalSeats?: string;
  soldSeats?: string;
  reservedSeats?: string;
  price: string;
  unlimitedSeats?: boolean;
  isSpecialDate?: boolean;
  specialDates?: string[];
  priority?: number;
  isOverride?: boolean;
  timeSlots?: TimeSlot[];
  sessionType?: string;
  ratePerClass?: string;
  isFreeSession?: boolean;
  description?: string;
}

interface FAQ {
  id?: string;
  _id?: string;
  question: string;
  answer: string;
}

interface UploadedBookingAttachment {
  originalName: string;
  filename: string;
  url: string;
  size: number;
  mimetype: string;
  provider?: 'local' | 'cloudinary';
  publicId?: string;
  cloudinaryUrl?: string;
  uploadedAt?: string;
}

interface EventFormData {
  // Basic Info
  title: string;
  description: string;
  shortDescription: string;
  customCSS: string;
  category: string;
  type:
  | "Olympiad"
  | "Championship"
  | "Competition"
  | "Event"
  | "Course"
  | "Venue"
  | "Workshop"
  | "Class"
  | "Bootcamp"
  | "Masterclass";
  venueType: "Indoor" | "Outdoor" | "Online" | "Offline";
  ageRangeMin: string;
  ageRangeMax: string;
  tags: string[];
  images: string[]; // MediaAsset IDs
  imagePreviewUrls: string[];
  bookingAttachments: UploadedBookingAttachment[];

  // Admin-specific fields
  isApproved: boolean;
  isFeatured: boolean;
  requirePhoneVerification: boolean;
  status: "draft" | "published" | "archived" | "pending" | "rejected";
  isActive: boolean;
  vendorId: string;

  // Affiliate Event fields
  isAffiliateEvent: boolean;
  externalBookingLink: string;
  claimStatus: "unclaimed" | "claimed" | "not_claimable";

  // Schedule & Pricing
  basePrice: string;
  currency: string;
  capacity: string;

  // Free event & meeting
  isFreeEvent: boolean;
  meetingPassword: string;

  // Location (in Advanced tab)
  country: string;
  city: string;
  address: string;
  latitude: string;
  longitude: string;
  meetingLink: string;

  // SEO
  seoMeta: {
    title: string;
    description: string;
    keywords: string[];
  };
  collectionInfo?: Array<{
    heading: string;
    shortDescription: string;
    link: string;
  }>;

  // Educational Fields
  syllabus: Array<{ title: string; description: string; duration?: string }>;
  subject: string;
  topic: string;
  introVideo: string;
  teacherId: string;

  // FAQs
  faqs: FAQ[];

  // Past Event Memories
  pastEventMemories: PastEventMemory[];

  // Google Maps Integration
  googlePlaceId: string;
}

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Vendor {
  _id: string;
  businessName: string;
  email: string;
}

type TabType = "basic" | "schedule" | "advanced" | "reviews" | "registration" | "certificates";

const AdminEditEventPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabType>("basic");
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [, setSelectedImageAssets] = useState<MediaAsset[]>([]);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [bookingMethod, setBookingMethod] = useState<"internal" | "external">(
    "internal",
  );
  const [unlimitedCapacity, setUnlimitedCapacity] = useState<boolean>(false);

  const [formData, setFormData] = useState<EventFormData>({
    title: "",
    description: "",
    shortDescription: "",
    customCSS: "",
    category: "",
    type: "Event",
    venueType: "Indoor",
    ageRangeMin: "",
    ageRangeMax: "",
    tags: [],
    images: [],
    imagePreviewUrls: [],
    bookingAttachments: [],
    isApproved: false,
    isFeatured: false,
    requirePhoneVerification: false,
    status: "pending",
    isActive: true,
    vendorId: "",
    isAffiliateEvent: false,
    externalBookingLink: "",
    claimStatus: "not_claimable",
    basePrice: "",
    currency: "AED",
    capacity: "",
    country: "",
    city: "",
    address: "",
    latitude: "",
    longitude: "",
    isFreeEvent: false,
    meetingPassword: "",
    meetingLink: "",
    seoMeta: {
      title: "",
      description: "",
      keywords: [],
    },
    collectionInfo: [],
    syllabus: [],
    subject: "",
    topic: "",
    introVideo: "",
    teacherId: "",
    faqs: [],
    pastEventMemories: [],
    googlePlaceId: "",
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveStatus, setSaveStatus] = useState<{
    type: "success" | "error";
    message: string;
    validationErrors?: Record<string, string>;
  } | null>(null);
  const isCreateMode = !id;

  // Fetch categories, vendors, and event data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);

      try {
        // Fetch categories for all modes
        const categoriesData = await categoriesAPI.getAllCategories({
          tree: false,
        });
        const categoriesArray = Array.isArray(categoriesData)
          ? categoriesData
          : [];
        const transformedCategories: Category[] = categoriesArray.map(
          (cat: any) => ({
            id: cat._id || cat.id,
            name: cat.name,
            slug: cat.slug,
          }),
        );
        setCategories(transformedCategories);

        // Fetch vendors for all modes (Create & Edit)
        const vendorsResponse = await adminAPI.getVendorsList();
        const vendorsData =
          vendorsResponse?.data?.vendors ||
          vendorsResponse?.data?.users ||
          vendorsResponse?.data ||
          [];
        setVendors(vendorsData);

        // Fetch teachers for all modes (Create & Edit)
        const teachersResponse = await adminAPI.getTeachingEventTeachers();
        const teachersData =
          teachersResponse?.data?.teachers ||
          teachersResponse?.data?.data?.teachers ||
          teachersResponse?.data?.users ||
          teachersResponse?.data ||
          [];
        setTeachers(
          (teachersData || []).map((t: any) => ({
            id: t._id || t.id,
            firstName: t.firstName,
            lastName: t.lastName,
            email: t.email,
          })),
        );

        if (id) {
          // EDIT MODE: Fetch event details
          const eventResponse = await adminAPI.getEventById(id);
          const event =
            eventResponse?.data?.event ||
            eventResponse?.event ||
            eventResponse?.data ||
            eventResponse;

          if (!event || typeof event !== "object") {
            throw new Error("Invalid event response payload");
          }

          // Populate form data
          setFormData({
            title: event.title || "",
            description: event.description || "",
            shortDescription: event.shortDescription || "",
            customCSS: event.customCSS || "",
            // Decode HTML entities (backend may return "Family &amp; Kids")
            category: (event.category || "")
              .replace(/&amp;/g, "&")
              .replace(/&lt;/g, "<")
              .replace(/&gt;/g, ">"),
            type: event.type || "Event",
            venueType: event.venueType || "Indoor",
            ageRangeMin: event.ageRange?.[0]?.toString() || "",
            ageRangeMax: event.ageRange?.[1]?.toString() || "",
            tags: event.tags || [],
            // Use MediaAsset IDs (not raw URL strings from images[])
            images:
              event.imageAssets?.map((a: any) => a._id).filter(Boolean) || [],
            // Use URLs for preview — prefer imageAssets, fall back to images[]
            imagePreviewUrls:
              event.imageAssets?.map((a: any) => a.url).filter(Boolean) ||
              (event.images || []).filter(
                (s: any) => typeof s === "string" && s.startsWith("http"),
              ),
            bookingAttachments:
              event.bookingAttachments ||
              (event.bookingAttachment ? [event.bookingAttachment] : []),
            isApproved: event.isApproved || false,
            isFeatured: event.isFeatured || false,
            requirePhoneVerification: event.requirePhoneVerification || false,
            status: event.status || "draft",
            isActive: event.isActive || false,
            // vendorId may come back as a populated object — extract the ID
            vendorId:
              event.vendorId?._id || event.vendorId || event.vendor?.id || "",
            isAffiliateEvent: !!event.externalBookingLink, // Infer from link existence if flag missing
            externalBookingLink: event.externalBookingLink || "",
            claimStatus: event.claimStatus || "unclaimed",
            basePrice: event.price?.toString() || "",
            currency: event.currency || "AED",
            capacity: (event.dateSchedule?.[0]?.totalSeats || "").toString(),
            country: event.location?.country || "",
            city: event.location?.city || "",
            address: event.location?.address || "",
            latitude: (event.location?.coordinates?.lat || "").toString(),
            longitude: (event.location?.coordinates?.lng || "").toString(),
            isFreeEvent: !!event.isFreeEvent,
            meetingPassword: event.meetingPassword || "",
            meetingLink: event.meetingLink || "",
            seoMeta: {
              title: event.seoMeta?.title || "",
              description: event.seoMeta?.description || "",
              keywords: event.seoMeta?.keywords || [],
            },
            collectionInfo: event.collectionInfo?.map((col: { heading?: string; shortDescription?: string; link?: string }) => ({
              heading: col.heading || "",
              shortDescription: col.shortDescription || "",
              link: col.link || "",
            })) || [],
            syllabus: event.syllabus || [],
            subject: event.subject || "",
            topic: event.topic || "",
            introVideo: event.introVideo || "",
            teacherId:
              event.teacherId?._id ||
              event.teacherId ||
              event.teacher?.id ||
              "", // Handle populated object or ID
            faqs: event.faqs || [],
            pastEventMemories: event.pastEventMemories || [],
            googlePlaceId: event.googlePlaceId || "",
          });

          // Ensure currently assigned vendor appears in dropdown even if inactive/missing from list
          if (event.vendor?.id) {
            setVendors((prev) => {
              if (prev.some((v) => v._id === event.vendor.id)) return prev;
              return [
                ...prev,
                {
                  _id: event.vendor.id,
                  businessName:
                    event.vendor.businessName ||
                    event.vendor.fullName ||
                    "Current Vendor",
                  email: event.vendor.email || "",
                },
              ];
            });
          }

          // Ensure currently assigned teacher appears in dropdown even if missing from list
          if (event.teacher?.id) {
            setTeachers((prev) => {
              if (prev.some((t) => t.id === event.teacher.id)) return prev;
              return [
                ...prev,
                {
                  id: event.teacher.id,
                  firstName: event.teacher.firstName || "",
                  lastName: event.teacher.lastName || "",
                  email: event.teacher.email || "",
                },
              ];
            });
          }

          // Set selected image assets for MediaPickerModal
          if (event.imageAssets && event.imageAssets.length > 0) {
            setSelectedImageAssets(event.imageAssets);
          }

          // Transform schedules
          const transformedSchedules: Schedule[] = (
            event.dateSchedule || []
          ).map((schedule: any, index: number) => {
            // Use price as ground truth to derive sessionType and isFreeSession.
            // DB flags may be stale/corrupted so we recompute from actual price.
            const dbPrice = parseFloat(schedule.price?.toString() || '0');
            // If sessionType is explicitly saved in DB, use it.
            // Otherwise infer: price > 0 → Standard, price === 0 → Intro.
            const resolvedSessionType: string = schedule.sessionType
              ? schedule.sessionType
              : (dbPrice > 0 ? 'Standard Session' : 'Intro Session');
            // isFreeSession: true only when sessionType is Intro AND price is 0.
            // For Standard Sessions it's ALWAYS false regardless of DB flag.
            const resolvedIsFreeSession: boolean = resolvedSessionType === 'Intro Session' && dbPrice === 0;

            return {
              id: schedule._id || `schedule-${index}`,
              _id: schedule._id,
              startDate: schedule.startDate
                ? new Date(schedule.startDate).toISOString().split("T")[0]
                : schedule.date
                  ? new Date(schedule.date).toISOString().split("T")[0]
                  : "",
              endDate: schedule.endDate
                ? new Date(schedule.endDate).toISOString().split("T")[0]
                : schedule.date
                  ? new Date(schedule.date).toISOString().split("T")[0]
                  : "",
              startTime: schedule.startTime || "",
              endTime: schedule.endTime || "",
              availableSeats: schedule.availableSeats?.toString() || "",
              totalSeats:
                schedule.totalSeats?.toString() ||
                schedule.availableSeats?.toString() ||
                "",
              soldSeats: schedule.soldSeats?.toString() || "0",
              reservedSeats: schedule.reservedSeats?.toString() || "0",
              price: schedule.price?.toString() || "",
              unlimitedSeats: schedule.unlimitedSeats || false,
              isSpecialDate: schedule.isSpecialDate || false,
              specialDates:
                schedule.specialDates?.map(
                  (d: any) => new Date(d).toISOString().split("T")[0],
                ) || [],
              priority: schedule.priority || 0,
              isOverride: schedule.isOverride || false,
              sessionType: resolvedSessionType,
              ratePerClass: schedule.ratePerClass?.toString() || '',
              isFreeSession: resolvedIsFreeSession,
              description: schedule.description || '',
              timeSlots: (schedule.timeSlots || []).map(
                (slot: any, slotIdx: number) => ({
                  id: slot._id || `slot-${index}-${slotIdx}`,
                  date: slot.date
                    ? new Date(slot.date).toISOString().split("T")[0]
                    : "",
                  startTime: slot.startTime || "",
                  endTime: slot.endTime || "",
                  availableSeats: slot.availableSeats?.toString() || "",
                  price: slot.price?.toString() || "",
                }),
              ),
            };
          });

          setSchedules(transformedSchedules);

          // If all schedules have unlimitedSeats, enable global unlimited capacity toggle
          if (
            transformedSchedules.length > 0 &&
            transformedSchedules.every((s) => s.unlimitedSeats)
          ) {
            setUnlimitedCapacity(true);
          }
        } else {
          // CREATE MODE: Initialize with empty schedules array
          setSchedules([]);
        }
      } catch (error: any) {
        logger.error("Error fetching data:", error);
        setSaveStatus({
          type: "error",
          message:
            error.response?.data?.message ||
            "Failed to load data. Please try again.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Input change handlers
  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const handleTagsChange = (tags: string[]) => {
    setFormData((prev) => ({ ...prev, tags }));
    // Clear errors if tags are added
    if (tags.length > 0 && errors.tags) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.tags;
        return newErrors;
      });
    }
  };

  const handleCountryChange = (country: string) => {
    setFormData((prev) => ({
      ...prev,
      country,
      city: "", // Clear city when country changes to prevent invalid combinations
    }));

    // Clear country error
    if (errors.country) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.country;
        return newErrors;
      });
    }

    // Clear city error
    if (errors.city) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.city;
        return newErrors;
      });
    }
  };

  const handleImagesChange = (assets: MediaAsset[]) => {
    setSelectedImageAssets(assets);
    setFormData((prev) => ({
      ...prev,
      images: assets.map((a) => a._id), // Store MediaAsset IDs
      imagePreviewUrls: assets.map((a) => a.url), // Store URLs for preview
    }));

    if (assets.length > 0 && errors.images) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.images;
        return newErrors;
      });
    }
  };

  const removeImage = (index: number) => {
    setSelectedImageAssets((prev) => prev.filter((_, i) => i !== index));
    setFormData((prev) => {
      const newImages = prev.images.filter((_, i) => i !== index);
      const newImagePreviewUrls = prev.imagePreviewUrls.filter(
        (_, i) => i !== index,
      );

      return {
        ...prev,
        images: newImages,
        imagePreviewUrls: newImagePreviewUrls,
      };
    });
  };

  const handleBookingAttachmentUpload = async (files: File | File[] | null) => {
    if (!files) {
      setFormData((prev) => ({ ...prev, bookingAttachments: [] }));
      return;
    }

    try {
      const fileList = Array.isArray(files) ? files : [files];
      const uploadResults = await Promise.allSettled(
        fileList.map(async (file) => {
          // Use the dedicated booking-attachment endpoint so that PDFs are
          // stored with resource_type="raw" on Cloudinary (giving a /raw/upload/
          // URL) and images use resource_type="image".
          const uploadResponse = await UploadAPI.uploadBookingAttachment(file);
          return uploadResponse.data;
        }),
      );

      const uploadedFiles = uploadResults
        .filter((result): result is PromiseFulfilledResult<any> => result.status === "fulfilled")
        .map((result) => result.value);

      const failedCount = uploadResults.filter((result) => result.status === "rejected").length;

      setFormData((prev) => ({
        ...prev,
        bookingAttachments: [
          ...prev.bookingAttachments,
          ...uploadedFiles.map((uploadedFile) => ({
            originalName: uploadedFile.originalName,
            filename: uploadedFile.filename,
            url: uploadedFile.url,
            size: uploadedFile.size,
            mimetype: uploadedFile.mimetype,
            provider: uploadedFile.provider,
            publicId: uploadedFile.publicId,
            cloudinaryUrl: uploadedFile.cloudinaryUrl,
            uploadedAt: uploadedFile.uploadedAt,
          })),
        ],
      }));

      if (failedCount > 0) {
        setSaveStatus({
          type: "error",
          message: `${failedCount} attachment${failedCount > 1 ? "s" : ""} failed to upload. The successful files were added.`,
        });
      }
    } catch (error: any) {
      setSaveStatus({
        type: "error",
        message:
          error.response?.data?.message ||
          "Failed to upload event attachment. Please try again.",
      });
      throw error;
    }
  };

  // Schedule management
  const handleScheduleChange = (
    index: number,
    field: keyof Schedule,
    value: string | boolean | string[] | number,
  ) => {
    setSchedules((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      // Clear availableSeats when unlimited is enabled
      if (field === "unlimitedSeats" && value === true) {
        updated[index].availableSeats = "";
      }

      return updated;
    });

    // Clear schedule-specific errors
    const errorKey = `schedule_${index}_${field}`;
    if (errors[errorKey]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }

    // When unlimited is toggled, also clear availableSeats error
    if (field === "unlimitedSeats") {
      const seatsErrorKey = `schedule_${index}_availableSeats`;
      if (errors[seatsErrorKey]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[seatsErrorKey];
          return newErrors;
        });
      }
    }
  };

  const handleAddSchedule = (isSpecialDate: boolean = false) => {
    const newSchedule: Schedule = {
      id: `schedule-${Date.now()}`,
      startDate: "",
      endDate: "",
      startTime: "",
      endTime: "",
      availableSeats: "",
      totalSeats: "",
      price: formData.isFreeEvent ? "0" : formData.basePrice || "",
      unlimitedSeats: unlimitedCapacity,
      isSpecialDate,
      specialDates: [],
      priority: 0,
      isOverride: false,
      description: '',
    };
    setSchedules((prev) => [...prev, newSchedule]);
  };

  const handleRemoveSchedule = (index: number) => {
    setSchedules((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUnlimitedCapacityChange = (val: boolean) => {
    setUnlimitedCapacity(val);
    setSchedules((prev) =>
      prev.map((s) => ({
        ...s,
        unlimitedSeats: val ? true : false,
        availableSeats: val ? "" : s.availableSeats,
      })),
    );
  };

  // FAQ management
  const handleFaqChange = (
    index: number,
    field: "question" | "answer",
    value: string,
  ) => {
    setFormData((prev) => {
      const updatedFaqs = [...prev.faqs];
      updatedFaqs[index] = { ...updatedFaqs[index], [field]: value };
      return { ...prev, faqs: updatedFaqs };
    });

    const errorKey = `faq_${index}_${field}`;
    if (errors[errorKey]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
  };

  const handleAddFaq = () => {
    setFormData((prev) => ({
      ...prev,
      faqs: [
        ...prev.faqs,
        { id: `faq-${Date.now()}`, question: "", answer: "" },
      ],
    }));
  };

  const handleRemoveFaq = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      faqs: prev.faqs.filter((_, i) => i !== index),
    }));
  };

  // SEO change handler
  const handleSeoChange = useCallback((seoData: any) => {
    setFormData((prev) => ({
      ...prev,
      seoMeta: {
        title: seoData.title,
        description: seoData.description,
        keywords: seoData.keywords,
      },
    }));
  }, []);

  const handleCollectionChange = useCallback((collections: any[]) => {
    setFormData((prev) => ({
      ...prev,
      collectionInfo: collections,
    }));
  }, []);

  // Custom CSS change handler
  const handleCustomCSSChange = (css: string) => {
    setFormData((prev) => ({ ...prev, customCSS: css }));
  };

  // Validation
  const validateForm = (validateAll: boolean = false): {
    isValid: boolean;
    errors: Record<string, string>;
  } => {
    const newErrors: Record<string, string> = {};

    // Basic Info validation
    if (validateAll || activeTab === "basic" || activeTab === "schedule") {
      if (!formData.title?.trim()) newErrors.title = "Title is required";
      if (!formData.description?.trim())
        newErrors.description = "Description is required";
      if (!formData.shortDescription?.trim())
        newErrors.shortDescription = "Short description is required";
      if (!formData.category) newErrors.category = "Category is required";
      if (
        (!formData.vendorId || formData.vendorId.trim() === "") &&
        (!formData.teacherId || formData.teacherId.trim() === "")
      ) {
        newErrors.vendorId =
          "Either vendor or instructor assignment is required";
        newErrors.teacherId =
          "Either vendor or instructor assignment is required";
      }

      if (formData.isAffiliateEvent) {
        const link = formData.externalBookingLink?.trim() || "";
        if (!link) {
          newErrors.externalBookingLink =
            "External booking link is required for affiliate events";
        } else if (!/^https?:\/\/.+/.test(link)) {
          newErrors.externalBookingLink =
            "External booking link must be a valid http(s) URL";
        }
      }
      if (!formData.ageRangeMin?.trim())
        newErrors.ageRangeMin = "Minimum age is required";
      if (!formData.ageRangeMax?.trim())
        newErrors.ageRangeMax = "Maximum age is required";

      // Age range validation
      if (formData.ageRangeMin && formData.ageRangeMax) {
        const minAge = parseInt(formData.ageRangeMin);
        const maxAge = parseInt(formData.ageRangeMax);
        if (isNaN(minAge) || isNaN(maxAge)) {
          newErrors.ageRangeMin = "Age must be a valid number";
        } else if (minAge >= maxAge) {
          newErrors.ageRangeMax =
            "Maximum age must be greater than minimum age";
        }
      }

      // Meeting link validation for Online events removed per user request
    }

    // Schedule validation
    if (validateAll || activeTab === "schedule") {
      // Validate each schedule
      schedules.forEach((schedule, index) => {
        if (!schedule.isSpecialDate) {
          if (!schedule.startDate) {
            newErrors[`schedule_${index}_startDate`] = "Start date is required";
          }
          if (!schedule.endDate) {
            newErrors[`schedule_${index}_endDate`] = "End date is required";
          }
        }

        if (!schedule.unlimitedSeats) {
          if (!schedule.availableSeats) {
            newErrors[`schedule_${index}_availableSeats`] =
              "Available seats is required";
          } else {
            const seats = parseInt(schedule.availableSeats);
            if (isNaN(seats) || seats < 1 || seats > 10000) {
              newErrors[`schedule_${index}_availableSeats`] =
                "Available seats must be between 1 and 10,000";
            }
          }
        }

        if (!formData.isFreeEvent && (!schedule.isFreeSession)) {
          if (!schedule.price) {
            newErrors[`schedule_${index}_price`] = "Price is required";
          } else if (
            isNaN(parseFloat(schedule.price)) ||
            parseFloat(schedule.price) < 0
          ) {
            newErrors[`schedule_${index}_price`] =
              "Price must be a valid number";
          }
        }
      });
    }

    // Advanced tab validation
    if (validateAll || activeTab === "advanced") {
      // City is only required for non-online events
      if (formData.venueType !== "Online" && !formData.city?.trim()) {
        newErrors.city = "City is required";
      }

      // Address is only required for non-Online events
      if (formData.venueType !== "Online" && !formData.address?.trim()) {
        newErrors.address = "Address is required for non-online events";
      }

      // FAQ validation
      formData.faqs.forEach((faq, index) => {
        if (!faq.question.trim()) {
          newErrors[`faq_${index}_question`] = "Question is required";
        }
        if (!faq.answer.trim()) {
          newErrors[`faq_${index}_answer`] = "Answer is required";
        }
      });
    }

    setErrors(newErrors);
    return {
      isValid: Object.keys(newErrors).length === 0,
      errors: newErrors,
    };
  };

  // Form submission
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const validation = validateForm(true);

    if (!validation.isValid) {
      const firstErrorField = Object.keys(validation.errors)[0];
      
      let errorTab = "basic" as any;
      if (['basePrice', 'capacity'].includes(firstErrorField) || firstErrorField.startsWith('schedule_')) {
         errorTab = "schedule";
      } else if (['city', 'country', 'address'].includes(firstErrorField) || firstErrorField.startsWith('faq_')) {
         errorTab = "advanced";
      }
      setActiveTab(errorTab);

      setSaveStatus({
        type: "error",
        message: `Please fix validation errors: ${validation.errors[firstErrorField]}`,
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      setIsSaving(true);
      setSaveStatus(null);

      // Transform form data to match backend Event model
      const eventData = {
        title: formData.title,
        description: formData.description,
        shortDescription: formData.shortDescription || undefined,
        customCSS: formData.customCSS,
        category: formData.category,
        type: formData.type,
        venueType: formData.venueType,
        ageRange: [
          parseInt(formData.ageRangeMin),
          parseInt(formData.ageRangeMax),
        ],
        location: (() => {
          // For online events, coordinates are not required
          if (formData.venueType === "Online") {
            return {
              country: formData.country || undefined,
              city: formData.city,
              address: undefined,
            };
          }

          // For physical events, include coordinates only if valid
          const lat = formData.latitude
            ? parseFloat(formData.latitude)
            : undefined;
          const lng = formData.longitude
            ? parseFloat(formData.longitude)
            : undefined;

          return {
            country: formData.country || undefined,
            city: formData.city,
            address: formData.address,
            coordinates:
              lat !== undefined &&
                lng !== undefined &&
                !isNaN(lat) &&
                !isNaN(lng)
                ? { lat, lng }
                : undefined,
          };
        })(),
        meetingLink:
          formData.venueType === "Online" ? formData.meetingLink : undefined,
        meetingPassword:
          formData.venueType === "Online" && formData.meetingPassword
            ? formData.meetingPassword
            : undefined,
        isFreeEvent: formData.isFreeEvent,
        vendorId: formData.vendorId?.trim() || undefined,
        price: schedules.length > 0 ? parseFloat(schedules[0].price || "0") : 0,
        currency: "AED", // Defaulted since global currency is removed
        tags: formData.tags,

        // Admin-specific fields
        isApproved: formData.isApproved,
        isFeatured: formData.isFeatured,
        requirePhoneVerification: formData.requirePhoneVerification,
        status: formData.status,
        isActive: formData.isActive,

        // Affiliate Event fields
        isAffiliateEvent: formData.isAffiliateEvent,
        externalBookingLink: formData.isAffiliateEvent
          ? formData.externalBookingLink
          : "",
        claimStatus: formData.isAffiliateEvent
          ? formData.claimStatus
          : "not_claimable",

        // Multiple schedules
        dateSchedule: schedules.map((schedule) => ({
          ...(schedule._id && { _id: schedule._id }),
          startDate: schedule.startDate,
          endDate: schedule.endDate,
          startTime: schedule.startTime || "",
          endTime: schedule.endTime || "",
          availableSeats: schedule.unlimitedSeats
            ? 999999
            : parseInt(schedule.availableSeats) || 0,
          // Use user-typed availableSeats as the new totalSeats so the backend
          // recalculates correctly. Sending stale totalSeats from initial fetch
          // caused the backend to ignore the user's new capacity value.
          totalSeats: schedule.unlimitedSeats
            ? undefined
            : parseInt(schedule.availableSeats) || undefined,
          price: schedule.isFreeSession ? 0 : (schedule.price !== '' && schedule.price !== null && schedule.price !== undefined ? (parseFloat(schedule.price) || 0) : (parseFloat(formData.basePrice) || 0)),
          unlimitedSeats: schedule.unlimitedSeats || false,
          isSpecialDate: schedule.isSpecialDate || false,
          specialDates: schedule.specialDates || [],
          priority: schedule.priority || 0,
          isOverride: schedule.isOverride || false,
          sessionType: schedule.sessionType,
          isFreeSession: schedule.isFreeSession || false,
          description: schedule.description || '',
          ratePerClass: schedule.ratePerClass ? parseFloat(schedule.ratePerClass) : undefined,
          timeSlots: (schedule.timeSlots || []).map((slot) => ({
            date: new Date(slot.date),
            startTime: slot.startTime,
            endTime: slot.endTime,
            availableSeats: parseInt(slot.availableSeats) || 0,
            price: slot.price ? parseFloat(slot.price) : undefined,
          })),
        })),

        imageAssets: formData.images, // Send MediaAsset IDs
        bookingAttachments: formData.bookingAttachments,

        seoMeta: {
          title: formData.seoMeta.title || formData.title,
          description:
            formData.seoMeta.description ||
            formData.description.substring(0, 160),
          keywords:
            formData.seoMeta.keywords.length > 0
              ? formData.seoMeta.keywords
              : formData.tags,
        },
        collectionInfo: formData.collectionInfo && formData.collectionInfo.length > 0 
          ? formData.collectionInfo.filter(c => c.heading || c.link) 
          : undefined,

        faqs: formData.faqs.map((faq) => ({
          ...(faq._id && { _id: faq._id }),
          question: faq.question,
          answer: faq.answer,
        })),

        pastEventMemories: formData.pastEventMemories,

        // Educational Fields
        syllabus: formData.syllabus,
        subject: formData.subject,
        topic: formData.topic,
        introVideo: formData.introVideo,
        teacherId: formData.teacherId?.trim() || undefined,
      };

      if (isCreateMode) {
        await adminAPI.createEvent(eventData);

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: eventsKeys.all }),
          queryClient.invalidateQueries({ queryKey: adminKeys.events.all() }),
        ]);

        setErrors({});
        setSaveStatus({
          type: "success",
          message: "Event created successfully!",
        });

        // After creating a new event, navigate to the events list
        navigate("/admin/events");
      } else {
        await adminAPI.updateEvent(id!, eventData);

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: eventsKeys.all }),
          queryClient.invalidateQueries({ queryKey: adminKeys.events.all() }),
        ]);

        setErrors({});
        setSaveStatus({
          type: "success",
          message: "Event updated successfully!",
        });

        setTimeout(() => {
          navigate("/admin/events");
        }, 300);
      }
    } catch (error: any) {
      logger.error("Error saving event:", error);

      // Check if the error contains validation errors
      const validationErrors = error.response?.data?.errors;
      if (validationErrors && typeof validationErrors === "object") {
        // Extract and format validation errors
        const errorMessages: Record<string, string> = {};
        Object.keys(validationErrors).forEach((field) => {
          const fieldErrors = validationErrors[field];
          if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
            errorMessages[field] = fieldErrors[0].msg || fieldErrors[0];
          } else if (typeof fieldErrors === "string") {
            errorMessages[field] = fieldErrors;
          }
        });

        setErrors(errorMessages);

        // Create a comprehensive error message
        const errorCount = Object.keys(errorMessages).length;
        setSaveStatus({
          type: "error",
          message: `Validation failed: ${errorCount} field${errorCount > 1 ? "s" : ""} ${errorCount > 1 ? "have" : "has"} errors. Please review and correct the highlighted fields.`,
          validationErrors: errorMessages,
        });
      } else {
        // Generic error handling
        setSaveStatus({
          type: "error",
          message:
            error.response?.data?.message ||
            `Failed to ${isCreateMode ? "create" : "update"} event. Please try again.`,
        });
      }

      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <PrivatePageSEO
          title="Admin - Edit Event | Kidrove"
          description="Edit event details"
        />
        <div className="flex justify-center items-center min-h-screen">
          <svg
            className="animate-spin h-10 w-10 text-primary"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        </div>
      </>
    );
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "published":
        return "success";
      case "draft":
        return "warning";
      case "archived":
        return "secondary";
      case "pending":
        return "warning";
      case "rejected":
        return "error";
      default:
        return "secondary";
    }
  };

  const tabs = [
    { id: "basic" as TabType, label: "Basic Info", icon: FileText },
    { id: "schedule" as TabType, label: "Schedule & Pricing", icon: Calendar },
    { id: "advanced" as TabType, label: "Advanced", icon: MapPin },
    { id: "reviews" as TabType, label: "Reviews", icon: Star },
    {
      id: "registration" as TabType,
      label: "Registration Form",
      icon: CheckCircle2,
    },
    { id: "certificates" as TabType, label: "Certificates", icon: Award },
  ];

  return (
    <>
      <PrivatePageSEO
        title="Admin - Edit Event | Kidrove"
        description="Edit event details"
      />
      <div className="min-h-screen bg-gray-50">
        {/* Sticky Header */}
        <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate("/admin/events")}
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    {isCreateMode ? "Create New Event" : "Edit Event"}
                  </h1>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={getStatusVariant(formData.status)}>
                      {formData.status}
                    </Badge>
                    {formData.isFeatured && (
                      <Badge variant="featured">✨ Featured</Badge>
                    )}
                    {formData.isApproved && (
                      <Badge variant="success">✓ Approved</Badge>
                    )}
                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">
                      Admin
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleSubmit}
                  disabled={isSaving}
                  className="px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-700 text-white font-bold rounded-xl hover:from-primary-600 hover:to-primary-800 hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving
                    ? "Saving..."
                    : isCreateMode
                      ? "Create Event"
                      : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {saveStatus && (
          <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4`}>
            <div
              className={`p-4 rounded-xl ${saveStatus.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
            >
              <p className="font-medium">{saveStatus.message}</p>
              {saveStatus.validationErrors &&
                Object.keys(saveStatus.validationErrors).length > 0 && (
                  <ul className="mt-2 ml-4 list-disc space-y-1">
                    {Object.entries(saveStatus.validationErrors).map(
                      ([field, error]) => (
                        <li key={field} className="text-sm">
                          <span className="font-semibold">{field}:</span>{" "}
                          {error}
                        </li>
                      ),
                    )}
                  </ul>
                )}
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          <div className="bg-white rounded-xl shadow-lg mb-8 overflow-hidden">
            <div className="flex border-b border-gray-200 overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                    flex-1 py-4 px-6 text-center font-medium transition-all duration-200 whitespace-nowrap
                    ${activeTab === tab.id
                        ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                        : "text-gray-600 hover:text-blue-600 hover:bg-gray-50"
                      }
                  `}
                  >
                    <Icon className="w-5 h-5 mx-auto mb-1" />
                    <span className="text-sm">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div className="space-y-8 pb-12">
            {activeTab === "basic" && (
              <BasicInfoTab
                formData={formData}
                categories={categories}
                vendors={vendors}
                errors={errors}
                onInputChange={handleInputChange}
                onCheckboxChange={handleCheckboxChange}
                onImagesChange={handleImagesChange}
                onRemoveImage={removeImage}
                onBookingAttachmentUpload={handleBookingAttachmentUpload}
                onBookingAttachmentsChange={(bookingAttachments) =>
                  setFormData((prev) => ({ ...prev, bookingAttachments }))
                }
                onTagsChange={handleTagsChange}
                onCustomCSSChange={handleCustomCSSChange}
                showMediaPicker={showMediaPicker}
                onOpenMediaPicker={() => setShowMediaPicker(true)}
                onCloseMediaPicker={() => setShowMediaPicker(false)}
                // New props for educational fields
                teachers={teachers}
                onSyllabusChange={(syllabus) =>
                  setFormData((prev) => ({ ...prev, syllabus }))
                }
                bookingMethod={bookingMethod}
                onBookingMethodChange={setBookingMethod}
              />
            )}

            {activeTab === "schedule" &&
              (isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading schedule data...</p>
                  </div>
                </div>
              ) : (
                <SchedulePricingTab
                  schedules={schedules || []}
                  currency={formData.currency || "AED"}
                  capacity={formData.capacity || ""}
                  basePrice={formData.basePrice || ""}
                  isFreeEvent={false}
                  unlimitedCapacity={unlimitedCapacity}
                  isEducational={['Course', 'Workshop', 'Bootcamp', 'Class', 'Masterclass'].includes(formData.type)}
                  errors={errors}
                  onScheduleChange={handleScheduleChange}
                  onAddSchedule={handleAddSchedule}
                  onRemoveSchedule={handleRemoveSchedule}
                  onCurrencyChange={handleInputChange}
                  onCapacityChange={handleInputChange}
                  onBasePriceChange={handleInputChange}
                  onFreeEventChange={(val) =>
                    setFormData((prev) => ({
                      ...prev,
                      isFreeEvent: val,
                      basePrice: val ? "0" : prev.basePrice,
                    }))
                  }
                  onUnlimitedCapacityChange={handleUnlimitedCapacityChange}
                />
              ))}

            {activeTab === "advanced" && (
              <AdvancedTab
                venueType={formData.venueType}
                formData={formData}
                eventData={{
                  title: formData.title,
                  description: formData.description,
                  category: formData.category,
                  tags: formData.tags.join(", "),
                  _id: id,
                }}
                errors={errors}
                onInputChange={handleInputChange}
                onCountryChange={handleCountryChange}
                onFaqChange={handleFaqChange}
                onAddFaq={handleAddFaq}
                onRemoveFaq={handleRemoveFaq}
                onSeoChange={handleSeoChange}
                onCollectionChange={handleCollectionChange}
                imagePreviewUrl={formData.imagePreviewUrls[0]}
              />
            )}

            {activeTab === "reviews" && id && (
              <ReviewsTab
                eventId={id}
                googlePlaceId={formData.googlePlaceId}
                onGooglePlaceIdChange={(placeId) =>
                  setFormData((prev) => ({ ...prev, googlePlaceId: placeId }))
                }
              />
            )}

            {activeTab === "certificates" && id && (
              <CertificateTypesTab eventId={id} />
            )}

            {activeTab === "certificates" && !id && (
              <div className="p-6">
                <div className="max-w-2xl mx-auto">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-8 text-center">
                    <Award className="w-10 h-10 text-purple-400 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Save the event first
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Certificate types can be configured after the event has been created.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab("basic")}
                      className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
                    >
                      Go to Basic Info
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "reviews" && !id && (
              <div className="p-6">
                <div className="max-w-2xl mx-auto">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                      <svg
                        className="h-6 w-6 text-blue-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Reviews Not Available Yet
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Reviews can only be managed after the event has been
                      created and saved. Please complete the basic event
                      information and save it first.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab("basic")}
                      className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Go to Basic Info
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "registration" && (
              <div>
                {!id ? (
                  <div className="p-6">
                    <div className="max-w-2xl mx-auto">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                          <svg
                            className="h-6 w-6 text-blue-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          Registration Form Not Available Yet
                        </h3>
                        <p className="text-gray-600 mb-6">
                          Registration forms can only be configured after the
                          event has been created and saved. Please complete the
                          basic event information and save it first.
                        </p>
                        <div className="bg-white rounded-md p-4 mb-6 text-left">
                          <p className="text-sm text-gray-700 font-medium mb-2">
                            Next steps:
                          </p>
                          <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                            <li>
                              Fill out the required fields in the Basic Info tab
                            </li>
                            <li>
                              Add at least one schedule in Schedule & Pricing
                            </li>
                            <li>Click "Create Event" to save your event</li>
                            <li>
                              After creation, you'll be able to configure the
                              registration form
                            </li>
                          </ol>
                        </div>
                        <button
                          type="button"
                          onClick={handleSubmit}
                          className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          disabled={isSaving}
                        >
                          {isSaving ? (
                            <>
                              <svg
                                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                ></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                              </svg>
                              Creating Event...
                            </>
                          ) : (
                            <>
                              <svg
                                className="h-5 w-5 mr-2"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                              Save Event & Continue
                            </>
                          )}
                        </button>
                        <p className="text-xs text-gray-500 mt-3">
                          You'll be redirected to edit mode where you can
                          configure the registration form
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <FormBuilder
                    eventId={id}
                    onSaveSuccess={() => {
                      setSaveStatus({
                        type: "success",
                        message: "Registration form saved successfully!",
                      });
                      setTimeout(() => setSaveStatus(null), 3000);
                    }}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminEditEventPage;
