import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useActivePopups, useRecordImpressionMutation, useRecordClickMutation, useRecordDismissalMutation } from '@/hooks/queries/usePopupsQuery';
import { PopupNotification } from '@/types/popup';

const DISMISSAL_STORAGE_KEY = 'gema_popup_dismissals';

interface DismissalRecord {
  dismissedAt: number;
  frequency: 'once' | 'session' | 'daily' | 'always';
}

const PopupManager: React.FC = () => {
  const location = useLocation();
  const [currentPopup, setCurrentPopup] = useState<PopupNotification | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);

  const { data: popups = [], isLoading } = useActivePopups(location.pathname);
  const recordImpression = useRecordImpressionMutation();
  const recordClick = useRecordClickMutation();
  const recordDismissal = useRecordDismissalMutation();

  // Get dismissal records from localStorage
  const getDismissalRecords = (): Record<string, DismissalRecord> => {
    try {
      const stored = localStorage.getItem(DISMISSAL_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  };

  // Check if popup is dismissed based on frequency
  const isDismissed = (popupId: string, frequency: string): boolean => {
    const records = getDismissalRecords();
    const record = records[popupId];

    if (!record) return false;

    const now = Date.now();
    const dismissedAt = record.dismissedAt;

    switch (frequency) {
      case 'once':
        return true; // Dismissed forever

      case 'session':
        // Check sessionStorage
        return sessionStorage.getItem(`popup_${popupId}`) === 'dismissed';

      case 'daily':
        // Check if dismissed within last 24 hours
        const oneDayMs = 24 * 60 * 60 * 1000;
        if (now - dismissedAt < oneDayMs) {
          return true;
        }
        // Remove expired record
        const updated = { ...records };
        delete updated[popupId];
        localStorage.setItem(DISMISSAL_STORAGE_KEY, JSON.stringify(updated));
        return false;

      case 'always':
        return false; // Always show

      default:
        return false;
    }
  };

  // Set dismissal record
  const setDismissalRecord = (popup: PopupNotification) => {
    const records = getDismissalRecords();

    if (popup.frequency === 'session') {
      sessionStorage.setItem(`popup_${popup._id}`, 'dismissed');
    } else if (popup.frequency !== 'always') {
      records[popup._id] = {
        dismissedAt: Date.now(),
        frequency: popup.frequency
      };
      localStorage.setItem(DISMISSAL_STORAGE_KEY, JSON.stringify(records));
    }
  };

  // Find first non-dismissed popup
  useEffect(() => {
    if (isLoading || !popups.length) {
      setCurrentPopup(null);
      setIsVisible(false);
      setHasTriggered(false);
      return;
    }

    const firstActive = popups.find(
      (popup) => !isDismissed(popup._id, popup.frequency)
    );

    if (firstActive) {
      setCurrentPopup(firstActive);
      setHasTriggered(false); // Reset trigger when popup changes
    } else {
      setCurrentPopup(null);
      setIsVisible(false);
    }
  }, [popups, isLoading, location.pathname]);

  // Trigger logic
  useEffect(() => {
    if (!currentPopup || hasTriggered) return;

    const triggerPopup = () => {
      setIsVisible(true);
      setHasTriggered(true);
      recordImpression.mutate(currentPopup._id);
    };

    switch (currentPopup.trigger) {
      case 'pageLoad':
        triggerPopup();
        break;

      case 'timeDelay':
        const delay = (currentPopup.triggerValue || 3) * 1000;
        const timeoutId = setTimeout(triggerPopup, delay);
        return () => clearTimeout(timeoutId);

      case 'scrollPercent':
        const handleScroll = () => {
          const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
          if (scrollPercent >= (currentPopup.triggerValue || 50)) {
            triggerPopup();
            window.removeEventListener('scroll', handleScroll);
          }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);

      case 'exitIntent':
        const handleMouseLeave = (e: MouseEvent) => {
          if (e.clientY <= 0) {
            triggerPopup();
            document.removeEventListener('mouseleave', handleMouseLeave);
          }
        };
        document.addEventListener('mouseleave', handleMouseLeave);
        return () => document.removeEventListener('mouseleave', handleMouseLeave);
    }
  }, [currentPopup, hasTriggered]);

  const handleDismiss = () => {
    if (!currentPopup) return;

    setIsVisible(false);
    setDismissalRecord(currentPopup);
    recordDismissal.mutate(currentPopup._id);

    setTimeout(() => {
      setCurrentPopup(null);
      setHasTriggered(false);
    }, 300);
  };

  const handleCTAClick = () => {
    if (!currentPopup?.ctaLink) return;
    recordClick.mutate(currentPopup._id);

    if (currentPopup.ctaLink.startsWith('http')) {
      window.open(currentPopup.ctaLink, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = currentPopup.ctaLink;
    }
  };

  if (!currentPopup) return null;

  // Size classes
  const sizeClasses = {
    small: 'max-w-sm',
    medium: 'max-w-md',
    large: 'max-w-2xl'
  };

  // Position classes
  const positionClasses = {
    center: 'items-center justify-center',
    top: 'items-start justify-center pt-20',
    bottom: 'items-end justify-center pb-20'
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`fixed inset-0 z-50 flex ${positionClasses[currentPopup.position || 'center']} p-4`}
          style={{
            backgroundColor: `rgba(0, 0, 0, ${(currentPopup.overlayOpacity || 50) / 100})`
          }}
          onClick={handleDismiss}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`relative ${sizeClasses[currentPopup.size || 'medium']} w-full rounded-lg shadow-2xl overflow-hidden`}
            style={{
              backgroundColor: currentPopup.backgroundColor || '#FFFFFF',
              color: currentPopup.textColor || '#000000'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 p-1 rounded-full hover:bg-black/10 transition-colors z-10"
              aria-label="Close popup"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Image */}
            {currentPopup.image && (
              <div className="w-full h-48 overflow-hidden">
                <img
                  src={currentPopup.image.url}
                  alt={currentPopup.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Content */}
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-3">{currentPopup.title}</h2>
              <p className="text-base mb-6 whitespace-pre-line">{currentPopup.message}</p>

              {/* Actions */}
              <div className="flex gap-3">
                {currentPopup.ctaText && currentPopup.ctaLink && (
                  <button
                    onClick={handleCTAClick}
                    className="flex-1 px-6 py-3 rounded-lg font-semibold transition-all duration-200 hover:opacity-90"
                    style={{
                      backgroundColor: currentPopup.textColor || '#000000',
                      color: currentPopup.backgroundColor || '#FFFFFF'
                    }}
                  >
                    {currentPopup.ctaText}
                  </button>
                )}

                <button
                  onClick={handleDismiss}
                  className="px-6 py-3 rounded-lg font-medium border-2 transition-all duration-200 hover:opacity-70"
                  style={{
                    borderColor: currentPopup.textColor || '#000000',
                    color: currentPopup.textColor || '#000000'
                  }}
                >
                  {currentPopup.dismissText || 'Close'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PopupManager;
