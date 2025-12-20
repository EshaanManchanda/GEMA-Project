import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaInfoCircle, FaExclamationTriangle, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { useActiveAnnouncements, useRecordImpressionMutation, useRecordClickMutation, useRecordDismissalMutation } from '@/hooks/queries/useAnnouncementsQuery';
import { AnnouncementBar as AnnouncementBarType } from '@/types/announcementBar';

const DISMISSAL_STORAGE_KEY = 'gema_announcement_dismissals';

interface DismissalRecord {
  dismissedAt: number;
  expiresAt: number | null; // null = forever
}

const AnnouncementBar: React.FC = () => {
  const location = useLocation();
  const [currentAnnouncement, setCurrentAnnouncement] = useState<AnnouncementBarType | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const announcementRef = React.useRef<HTMLDivElement>(null);

  const { data: announcements = [], isLoading } = useActiveAnnouncements(location.pathname);
  const recordImpression = useRecordImpressionMutation();
  const recordClick = useRecordClickMutation();
  const recordDismissal = useRecordDismissalMutation();

  // Debug logging
  useEffect(() => {
    console.log('[AnnouncementBar] Component mounted/updated:', {
      pathname: location.pathname,
      isLoading,
      announcementsCount: announcements.length,
      announcements: announcements.map(a => ({
        id: a._id,
        message: a.message,
        status: a.status,
        isActive: a.isActive
      }))
    });
  }, [location.pathname, isLoading, announcements]);

  // Get dismissal records from localStorage
  const getDismissalRecords = (): Record<string, DismissalRecord> => {
    try {
      const stored = localStorage.getItem(DISMISSAL_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  };

  // Check if announcement is dismissed
  const isDismissed = (announcementId: string): boolean => {
    const records = getDismissalRecords();
    const record = records[announcementId];

    if (!record) return false;

    // If expiresAt is null, dismissed forever
    if (record.expiresAt === null) return true;

    // Check if dismissal has expired
    if (Date.now() > record.expiresAt) {
      // Remove expired record
      const updated = { ...records };
      delete updated[announcementId];
      localStorage.setItem(DISMISSAL_STORAGE_KEY, JSON.stringify(updated));
      return false;
    }

    return true;
  };

  // Set dismissal record
  const setDismissalRecord = (announcement: AnnouncementBarType) => {
    const records = getDismissalRecords();

    let expiresAt: number | null = null;

    if (announcement.dismissalDuration !== undefined && announcement.dismissalDuration !== null) {
      if (announcement.dismissalDuration === 0) {
        // Session only - use sessionStorage
        sessionStorage.setItem(`announcement_${announcement._id}`, 'dismissed');
        return;
      } else {
        // Duration in days
        expiresAt = Date.now() + announcement.dismissalDuration * 24 * 60 * 60 * 1000;
      }
    }
    // else: null = forever

    records[announcement._id] = {
      dismissedAt: Date.now(),
      expiresAt
    };

    localStorage.setItem(DISMISSAL_STORAGE_KEY, JSON.stringify(records));
  };

  // Check session dismissal
  const isSessionDismissed = (announcementId: string): boolean => {
    return sessionStorage.getItem(`announcement_${announcementId}`) === 'dismissed';
  };

  // Find first non-dismissed announcement
  useEffect(() => {
    console.log('[AnnouncementBar] Finding announcement to display:', {
      isLoading,
      announcementsCount: announcements.length
    });

    if (isLoading || !announcements.length) {
      console.log('[AnnouncementBar] No announcements to show (loading or empty)');
      setCurrentAnnouncement(null);
      setIsVisible(false);
      return;
    }

    // Check each announcement
    announcements.forEach((ann, index) => {
      const dismissed = isDismissed(ann._id);
      const sessionDismissed = isSessionDismissed(ann._id);
      console.log(`[AnnouncementBar] Announcement ${index}:`, {
        id: ann._id,
        message: ann.message,
        isDismissed: dismissed,
        isSessionDismissed: sessionDismissed
      });
    });

    const firstActive = announcements.find(
      (ann) => !isDismissed(ann._id) && !isSessionDismissed(ann._id)
    );

    console.log('[AnnouncementBar] First active announcement:', firstActive ? {
      id: firstActive._id,
      message: firstActive.message
    } : 'none');

    if (firstActive && firstActive._id !== currentAnnouncement?._id) {
      console.log('[AnnouncementBar] Setting announcement as visible');
      setCurrentAnnouncement(firstActive);
      setIsVisible(true);

      // Record impression
      recordImpression.mutate(firstActive._id);
    } else if (!firstActive) {
      console.log('[AnnouncementBar] No active announcement found, hiding');
      setCurrentAnnouncement(null);
      setIsVisible(false);
    }
  }, [announcements, isLoading]);

  // Update CSS variable for header spacing
  useEffect(() => {
    if (isVisible && announcementRef.current) {
      const height = announcementRef.current.offsetHeight;
      document.documentElement.style.setProperty('--announcement-height', `${height}px`);
      console.log('[AnnouncementBar] Set CSS variable --announcement-height:', `${height}px`);
    } else {
      document.documentElement.style.setProperty('--announcement-height', '0px');
      console.log('[AnnouncementBar] Reset CSS variable --announcement-height: 0px');
    }
  }, [isVisible, currentAnnouncement]);

  const handleDismiss = () => {
    if (!currentAnnouncement) return;

    setIsVisible(false);
    setDismissalRecord(currentAnnouncement);
    recordDismissal.mutate(currentAnnouncement._id);

    // Clear after animation
    setTimeout(() => setCurrentAnnouncement(null), 300);
  };

  const handleClick = () => {
    if (!currentAnnouncement?.link) return;
    recordClick.mutate(currentAnnouncement._id);

    // Navigate
    if (currentAnnouncement.link.startsWith('http')) {
      window.open(currentAnnouncement.link, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = currentAnnouncement.link;
    }
  };

  if (!currentAnnouncement) return null;

  // Variant presets
  const variantStyles: Record<string, { bg: string; text: string; icon: React.ReactElement }> = {
    info: { bg: '#3B82F6', text: '#FFFFFF', icon: <FaInfoCircle /> },
    warning: { bg: '#F59E0B', text: '#FFFFFF', icon: <FaExclamationTriangle /> },
    success: { bg: '#10B981', text: '#FFFFFF', icon: <FaCheckCircle /> },
    error: { bg: '#EF4444', text: '#FFFFFF', icon: <FaTimesCircle /> }
  };

  const variant = variantStyles[currentAnnouncement.variant] || variantStyles.info;
  const backgroundColor = currentAnnouncement.backgroundColor || variant.bg;
  const textColor = currentAnnouncement.textColor || variant.text;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          ref={announcementRef}
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed top-0 left-0 right-0 z-[60]"
          style={{ backgroundColor, color: textColor }}
        >
          <div className="max-w-screen-xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              {/* Icon + Message */}
              <div className="flex items-center gap-3 flex-1">
                {currentAnnouncement.icon && (
                  <span className="text-xl flex-shrink-0">
                    {currentAnnouncement.icon}
                  </span>
                )}
                {!currentAnnouncement.icon && (
                  <span className="text-xl flex-shrink-0">
                    {variant.icon}
                  </span>
                )}
                <p className="text-sm md:text-base font-medium">
                  {currentAnnouncement.message}
                </p>
              </div>

              {/* CTA Link */}
              {currentAnnouncement.link && currentAnnouncement.linkText && (
                <button
                  onClick={handleClick}
                  className="px-4 py-1.5 rounded-md font-semibold text-sm transition-all duration-200 hover:opacity-90 flex-shrink-0"
                  style={{
                    backgroundColor: textColor,
                    color: backgroundColor
                  }}
                >
                  {currentAnnouncement.linkText}
                </button>
              )}

              {/* Dismiss Button */}
              {currentAnnouncement.isDismissible && (
                <button
                  onClick={handleDismiss}
                  className="p-1 hover:opacity-70 transition-opacity duration-200 flex-shrink-0"
                  aria-label="Dismiss announcement"
                >
                  <FaTimes className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AnnouncementBar;
