import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import adminAPI from '../../services/api/adminAPI';
import categoriesAPI from '../../services/api/categoriesAPI';
import TeachingBasicInfoTab from '../../components/admin/TeachingBasicInfoTab';
import TeachingSchedulePricingTab from '../../components/admin/TeachingSchedulePricingTab';
import TeachingAdvancedTab from '../../components/admin/TeachingAdvancedTab';
import FormBuilder from '@/components/registration/FormBuilder';
import { Calendar, MapPin, FileText, ArrowLeft, Save, CheckCircle2, Star, BookOpen } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import ReviewsTab from '../../components/admin/ReviewsTab';
// import MediaPickerModal from '@/components/admin/media/MediaPickerModal';
// import MediaPickerModal from '@/components/admin/media/MediaPickerModal';
import { MediaAsset } from '@/store/slices/mediaSlice';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import logger from '@/utils/logger';
import { PastEventMemory } from '@/types/event';

interface SyllabusLesson {
  title: string;
  duration: string;
}

interface SyllabusSection {
  title: string;
  description: string;
  duration: string;
  lessons: SyllabusLesson[];
}

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
}

interface FAQ {
  id?: string;
  _id?: string;
  question: string;
  answer: string;
}

interface TeachingEventFormData {
  // Basic Info
  title: string;
  description: string;
  customCSS: string;
  category: string;
  type: 'Class' | 'Course' | 'Workshop' | 'Bootcamp' | 'Masterclass';
  teachingMode: 'Online' | 'Offline' | 'Hybrid';
  ageRangeMin: string;
  ageRangeMax: string;
  grades: string[];
  tags: string[];
  images: string[];
  imagePreviewUrls: string[];

  // Teaching event specific
  teacherId: string;
  skillLevel: 'Beginner' | 'Intermediate' | 'Advanced' | 'All Levels';
  prerequisites?: string;
  duration?: string;

  // Admin-specific fields
  isApproved: boolean;
  isFeatured: boolean;
  requirePhoneVerification: boolean;
  status: 'draft' | 'published' | 'archived' | 'pending' | 'rejected';
  isActive: boolean;

  // New fields
  slug: string;
  isAffiliateTeachingEvent: boolean;
  externalBookingLink: string;
  cancellationStatus: 'active' | 'cancelled';

  // Schedule & Pricing
  basePrice: string;
  currency: string;

  // Location
  country: string;
  city: string;
  address: string;
  latitude: string;
  longitude: string;
  meetingLink: string;
  googlePlaceId: string;

  // SEO
  seoMeta: {
    title: string;
    description: string;
    keywords: string[];
  };

  // FAQs
  faqs: FAQ[];

  // Course specific
  subject: string;
  topic: string;
  introVideo: string;
  syllabus: SyllabusSection[];
  pastEventMemories: PastEventMemory[];
}

interface Category {
  id: string;
  name: string;
}

interface Teacher {
  _id: string;
  fullName: string;
  email: string;
}

type TabType = 'basic' | 'schedule' | 'advanced' | 'reviews' | 'registration' | 'syllabus';

const AdminTeachingEditEventPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabType>('basic');
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedImageAssets, setSelectedImageAssets] = useState<MediaAsset[]>([]);
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  const [formData, setFormData] = useState<TeachingEventFormData>({
    title: '',
    description: '',
    customCSS: '',
    category: '',
    type: 'Course',
    teachingMode: 'Online',
    ageRangeMin: '',
    ageRangeMax: '',
    grades: [],
    tags: [],
    images: [],
    imagePreviewUrls: [],
    teacherId: '',
    skillLevel: 'Beginner',
    prerequisites: '',
    duration: '',
    isApproved: false,
    isFeatured: false,
    requirePhoneVerification: false,
    status: 'pending',
    isActive: true,
    slug: '',
    isAffiliateTeachingEvent: false,
    externalBookingLink: '',
    cancellationStatus: 'active',
    basePrice: '',
    currency: 'AED',
    country: '',
    city: '',
    address: '',
    latitude: '',
    longitude: '',
    meetingLink: '',
    googlePlaceId: '',
    seoMeta: {
      title: '',
      description: '',
      keywords: []
    },
    faqs: [],
    subject: '',
    topic: '',
    introVideo: '',
    syllabus: [],
    pastEventMemories: [],
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string; validationErrors?: Record<string, string> } | null>(null);
  const isCreateMode = !id;

  // Fetch categories, teachers, and teaching event data
  useEffect(() => {
    const fetchData = async () => {
      logger.debug('🔍 AdminTeachingEditEventPage - Starting data fetch');
      logger.debug('🔍 Teaching Event ID from URL params:', id);
      logger.debug('🔍 Is Create Mode:', !id);

      setIsLoading(true);

      try {
        // Fetch categories
        const categoriesData = await categoriesAPI.getAllCategories({ tree: false });
        const categoriesArray = Array.isArray(categoriesData) ? categoriesData : [];
        const transformedCategories: Category[] = categoriesArray.map((cat: any) => ({
          id: cat._id || cat.id,
          name: cat.name
        }));
        setCategories(transformedCategories);
        logger.debug('✅ Categories loaded:', transformedCategories.length);

        // Fetch teachers
        const teachersResponse = await adminAPI.getTeachingEventTeachers({ limit: 1000 });
        const teachersData = (teachersResponse as any)?.data?.teachers
          || (teachersResponse as any)?.teachers
          || [];
        const teachersArray = Array.isArray(teachersData) ? teachersData : [];
        logger.debug('✅ Teachers loaded:', teachersArray.length);
        setTeachers(teachersArray);

        // Fetch teaching event data if editing
        if (id) {
          logger.debug('📥 Fetching teaching event with ID:', id);
          const response = await adminAPI.getTeachingEventById(id);
          logger.debug('📥 API Response:', response);
          const eventData = response.data?.teachingEvent || response.teachingEvent || response.event || response;
          logger.debug('📥 Event Data extracted:', eventData);

          if (!eventData) {
            logger.error('❌ No event data found in response');
            setSaveStatus({
              type: 'error',
              message: 'Teaching event not found or data is unavailable.'
            });
            return;
          }

          logger.debug('✅ Successfully loaded teaching event:', eventData.title);
          logger.debug('📝 Description from API:', eventData.description);
          logger.debug('📝 Description length:', eventData.description?.length || 0);

          // Transform event data to form format
          // Map eventType from backend to teachingMode for form (eventType: 'Online' | 'Offline')
          const mappedTeachingMode: 'Online' | 'Offline' | 'Hybrid' = eventData.eventType === 'Online' ? 'Online' : eventData.eventType === 'Offline' ? 'Offline' : 'Online';

          const newFormData = {
            title: eventData.title || '',
            description: eventData.description || '',
            customCSS: eventData.customCSS || '',
            category: eventData.category || '',
            type: eventData.type || 'Course',
            teachingMode: mappedTeachingMode,
            ageRangeMin: eventData.ageRange?.[0]?.toString() || '',
            ageRangeMax: eventData.ageRange?.[1]?.toString() || '',
            grades: eventData.grades || [],
            tags: eventData.tags || [],
            images: eventData.imageAssets?.map((a: MediaAsset) => a._id) || [],
            imagePreviewUrls: eventData.imageAssets?.map((a: MediaAsset) => a.url) || eventData.images || [],
            teacherId: eventData.teacher?.id || eventData.teacherId || '',
            skillLevel: eventData.skillLevel || 'Beginner',
            prerequisites: eventData.prerequisites || '',
            duration: eventData.duration || '',
            isApproved: eventData.isApproved || false,
            isFeatured: eventData.isFeatured || false,
            requirePhoneVerification: eventData.requirePhoneVerification || false,
            status: eventData.status || 'pending',
            isActive: eventData.isActive !== undefined ? eventData.isActive : true,
            slug: eventData.slug || '',
            isAffiliateTeachingEvent: eventData.isAffiliateTeachingEvent || false,
            externalBookingLink: eventData.externalBookingLink || '',
            cancellationStatus: eventData.cancellationStatus || 'active',
            basePrice: eventData.price?.toString() || '',
            currency: eventData.currency || 'AED',
            country: eventData.location?.country || '',
            city: eventData.location?.city || '',
            address: eventData.location?.address || '',
            latitude: eventData.location?.coordinates?.lat?.toString() || '',
            longitude: eventData.location?.coordinates?.lng?.toString() || '',
            meetingLink: eventData.meetingLink || '',
            googlePlaceId: eventData.googlePlaceId || '',
            seoMeta: {
              title: eventData.seoMeta?.title || '',
              description: eventData.seoMeta?.description || '',
              keywords: eventData.seoMeta?.keywords || []
            },
            faqs: eventData.faqs || [],
            subject: eventData.subject || '',
            topic: eventData.topic || '',
            introVideo: eventData.introVideo || '',
            syllabus: eventData.syllabus || [],
            pastEventMemories: eventData.pastEventMemories || [],
          };

          logger.debug('📝 Setting formData.description to:', newFormData.description);
          setFormData(newFormData);

          // Set selected image assets for MediaPickerModal
          if (eventData.imageAssets && eventData.imageAssets.length > 0) {
            setSelectedImageAssets(eventData.imageAssets);
          }

          // Transform schedules
          const transformedSchedules: Schedule[] = (eventData.dateSchedule || []).map((schedule: any, index: number) => {
            // Use price as ground truth to derive sessionType and isFreeSession.
            // DB flags may be stale/corrupted so we recompute from actual price.
            const dbPrice = parseFloat(schedule.price?.toString() || '0');
            // If sessionType is explicitly saved in DB, use it.
            // Otherwise infer: price > 0 → Standard, price === 0 → Intro.
            const resolvedSessionType: string = schedule.sessionType
              ? schedule.sessionType
              : (dbPrice > 0 ? 'Standard Session' : 'Intro Session');
            // isFreeSession: true only when sessionType is Intro AND price is 0.
            const resolvedIsFreeSession: boolean = resolvedSessionType === 'Intro Session' && dbPrice === 0;

            return {
              id: schedule._id || `schedule-${index}`,
              _id: schedule._id,
              startDate: schedule.startDate
                ? new Date(schedule.startDate).toISOString().split('T')[0]
                : schedule.date
                  ? new Date(schedule.date).toISOString().split('T')[0]
                  : '',
              endDate: schedule.endDate
                ? new Date(schedule.endDate).toISOString().split('T')[0]
                : schedule.date
                  ? new Date(schedule.date).toISOString().split('T')[0]
                  : '',
              startTime: schedule.startTime || '',
              endTime: schedule.endTime || '',
              availableSeats: (schedule.totalSeats || schedule.availableSeats || '').toString(),
              totalSeats: (schedule.totalSeats || schedule.availableSeats || '').toString(),
              soldSeats: schedule.soldSeats?.toString() || '0',
              reservedSeats: schedule.reservedSeats?.toString() || '0',
              price: schedule.price?.toString() || '',
              unlimitedSeats: schedule.unlimitedSeats || false,
              isSpecialDate: schedule.isSpecialDate || false,
              specialDates: schedule.specialDates?.map((d: any) =>
                new Date(d).toISOString().split('T')[0]
              ) || [],
              priority: schedule.priority || 0,
              isOverride: schedule.isOverride || false,
              sessionType: resolvedSessionType,
              ratePerClass: schedule.ratePerClass?.toString() || '',
              isFreeSession: resolvedIsFreeSession,
              timeSlots: (schedule.timeSlots || []).map((slot: any, slotIdx: number) => ({
                id: slot._id || `slot-${index}-${slotIdx}`,
                date: slot.date ? new Date(slot.date).toISOString().split('T')[0] : '',
                startTime: slot.startTime || '',
                endTime: slot.endTime || '',
                availableSeats: slot.availableSeats?.toString() || '',
                price: slot.price?.toString() || ''
              }))
            };
          });

          setSchedules(transformedSchedules);
        } else {
          logger.debug('📝 Create mode - initializing empty form');
          // Initialize with one empty schedule for new events
          setSchedules([{
            id: 'schedule-1',
            startDate: '',
            endDate: '',
            startTime: '',
            endTime: '',
            availableSeats: '',
            totalSeats: '',
            price: '',
            unlimitedSeats: false,
            isSpecialDate: false,
            specialDates: [],
            priority: 0,
            isOverride: false
          }]);
        }
      } catch (error: any) {
        logger.error('❌ Error fetching data:', error);
        logger.error('❌ Error details:', error.response?.data);
        setSaveStatus({
          type: 'error',
          message: error.response?.data?.message || 'Failed to load data. Please try again.'
        });
      } finally {
        logger.debug('✅ Data fetch complete, setting isLoading to false');
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Input change handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors(prev => {
        const { [name]: _removed, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleTagsChange = (tags: string[]) => {
    setFormData(prev => ({ ...prev, tags }));
    if (tags.length > 0 && errors.tags) {
      setErrors(prev => {
        const { tags, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleGradesChange = (grades: string[]) => {
    setFormData(prev => ({ ...prev, grades }));
  };

  const handleCountryChange = (country: string) => {
    setFormData(prev => ({
      ...prev,
      country,
      city: ''
    }));

    if (errors.country || errors.city) {
      setErrors(prev => {
        const { country, city, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleImagesChange = (assets: MediaAsset[]) => {
    setSelectedImageAssets(assets);
    setFormData(prev => ({
      ...prev,
      images: assets.map(a => a._id),
      imagePreviewUrls: assets.map(a => a.url)
    }));

    if (assets.length > 0 && errors.images) {
      setErrors(prev => {
        const { images, ...rest } = prev;
        return rest;
      });
    }
  };

  const removeImage = (index: number) => {
    setSelectedImageAssets(prev => prev.filter((_, i) => i !== index));
    setFormData(prev => {
      const newImages = prev.images.filter((_, i) => i !== index);
      const newImagePreviewUrls = prev.imagePreviewUrls.filter((_, i) => i !== index);

      return {
        ...prev,
        images: newImages,
        imagePreviewUrls: newImagePreviewUrls
      };
    });
  };

  // Schedule management
  const handleScheduleChange = (index: number, field: keyof Schedule, value: string | boolean | string[] | number) => {
    setSchedules(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      if (field === 'unlimitedSeats' && value === true) {
        updated[index].availableSeats = '';
      }

      return updated;
    });

    const errorKey = `schedule_${index}_${field}`;
    if (errors[errorKey]) {
      setErrors(prev => {
        const { [errorKey]: _removed, ...rest } = prev;
        return rest;
      });
    }

    if (field === 'unlimitedSeats') {
      const seatsErrorKey = `schedule_${index}_availableSeats`;
      if (errors[seatsErrorKey]) {
        setErrors(prev => {
          const { [seatsErrorKey]: _removed, ...rest } = prev;
          return rest;
        });
      }
    }
  };

  const handleAddSchedule = (isSpecialDate: boolean = false) => {
    const newSchedule: Schedule = {
      id: `schedule-${Date.now()}`,
      startDate: '',
      endDate: '',
      startTime: '',
      endTime: '',
      availableSeats: '',
      totalSeats: '',
      price: formData.basePrice || '',
      unlimitedSeats: false,
      isSpecialDate,
      specialDates: [],
      priority: 0,
      isOverride: false
    };
    setSchedules(prev => [...prev, newSchedule]);
  };

  const handleRemoveSchedule = (index: number) => {
    setSchedules(prev => prev.filter((_, i) => i !== index));
  };

  // FAQ management
  const handleFaqChange = (index: number, field: 'question' | 'answer', value: string) => {
    setFormData(prev => {
      const updatedFaqs = [...prev.faqs];
      updatedFaqs[index] = { ...updatedFaqs[index], [field]: value };
      return { ...prev, faqs: updatedFaqs };
    });

    const errorKey = `faq_${index}_${field}`;
    if (errors[errorKey]) {
      setErrors(prev => {
        const { [errorKey]: _removed, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleAddFaq = () => {
    setFormData(prev => ({
      ...prev,
      faqs: [...prev.faqs, { id: `faq-${Date.now()}`, question: '', answer: '' }]
    }));
  };

  const handleRemoveFaq = (index: number) => {
    setFormData(prev => ({
      ...prev,
      faqs: prev.faqs.filter((_, i) => i !== index)
    }));
  };

  // SEO change handler
  const handleSeoChange = useCallback((seoData: any) => {
    setFormData(prev => ({
      ...prev,
      seoMeta: {
        title: seoData.title,
        description: seoData.description,
        keywords: seoData.keywords
      }
    }));
  }, []);

  // Custom CSS change handler
  const handleCustomCSSChange = (css: string) => {
    setFormData(prev => ({ ...prev, customCSS: css }));
  };

  // Validation
  const validateForm = (validateAll: boolean = false): { isValid: boolean; errors: Record<string, string> } => {
    const newErrors: Record<string, string> = {};

    // Basic Info validation
    if (validateAll || activeTab === 'basic' || activeTab === 'schedule') {
      if (!formData.title?.trim()) newErrors.title = 'Title is required';
      if (!formData.description?.trim()) newErrors.description = 'Description is required';
      if (!formData.category) newErrors.category = 'Category is required';
      if (!formData.teacherId?.trim()) {
        newErrors.teacherId = 'Instructor is required';
      } else if (!/^[0-9a-fA-F]{24}$/.test(formData.teacherId.trim())) {
        newErrors.teacherId = 'Invalid teacher ID format';
      }
      if (!formData.ageRangeMin?.trim()) newErrors.ageRangeMin = 'Minimum age is required';
      if (!formData.ageRangeMax?.trim()) newErrors.ageRangeMax = 'Maximum age is required';

      // Age range validation
      if (formData.ageRangeMin && formData.ageRangeMax) {
        const minAge = parseInt(formData.ageRangeMin);
        const maxAge = parseInt(formData.ageRangeMax);
        if (isNaN(minAge) || isNaN(maxAge)) {
          newErrors.ageRangeMin = 'Age must be a valid number';
        } else if (minAge >= maxAge) {
          newErrors.ageRangeMax = 'Maximum age must be greater than minimum age';
        }
      }

      // Meeting link validation for Online/Hybrid removed per user request
    }

    // Schedule validation
    if (validateAll || activeTab === 'schedule') {
      // Validate each schedule
      schedules.forEach((schedule, index) => {
        if (!schedule.startDate) {
          newErrors[`schedule_${index}_startDate`] = 'Start date is required';
        }
        if (!schedule.endDate) {
          newErrors[`schedule_${index}_endDate`] = 'End date is required';
        }

        if (!schedule.unlimitedSeats) {
          if (!schedule.availableSeats) {
            newErrors[`schedule_${index}_availableSeats`] = 'Available seats is required';
          } else {
            const seats = parseInt(schedule.availableSeats);
            if (isNaN(seats) || seats < 1 || seats > 10000) {
              newErrors[`schedule_${index}_availableSeats`] = 'Available seats must be between 1 and 10,000';
            }
          }
        }

        if (!schedule.isFreeSession) {
          if (!schedule.price) {
            newErrors[`schedule_${index}_price`] = 'Price is required';
          } else if (isNaN(parseFloat(schedule.price)) || parseFloat(schedule.price) < 0) {
            newErrors[`schedule_${index}_price`] = 'Price must be a valid number';
          }
        }
      });
    }

    // Advanced tab validation
    if (validateAll || activeTab === 'advanced') {
      if (!formData.country?.trim()) newErrors.country = 'Country is required';
      if (!formData.city?.trim()) newErrors.city = 'City is required';

      // Address is required for offline teaching only
      if (formData.teachingMode === 'Offline' && !formData.address?.trim()) {
        newErrors.address = 'Address is required for offline teaching';
      }

      // FAQ validation
      formData.faqs.forEach((faq, index) => {
        if (!faq.question.trim()) {
          newErrors[`faq_${index}_question`] = 'Question is required';
        }
        if (!faq.answer.trim()) {
          newErrors[`faq_${index}_answer`] = 'Answer is required';
        }
      });
    }

    setErrors(newErrors);
    return {
      isValid: Object.keys(newErrors).length === 0,
      errors: newErrors
    };
  };

  // Syllabus Handlers
  const handleAddSyllabusSection = () => {
    setFormData(prev => ({
      ...prev,
      syllabus: [
        ...prev.syllabus,
        { title: '', description: '', duration: '', lessons: [] }
      ]
    }));
  };

  const handleRemoveSyllabusSection = (index: number) => {
    setFormData(prev => ({
      ...prev,
      syllabus: prev.syllabus.filter((_, i) => i !== index)
    }));
  };

  const handleSyllabusSectionChange = (index: number, field: keyof SyllabusSection, value: string) => {
    setFormData(prev => {
      const newSyllabus = [...prev.syllabus];
      newSyllabus[index] = { ...newSyllabus[index], [field]: value };
      return { ...prev, syllabus: newSyllabus };
    });
  };

  const handleAddLesson = (sectionIndex: number) => {
    setFormData(prev => {
      const newSyllabus = [...prev.syllabus];
      newSyllabus[sectionIndex].lessons.push({ title: '', duration: '' });
      return { ...prev, syllabus: newSyllabus };
    });
  };

  const handleRemoveLesson = (sectionIndex: number, lessonIndex: number) => {
    setFormData(prev => {
      const newSyllabus = [...prev.syllabus];
      newSyllabus[sectionIndex].lessons = newSyllabus[sectionIndex].lessons.filter((_, i) => i !== lessonIndex);
      return { ...prev, syllabus: newSyllabus };
    });
  };

  const handleLessonChange = (sectionIndex: number, lessonIndex: number, field: keyof SyllabusLesson, value: string) => {
    setFormData(prev => {
      const newSyllabus = [...prev.syllabus];
      newSyllabus[sectionIndex].lessons[lessonIndex] = {
        ...newSyllabus[sectionIndex].lessons[lessonIndex],
        [field]: value
      };
      return { ...prev, syllabus: newSyllabus };
    });
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
        type: 'error',
        message: `Please fix validation errors: ${validation.errors[firstErrorField]}`
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      setIsSaving(true);
      setSaveStatus(null);

      // Transform form data to match backend TeachingEvent model
      // Map teachingMode to eventType (backend uses eventType: 'Online' | 'Offline')
      const eventType = formData.teachingMode === 'Hybrid' ? 'Online' : formData.teachingMode;

      // Validate teacherId is a valid MongoDB ObjectId
      if (!formData.teacherId?.trim() || !/^[0-9a-fA-F]{24}$/.test(formData.teacherId)) {
        setSaveStatus({
          type: 'error',
          message: 'Please select a valid instructor before saving.'
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setIsSaving(false);
        return;
      }

      const eventData = {
        title: formData.title,
        description: formData.description,
        customCSS: formData.customCSS,
        category: formData.category,
        type: formData.type,
        eventType: eventType, // Backend expects 'eventType', not 'teachingMode'
        ageRange: [parseInt(formData.ageRangeMin), parseInt(formData.ageRangeMax)],
        grades: formData.grades,
        teacherId: formData.teacherId.trim(),
        skillLevel: formData.skillLevel,
        prerequisites: formData.prerequisites || undefined,
        duration: formData.duration || undefined,
        location: {
          country: formData.country || undefined,
          city: formData.city,
          address: (formData.teachingMode === 'Offline') ? formData.address : undefined,
          coordinates: (formData.teachingMode === 'Offline') ? {
            lat: parseFloat(formData.latitude) || 0,
            lng: parseFloat(formData.longitude) || 0
          } : undefined
        },
        meetingLink: (formData.teachingMode === 'Online' || formData.teachingMode === 'Hybrid') ? formData.meetingLink : undefined,
        googlePlaceId: formData.googlePlaceId,
        price: schedules.length > 0 ? parseFloat(schedules[0].price || "0") : 0,
        currency: "AED", // Defaulted since global currency is removed
        tags: formData.tags,

        // Admin-specific fields
        isApproved: formData.isApproved,
        isFeatured: formData.isFeatured,
        requirePhoneVerification: formData.requirePhoneVerification,
        status: formData.status,
        isActive: formData.isActive,
        slug: formData.slug || undefined,
        isAffiliateTeachingEvent: formData.isAffiliateTeachingEvent,
        externalBookingLink: formData.isAffiliateTeachingEvent ? formData.externalBookingLink : undefined,
        cancellationStatus: formData.cancellationStatus,

        // Multiple schedules
        dateSchedule: schedules.map(schedule => ({
          ...(schedule._id && { _id: schedule._id }),
          startDate: schedule.startDate,
          endDate: schedule.endDate,
          startTime: schedule.startTime || '',
          endTime: schedule.endTime || '',
          availableSeats: schedule.unlimitedSeats
            ? 999999
            : parseInt(schedule.availableSeats) || 0,
          // Use user-typed availableSeats as the new totalSeats so the backend
          // recalculates correctly.
          totalSeats: schedule.unlimitedSeats
            ? undefined
            : parseInt(schedule.availableSeats) || undefined,
          price: schedule.isFreeSession ? 0 : (schedule.price !== '' && schedule.price !== null && schedule.price !== undefined ? (parseFloat(schedule.price) || 0) : 0),
          unlimitedSeats: schedule.unlimitedSeats || false,
          isSpecialDate: schedule.isSpecialDate || false,
          specialDates: schedule.specialDates || [],
          description: schedule.description || '',
          priority: schedule.priority || 0,
          isOverride: schedule.isOverride || false,
          sessionType: schedule.sessionType,
          isFreeSession: schedule.isFreeSession || false,
          ratePerClass: schedule.ratePerClass ? parseFloat(schedule.ratePerClass) : undefined,
          timeSlots: (schedule.timeSlots || []).map(slot => ({
            date: new Date(slot.date),
            startTime: slot.startTime,
            endTime: slot.endTime,
            availableSeats: parseInt(slot.availableSeats) || 0,
            price: slot.price ? parseFloat(slot.price) : undefined
          }))
        })),

        imageAssets: formData.images,

        seoMeta: {
          title: formData.seoMeta.title || formData.title,
          description: formData.seoMeta.description || formData.description.substring(0, 160),
          keywords: formData.seoMeta.keywords.length > 0
            ? formData.seoMeta.keywords
            : formData.tags
        },

        faqs: formData.faqs.map(faq => ({
          ...(faq._id && { _id: faq._id }),
          question: faq.question,
          answer: faq.answer
        })),
        pastEventMemories: formData.pastEventMemories,

        subject: formData.subject,
        topic: formData.topic,
        introVideo: formData.introVideo,
        syllabus: formData.syllabus,
      };

      if (isCreateMode) {
        const response = await adminAPI.createTeachingEvent(eventData);
        const newEventId = response?.data?.event?.id || response?.event?.id;

        setErrors({});
        setSaveStatus({
          type: 'success',
          message: 'Teaching event created successfully!'
        });

        setTimeout(() => {
          if (newEventId) {
            navigate(`/admin/teaching-events/${newEventId}/edit`);
          } else {
            navigate('/admin/teaching-events');
          }
        }, 2000);
      } else {
        await adminAPI.updateTeachingEvent(id!, eventData);

        setErrors({});
        setSaveStatus({
          type: 'success',
          message: 'Teaching event updated successfully!'
        });

        setTimeout(() => {
          navigate('/admin/teaching-events');
        }, 2000);
      }
    } catch (error: any) {
      logger.error('Error saving teaching event:', error);

      const validationErrors = error.response?.data?.errors;
      if (validationErrors && typeof validationErrors === 'object') {
        const errorMessages: Record<string, string> = {};
        Object.keys(validationErrors).forEach((field) => {
          const fieldErrors = validationErrors[field];
          if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
            errorMessages[field] = fieldErrors[0].msg || fieldErrors[0];
          } else if (typeof fieldErrors === 'string') {
            errorMessages[field] = fieldErrors;
          }
        });

        setErrors(errorMessages);

        const errorCount = Object.keys(errorMessages).length;
        setSaveStatus({
          type: 'error',
          message: `Validation failed: ${errorCount} field${errorCount > 1 ? 's' : ''} ${errorCount > 1 ? 'have' : 'has'} errors. Please review and correct the highlighted fields.`,
          validationErrors: errorMessages
        });
      } else {
        setSaveStatus({
          type: 'error',
          message: error.response?.data?.message || `Failed to ${isCreateMode ? 'create' : 'update'} teaching event. Please try again.`
        });
      }

      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'published': return 'success';
      case 'draft': return 'warning';
      case 'archived': return 'secondary';
      case 'pending': return 'warning';
      case 'rejected': return 'error';
      default: return 'secondary';
    }
  };

  const tabs = [
    { id: 'basic' as TabType, label: 'Basic Info', icon: FileText },
    { id: 'schedule' as TabType, label: 'Schedule & Pricing', icon: Calendar },
    { id: 'advanced' as TabType, label: 'Advanced', icon: MapPin },
    { id: 'reviews' as TabType, label: 'Reviews', icon: Star },
    { id: 'registration' as TabType, label: 'Registration Form', icon: CheckCircle2 },
    { id: 'syllabus' as TabType, label: 'Syllabus', icon: BookOpen }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/admin/teaching-events')}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  {isCreateMode ? 'Create New Teaching Event' : 'Edit Teaching Event'}
                </h1>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={getStatusVariant(formData.status)}>{formData.status}</Badge>
                  {formData.isFeatured && <Badge variant="featured">✨ Featured</Badge>}
                  {formData.isApproved && <Badge variant="success">✓ Approved</Badge>}
                  <span className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded-full">Teaching Event</span>
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
                {isSaving ? 'Saving...' : (isCreateMode ? 'Create Event' : 'Save Changes')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {saveStatus && (
        <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4`}>
          <div className={`p-4 rounded-xl ${saveStatus.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            <p className="font-medium">{saveStatus.message}</p>
            {saveStatus.validationErrors && Object.keys(saveStatus.validationErrors).length > 0 && (
              <ul className="mt-2 ml-4 list-disc space-y-1">
                {Object.entries(saveStatus.validationErrors).map(([field, error]) => (
                  <li key={field} className="text-sm">
                    <span className="font-semibold">{field}:</span> {error}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="bg-white rounded-xl shadow-lg mb-8 overflow-hidden">
          <div className="flex border-b border-gray-200 overflow-x-auto">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex-1 py-4 px-6 text-center font-medium transition-all duration-200 whitespace-nowrap
                    ${activeTab === tab.id
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
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
          {activeTab === 'basic' && (
            <>
              <TeachingBasicInfoTab
                formData={formData}
                categories={categories}
                teachers={teachers}
                errors={errors}
                onInputChange={handleInputChange}
                onCheckboxChange={handleCheckboxChange}
                onImagesChange={handleImagesChange}
                onRemoveImage={removeImage}
                onTagsChange={handleTagsChange}
                onGradesChange={handleGradesChange}
                onCustomCSSChange={handleCustomCSSChange}
                showMediaPicker={showMediaPicker}
                onOpenMediaPicker={() => setShowMediaPicker(true)}
                onCloseMediaPicker={() => setShowMediaPicker(false)}
                selectedImageAssets={selectedImageAssets}
              />

              {/* New Fields for Course - Added outside TeachingBasicInfoTab */}
              <div className="bg-white p-6 rounded-lg shadow-sm mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Course Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-700">Subject</label>
                    <input
                      type="text"
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. Mathematics"
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-700">Topic</label>
                    <input
                      type="text"
                      name="topic"
                      value={formData.topic}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. Calculus"
                    />
                  </div>
                  <div className="col-span-2 space-y-4">
                    <label className="block text-sm font-medium text-gray-700">Intro Video URL</label>
                    <input
                      type="text"
                      name="introVideo"
                      value={formData.introVideo}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="https://youtube.com/..."
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'schedule' && (
            isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading schedule data...</p>
                </div>
              </div>
            ) : (
              <TeachingSchedulePricingTab
                schedules={schedules || []}
                currency={formData.currency || 'AED'}
                basePrice={formData.basePrice || ''}
                errors={errors}
                onScheduleChange={handleScheduleChange}
                onAddSchedule={handleAddSchedule}
                onRemoveSchedule={handleRemoveSchedule}
                onCurrencyChange={handleInputChange}
                onBasePriceChange={handleInputChange}
              />
            )
          )}

          {activeTab === 'advanced' && (
            <TeachingAdvancedTab
              teachingMode={formData.teachingMode}
              formData={formData}
              eventData={{
                title: formData.title,
                description: formData.description,
                category: formData.category,
                tags: formData.tags.join(', '),
                _id: id
              }}
              errors={errors}
              onInputChange={handleInputChange}
              onCountryChange={handleCountryChange}
              onFaqChange={handleFaqChange}
              onAddFaq={handleAddFaq}
              onRemoveFaq={handleRemoveFaq}
              onSeoChange={handleSeoChange}
              imagePreviewUrl={formData.imagePreviewUrls[0]}
            />
          )}

          {activeTab === 'reviews' && id && (
            <ReviewsTab
              eventId={id}
              googlePlaceId={formData.googlePlaceId}
              onGooglePlaceIdChange={(placeId) =>
                setFormData({ ...formData, googlePlaceId: placeId })
              }
            />
          )}

          {activeTab === 'reviews' && !id && (
            <div className="p-6">
              <div className="max-w-2xl mx-auto">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                    <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Reviews Not Available Yet
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Reviews can only be managed after the teaching event has been created and saved.
                    Please complete the basic information and save it first.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('basic')}
                    className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Go to Basic Info
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'registration' && (
            <div>
              {!id ? (
                <div className="p-6">
                  <div className="max-w-2xl mx-auto">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
                      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                        <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Registration Form Not Available Yet
                      </h3>
                      <p className="text-gray-600 mb-6">
                        Registration forms can only be configured after the teaching event has been created and saved.
                        Please complete the basic event information and save it first.
                      </p>
                      <div className="bg-white rounded-md p-4 mb-6 text-left">
                        <p className="text-sm text-gray-700 font-medium mb-2">Next steps:</p>
                        <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                          <li>Fill out the required fields in the Basic Info tab</li>
                          <li>Add at least one schedule in Schedule & Pricing</li>
                          <li>Click "Create Event" to save your teaching event</li>
                          <li>After creation, you'll be able to configure the registration form</li>
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
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Creating Event...
                          </>
                        ) : (
                          <>
                            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Save Event & Continue
                          </>
                        )}
                      </button>
                      <p className="text-xs text-gray-500 mt-3">
                        You'll be redirected to edit mode where you can configure the registration form
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <FormBuilder
                  eventId={id}
                  onSaveSuccess={() => {
                    setSaveStatus({
                      type: 'success',
                      message: 'Registration form saved successfully!'
                    });
                    setTimeout(() => setSaveStatus(null), 3000);
                  }}
                />
              )}
            </div>
          )}
          {activeTab === 'syllabus' && (
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">Course Syllabus</h3>
                <button
                  type="button"
                  onClick={handleAddSyllabusSection}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Section
                </button>
              </div>

              <div className="space-y-6">
                {formData.syllabus.map((section, sIndex) => (
                  <div key={sIndex} className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <input
                        type="text"
                        placeholder="Section Title (e.g., Module 1: Introduction)"
                        value={section.title}
                        onChange={(e) => handleSyllabusSectionChange(sIndex, 'title', e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Duration (e.g., 2 weeks)"
                        value={section.duration}
                        onChange={(e) => handleSyllabusSectionChange(sIndex, 'duration', e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg bg-white"
                      />
                      <textarea
                        placeholder="Section Description"
                        value={section.description}
                        onChange={(e) => handleSyllabusSectionChange(sIndex, 'description', e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg bg-white col-span-2"
                        rows={2}
                      />
                    </div>

                    <div className="space-y-3 pl-4 border-l-2 border-gray-200">
                      {section.lessons.map((lesson, lIndex) => (
                        <div key={lIndex} className="flex gap-3 items-center">
                          <GripVertical className="w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Lesson Title"
                            value={lesson.title}
                            onChange={(e) => handleLessonChange(sIndex, lIndex, 'title', e.target.value)}
                            className="flex-1 px-3 py-2 border rounded-lg text-sm"
                          />
                          <input
                            type="text"
                            placeholder="Duration"
                            value={lesson.duration}
                            onChange={(e) => handleLessonChange(sIndex, lIndex, 'duration', e.target.value)}
                            className="w-24 px-3 py-2 border rounded-lg text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveLesson(sIndex, lIndex)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => handleAddLesson(sIndex)}
                        className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-2"
                      >
                        <Plus className="w-3 h-3" /> Add Lesson
                      </button>
                    </div>

                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleRemoveSyllabusSection(sIndex)}
                        className="text-sm text-red-600 hover:text-red-800 flex items-center gap-1"
                      >
                        <Trash2 className="w-4 h-4" /> Remove Section
                      </button>
                    </div>
                  </div>
                ))}
                {formData.syllabus.length === 0 && (
                  <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-200 rounded-xl">
                    <p>No syllabus sections added yet.</p>
                    <button
                      type="button"
                      onClick={handleAddSyllabusSection}
                      className="mt-2 text-blue-600 font-medium hover:underline"
                    >
                      Add your first section
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminTeachingEditEventPage;
