import React, { useState, useEffect } from 'react';
import { FaWifi, FaExclamationTriangle, FaHourglassHalf } from 'react-icons/fa';

// Network Information API — Chrome/Edge/Android only, no TS lib types
interface NetworkInformation extends EventTarget {
  effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
  saveData?: boolean;
  addEventListener(type: 'change', listener: () => void): void;
  removeEventListener(type: 'change', listener: () => void): void;
}

const getConnection = (): NetworkInformation | undefined =>
  (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

const isSlowConnection = (conn: NetworkInformation | undefined): boolean =>
  !!conn && (conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g' || conn.effectiveType === '3g');

const ConnectionStatus: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineMessage, setShowOfflineMessage] = useState(false);
  const [isSlow, setIsSlow] = useState(() => isSlowConnection(getConnection()));
  const [showSlowMessage, setShowSlowMessage] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineMessage(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineMessage(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Slow-connection detection (2G/3G/save-data) via Network Information API.
  // Unsupported in Safari/Firefox — conn is undefined there, banner just never shows.
  useEffect(() => {
    const conn = getConnection();
    if (!conn) return;

    const handleChange = () => {
      const slow = isSlowConnection(conn);
      setIsSlow(slow);
      setShowSlowMessage(slow);
    };

    handleChange();
    conn.addEventListener('change', handleChange);
    return () => conn.removeEventListener('change', handleChange);
  }, []);

  // Auto-hide offline message after 5 seconds when back online
  useEffect(() => {
    if (isOnline && showOfflineMessage) {
      const timer = setTimeout(() => {
        setShowOfflineMessage(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
    return;
  }, [isOnline, showOfflineMessage]);

  // Auto-hide slow-connection notice after 6 seconds — it's informational, not persistent
  useEffect(() => {
    if (showSlowMessage) {
      const timer = setTimeout(() => setShowSlowMessage(false), 6000);
      return () => clearTimeout(timer);
    }
    return;
  }, [showSlowMessage]);

  if (!showOfflineMessage && isOnline && !(showSlowMessage && isSlow)) {
    return null;
  }

  // Offline takes priority over slow-connection
  if (!isOnline || showOfflineMessage) {
    return (
      <div
        className={`fixed top-0 left-0 right-0 z-50 px-4 py-3 text-center text-sm font-medium transition-all duration-300 ${
          isOnline ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}
        role="alert"
      >
        <div className="flex items-center justify-center gap-2">
          {isOnline ? (
            <>
              <FaWifi className="w-4 h-4" />
              <span>Connection restored</span>
            </>
          ) : (
            <>
              <FaExclamationTriangle className="w-4 h-4" />
              <span>You're offline. Some features may not work properly.</span>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 px-4 py-3 text-center text-sm font-medium bg-amber-500 text-white transition-all duration-300"
      role="status"
    >
      <div className="flex items-center justify-center gap-2">
        <FaHourglassHalf className="w-4 h-4" />
        <span>Slow connection detected — content may take longer to load.</span>
      </div>
    </div>
  );
};

export default ConnectionStatus;