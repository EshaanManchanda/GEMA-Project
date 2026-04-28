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
          className="fixed top-0 left-0 right-0 z-[60]"
          style={{ background, color: txtColor }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className="max-w-screen-xl mx-auto px-3 sm:px-4 py-2 sm:py-2.5">
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Prev arrow */}
              {multiSlide && (
                <button
                  onClick={goPrev}
                  className="p-1 sm:p-1.5 rounded-full hover:bg-white/20
                    transition-colors flex-shrink-0"
                  aria-label="Previous announcement"
                >
                  <FaChevronLeft className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                </button>
              )}

              {/* Slide content */}
              <div className="flex-1 min-w-0 overflow-hidden">
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
                        y: d > 0 ? 20 : -20,
                        opacity: 0,
                      }),
                      center: {
                        y: 0,
                        opacity: 1,
                      },
                      exit: (d: number) => ({
                        y: d > 0 ? -20 : 20,
                        opacity: 0,
                      }),
                    }}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="flex items-center justify-center
                      gap-2 sm:gap-3"
                  >
                    {/* Icon */}
                    <span className="text-sm sm:text-base flex-shrink-0 opacity-90">
                      {current.icon || variant.icon}
                    </span>

                    {/* Message */}
                    <p className="text-xs sm:text-sm font-medium truncate">
                      {current.message}
                    </p>

                    {/* CTA */}
                    {current.link && current.linkText && (
                      <button
                        onClick={handleClick}
                        className="hidden sm:inline-flex px-3 py-1
                          rounded-full text-xs font-bold
                          transition-all duration-200
                          hover:scale-105 hover:shadow-lg
                          flex-shrink-0 whitespace-nowrap"
                        style={{
                          backgroundColor: `${txtColor}E6`,
                          color: bgColor,
                        }}
                      >
                        {current.linkText}
                      </button>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Next arrow */}
              {multiSlide && (
                <button
                  onClick={goNext}
                  className="p-1 sm:p-1.5 rounded-full hover:bg-white/20
                    transition-colors flex-shrink-0"
                  aria-label="Next announcement"
                >
                  <FaChevronRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                </button>
              )}

              {/* Dots - hidden on small mobile */}
              {multiSlide && (
                <div className="hidden xs:flex items-center gap-1 sm:gap-1.5
                  ml-1 sm:ml-2 flex-shrink-0">
                  {activeAnnouncements.map((ann, i) => (
                    <button
                      key={ann._id}
                      onClick={() => goToSlide(i)}
                      aria-label={`Announcement ${i + 1}`}
                      className="transition-all duration-300 rounded-full"
                      style={{
                        width: i === activeIndex ? 14 : 5,
                        height: 5,
                        backgroundColor: txtColor,
                        opacity: i === activeIndex ? 1 : 0.4,
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Mobile CTA (link only, no button) */}
              {current.link && current.linkText && (
                <button
                  onClick={handleClick}
                  className="sm:hidden text-xs font-bold underline
                    underline-offset-2 flex-shrink-0 whitespace-nowrap
                    hover:opacity-80 transition-opacity"
                >
                  {current.linkText}
                </button>
              )}

              {/* Dismiss */}
              {current.isDismissible && (
                <button
                  onClick={handleDismiss}
                  className="p-1 sm:p-1.5 rounded-full hover:bg-white/20
                    transition-colors flex-shrink-0 ml-0.5 sm:ml-1"
                  aria-label="Dismiss announcement"
                >
                  <FaTimes className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {multiSlide && !isPaused && (
            <div className="h-[2px] bg-white/10">
              <motion.div
                key={`progress-${activeIndex}`}
                className="h-full"
                style={{ backgroundColor: `${txtColor}60` }}
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
