import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FaThLarge,
  FaTicketAlt,
  FaCalendarPlus,
  FaListUl,
  FaWallet,
  FaUserTie,
  FaChartLine,
  FaCog,
  FaHome,
  FaHandshake
} from 'react-icons/fa';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const VendorNavigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const navItems: NavItem[] = [
    {
      path: '/vendor',
      label: 'Dashboard',
      icon: <FaThLarge className="w-4 h-4" />
    },
    {
      path: '/vendor/events',
      label: 'My Events',
      icon: <FaTicketAlt className="w-4 h-4" />
    },
    {
      path: '/vendor/events/create',
      label: 'Create Event',
      icon: <FaCalendarPlus className="w-4 h-4" />
    },
    {
      path: '/vendor/claimed-events',
      label: 'Claimed Listings',
      icon: <FaHandshake className="w-4 h-4" />
    },
    {
      path: '/vendor/bookings',
      label: 'Bookings',
      icon: <FaListUl className="w-4 h-4" />
    },
    {
      path: '/vendor/payouts',
      label: 'Payouts',
      icon: <FaWallet className="w-4 h-4" />
    },
    {
      path: '/vendor/employees',
      label: 'Employees',
      icon: <FaUserTie className="w-4 h-4" />
    },
    {
      path: '/vendor/analytics',
      label: 'Analytics',
      icon: <FaChartLine className="w-4 h-4" />
    },
    {
      path: '/vendor/profile',
      label: 'Settings',
      icon: <FaCog className="w-4 h-4" />
    }
  ];

  const isActive = (path: string) => {
    if (path === '/vendor') return location.pathname === '/vendor';
    if (path === '/vendor/events') {
      return (
        location.pathname === '/vendor/events' ||
        (location.pathname.startsWith('/vendor/events/') &&
          !location.pathname.startsWith('/vendor/events/create'))
      );
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="bg-gradient-to-r from-green-50 to-emerald-50 shadow-lg border-b border-green-100 backdrop-blur-sm sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          {/* Breadcrumb */}
          <div className="flex items-center space-x-3 text-sm">
            <Link to="/" className="text-gray-600 hover:text-green-700 transition-colors duration-300 transform hover:scale-110">
              <FaHome className="w-5 h-5" />
            </Link>
            <span className="text-gray-400 text-lg">/</span>
            <span className="text-green-700 font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent text-lg">
              Vendor Portal
            </span>
          </div>

          {/* Navigation Links */}
          <div className="hidden lg:flex items-center space-x-1 overflow-x-auto scrollbar-hide py-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-300 transform hover:scale-105 whitespace-nowrap ${
                  isActive(item.path)
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/25 border border-green-500'
                    : 'text-gray-700 hover:text-green-700 hover:bg-white/60 hover:shadow-md backdrop-blur-sm border border-transparent hover:border-green-200'
                }`}
              >
                <div className={`transition-colors duration-300 flex-shrink-0 ${
                  isActive(item.path) ? 'text-green-100' : 'text-green-600'
                }`}>
                  {item.icon}
                </div>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>

          {/* Tablet Navigation */}
          <div className="hidden md:flex lg:hidden items-center space-x-1">
            {navItems.slice(0, 5).map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-center w-10 h-10 rounded-lg text-sm font-medium transition-all duration-300 flex-shrink-0 ${
                  isActive(item.path)
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg'
                    : 'text-gray-700 hover:text-green-700 hover:bg-white/60'
                }`}
                title={item.label}
              >
                {item.icon}
              </Link>
            ))}
          </div>

          {/* Mobile Dropdown */}
          <div className="md:hidden">
            <select
              value={location.pathname}
              onChange={(e) => navigate(e.target.value)}
              className="block w-full px-4 py-3 border border-green-300 rounded-xl shadow-md bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm font-semibold text-gray-700 transition-all duration-300"
            >
              {navItems.map((item) => (
                <option key={item.path} value={item.path} className="font-medium">
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default VendorNavigation;