import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaTimes,
  FaInfoCircle,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimesCircle,
  FaChevronLeft,
  FaChevronRight
} from 'react-icons/fa';
import {
  useActiveAnnouncements,
  useRecordImpressionMutation,
  useRecordClickMutation,
  useRecordDismissalMutation
} from '@/hooks/queries/useAnnouncementsQuery';
import { AnnouncementBar as AnnouncementBarType } from '@/types/announcementBar';
import logger from '@/utils/logger';

const DISMISSAL_STORAGE_KEY = 'gema_announcement_dismissals';
const SLIDE_INTERVAL = 5000;

interface DismissalRecord {
  dismissedAt: number;
  expiresAt: number | null;
}

const variantConfig: Record<string, {
  bg: string;
  text: string;
  icon: React.ReactElement;
  gradient: string;
}> = {
  info: {
    bg: '#3B82F6',
    text: '#FFFFFF',
    icon: <FaInfoCircle />,
    gradient: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 50%, #1D4ED8 100%)'
  },
  warning: {
    bg: '#F59E0B',
    text: '#FFFFFF',
    icon: <FaExclamationTriangle />,
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 50%, #B45309 100%)'
  },
  success: {
    bg: '#10B981',
    text: '#FFFFFF',
    icon: <FaCheckCircle />,
    gradient: 'linear-gradient(135deg, #10B981 0%, #059669 50%, #047857 100%)'
  },
  error: {
    bg: '#EF4444',
    text: '#FFFFFF',
    icon: <FaTimesCircle />,
    gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 50%, #B91C1C 100%)'
  }
};

// --- Dismissal helpers ---

const getDismissalRecords = (): Record<string, DismissalRecord> => {
  try {
    const stored = localStorage.getItem(DISMISSAL_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

const isDismissed = (announcementId: string): boolean => {
  const records = getDismissalRecords();
  const record = records[announcementId];
  if (!record) return false;
  if (record.expiresAt === null) return true;
  if (Date.now() > record.expiresAt) {
    const updated = { ...records };
    delete updated[announcementId];
    localStorage.setItem(DISMISSAL_STORAGE_KEY, JSON.stringify(updated));
    return false;
  }
  return true;
};

const isSessionDismissed = (announcementId: string): boolean => {
  return sessionStorage.getItem(`announcement_${announcementId}`) === 'dismissed';
};

const saveDismissalRecord = (announcement: AnnouncementBarType) => {
  if (
    announcement.dismissalDuration !== undefined &&
    announcement.dismissalDuration !== null &&
    announcement.dismissalDuration === 0
  ) {
    sessionStorage.setItem(`announcement_${announcement._id}`, 'dismissed');
    return;
  }

  const records = getDismissalRecords();
  let expiresAt: number | null = null;
  if (
    announcement.dismissalDuration !== undefined &&
    announcement.dismissalDuration !== null
  ) {
    expiresAt = Date.now() + announcement.dismissalDuration * 24 * 60 * 60 * 1000;
  }

  records[announcement._id] = { dismissedAt: Date.now(), expiresAt };
  localStorage.setItem(DISMISSAL_STORAGE_KEY, JSON.stringify(records));
};

// --- Component ---

const AnnouncementBar: React.FC = () => {
  const location = useLocation();
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isVisible, setIsVisible] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [dismissalVersion, setDismissalVersion] = useState(0);
  const announcementRef = useRef<HTMLDivElement>(null);
  const impressionSet = useRef<Set<string>>(new Set());

  const { data: announcements = [], isLoading } = useActiveAnnouncements(
    location.pathname
  );
  const recordImpression = useRecordImpressionMutation();
  const recordClick = useRecordClickMutation();
  const recordDismissal = useRecordDismissalMutation();

  const activeAnnouncements = useMemo(() => {
    return announcements.filter(
      (ann) => !isDismissed(ann._id) && !isSessionDismissed(ann._id)
    );
  // dismissalVersion forces recompute after localStorage write
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [announcements, dismissalVersion]);

  useEffect(() => {
    if (isLoading) return;
    if (activeAnnouncements.length > 0) {
      setIsVisible(true);
      setActiveIndex(0);
      setDirection(1);
    } else {
      setIsVisible(false);
    }
  }, [activeAnnouncements.length, isLoading]);

  // Record impression for current slide
  useEffect(() => {
    if (!isVisible || activeAnnouncements.length === 0) return;
    const current = activeAnnouncements[activeIndex];
    if (current && !impressionSet.current.has(current._id)) {
      impressionSet.current.add(current._id);
      recordImpression.mutate(current._id);
    }
  }, [activeIndex, isVisible, activeAnnouncements]);

  // Auto-slide
  useEffect(() => {
    if (isPaused || activeAnnouncements.length <= 1 || !isVisible) return;
    const timer = setInterval(() => {
      setDirection(1);
      setActiveIndex((prev) =>
        prev >= activeAnnouncements.length - 1 ? 0 : prev + 1
      );
    }, SLIDE_INTERVAL);
    return () => clearInterval(timer);
  }, [isPaused, activeAnnouncements.length, isVisible]);

  // Update --announcement-height CSS variable
  useEffect(() => {
    if (!announcementRef.current) return;
    if (isVisible) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          document.documentElement.style.setProperty(
            '--announcement-height',
            `${entry.contentRect.height}px`
          );
        }
      });
      observer.observe(announcementRef.current);
      return () => observer.disconnect();
    } else {
      document.documentElement.style.setProperty('--announcement-height', '0px');
      return;
    }
  }, [isVisible]);

  // Clamp index on dismiss
  useEffect(() => {
    if (activeIndex >= activeAnnouncements.length && activeAnnouncements.length > 0) {
      setActiveIndex(0);
    }
  }, [activeAnnouncements.length, activeIndex]);

  const goNext = useCallback(() => {
    setDirection(1);
    setActiveIndex((prev) =>
      prev >= activeAnnouncements.length - 1 ? 0 : prev + 1
    );
  }, [activeAnnouncements.length]);

  const goPrev = useCallback(() => {
    setDirection(-1);
    setActiveIndex((prev) =>
      prev <= 0 ? activeAnnouncements.length - 1 : prev - 1
    );
  }, [activeAnnouncements.length]);

  const goToSlide = useCallback(
    (index: number) => {
      setDirection(index > activeIndex ? 1 : -1);
      setActiveIndex(index);
    },
    [activeIndex]
  );

  const handleDismiss = useCallback(() => {
    const current = activeAnnouncements[activeIndex];
    if (!current) return;

    saveDismissalRecord(current);
    recordDismissal.mutate(current._id);
    logger.debug('[AnnouncementBar] Dismissed:', current._id);

    // Bump version so useMemo recomputes and drops the dismissed item.
    // The useEffect on activeAnnouncements.length handles hide/show.
    setDismissalVersion(v => v + 1);
  }, [activeIndex, activeAnnouncements, recordDismissal]);

  const handleClick = useCallback(() => {
    const current = activeAnnouncements[activeIndex];
    if (!current?.link) return;
    recordClick.mutate(current._id);
    if (current.link.startsWith('http')) {
      window.open(current.link, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = current.link;
    }
  }, [activeIndex, activeAnnouncements, recordClick]);

  if (!isVisible || activeAnnouncements.length === 0) return null;

  const current = activeAnnouncements[activeIndex];
  if (!current) return null;

  const variant = variantConfig[current.variant] || variantConfig.info;
  const bgColor = current.backgroundColor || variant.bg;
  const txtColor = current.textColor || variant.text;
  const background = current.backgroundColor ? bgColor : variant.gradient;
  const multiSlide = activeAnnouncements.length > 1;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          ref={announcementRef}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed top-0 left-0 right-0 z-[60] overflow-hidden shadow-md"
          style={{ background, color: txtColor }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Animated background rays (Starburst effect) */}
          <div className="absolute inset-0 opacity-10 pointer-events-none flex justify-center">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="absolute top-0 w-8 h-[200%] bg-white origin-top opacity-50"
                style={{ 
                  transform: `rotate(${i * 30}deg)`, 
                  transformOrigin: '50% 0%',
                  clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)'
                }}
              />
            ))}
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-2 sm:py-3">
            
            {/* Dismiss - Absolutely positioned at top right */}
            {current.isDismissible && (
              <button
                onClick={handleDismiss}
                className="absolute top-1 right-2 sm:top-2 sm:right-4 p-1.5 sm:p-2 rounded-full hover:bg-black/10 transition-colors z-10 backdrop-blur-sm"
                aria-label="Dismiss announcement"
              >
                <FaTimes className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            )}

            <div className="flex flex-row items-center justify-between gap-2 sm:gap-4 pr-6 sm:pr-8">
              
              {/* Prev arrow */}
              {multiSlide && (
                <button
                  onClick={goPrev}
                  className="p-2 rounded-full hover:bg-black/10 transition-colors flex-shrink-0 backdrop-blur-sm"
                  aria-label="Previous announcement"
                >
                  <FaChevronLeft className="w-4 h-4" />
                </button>
              )}

              {/* Slide content */}
              <div className="flex-1 min-w-0 overflow-hidden relative">
                <AnimatePresence
                  initial={false}
                  custom={direction}
                  mode="wait"
                >
                  <motion.div
                    key={current._id}
                    custom={direction}
                    variants={{
                      enter: (d: number) => ({
                        x: d > 0 ? 50 : -50,
                        opacity: 0,
                      }),
                      center: {
                        x: 0,
                        opacity: 1,
                      },
                      exit: (d: number) => ({
                        x: d > 0 ? -50 : 50,
                        opacity: 0,
                      }),
                    }}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6 w-full"
                  >
                    <div className="flex items-center gap-3 sm:gap-4 justify-center md:justify-start w-full md:w-auto">
                      {/* Icon */}
                      <span className="text-3xl sm:text-4xl animate-bounce drop-shadow-md flex-shrink-0">
                        {current.icon || variant.icon}
                      </span>

                      {/* Message and Description */}
                      <div className="text-center md:text-left flex flex-col gap-1">
                        <p className="font-extrabold text-base sm:text-lg md:text-xl leading-tight drop-shadow-sm">
                          {current.message}
                        </p>
                        {current.shortDescription && (
                          <p className="text-xs sm:text-sm font-medium opacity-90 leading-snug max-w-2xl">
                            {current.shortDescription}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* CTA */}
                    {current.link && current.linkText && (
                      <button
                        onClick={handleClick}
                        className="flex-shrink-0 flex items-center justify-center gap-2 bg-white font-extrabold px-6 py-2.5 sm:py-3 rounded-full shadow-lg hover:scale-105 transition-transform text-sm whitespace-nowrap w-full sm:w-auto"
                        style={{ color: background.includes('gradient') ? '#EA580C' : bgColor }}
                      >
                        {current.linkText}
                        <FaChevronRight className="text-xs" />
                      </button>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Next arrow */}
              {multiSlide && (
                <button
                  onClick={goNext}
                  className="p-2 rounded-full hover:bg-black/10 transition-colors flex-shrink-0 backdrop-blur-sm"
                  aria-label="Next announcement"
                >
                  <FaChevronRight className="w-4 h-4" />
                </button>
              )}

            </div>
            
            {/* Dots */}
            {multiSlide && (
              <div className="flex items-center justify-center gap-2 mt-4 flex-shrink-0 relative z-10">
                {activeAnnouncements.map((ann, i) => (
                  <button
                    key={ann._id}
                    onClick={() => goToSlide(i)}
                    aria-label={`Announcement ${i + 1}`}
                    className="transition-all duration-300 rounded-full"
                    style={{
                      width: i === activeIndex ? 18 : 6,
                      height: 6,
                      backgroundColor: txtColor,
                      opacity: i === activeIndex ? 1 : 0.4,
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Progress bar */}
          {multiSlide && !isPaused && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10">
              <motion.div
                key={`progress-${activeIndex}`}
                className="h-full bg-white/40"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{
                  duration: SLIDE_INTERVAL / 1000,
                  ease: 'linear',
                }}
              />
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AnnouncementBar;
