import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useCart } from '@/contexts/CartContext';
import { RootState, AppDispatch } from '@/store';
import { logoutUser } from '@/store/slices/authSlice';
import {
  fetchFeaturedCategories,
  selectFeaturedCategories,
  selectCategoriesLoading
} from '@/store/slices/categoriesSlice';
// Commented out - notification system disabled
// import {
//   fetchNotifications,
//   selectUnreadCount
// } from '@/store/slices/notificationsSlice';
// import NotificationDropdown from './NotificationDropdown';
import NewsletterSubscription from './NewsletterSubscription';
import ConnectionStatus from './ConnectionStatus';
import CurrencySelector from '@/components/common/CurrencySelector';
import { useRealTimeData } from '@/hooks/useRealTimeData';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import kidroveLogo from '/assets/images/KidRove-Logo.png';
import kidroveLogoWhite from '/assets/images/KidRove-Logo-white.png';
import {
  FaFacebookF,
  FaTwitter,
  FaWhatsapp,
  FaInstagram,
  FaYoutube,
  FaDownload,
  // FaGlobe,
  FaSearch,
  FaUser,
  FaHeart,
  FaShoppingCart,
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
import { MdLanguage } from 'react-icons/md';
import { IoMdArrowDropdown } from 'react-icons/io';

const Layout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState({ code: 'en', name: 'English' });
  
  const { cartCount } = useCart();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const featuredCategories = useSelector(selectFeaturedCategories);
  const categoriesLoading = useSelector(selectCategoriesLoading);
  // const unreadNotificationsCount = useSelector(selectUnreadCount); // Commented out - notification system disabled
  
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Real-time data updates
  useRealTimeData({
    enableNotifications: false, // Disabled - notification system disabled
    enableCategories: true,
    notificationInterval: 30000, // 30 seconds
    categoryInterval: 300000, // 5 minutes
  });

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
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
      console.error('Logout error:', error);
    }
  };

  const getDashboardPath = () => {
    if (!user?.role) return '/dashboard';
    
    switch (user.role) {
      case 'admin':
        return '/admin';
      case 'vendor':
        return '/vendor';
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

  const handleLanguageChange = useCallback((language: { code: string; name: string }) => {
    setCurrentLanguage(language);
    // TODO: Implement actual language change logic (i18n)
    console.log('Language changed to:', language);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 overflow-x-hidden">
      <ConnectionStatus />
      <header className="relative z-50">
        {/* Top Bar */}
        <div
          className="w-full text-white"
          style={{ backgroundColor: 'var(--primary-color)' }}
        >
          <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-center items-center text-sm">
            {/* Left: Social Icons */}
            <div className="hidden md:flex space-x-4">
              <a href="#" className="hover:opacity-80 transition-opacity duration-300 flex items-center justify-center w-7 h-7 rounded-full bg-white/10">
                <FaFacebookF size={14} />
              </a>
              <a href="#" className="hover:opacity-80 transition-opacity duration-300 flex items-center justify-center w-7 h-7 rounded-full bg-white/10">
                <FaTwitter size={14} />
              </a>
              <a href="#" className="hover:opacity-80 transition-opacity duration-300 flex items-center justify-center w-7 h-7 rounded-full bg-white/10">
                <FaWhatsapp size={14} />
              </a>
              <a href="#" className="hover:opacity-80 transition-opacity duration-300 flex items-center justify-center w-7 h-7 rounded-full bg-white/10">
                <FaInstagram size={14} />
              </a>
              <a href="#" className="hover:opacity-80 transition-opacity duration-300 flex items-center justify-center w-7 h-7 rounded-full bg-white/10">
                <FaYoutube size={14} />
              </a>
            </div>

            {/* Mobile: Logo */}
            <div className="md:hidden">
              <a href="/">
                <img src={kidroveLogo} alt="Kidzapp Logo" className="h-8 w-auto" />
              </a>
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
            top: scrolled ? 0 : 'auto'
          }}
        >
          <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            {/* Logo */}
            <div className="flex items-center" style={{ width: '10%', height: 'auto',}}>
              <Link to="/" style={{ width: '100%',}}>
                <img src={scrolled ? kidroveLogoWhite : kidroveLogo} alt="Kidzapp Logo" className="h-auto w-10" style={{ width: '100%',}} />
              </Link>
            </div>

            {/* Desktop Nav Links */}
            <nav className="hidden md:flex space-x-8">
              <Link
                to="/search"
                className={`text-sm font-medium hover:opacity-80 transition-opacity duration-300 ${scrolled ? 'text-white' : 'text-gray-900'}`}
              >
                Find Activities
              </Link>
              <Link
                to="/blog"
                className={`text-sm font-medium hover:opacity-80 transition-opacity duration-300 ${scrolled ? 'text-white' : 'text-gray-900'}`}
              >
                Blog
              </Link>
              <Link
                to="/about"
                className={`text-sm font-medium hover:opacity-80 transition-opacity duration-300 ${scrolled ? 'text-white' : 'text-gray-900'}`}
              >
                Kidzapp Go
              </Link>
              <Link
                to="/faq"
                className={`text-sm font-medium hover:opacity-80 transition-opacity duration-300 ${scrolled ? 'text-white' : 'text-gray-900'}`}
              >
                FAQ
              </Link>
              <Link
                to="/contact"
                className={`text-sm font-medium hover:opacity-80 transition-opacity duration-300 ${scrolled ? 'text-white' : 'text-gray-900'}`}
              >
                Get In Touch
              </Link>
            </nav>

            {/* Desktop: User Actions */}
            <div className="hidden md:flex items-center space-x-4">
              <Link 
                to="/search"
                className="p-2 rounded-full text-white hover:shadow-md transition-all duration-300" 
                style={{ backgroundColor: 'var(--accent-color)' }}
              >
                <FaSearch size={14} />
              </Link>
              <Link 
                to="/favorites"
                className="p-2 rounded-full hover:bg-gray-100 transition-all duration-300"
                style={{ color: scrolled ? 'white' : 'var(--primary-color)' }}
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
              {isAuthenticated && user ? (
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
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                      <div className="px-4 py-3 border-b border-gray-200">
                        <p className="text-sm font-medium text-gray-900">{getUserDisplayName()}</p>
                        <p className="text-sm text-gray-700">{user.email}</p>
                        <span className="inline-block px-2 py-1 text-xs rounded-full mt-1"
                              style={{ backgroundColor: 'var(--primary-color)', color: 'white' }}>
                          {user.role}
                        </span>
                      </div>
                      
                      <Link 
                        to={getDashboardPath()}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setProfileDropdownOpen(false)}
                      >
                        <FaTachometerAlt className="mr-3" />
                        Dashboard
                      </Link>
                      
                      <Link 
                        to="/profile"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setProfileDropdownOpen(false)}
                      >
                        <FaUser className="mr-3" />
                        View Profile
                      </Link>
                      
                      {(user.role === 'customer') && (
                        <>
                          <Link 
                            to="/bookings"
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={() => setProfileDropdownOpen(false)}
                          >
                            <FaTicketAlt className="mr-3" />
                            My Bookings
                          </Link>
                          
                          <Link 
                            to="/favorites"
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={() => setProfileDropdownOpen(false)}
                          >
                            <FaHeart className="mr-3" />
                            Favorites
                          </Link>
                        </>
                      )}
                      
                      {user.role === 'vendor' && (
                        <>
                          <Link 
                            to="/vendor/events"
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={() => setProfileDropdownOpen(false)}
                          >
                            <FaTicketAlt className="mr-3" />
                            My Events
                          </Link>
                          
                          <Link 
                            to="/vendor/events/create"
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={() => setProfileDropdownOpen(false)}
                          >
                            <FaCalendarPlus className="mr-3" />
                            Create Event
                          </Link>
                          
                          <Link 
                            to="/vendor/bookings"
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={() => setProfileDropdownOpen(false)}
                          >
                            <FaFileAlt className="mr-3" />
                            Bookings
                          </Link>
                          
                          <Link 
                            to="/vendor/analytics"
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={() => setProfileDropdownOpen(false)}
                          >
                            <FaChartBar className="mr-3" />
                            Analytics
                          </Link>
                          
                          <Link 
                            to="/vendor/profile"
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={() => setProfileDropdownOpen(false)}
                          >
                            <FaCog className="mr-3" />
                            Vendor Settings
                          </Link>
                        </>
                      )}
                      
                      {user.role === 'admin' && (
                        <>
                          <Link 
                            to="/admin/users"
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={() => setProfileDropdownOpen(false)}
                          >
                            <FaUser className="mr-3" />
                            Manage Users
                          </Link>
                          
                          <Link 
                            to="/admin/events"
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={() => setProfileDropdownOpen(false)}
                          >
                            <FaTicketAlt className="mr-3" />
                            Manage Events
                          </Link>
                          
                          <Link 
                            to="/admin/venues"
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={() => setProfileDropdownOpen(false)}
                          >
                            <FaCog className="mr-3" />
                            Manage Venues
                          </Link>
                          
                          <Link 
                            to="/admin/categories"
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={() => setProfileDropdownOpen(false)}
                          >
                            <FaCog className="mr-3" />
                            Manage Categories
                          </Link>
                          
                          <Link 
                            to="/admin/orders"
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={() => setProfileDropdownOpen(false)}
                          >
                            <FaTicketAlt className="mr-3" />
                            Manage Orders
                          </Link>
                        </>
                      )}
                      
                      <div className="border-t border-gray-200 mt-2 pt-2">
                        <button 
                          onClick={handleLogout}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
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
                <Link to="/about" className="block py-2 text-base font-medium text-gray-900">Kidzapp Go</Link>
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
                  {isAuthenticated && user ? (
                    <div className="space-y-2">
                      <div className="px-4 py-3 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-900">{getUserDisplayName()}</p>
                        <p className="text-sm text-gray-700">{user.email}</p>
                        <span className="inline-block px-2 py-1 text-xs rounded-full mt-1"
                              style={{ backgroundColor: 'var(--primary-color)', color: 'white' }}>
                          {user.role}
                        </span>
                      </div>
                      
                      <Link
                        to={getDashboardPath()}
                        className="block py-2 text-base font-medium text-gray-900"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Dashboard
                      </Link>
                      
                      <Link
                        to="/profile"
                        className="block py-2 text-base font-medium text-gray-900"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        View Profile
                      </Link>

                      {(user.role === 'customer') && (
                        <>
                          <Link
                            to="/bookings"
                            className="block py-2 text-base font-medium text-gray-900"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            My Bookings
                          </Link>

                          <Link
                            to="/favorites"
                            className="block py-2 text-base font-medium text-gray-900"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            Favorites
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
      <main className="flex-grow pt-16">
        <ErrorBoundary>
          <div className="w-full">
            {children || <Outlet />}
          </div>
        </ErrorBoundary>
      </main>

      {/* Footer */}
      <footer className="bg-white shadow-inner border-t border-gray-100">
        <div className="max-w-screen-xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Logo and About */}
            <div className="col-span-1">
              <img src={kidroveLogo} alt="Kidzapp Logo" className="h-8 w-auto mb-4" />
              <p className="text-gray-700 text-sm mb-4">
                Discover and book the best activities for your kids in the UAE.
              </p>
              <div className="flex space-x-3">
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity duration-300 flex items-center justify-center w-8 h-8 rounded-full" style={{ backgroundColor: 'var(--primary-color)', color: 'white' }}>
                  <FaFacebookF size={14} />
                </a>
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity duration-300 flex items-center justify-center w-8 h-8 rounded-full" style={{ backgroundColor: 'var(--primary-color)', color: 'white' }}>
                  <FaTwitter size={14} />
                </a>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity duration-300 flex items-center justify-center w-8 h-8 rounded-full" style={{ backgroundColor: 'var(--primary-color)', color: 'white' }}>
                  <FaInstagram size={14} />
                </a>
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
                  featuredCategories.slice(0, 4).map((category) => (
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
                {featuredCategories.length === 0 && !categoriesLoading && (
                  <li className="text-gray-700 text-sm italic">No categories available</li>
                )}
              </ul>
            </div>

            {/* Newsletter */}
            <NewsletterSubscription />
          </div>

          <div className="border-t border-gray-200 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-700 text-sm">
              &copy; {new Date().getFullYear()} Kidzapp. All rights reserved.
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