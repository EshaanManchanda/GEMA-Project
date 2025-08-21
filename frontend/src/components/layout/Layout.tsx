import React, { useEffect, useState, useRef } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useCart } from '@/contexts/CartContext';
import { RootState, AppDispatch } from '@/store';
import { logoutUser } from '@/store/slices/authSlice';
import {
  FaFacebookF,
  FaTwitter,
  FaWhatsapp,
  FaInstagram,
  FaYoutube,
  FaDownload,
  FaGlobe,
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
  FaHome
} from 'react-icons/fa';
import { MdLanguage } from 'react-icons/md';
import { IoMdArrowDropdown } from 'react-icons/io';

const Layout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const { cartCount } = useCart();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

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
      await dispatch(logoutUser());
      
      // Clear localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('rememberMe');
      
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

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 overflow-x-hidden">
      <header className="relative z-50">
        {/* Top Bar */}
        <div
          className="w-full text-white"
          style={{ backgroundColor: 'var(--primary-color)' }}
        >
          <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center text-sm">
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
                <img src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=120&h=40&fit=crop&crop=center" alt="Kidzapp Logo" className="h-6 w-auto" />
              </a>
            </div>

            {/* Right: Download App, Country, Language */}
            <div className="flex items-center space-x-4 md:space-x-6">
              <div className="hidden md:flex items-center space-x-1 cursor-pointer hover:opacity-80 transition-opacity duration-300">
                <FaDownload size={14} />
                <span>Download App</span>
              </div>

              <div className="flex items-center space-x-1 cursor-pointer hover:opacity-80 transition-opacity duration-300">
                <img
                  src="https://flagcdn.com/w40/ae.png"
                  alt="UAE"
                  className="w-5 h-3"
                />
                <span className="hidden md:inline">UAE</span>
                <IoMdArrowDropdown />
              </div>

              <div className="flex items-center space-x-1 cursor-pointer hover:opacity-80 transition-opacity duration-300">
                <MdLanguage size={16} />
                <span>عربي</span>
              </div>
            </div>
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
            <div className="flex items-center">
              <Link to="/">
                <img 
                  src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=120&h=40&fit=crop&crop=center" 
                  alt="Kidzapp Logo" 
                  className="h-8 w-auto" 
                />
              </Link>
            </div>

            {/* Desktop Nav Links */}
            <nav className="hidden md:flex space-x-8">
              <Link 
                to="/search" 
                className={`text-sm font-medium hover:opacity-80 transition-opacity duration-300 ${scrolled ? 'text-white' : ''}`}
                style={{ color: scrolled ? 'white' : 'var(--primary-color)' }}
              >
                Find Activities
              </Link>
              <Link 
                to="/blog" 
                className={`text-sm font-medium hover:opacity-80 transition-opacity duration-300 ${scrolled ? 'text-white' : ''}`}
                style={{ color: scrolled ? 'white' : 'var(--primary-color)' }}
              >
                Blog
              </Link>
              <Link 
                to="/about" 
                className={`text-sm font-medium hover:opacity-80 transition-opacity duration-300 ${scrolled ? 'text-white' : ''}`}
                style={{ color: scrolled ? 'white' : 'var(--primary-color)' }}
              >
                Kidzapp Go
              </Link>
              <Link 
                to="/contact" 
                className={`text-sm font-medium hover:opacity-80 transition-opacity duration-300 ${scrolled ? 'text-white' : ''}`}
                style={{ color: scrolled ? 'white' : 'var(--primary-color)' }}
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
              <Link 
                to="/cart"
                className="p-2 rounded-full hover:bg-gray-100 transition-all duration-300 relative"
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
              </Link>
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
                    <FaUserCircle size={16} />
                    <span className="hidden md:inline">{getUserDisplayName()}</span>
                    <FaChevronDown size={12} className={`transition-transform duration-200 ${profileDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {profileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                      <div className="px-4 py-3 border-b border-gray-200">
                        <p className="text-sm font-medium text-gray-900">{getUserDisplayName()}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
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
              <Link 
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
              </Link>
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
                <Link to="/search" className="block py-2 text-base font-medium" style={{ color: 'var(--primary-color)' }}>Find Activities</Link>
                <Link to="/blog" className="block py-2 text-base font-medium" style={{ color: 'var(--primary-color)' }}>Blog</Link>
                <Link to="/about" className="block py-2 text-base font-medium" style={{ color: 'var(--primary-color)' }}>Kidzapp Go</Link>
                <Link to="/contact" className="block py-2 text-base font-medium" style={{ color: 'var(--primary-color)' }}>Get In Touch</Link>
                <Link to="/cart" className="flex items-center py-2 text-base font-medium" style={{ color: 'var(--primary-color)' }}>
                  <FaShoppingCart className="mr-2" size={14} />
                  Cart {cartCount > 0 && <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-1">{cartCount}</span>}
                </Link>
                <div className="pt-4 border-t border-gray-200">
                  {isAuthenticated && user ? (
                    <div className="space-y-2">
                      <div className="px-4 py-3 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-900">{getUserDisplayName()}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                        <span className="inline-block px-2 py-1 text-xs rounded-full mt-1" 
                              style={{ backgroundColor: 'var(--primary-color)', color: 'white' }}>
                          {user.role}
                        </span>
                      </div>
                      
                      <Link 
                        to={getDashboardPath()}
                        className="block py-2 text-base font-medium" 
                        style={{ color: 'var(--primary-color)' }}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Dashboard
                      </Link>
                      
                      <Link 
                        to="/profile" 
                        className="block py-2 text-base font-medium" 
                        style={{ color: 'var(--primary-color)' }}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        View Profile
                      </Link>
                      
                      {(user.role === 'customer') && (
                        <>
                          <Link 
                            to="/bookings" 
                            className="block py-2 text-base font-medium" 
                            style={{ color: 'var(--primary-color)' }}
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            My Bookings
                          </Link>
                          
                          <Link 
                            to="/favorites" 
                            className="block py-2 text-base font-medium" 
                            style={{ color: 'var(--primary-color)' }}
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
        <div className="w-full">
          {children || <Outlet />}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white shadow-inner border-t border-gray-100">
        <div className="max-w-screen-xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Logo and About */}
            <div className="col-span-1">
              <img src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=120&h=40&fit=crop&crop=center" alt="Kidzapp Logo" className="h-8 w-auto mb-4" />
              <p className="text-gray-600 text-sm mb-4">
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
              <h3 className="font-semibold mb-4" style={{ color: 'var(--primary-color)' }}>Quick Links</h3>
              <ul className="space-y-2">
                <li><Link to="/about" className="text-gray-600 hover:text-gray-900 text-sm">About Us</Link></li>
                <li><Link to="/blog" className="text-gray-600 hover:text-gray-900 text-sm">Blog</Link></li>
                <li><Link to="/contact" className="text-gray-600 hover:text-gray-900 text-sm">Contact Us</Link></li>
                <li><Link to="/faq" className="text-gray-600 hover:text-gray-900 text-sm">FAQs</Link></li>
              </ul>
            </div>
            
            {/* Categories */}
            <div className="col-span-1">
              <h3 className="font-semibold mb-4" style={{ color: 'var(--primary-color)' }}>Categories</h3>
              <ul className="space-y-2">
                <li><Link to="/categories/summer-camps" className="text-gray-600 hover:text-gray-900 text-sm">Summer Camps</Link></li>
                <li><Link to="/categories/indoor-play" className="text-gray-600 hover:text-gray-900 text-sm">Indoor Play Areas</Link></li>
                <li><Link to="/categories/outdoor-activities" className="text-gray-600 hover:text-gray-900 text-sm">Outdoor Activities</Link></li>
                <li><Link to="/categories/educational" className="text-gray-600 hover:text-gray-900 text-sm">Educational Classes</Link></li>
              </ul>
            </div>
            
            {/* Newsletter */}
            <div className="col-span-1">
              <h3 className="font-semibold mb-4" style={{ color: 'var(--primary-color)' }}>Newsletter</h3>
              <p className="text-gray-600 text-sm mb-4">Subscribe to our newsletter for updates on new activities and promotions.</p>
              <div className="flex flex-wrap">
                <input 
                  type="email" 
                  placeholder="Your email" 
                  className="flex-grow w-full sm:w-auto px-4 py-2 text-sm rounded-l-lg sm:rounded-l-lg sm:rounded-r-none border border-gray-300 focus:outline-none focus:ring-2 focus:ring-inset"
                  style={{ borderColor: 'var(--primary-color)', focusRing: 'var(--primary-color)' }}
                />
                <button 
                  className="px-4 py-2 rounded-r-lg sm:rounded-r-lg sm:rounded-l-none text-white text-sm mt-2 sm:mt-0 w-full sm:w-auto"
                  style={{ backgroundColor: 'var(--accent-color)' }}
                >
                  Subscribe
                </button>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-200 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-500 text-sm">
              &copy; {new Date().getFullYear()} Kidzapp. All rights reserved.
            </p>
            <div className="mt-4 md:mt-0 flex space-x-6">
              <Link to="/privacy" className="text-gray-500 hover:text-gray-700 text-sm">Privacy Policy</Link>
              <Link to="/terms" className="text-gray-500 hover:text-gray-700 text-sm">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;