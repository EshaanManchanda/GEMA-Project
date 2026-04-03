import React, { useEffect, useState, useRef } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import logger from '@/utils/logger';
import { useSelector, useDispatch, shallowEqual } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { logoutUser } from '@/store/slices/authSlice';
import {
  fetchRootCategories,
  selectCategories,
  selectCategoriesLoading
} from '@/store/slices/categoriesSlice';
import { selectSocialSettings } from '@/store/slices/settingsSlice';
// Commented out - notification system disabled
// import {
//   fetchNotifications,
//   selectUnreadCount
// } from '@/store/slices/notificationsSlice';
// import NotificationDropdown from './NotificationDropdown';
import NewsletterSubscription from './NewsletterSubscription';
import ConnectionStatus from './ConnectionStatus';
import CustomerChatWidget from '@/components/common/CustomerChatWidget';
import AnnouncementBar from '@/components/client/AnnouncementBar';
import PopupManager from '@/components/client/PopupManager';
import { useRealTimeData } from '@/hooks/useRealTimeData';
import ErrorBoundary from '@/components/common/ErrorBoundary';
const kidroveLogo = import.meta.env.VITE_SITE_LOGO || '/assets/images/Kidrove-log-new.png';
// const kidroveLogoWhite = import.meta.env.VITE_SITE_LOGO_WHITE || '/assets/images/KidRove-Logo-white.png';
import {
  FaFacebookF,
  FaTwitter,
  FaInstagram,
  FaYoutube,
  FaLinkedinIn,
  // FaGlobe,
  FaSearch,
  FaUser,
  FaHeart,
  FaBars,
  FaTimes,
  FaCog,
  FaSignOutAlt,
  FaUserCircle,
  FaChevronDown,
  FaTachometerAlt,
  FaTicketAlt,
  FaCalendarPlus,
  FaChartBar,
  FaFileAlt,
  // FaHome
} from 'react-icons/fa';

const Layout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const { isAuthenticated, isInitialized, user } = useSelector(
    (state: RootState) => ({
      isAuthenticated: state.auth.isAuthenticated,
      isInitialized: state.auth.isInitialized,
      user: state.auth.user,
    }),
    shallowEqual
  );
  const categories = useSelector(selectCategories);
  const categoriesLoading = useSelector(selectCategoriesLoading);
  const socialSettings = useSelector(selectSocialSettings);

  // Filter active root categories for footer display
  const footerCategories = categories.filter(c => c.isActive).slice(0, 8);
  // const unreadNotificationsCount = useSelector(selectUnreadCount); // Commented out - notification system disabled

  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const topBarRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);

  // Dynamically compute main padding-top = announcement + nav - topBar (flow spacer)
  useEffect(() => {
    const update = () => {
      const topBarH = topBarRef.current?.offsetHeight ?? 0;
      const navH = navRef.current?.offsetHeight ?? 72;
      const raw = getComputedStyle(document.documentElement)
        .getPropertyValue('--announcement-height').trim().replace('px', '');
      const announcementH = parseFloat(raw) || 0;
      const padding = Math.max(0, announcementH + navH - topBarH);
      document.documentElement.style.setProperty('--main-padding-top', `${padding}px`);
    };

    const resizeObserver = new ResizeObserver(update);
    if (topBarRef.current) resizeObserver.observe(topBarRef.current);
    if (navRef.current) resizeObserver.observe(navRef.current);

    // Re-run when AnnouncementBar updates --announcement-height
    const mutationObserver = new MutationObserver(update);
    mutationObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style'],
    });

    update();
    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, []);

  // Real-time data updates
  useRealTimeData({
    enableNotifications: false, // Disabled - notification system disabled
    notificationInterval: 30000, // 30 seconds
  });

  // Fetch root categories on mount for footer
  useEffect(() => {
    dispatch(fetchRootCategories());
  }, [dispatch]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Handle clicking outside of profile dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const toggleProfileDropdown = () => {
    setProfileDropdownOpen(!profileDropdownOpen);
  };

  const handleLogout = async () => {
    try {
      // Logout action now handles:
      // 1. Clearing httpOnly cookies on the server
      // 2. Clearing persisted auth state from localStorage
      // 3. Clearing Redux state
      await dispatch(logoutUser());

      setProfileDropdownOpen(false);
      navigate('/');
    } catch (error) {
      logger.error('Logout error:', error);
    }
  };

  const getDashboardPath = () => {
    if (!user?.role) return '/dashboard';

    switch (user.role) {
      case 'admin':
        return '/admin';
      case 'vendor':
        return '/vendor';
      case 'teacher':
        return '/teacher';
      case 'employee':
        return '/employee';
      case 'customer':
      default:
        return '/dashboard';
    }
  };

  const getUserDisplayName = () => {
    if (!user) return 'User';
    return user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email;
  };

  const getUserAvatar = () => {
    if (user?.avatar) return user.avatar;
    // Generate a default avatar based on user initials
    const initials = user?.firstName ?
      `${user.firstName.charAt(0)}${user.lastName?.charAt(0) || ''}` :
      user?.email?.charAt(0).toUpperCase() || 'U';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=1a73e8&color=fff&size=32&rounded=true`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 overflow-x-hidden">
      <ConnectionStatus />
      <AnnouncementBar />
      <PopupManager />
      <header className="relative z-50">
        {/* Top Bar — desktop only */}
        <div
          ref={topBarRef}
          className="hidden md:block w-full text-white"
          style={{ backgroundColor: 'var(--primary-color)' }}
        >
          <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-center items-center text-sm">
            {/* Social Icons */}
            <div className="flex space-x-4">
              {socialSettings.facebookUrl && (
                <a href={socialSettings.facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Visit our Facebook page" className="hover:opacity-80 transition-opacity duration-300 flex items-center justify-center w-7 h-7 rounded-full bg-white/10">
                  <FaFacebookF size={14} />
                </a>
              )}
              {socialSettings.twitterUrl && (
                <a href={socialSettings.twitterUrl} target="_blank" rel="noopener noreferrer" aria-label="Visit our Twitter page" className="hover:opacity-80 transition-opacity duration-300 flex items-center justify-center w-7 h-7 rounded-full bg-white/10">
                  <FaTwitter size={14} />
                </a>
              )}
              {socialSettings.instagramUrl && (
                <a href={socialSettings.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Visit our Instagram page" className="hover:opacity-80 transition-opacity duration-300 flex items-center justify-center w-7 h-7 rounded-full bg-white/10">
                  <FaInstagram size={14} />
                </a>
              )}
              {socialSettings.youtubeUrl && (
                <a href={socialSettings.youtubeUrl} target="_blank" rel="noopener noreferrer" aria-label="Visit our YouTube channel" className="hover:opacity-80 transition-opacity duration-300 flex items-center justify-center w-7 h-7 rounded-full bg-white/10">
                  <FaYoutube size={14} />
                </a>
              )}
              {socialSettings.linkedinUrl && (
                <a href={socialSettings.linkedinUrl} target="_blank" rel="noopener noreferrer" aria-label="Visit our LinkedIn page" className="hover:opacity-80 transition-opacity duration-300 flex items-center justify-center w-7 h-7 rounded-full bg-white/10">
                  <FaLinkedinIn size={14} />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Main Navigation Bar */}
        <div
          ref={navRef}
          className={`w-full fixed left-0 z-50 transition-all duration-300 ${scrolled ? 'shadow-md' : ''}`}
          style={{
            backgroundColor: scrolled ? 'var(--primary-color)' : 'white',
            top: 'var(--announcement-height, 0px)'
          }}
        >
          <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-3 md:py-4 flex justify-between items-center">
            {/* Logo */}
            <div className="flex items-center flex-shrink-0">
              <Link to="/" className="flex items-center">
                <img
                  src={kidroveLogo}
                  alt="kidrove Logo"
                  className="h-7 w-auto md:h-10"
                  width="120"
                  height="40"
                  loading="eager"
                  decoding="async"
                />
              </Link>
            </div>

            {/* Desktop Nav Links */}
            {/* Desktop Nav Links */}
            <nav className="hidden md:flex space-x-8">
              {[
                { path: '/search', label: 'Find Activities' },
                { path: '/blog', label: 'Blog' },
                { path: '/about', label: 'Kidrove Go' },
                { path: '/faq', label: 'FAQ' },
                { path: '/contact', label: 'Get In Touch' },
              ].map((link) => {
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`text-sm font-medium transition-all duration-300 ${scrolled
                      ? isActive
                        ? 'text-white font-bold underline underline-offset-4'
                        : 'text-white hover:opacity-80'
                      : isActive
                        ? 'text-primary font-bold'
                        : 'text-gray-900 hover:text-primary'
                      }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* Desktop: User Actions */}
            <div className="hidden md:flex items-center space-x-4">
              <Link
                to="/search"
                className="p-2 rounded-full text-white hover:shadow-md transition-all duration-300"
                style={{ backgroundColor: 'var(--accent-color)' }}
                aria-label="Search activities"
              >
                <FaSearch size={14} />
              </Link>
              <Link
                to="/favorites"
                className="p-2 rounded-full hover:bg-gray-100 transition-all duration-300"
                style={{ color: scrolled ? 'white' : 'var(--primary-color)' }}
                aria-label="View favorites"
              >
                <FaHeart size={14} />
              </Link>
              {/* <Link 
                to="/cart"
                className="p-2 rounded-full hover:bg-gray-100 transition-all duration-300 relative"
                style={{ color: scrolled ? 'white' : 'var(--primary-color)' }}
              >
                <FaShoppingCart size={14} />
                {cartCount > 0 && (
                  <span 
                    className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center animate-pulse"
                  >
                    {cartCount}
                  </span>
                )}
              </Link> */}

              {/* Notifications - Commented out - notification system disabled */}
              {/* {isAuthenticated && (
                <NotificationDropdown className="relative" />
              )} */}
              {isInitialized && isAuthenticated && user ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={toggleProfileDropdown}
                    className="px-5 py-2 rounded-full font-medium transition-all duration-300 flex items-center gap-2"
                    style={{
                      backgroundColor: scrolled ? 'white' : 'var(--primary-color)',
                      color: scrolled ? 'var(--primary-color)' : 'white'
                    }}
                  >
                    {user?.avatar ? (
                      <img
                        src={getUserAvatar()}
                        alt="Profile"
                        className="w-6 h-6 rounded-full object-cover"
                        width="24"
                        height="24"
                      />
                    ) : (
                      <FaUserCircle size={16} />
                    )}
                    <span className="hidden md:inline">{getUserDisplayName()}</span>
                    {/* Commented out - notification system disabled */}
                    {/* {unreadNotificationsCount > 0 && (
                      <span className="bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center ml-1">
                        {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                      </span>
                    )} */}
                    <FaChevronDown size={12} className={`transition-transform duration-200 ${profileDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {profileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                      {/* User Info */}
                      <div className="px-4 py-3 border-b border-gray-200">
                        <p className="text-sm font-medium text-gray-900">{getUserDisplayName()}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        <span className="inline-block px-2 py-0.5 text-xs rounded-full mt-1 capitalize"
                          style={{ backgroundColor: 'var(--primary-color)', color: 'white' }}>
                          {user.role}
                        </span>
                      </div>

                      {/* Common links */}
                      <Link
                        to={getDashboardPath()}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setProfileDropdownOpen(false)}
                      >
                        <FaTachometerAlt className="mr-3 text-gray-400" />
                        Dashboard
                      </Link>
                      <Link
                        to="/profile"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setProfileDropdownOpen(false)}
                      >
                        <FaUserCircle className="mr-3 text-gray-400" />
                        View Profile
                      </Link>

                      {/* Admin-specific links */}
                      {user.role === 'admin' && (
                        <>
                          <div className="px-4 pt-3 pb-1">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Admin</p>
                          </div>
                          <Link to="/admin/users" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setProfileDropdownOpen(false)}>
                            <FaUser className="mr-3 text-gray-400" /> Manage Users
                          </Link>
                          <Link to="/admin/events" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setProfileDropdownOpen(false)}>
                            <FaTicketAlt className="mr-3 text-gray-400" /> Manage Events
                          </Link>
                          <Link to="/admin/venues" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setProfileDropdownOpen(false)}>
                            <FaCog className="mr-3 text-gray-400" /> Manage Venues
                          </Link>
                          <Link to="/admin/categories" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setProfileDropdownOpen(false)}>
                            <FaCog className="mr-3 text-gray-400" /> Manage Categories
                          </Link>
                          <Link to="/admin/orders" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setProfileDropdownOpen(false)}>
                            <FaFileAlt className="mr-3 text-gray-400" /> Manage Orders
                          </Link>
                        </>
                      )}

                      {/* Vendor-specific links */}
                      {user.role === 'vendor' && (
                        <>
                          <div className="px-4 pt-3 pb-1">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Vendor</p>
                          </div>
                          <Link to="/vendor/events" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setProfileDropdownOpen(false)}>
                            <FaTicketAlt className="mr-3 text-gray-400" /> My Events
                          </Link>
                          <Link to="/vendor/events/create" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setProfileDropdownOpen(false)}>
                            <FaCalendarPlus className="mr-3 text-gray-400" /> Create Event
                          </Link>
                          <Link to="/vendor/bookings" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setProfileDropdownOpen(false)}>
                            <FaFileAlt className="mr-3 text-gray-400" /> Bookings
                          </Link>
                          <Link to="/vendor/analytics" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setProfileDropdownOpen(false)}>
                            <FaChartBar className="mr-3 text-gray-400" /> Analytics
                          </Link>
                          <Link to="/vendor/profile" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setProfileDropdownOpen(false)}>
                            <FaCog className="mr-3 text-gray-400" /> Vendor Settings
                          </Link>
                        </>
                      )}

                      {/* Teacher-specific links */}
                      {user.role === 'teacher' && (
                        <>
                          <div className="px-4 pt-3 pb-1">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Teacher</p>
                          </div>
                          <Link to="/teacher/events" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setProfileDropdownOpen(false)}>
                            <FaTicketAlt className="mr-3 text-gray-400" /> My Teaching-Events
                          </Link>
                          <Link to="/teacher/events/create" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setProfileDropdownOpen(false)}>
                            <FaCalendarPlus className="mr-3 text-gray-400" /> Create Teaching-Event
                          </Link>
                          <Link to="/teacher/bookings" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setProfileDropdownOpen(false)}>
                            <FaFileAlt className="mr-3 text-gray-400" /> Bookings
                          </Link>
                          <Link to="/teacher/analytics" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setProfileDropdownOpen(false)}>
                            <FaChartBar className="mr-3 text-gray-400" /> Analytics
                          </Link>
                          <Link to="/teacher/profile" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setProfileDropdownOpen(false)}>
                            <FaCog className="mr-3 text-gray-400" /> Teacher Settings
                          </Link>
                        </>
                      )}

                      {/* Customer links — visible to all roles */}
                      {(user.role === 'admin' || user.role === 'vendor' || user.role === 'teacher' || user.role === 'customer') && (
                        <>
                          <div className="px-4 pt-3 pb-1">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">My Account</p>
                          </div>
                          <Link to="/bookings" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setProfileDropdownOpen(false)}>
                            <FaTicketAlt className="mr-3 text-gray-400" /> My Bookings
                          </Link>
                          <Link to="/favorites" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setProfileDropdownOpen(false)}>
                            <FaHeart className="mr-3 text-gray-400" /> Favorites
                          </Link>
                        </>
                      )}

                      {/* Logout */}
                      <div className="border-t border-gray-200 mt-2 pt-2">
                        <button
                          onClick={handleLogout}
                          className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          <FaSignOutAlt className="mr-3" />
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/login"
                  className="px-5 py-2 rounded-full font-medium transition-all duration-300 flex items-center gap-2"
                  style={{
                    backgroundColor: scrolled ? 'white' : 'var(--primary-color)',
                    color: scrolled ? 'var(--primary-color)' : 'white'
                  }}
                >
                  <FaUser size={14} />
                  Login
                </Link>
              )}
            </div>

            {/* Mobile: Action icons + Menu Toggle */}
            <div className="md:hidden flex items-center gap-1">
              <Link
                to="/search"
                className="w-9 h-9 flex items-center justify-center rounded-full text-white transition-all duration-300"
                style={{ backgroundColor: 'var(--accent-color)' }}
                aria-label="Search activities"
              >
                <FaSearch size={14} />
              </Link>
              <Link
                to="/favorites"
                className="w-9 h-9 flex items-center justify-center rounded-full transition-all duration-300"
                style={{ color: scrolled ? 'white' : 'var(--primary-color)' }}
                aria-label="View favorites"
              >
                <FaHeart size={15} />
              </Link>
              <button
                onClick={toggleMobileMenu}
                className="w-9 h-9 flex items-center justify-center rounded-full transition-all duration-300"
                style={{ color: scrolled ? 'white' : 'var(--primary-color)' }}
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              >
                {mobileMenuOpen ? <FaTimes size={18} /> : <FaBars size={20} />}
              </button>
            </div>
          </div>

          {/* Mobile Menu — full-screen slide drawer */}
          {mobileMenuOpen && (
            <>
              {/* Backdrop */}
              <div
                className="md:hidden fixed inset-0 bg-black/50 z-40"
                onClick={() => setMobileMenuOpen(false)}
                aria-hidden="true"
              />
              {/* Drawer */}
              <div className="md:hidden fixed top-0 right-0 bottom-0 w-4/5 max-w-xs bg-white z-50 flex flex-col shadow-2xl overflow-hidden">
                {/* Drawer header */}
                <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100" style={{ backgroundColor: 'var(--primary-color)' }}>
                  <Link to="/" onClick={() => setMobileMenuOpen(false)}>
                    <img src={kidroveLogo} alt="Logo" className="h-8 w-auto" width="120" height="32" />
                  </Link>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 text-white"
                    aria-label="Close menu"
                  >
                    <FaTimes size={16} />
                  </button>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto">
                  {/* Main nav links */}
                  <nav className="px-2 py-3 border-b border-gray-100">
                    {[
                      { path: '/search', label: 'Find Activities', icon: <FaSearch size={14} /> },
                      { path: '/blog', label: 'Blog', icon: <FaFileAlt size={14} /> },
                      { path: '/about', label: 'Kidrove Go', icon: <FaUser size={14} /> },
                      { path: '/faq', label: 'FAQ', icon: <FaChartBar size={14} /> },
                      { path: '/contact', label: 'Get In Touch', icon: <FaCalendarPlus size={14} /> },
                    ].map((link) => {
                      const isActive = location.pathname === link.path;
                      return (
                        <Link
                          key={link.path}
                          to={link.path}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium min-h-[48px] transition-colors ${isActive ? 'text-white' : 'text-gray-700 hover:bg-gray-50'}`}
                          style={isActive ? { backgroundColor: 'var(--primary-color)' } : {}}
                        >
                          <span className={isActive ? 'text-white' : 'text-gray-400'}>{link.icon}</span>
                          {link.label}
                        </Link>
                      );
                    })}
                  </nav>

                  {/* Auth section */}
                  <div className="px-2 py-3">
                    {isInitialized && isAuthenticated && user ? (
                      <>
                        {/* User info card */}
                        <div className="flex items-center gap-3 px-3 py-3 bg-gray-50 rounded-lg mb-3">
                          <img
                            src={getUserAvatar()}
                            alt="Profile"
                            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                            width="40"
                            height="40"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{getUserDisplayName()}</p>
                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                            <span className="inline-block px-2 py-0.5 text-xs rounded-full mt-0.5 capitalize"
                              style={{ backgroundColor: 'var(--primary-color)', color: 'white' }}>
                              {user.role}
                            </span>
                          </div>
                        </div>

                        {/* Common links */}
                        <Link to={getDashboardPath()} className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium min-h-[48px] transition-colors ${location.pathname === getDashboardPath() ? 'text-white' : 'text-gray-700 hover:bg-gray-50'}`} style={location.pathname === getDashboardPath() ? { backgroundColor: 'var(--primary-color)' } : {}} onClick={() => setMobileMenuOpen(false)}>
                          <FaTachometerAlt size={14} className="text-gray-400 flex-shrink-0" /> Dashboard
                        </Link>
                        <Link to="/profile" className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium min-h-[48px] transition-colors ${location.pathname === '/profile' ? 'text-white' : 'text-gray-700 hover:bg-gray-50'}`} style={location.pathname === '/profile' ? { backgroundColor: 'var(--primary-color)' } : {}} onClick={() => setMobileMenuOpen(false)}>
                          <FaUserCircle size={14} className="text-gray-400 flex-shrink-0" /> View Profile
                        </Link>

                        {/* Admin links */}
                        {user.role === 'admin' && (
                          <>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 pt-4 pb-1">Admin</p>
                            <Link to="/admin/users" className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium min-h-[48px] text-gray-700 hover:bg-gray-50" onClick={() => setMobileMenuOpen(false)}><FaUser size={14} className="text-gray-400 flex-shrink-0" /> Manage Users</Link>
                            <Link to="/admin/events" className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium min-h-[48px] text-gray-700 hover:bg-gray-50" onClick={() => setMobileMenuOpen(false)}><FaTicketAlt size={14} className="text-gray-400 flex-shrink-0" /> Manage Events</Link>
                            <Link to="/admin/orders" className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium min-h-[48px] text-gray-700 hover:bg-gray-50" onClick={() => setMobileMenuOpen(false)}><FaFileAlt size={14} className="text-gray-400 flex-shrink-0" /> Manage Orders</Link>
                          </>
                        )}

                        {/* Vendor links */}
                        {user.role === 'vendor' && (
                          <>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 pt-4 pb-1">Vendor</p>
                            <Link to="/vendor/events" className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium min-h-[48px] text-gray-700 hover:bg-gray-50" onClick={() => setMobileMenuOpen(false)}><FaTicketAlt size={14} className="text-gray-400 flex-shrink-0" /> My Events</Link>
                            <Link to="/vendor/events/create" className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium min-h-[48px] text-gray-700 hover:bg-gray-50" onClick={() => setMobileMenuOpen(false)}><FaCalendarPlus size={14} className="text-gray-400 flex-shrink-0" /> Create Event</Link>
                            <Link to="/vendor/bookings" className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium min-h-[48px] text-gray-700 hover:bg-gray-50" onClick={() => setMobileMenuOpen(false)}><FaFileAlt size={14} className="text-gray-400 flex-shrink-0" /> Bookings</Link>
                            <Link to="/vendor/analytics" className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium min-h-[48px] text-gray-700 hover:bg-gray-50" onClick={() => setMobileMenuOpen(false)}><FaChartBar size={14} className="text-gray-400 flex-shrink-0" /> Analytics</Link>
                          </>
                        )}

                        {/* Teacher links */}
                        {user.role === 'teacher' && (
                          <>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 pt-4 pb-1">Teacher</p>
                            <Link to="/teacher/events" className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium min-h-[48px] text-gray-700 hover:bg-gray-50" onClick={() => setMobileMenuOpen(false)}><FaTicketAlt size={14} className="text-gray-400 flex-shrink-0" /> My Teaching-Events</Link>
                            <Link to="/teacher/events/create" className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium min-h-[48px] text-gray-700 hover:bg-gray-50" onClick={() => setMobileMenuOpen(false)}><FaCalendarPlus size={14} className="text-gray-400 flex-shrink-0" /> Create Teaching-Event</Link>
                            <Link to="/teacher/bookings" className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium min-h-[48px] text-gray-700 hover:bg-gray-50" onClick={() => setMobileMenuOpen(false)}><FaFileAlt size={14} className="text-gray-400 flex-shrink-0" /> Bookings</Link>
                            <Link to="/teacher/analytics" className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium min-h-[48px] text-gray-700 hover:bg-gray-50" onClick={() => setMobileMenuOpen(false)}><FaChartBar size={14} className="text-gray-400 flex-shrink-0" /> Analytics</Link>
                            <Link to="/teacher/profile" className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium min-h-[48px] text-gray-700 hover:bg-gray-50" onClick={() => setMobileMenuOpen(false)}><FaCog size={14} className="text-gray-400 flex-shrink-0" /> Teacher Settings</Link>
                          </>
                        )}

                        {/* My Account */}
                        {(user.role === 'admin' || user.role === 'vendor' || user.role === 'teacher' || user.role === 'customer') && (
                          <>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 pt-4 pb-1">My Account</p>
                            <Link to="/bookings" className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium min-h-[48px] text-gray-700 hover:bg-gray-50" onClick={() => setMobileMenuOpen(false)}><FaTicketAlt size={14} className="text-gray-400 flex-shrink-0" /> My Bookings</Link>
                            <Link to="/favorites" className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium min-h-[48px] text-gray-700 hover:bg-gray-50" onClick={() => setMobileMenuOpen(false)}><FaHeart size={14} className="text-gray-400 flex-shrink-0" /> Favorites</Link>
                          </>
                        )}
                      </>
                    ) : (
                      <Link
                        to="/login"
                        className="flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl font-semibold text-white transition-all duration-300"
                        style={{ backgroundColor: 'var(--primary-color)' }}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <FaUser size={14} />
                        Login / Register
                      </Link>
                    )}
                  </div>
                </div>

                {/* Drawer footer — logout */}
                {isAuthenticated && user && (
                  <div className="px-4 py-4 border-t border-gray-100">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-white transition-all duration-300"
                      style={{ backgroundColor: 'var(--accent-color)' }}
                    >
                      <FaSignOutAlt size={14} />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </header>

      {/* Main content */}
      <main
        className="flex-grow"
        style={{ paddingTop: 'var(--main-padding-top, 72px)' }}
      >
        <ErrorBoundary>
          <motion.div
            key={location.key}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {children || <Outlet />}
          </motion.div>
        </ErrorBoundary>
      </main>

      {/* Footer */}
      <footer className="bg-white shadow-inner border-t border-gray-100">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            {/* Logo and About */}
            <div className="col-span-2 md:col-span-1">
              <picture>
                {/* <source type="image/webp" srcSet="/assets/images/KidRove-Logo.webp" /> */}
                <img src={kidroveLogo} alt="Kidrove Logo" className="h-8 w-auto mb-4" width="150" height="32" loading="lazy" decoding="async" />
              </picture>
              <p className="text-gray-700 text-sm mb-4">
                Discover and book the best activities for your kids in the UAE.
              </p>
              <div className="flex space-x-3">
                {socialSettings.facebookUrl && (
                  <a href={socialSettings.facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Visit our Facebook page" className="hover:opacity-80 transition-opacity duration-300 flex items-center justify-center w-8 h-8 rounded-full" style={{ backgroundColor: 'var(--primary-color)', color: 'white' }}>
                    <FaFacebookF size={14} />
                  </a>
                )}
                {socialSettings.twitterUrl && (
                  <a href={socialSettings.twitterUrl} target="_blank" rel="noopener noreferrer" aria-label="Visit our Twitter page" className="hover:opacity-80 transition-opacity duration-300 flex items-center justify-center w-8 h-8 rounded-full" style={{ backgroundColor: 'var(--primary-color)', color: 'white' }}>
                    <FaTwitter size={14} />
                  </a>
                )}
                {socialSettings.instagramUrl && (
                  <a href={socialSettings.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Visit our Instagram page" className="hover:opacity-80 transition-opacity duration-300 flex items-center justify-center w-8 h-8 rounded-full" style={{ backgroundColor: 'var(--primary-color)', color: 'white' }}>
                    <FaInstagram size={14} />
                  </a>
                )}
                {socialSettings.youtubeUrl && (
                  <a href={socialSettings.youtubeUrl} target="_blank" rel="noopener noreferrer" aria-label="Visit our YouTube channel" className="hover:opacity-80 transition-opacity duration-300 flex items-center justify-center w-8 h-8 rounded-full" style={{ backgroundColor: 'var(--primary-color)', color: 'white' }}>
                    <FaYoutube size={14} />
                  </a>
                )}
                {socialSettings.linkedinUrl && (
                  <a href={socialSettings.linkedinUrl} target="_blank" rel="noopener noreferrer" aria-label="Visit our LinkedIn page" className="hover:opacity-80 transition-opacity duration-300 flex items-center justify-center w-8 h-8 rounded-full" style={{ backgroundColor: 'var(--primary-color)', color: 'white' }}>
                    <FaLinkedinIn size={14} />
                  </a>
                )}
              </div>
            </div>

            {/* Quick Links */}
            <div className="col-span-1">
              <h3 className="font-semibold mb-4 text-gray-900">Quick Links</h3>
              <ul className="space-y-2">
                <li><Link to="/about" className="text-gray-700 hover:text-gray-900 text-sm">About Us</Link></li>
                <li><Link to="/blog" className="text-gray-700 hover:text-gray-900 text-sm">Blog</Link></li>
                <li><Link to="/contact" className="text-gray-700 hover:text-gray-900 text-sm">Contact Us</Link></li>
                <li><Link to="/faq" className="text-gray-700 hover:text-gray-900 text-sm">FAQs</Link></li>
                <li><Link to="/partner-with-us" className="text-gray-700 hover:text-gray-900 text-sm">Partner with Us</Link></li>
              </ul>
            </div>

            {/* Categories - Dynamic */}
            <div className="col-span-1">
              <h3 className="font-semibold mb-4 text-gray-900">Categories</h3>
              <ul className="space-y-2">
                {categoriesLoading ? (
                  <div className="space-y-2">
                    {[...Array(4)].map((_, index) => (
                      <div key={index} className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  footerCategories.slice(0, 4).map((category) => (
                    <li key={category._id}>
                      <Link
                        to={`/categories/${category.slug}`}
                        className="text-gray-700 hover:text-gray-900 text-sm transition-colors duration-200"
                      >
                        {category.name}
                      </Link>
                    </li>
                  ))
                )}
                {footerCategories.length === 0 && !categoriesLoading && (
                  <li className="text-gray-700 text-sm italic">No categories available</li>
                )}
              </ul>
            </div>

            {/* Newsletter */}
            <NewsletterSubscription />
          </div>

          <div className="border-t border-gray-200 mt-6 sm:mt-8 pt-6 sm:pt-8 flex flex-col sm:flex-row justify-between items-center gap-3">
            <p className="text-gray-700 text-sm text-center sm:text-left">
              &copy; {new Date().getFullYear()} Kidrove. All rights reserved.
            </p>
            <div className="flex gap-4 sm:gap-6 flex-wrap justify-center">
              <Link to="/privacy" className="text-gray-700 hover:text-gray-900 text-sm">Privacy Policy</Link>
              <Link to="/terms" className="text-gray-700 hover:text-gray-900 text-sm">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Customer chat widget — floating bottom-right on all public pages */}
      {import.meta.env.VITE_ENABLE_CHAT === 'true' && <CustomerChatWidget />}
    </div>
  );
};

export default Layout;