import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import teachingEventAPI from '../services/api/teachingEventAPI';
import { ITeachingEvent } from '../types/teacher';
import { AppDispatch } from '../store/legacyStore';
import {
    setBookingEvent,
    setBookingSchedule,
    resetBookingFlow,
    setBookingParticipants,
} from '../store/legacySlices/bookingsSlice';
import {
    ArrowLeft, MapPin, Clock, User,
    PlayCircle, BookOpen, CheckCircle2, Minus, Plus, Shield,
} from 'lucide-react';
import Badge from '../components/ui/Badge';
import EventDatePicker from '../components/ui/EventDatePicker';
// ImageCarousel available for future multi-image support
import { getEventImage } from '../utils/imageFallbacks';
import DOMPurify from 'isomorphic-dompurify';

const TeachingEventDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const dispatch = useDispatch<AppDispatch>();
    const [event, setEvent] = useState<ITeachingEvent | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'about' | 'syllabus' | 'instructor'>('about');
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [quantity, setQuantity] = useState(1);

    useEffect(() => {
        const fetchEvent = async () => {
            if (!id) return;
            try {
                setLoading(true);
                const response = await teachingEventAPI.getById(id);
                setEvent(response.teachingEvent);
            } catch (err) {
                console.error('Failed to fetch teaching event:', err);
                setError('Failed to load event details. It may have been removed or does not exist.');
            } finally {
                setLoading(false);
            }
        };

        fetchEvent();
    }, [id]);

    // Map dateSchedule for EventDatePicker compatibility
    const mappedSchedules = useMemo(() => {
        if (!event?.dateSchedule) return [];
        return event.dateSchedule.map(ds => ({
            startDate: String(ds.startDate || ds.date || ''),
            endDate: String(ds.endDate || ds.startDate || ds.date || ''),
            totalSeats: ds.totalSeats || ds.availableSeats || 0,
            availableSeats: ds.availableSeats ?? 0,
            soldSeats: ds.soldSeats || 0,
            reservedSeats: 0,
            price: ds.price,
            _id: ds._id,
        }));
    }, [event?.dateSchedule]);

    const currentSchedule = useMemo(() => {
        if (!event?.dateSchedule || !selectedDate) return null;
        return event.dateSchedule.find(ds => {
            const d = new Date(
                (ds.startDate || ds.date) as string | number | Date
            );
            return d.toDateString() === selectedDate.toDateString();
        }) || null;
    }, [event?.dateSchedule, selectedDate]);

    const availableSeats = currentSchedule
        ? (currentSchedule.unlimitedSeats
            ? Infinity
            : currentSchedule.availableSeats)
        : 0;

    const currentPrice = currentSchedule?.price ?? event?.price ?? 0;

    const handleBookNow = () => {
        if (!event || !selectedDate) return;

        dispatch(resetBookingFlow());
        dispatch(setBookingEvent(event._id));
        if (currentSchedule?._id) {
            dispatch(setBookingSchedule(currentSchedule._id));
        }

        const participants = Array.from(
            { length: quantity },
            (_, i) => ({
                id: `participant-${i + 1}`,
                name: '',
                email: '',
                phone: '',
            })
        );
        dispatch(setBookingParticipants(participants));

        navigate(`/booking/${event.slug || event._id}`, {
            state: {
                event: { ...event, _id: event._id, id: event._id },
                quantity,
                selectedDate: selectedDate.toISOString(),
                schedule: currentSchedule,
                scheduleId: currentSchedule?._id,
                totalPrice: (currentPrice * quantity).toFixed(2),
                currency: event.currency || 'AED',
                isTeachingEvent: true,
            },
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error || !event) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
                <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">⚠️</span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Event Not Found</h2>
                    <p className="text-gray-600 mb-6">{error || 'Unable to find the requested teaching event.'}</p>
                    <button
                        onClick={() => navigate('/')}
                        className="w-full py-3 px-4 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium transition-colors"
                    >
                        Go to Homepage
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            {/* Sticky Header for Mobile */}
            <div className="sticky top-0 z-30 bg-white border-b border-gray-200 md:hidden p-4 flex items-center justify-between shadow-sm">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <span className="font-semibold truncate max-w-[200px]">{event.title}</span>
                <button className="p-2 opacity-0"><ArrowLeft className="w-5 h-5" /></button>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Breadcrumb & Back */}
                <div className="hidden md:flex items-center mb-6 text-sm text-gray-500">
                    <button onClick={() => navigate(-1)} className="flex items-center hover:text-gray-900 transition-colors mr-4">
                        <ArrowLeft className="w-4 h-4 mr-1" /> Back
                    </button>
                    <span>Events</span>
                    <span className="mx-2">/</span>
                    <span className="font-medium text-gray-900 truncate max-w-md">{event.title}</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Media & Details */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Header Section */}
                        <div>
                            <div className="flex flex-wrap gap-2 mb-4">
                                <Badge variant="default" className="bg-primary-100 text-primary-700 hover:bg-primary-200 border-none">
                                    {event.type}
                                </Badge>
                                <Badge variant="secondary" className="bg-purple-100 text-purple-700 hover:bg-purple-200 border-none">
                                    {event.category}
                                </Badge>
                                <Badge variant={event.eventType === 'Online' ? 'success' : 'warning'}>
                                    {event.eventType}
                                </Badge>
                            </div>
                            <h1 className="text-3xl md:text-5xl font-bold text-gray-900 leading-tight mb-4">
                                {event.title}
                            </h1>
                            {event.subject && event.topic && (
                                <p className="text-lg text-gray-600 mb-2">
                                    <span className="font-medium text-gray-900">{event.subject}</span> • {event.topic}
                                </p>
                            )}
                        </div>

                        {/* Media Gallery */}
                        <div className="bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100">
                            {/* Intro Video Overlay if available */}
                            {event.introVideo && (
                                <div className="relative group">
                                    {/* Placeholder for video player integration */}
                                    <div className="absolute top-4 right-4 z-10">
                                        <a href={event.introVideo} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-white/90 backdrop-blur text-gray-900 px-4 py-2 rounded-full text-sm font-medium hover:bg-white transition-all shadow-lg cursor-pointer">
                                            <PlayCircle className="w-4 h-4 text-red-600" />
                                            Watch Intro
                                        </a>
                                    </div>
                                </div>
                            )}

                            {/* Use the mapped image URL or fallback */}
                            {/* 
                  Note: ITeachingEvent interface might have array of image strings or objects.
                  Adjust based on actual API response structure. 
               */}
                            <div className="aspect-video w-full bg-gray-200">
                                <img
                                    src={event.images?.[0] || getEventImage(undefined, event.title, 800, 450)}
                                    alt={event.title}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = getEventImage(undefined, event.title, 800, 450);
                                    }}
                                />
                            </div>
                        </div>

                        {/* Content Tabs */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="flex border-b border-gray-200 overflow-x-auto scrolbar-hide">
                                {[
                                    { id: 'about', label: 'About', icon: BookOpen },
                                    { id: 'syllabus', label: 'Syllabus', icon: CheckCircle2 },
                                    { id: 'instructor', label: 'Instructor', icon: User },
                                ].map(tab => {
                                    const Icon = tab.icon;
                                    // Only show syllabus tab if syllabus exists
                                    if (tab.id === 'syllabus' && (!event.syllabus || event.syllabus.length === 0)) return null;

                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id as any)}
                                            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                                    ${activeTab === tab.id
                                                    ? 'border-primary text-primary bg-primary-50/50'
                                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                                }`}
                                        >
                                            <Icon className="w-4 h-4" />
                                            {tab.label}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="p-6 md:p-8">
                                {activeTab === 'about' && (
                                    <div className="prose max-w-none text-gray-600">
                                        <h3 className="text-xl font-bold text-gray-900 mb-4">Description</h3>
                                        <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(event.description) }} />

                                        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="bg-gray-50 p-4 rounded-lg">
                                                <h4 className="font-semibold text-gray-900 mb-2">Age Range</h4>
                                                <p>{event.ageRange[0]} - {event.ageRange[1]} years old</p>
                                            </div>
                                            <div className="bg-gray-50 p-4 rounded-lg">
                                                <h4 className="font-semibold text-gray-900 mb-2">Skill Level</h4>
                                                <p>{(event as any).skillLevel || 'All Levels'}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'syllabus' && event.syllabus && (
                                    <div className="space-y-6">
                                        <h3 className="text-xl font-bold text-gray-900">Course Syllabus</h3>
                                        {event.syllabus.map((section, idx) => (
                                            <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden">
                                                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                                                    <div className="flex justify-between items-center">
                                                        <h4 className="font-semibold text-gray-900 text-lg">
                                                            {idx + 1}. {section.title}
                                                        </h4>
                                                        {section.duration && (
                                                            <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200">
                                                                {section.duration}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {section.description && <p className="text-sm text-gray-600 mt-1">{section.description}</p>}
                                                </div>
                                                {section.lessons && section.lessons.length > 0 && (
                                                    <div className="divide-y divide-gray-100">
                                                        {section.lessons.map((lesson, lIdx) => (
                                                            <div key={lIdx} className="px-6 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                                                <div className="flex items-center gap-3">
                                                                    <PlayCircle className="w-4 h-4 text-primary" />
                                                                    <span className="text-gray-700">{lesson.title}</span>
                                                                </div>
                                                                {lesson.duration && (
                                                                    <span className="text-xs text-gray-400 font-medium">{lesson.duration}</span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {activeTab === 'instructor' && (
                                    <div className="flex items-start gap-6">
                                        {/* Note: ITeachingEvent.teacherId might be just ID string in some API responses, need to handle populated teacher */}
                                        <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center text-gray-400">
                                            <User className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900 mb-2">About the Instructor</h3>
                                            <p className="text-gray-600">
                                                {/* This is a placeholder. You'd ideally populate teacher details or fetch them */}
                                                Instructor details would appear here.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Booking Card */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 sticky top-24">
                            {/* Intro Video */}
                            {event.introVideo && (
                                <div className="mb-6">
                                    <span className="text-sm text-gray-500 font-medium uppercase tracking-wider">
                                        Intro Video
                                    </span>
                                    <div className="mt-2 rounded-xl overflow-hidden bg-black aspect-video">
                                        {event.introVideo.includes('youtube.com') || event.introVideo.includes('youtu.be') ? (
                                            <iframe
                                                src={event.introVideo
                                                    .replace('watch?v=', 'embed/')
                                                    .replace('youtu.be/', 'youtube.com/embed/')}
                                                title="Intro Video"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowFullScreen
                                                className="w-full h-full"
                                            />
                                        ) : event.introVideo.includes('vimeo.com') ? (
                                            <iframe
                                                src={event.introVideo.replace('vimeo.com/', 'player.vimeo.com/video/')}
                                                title="Intro Video"
                                                allow="autoplay; fullscreen; picture-in-picture"
                                                allowFullScreen
                                                className="w-full h-full"
                                            />
                                        ) : (
                                            <video
                                                src={event.introVideo}
                                                controls
                                                className="w-full h-full object-contain"
                                                preload="metadata"
                                            />
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Price */}
                            <div className="mb-6">
                                <span className="text-sm text-gray-500 font-medium uppercase tracking-wider">Price</span>
                                <div className="flex items-baseline gap-1 mt-1">
                                    <span className="text-3xl font-bold text-gray-900">
                                        {new Intl.NumberFormat('en-AE', {
                                            style: 'currency',
                                            currency: event.currency || 'AED',
                                        }).format(currentPrice)}
                                    </span>
                                    <span className="text-gray-400 text-sm">/ person</span>
                                </div>
                            </div>

                            {/* Date Picker */}
                            {mappedSchedules.length > 0 && (
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Select Date
                                    </label>
                                    <EventDatePicker
                                        dateSchedules={mappedSchedules}
                                        selectedDate={selectedDate}
                                        onDateSelect={setSelectedDate}
                                    />
                                </div>
                            )}

                            {/* Quantity Selector */}
                            {selectedDate && (
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Participants
                                    </label>
                                    <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                                        <button
                                            onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                            disabled={quantity <= 1}
                                            className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <Minus className="w-4 h-4" />
                                        </button>
                                        <span className="text-lg font-semibold text-gray-900">{quantity}</span>
                                        <button
                                            onClick={() => setQuantity(q =>
                                                availableSeats === Infinity ? q + 1 : Math.min(availableSeats, q + 1)
                                            )}
                                            disabled={availableSeats !== Infinity && quantity >= availableSeats}
                                            className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                    {availableSeats !== Infinity && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            {availableSeats} seat{availableSeats !== 1 ? 's' : ''} available
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Pricing Breakdown */}
                            {selectedDate && (
                                <div className="mb-6 border-t border-gray-200 pt-4 space-y-2">
                                    <div className="flex justify-between text-sm text-gray-600">
                                        <span>{new Intl.NumberFormat('en-AE', {
                                            style: 'currency',
                                            currency: event.currency || 'AED',
                                        }).format(currentPrice)} × {quantity}</span>
                                        <span>{new Intl.NumberFormat('en-AE', {
                                            style: 'currency',
                                            currency: event.currency || 'AED',
                                        }).format(currentPrice * quantity)}</span>
                                    </div>
                                    <div className="flex justify-between font-semibold text-gray-900 pt-2 border-t border-gray-100">
                                        <span>Total</span>
                                        <span>{new Intl.NumberFormat('en-AE', {
                                            style: 'currency',
                                            currency: event.currency || 'AED',
                                        }).format(currentPrice * quantity)}</span>
                                    </div>
                                </div>
                            )}

                            {/* Event Info */}
                            <div className="space-y-3 mb-6">
                                <div className="flex items-start gap-3 text-gray-600">
                                    <MapPin className="w-5 h-5 mt-0.5 text-red-500 shrink-0" />
                                    <p className="text-sm">
                                        {event.eventType === 'Online'
                                            ? 'Online Event'
                                            : `${event.location?.address}, ${event.location?.city}`}
                                    </p>
                                </div>
                                <div className="flex items-start gap-3 text-gray-600">
                                    <Clock className="w-5 h-5 mt-0.5 text-orange-500 shrink-0" />
                                    <p className="text-sm">{(event as any).duration || 'Variable'}</p>
                                </div>
                            </div>

                            {/* Book Now */}
                            <button
                                className="w-full py-4 text-center rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-lg shadow-lg shadow-primary/30 transition-all transform hover:-translate-y-1 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                                onClick={handleBookNow}
                                disabled={!selectedDate || availableSeats === 0}
                            >
                                {!selectedDate
                                    ? 'Select a Date'
                                    : availableSeats === 0
                                        ? 'Sold Out'
                                        : 'Book Now'}
                            </button>

                            <div className="flex items-center justify-center gap-1.5 mt-4">
                                <Shield className="w-3.5 h-3.5 text-green-600" />
                                <p className="text-xs text-gray-400">
                                    Secure payment processed by Kidrove
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeachingEventDetailPage;
