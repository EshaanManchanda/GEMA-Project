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
      <header className="relative z-50" style={{ paddingTop: 'var(--announcement-height, 0px)' }}>
        {/* Top Bar */}
        <div
          className="w-full text-white"
          style={{ backgroundColor: 'var(--primary-color)' }}
        >
          <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-center items-center text-sm">
            {/* Left: Social Icons */}
            <div className="hidden md:flex space-x-4">
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

            {/* Mobile: Logo */}
            <div className="md:hidden">
              <Link to="/">
                <picture>
                  <img src={kidroveLogo} alt="kidrove Logo" className="h-8 w-auto" width="150" height="32" loading="eager" decoding="async" />
                </picture>
              </Link>
            </div>

            {/* Right: Download App, Currency, Language */}
            {/* <div className="flex items-center space-x-4 md:space-x-6">
              <div className="hidden md:flex items-center space-x-1 cursor-pointer hover:opacity-80 transition-opacity duration-300">
                <FaDownload size={14} />
                <span>Download App</span>
              </div> */}

            {/* Currency Selector */}
            {/* <CurrencySelector compact={true} className="text-white" /> */}

            {/* Language Selector */}
            {/* <div className="flex items-center space-x-1 cursor-pointer hover:opacity-80 transition-opacity duration-300"
                   onClick={() => handleLanguageChange({ code: 'en', name: 'English' })}>
                <MdLanguage size={16} />
                <span>{currentLanguage.name}</span>
              </div> */}
            {/* </div> */}
          </div>
        </div>

        {/* Main Navigation Bar */}
        <div
          className={`w-full fixed left-0 z-50 transition-all duration-300 ${scrolled ? 'shadow-md' : ''}`}
          style={{
            backgroundColor: scrolled ? 'var(--primary-color)' : 'white',
            top: 'var(--announcement-height, 0px)'
          }}
        >
          <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            {/* Logo */}
            <div className="flex items-center" style={{ width: '10%', height: 'auto', }}>
              <Link to="/" style={{ width: '100%', }}>
                {scrolled ? (
                  <picture>
                    {/* <source type="image/webp" srcSet="/assets/images/KidRove-Logo-white.webp" /> */}
                    <img src={kidroveLogo} alt="kidrove Logo" className="h-auto w-10" style={{ width: '100%', }} width="40" height="40" loading="eager" decoding="async" />
                  </picture>
                ) : (
                  <picture>
                    {/* <source type="image/webp" srcSet="/assets/images/KidRove-Logo.webp" /> */}
                    <img src={kidroveLogo} alt="kidrove Logo" className="h-auto w-10" style={{ width: '100%', }} width="40" height="40" loading="eager" decoding="async" />
                  </picture>
                )}
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

            {/* Mobile: Menu Toggle */}
            <div className="md:hidden flex items-center space-x-3">
              <Link
                to="/search"
                className="p-2 rounded-full text-white hover:shadow-md transition-all duration-300"
                style={{ backgroundColor: 'var(--accent-color)' }}
                aria-label="Search activities"
              >
                <FaSearch size={14} />
              </Link>
              {/* <Link 
                to="/cart"
                className="p-2 rounded-full transition-all duration-300 relative"
                style={{ color: scrolled ? 'white' : 'var(--primary-color)' }}
              >
                <FaShoppingCart size={14} />
                {cartCount > 0 && (
                  <span 
                    className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center"
                  >
                    {cartCount}
                  </span>
                )}
              </Link> */}
              <button
                onClick={toggleMobileMenu}
                className="p-2 rounded-full transition-all duration-300"
                style={{ color: scrolled ? 'white' : 'var(--primary-color)' }}
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              >
                {mobileMenuOpen ? <FaTimes size={18} /> : <FaBars size={18} />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden bg-white shadow-lg absolute w-full">
              <div className="px-4 py-6 space-y-4">
                <Link to="/search" className="block py-2 text-base font-medium text-gray-900">Find Activities</Link>
                <Link to="/blog" className="block py-2 text-base font-medium text-gray-900">Blog</Link>
                <Link to="/about" className="block py-2 text-base font-medium text-gray-900">Kidrove Go</Link>
                <Link to="/contact" className="block py-2 text-base font-medium text-gray-900">Get In Touch</Link>
                {/* <Link to="/cart" className="flex items-center py-2 text-base font-medium text-gray-900">
                  <FaShoppingCart className="mr-2" size={14} />
                  Cart {cartCount > 0 && <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-1">{cartCount}</span>}
                </Link> */}

                {/* Currency Selector - Mobile */}
                {/* <div className="py-2">
                  <p className="text-sm text-gray-700 mb-2">Select Currency</p>
                  <CurrencySelector compact={true} />
                </div> */}

                <div className="pt-4 border-t border-gray-200">
                  {isInitialized && isAuthenticated && user ? (
                    <div className="space-y-1">
                      {/* User info */}
                      <div className="px-4 py-3 bg-gray-50 rounded-lg mb-2">
                        <p className="text-sm font-medium text-gray-900">{getUserDisplayName()}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        <span className="inline-block px-2 py-0.5 text-xs rounded-full mt-1 capitalize"
                          style={{ backgroundColor: 'var(--primary-color)', color: 'white' }}>
                          {user.role}
                        </span>
                      </div>

                      {/* Common */}
                      <Link to={getDashboardPath()} className="flex items-center py-2 text-base font-medium text-gray-900" onClick={() => setMobileMenuOpen(false)}>
                        <FaTachometerAlt className="mr-3 text-gray-400" size={14} /> Dashboard
                      </Link>
                      <Link to="/profile" className="flex items-center py-2 text-base font-medium text-gray-900" onClick={() => setMobileMenuOpen(false)}>
                        <FaUserCircle className="mr-3 text-gray-400" size={14} /> View Profile
                      </Link>

                      {/* Admin links */}
                      {user.role === 'admin' && (
                        <>
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-3 pb-1">Admin</p>
                          <Link to="/admin/users" className="flex items-center py-2 text-base font-medium text-gray-900" onClick={() => setMobileMenuOpen(false)}>
                            <FaUser className="mr-3 text-gray-400" size={14} /> Manage Users
                          </Link>
                          <Link to="/admin/events" className="flex items-center py-2 text-base font-medium text-gray-900" onClick={() => setMobileMenuOpen(false)}>
                            <FaTicketAlt className="mr-3 text-gray-400" size={14} /> Manage Events
                          </Link>
                          <Link to="/admin/orders" className="flex items-center py-2 text-base font-medium text-gray-900" onClick={() => setMobileMenuOpen(false)}>
                            <FaFileAlt className="mr-3 text-gray-400" size={14} /> Manage Orders
                          </Link>
                        </>
                      )}

                      {/* Vendor links */}
                      {user.role === 'vendor' && (
                        <>
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-3 pb-1">Vendor</p>
                          <Link to="/vendor/events" className="flex items-center py-2 text-base font-medium text-gray-900" onClick={() => setMobileMenuOpen(false)}>
                            <FaTicketAlt className="mr-3 text-gray-400" size={14} /> My Events
                          </Link>
                          <Link to="/vendor/events/create" className="flex items-center py-2 text-base font-medium text-gray-900" onClick={() => setMobileMenuOpen(false)}>
                            <FaCalendarPlus className="mr-3 text-gray-400" size={14} /> Create Event
                          </Link>
                          <Link to="/vendor/bookings" className="flex items-center py-2 text-base font-medium text-gray-900" onClick={() => setMobileMenuOpen(false)}>
                            <FaFileAlt className="mr-3 text-gray-400" size={14} /> Bookings
                          </Link>
                          <Link to="/vendor/analytics" className="flex items-center py-2 text-base font-medium text-gray-900" onClick={() => setMobileMenuOpen(false)}>
                            <FaChartBar className="mr-3 text-gray-400" size={14} /> Analytics
                          </Link>
                        </>
                      )}

                      {/* Teacher links */}
                      {user.role === 'teacher' && (
                        <>
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-3 pb-1">Teacher</p>
                          <Link to="/teacher/events" className="flex items-center py-2 text-base font-medium text-gray-900" onClick={() => setMobileMenuOpen(false)}>
                            <FaTicketAlt className="mr-3 text-gray-400" size={14} /> My Teaching-Events
                          </Link>
                          <Link to="/teacher/events/create" className="flex items-center py-2 text-base font-medium text-gray-900" onClick={() => setMobileMenuOpen(false)}>
                            <FaCalendarPlus className="mr-3 text-gray-400" size={14} /> Create Teaching-Event
                          </Link>
                          <Link to="/teacher/bookings" className="flex items-center py-2 text-base font-medium text-gray-900" onClick={() => setMobileMenuOpen(false)}>
                            <FaFileAlt className="mr-3 text-gray-400" size={14} /> Bookings
                          </Link>
                          <Link to="/teacher/analytics" className="flex items-center py-2 text-base font-medium text-gray-900" onClick={() => setMobileMenuOpen(false)}>
                            <FaChartBar className="mr-3 text-gray-400" size={14} /> Analytics
                          </Link>
                          <Link to="/teacher/profile" className="flex items-center py-2 text-base font-medium text-gray-900" onClick={() => setMobileMenuOpen(false)}>
                            <FaCog className="mr-3 text-gray-400" size={14} /> Teacher Settings
                          </Link>
                        </>
                      )}

                      {/* Customer links — all roles */}
                      {(user.role === 'admin' || user.role === 'vendor' || user.role === 'teacher' || user.role === 'customer') && (
                        <>
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-3 pb-1">My Account</p>
                          <Link to="/bookings" className="flex items-center py-2 text-base font-medium text-gray-900" onClick={() => setMobileMenuOpen(false)}>
                            <FaTicketAlt className="mr-3 text-gray-400" size={14} /> My Bookings
                          </Link>
                          <Link to="/favorites" className="flex items-center py-2 text-base font-medium text-gray-900" onClick={() => setMobileMenuOpen(false)}>
                            <FaHeart className="mr-3 text-gray-400" size={14} /> Favorites
                          </Link>
                        </>
                      )}

                      <button
                        onClick={handleLogout}
                        className="w-full px-5 py-3 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2 text-white mt-4"
                        style={{ backgroundColor: 'var(--accent-color)' }}
                      >
                        <FaSignOutAlt size={14} />
                        Logout
                      </button>
                    </div>
                  ) : (
                    <Link
                      to="/login"
                      className="w-full px-5 py-3 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2 text-white"
                      style={{ backgroundColor: 'var(--primary-color)' }}
                    >
                      <FaUser size={14} />
                      Login / Register
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main
        className="flex-grow"
        style={{ paddingTop: 'calc(var(--announcement-height, 0px) + 64px)' }}
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
        <div className="max-w-screen-xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Logo and About */}
            <div className="col-span-1">
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

          <div className="border-t border-gray-200 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-700 text-sm">
              &copy; {new Date().getFullYear()} Kidrove. All rights reserved.
            </p>
            <div className="mt-4 md:mt-0 flex space-x-6">
              <Link to="/privacy" className="text-gray-700 hover:text-gray-900 text-sm">Privacy Policy</Link>
              <Link to="/terms" className="text-gray-700 hover:text-gray-900 text-sm">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;