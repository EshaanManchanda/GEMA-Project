import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FaTachometerAlt,
  FaCalendarAlt,
  FaCalendarPlus,
  FaClipboardList,
  FaMoneyBillWave,
  FaChartBar,
  FaHome,
  FaUserCircle,
  FaHeart,
} from 'react-icons/fa';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const TeacherNavigation: React.FC = () => {
  const location = useLocation();

  const navItems: NavItem[] = [
    {
      path: '/teacher',
      label: 'Dashboard',
      icon: <FaTachometerAlt className="w-4 h-4" />,
    },
    {
      path: '/teacher/events',
      label: 'My Classes',
      icon: <FaCalendarAlt className="w-4 h-4" />,
    },
    {
      path: '/teacher/events/create',
      label: 'Create Class',
      icon: <FaCalendarPlus className="w-4 h-4" />,
    },
    {
      path: '/teacher/bookings',
      label: 'Bookings',
      icon: <FaClipboardList className="w-4 h-4" />,
    },
    {
      path: '/teacher/payouts',
      label: 'Payouts',
      icon: <FaMoneyBillWave className="w-4 h-4" />,
    },
    {
      path: '/teacher/analytics',
      label: 'Analytics',
      icon: <FaChartBar className="w-4 h-4" />,
    },
    {
      path: '/teacher/profile',
      label: 'Profile',
      icon: <FaUserCircle className="w-4 h-4" />,
    },
    {
      path: '/favorites',
      label: 'Favorites',
      icon: <FaHeart className="w-4 h-4" />,
    },
  ];

  const isActive = (path: string) => {
    if (path === '/teacher') {
      return location.pathname === '/teacher';
    }
    // Exact match for /teacher/events to avoid collision with /teacher/events/create
    if (path === '/teacher/events') {
      return (
        location.pathname === '/teacher/events' ||
        (location.pathname.startsWith('/teacher/events/') &&
          !location.pathname.startsWith('/teacher/events/create'))
      );
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="bg-gradient-to-r from-purple-50 to-indigo-50 shadow-lg border-b border-purple-100 backdrop-blur-sm sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          {/* Breadcrumb */}
          <div className="flex items-center space-x-3 text-sm">
            <Link
              to="/"
              className="text-gray-600 hover:text-purple-700 transition-colors duration-300 transform hover:scale-110"
            >
              <FaHome className="w-5 h-5" />
            </Link>
            <span className="text-gray-400 text-lg">/</span>
            <span className="text-purple-700 font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent text-lg">
              Teacher Portal
            </span>
          </div>

          {/* Navigation Links */}
          <div className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 transform hover:scale-105 ${isActive(item.path)
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25 border border-purple-500'
                  : 'text-gray-700 hover:text-purple-700 hover:bg-white/60 hover:shadow-md backdrop-blur-sm border border-transparent hover:border-purple-200'
                  }`}
              >
                <div
                  className={`transition-colors duration-300 ${isActive(item.path) ? 'text-purple-100' : 'text-purple-600'
                    }`}
                >
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
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${isActive(item.path)
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                  : 'text-gray-700 hover:text-purple-700 hover:bg-white/60'
                  }`}
              >
                {item.icon}
              </Link>
            ))}
          </div>

          {/* Mobile Dropdown */}
          <div className="md:hidden">
            <select
              value={location.pathname}
              onChange={(e) => (window.location.href = e.target.value)}
              className="block w-full px-4 py-3 border border-purple-300 rounded-xl shadow-md bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm font-semibold text-gray-700 transition-all duration-300"
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

export default TeacherNavigation;
