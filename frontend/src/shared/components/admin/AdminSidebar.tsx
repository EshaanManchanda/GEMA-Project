import { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { getUserPermissions, hasPermission } from '@features/admin/types/permissions';
import {
  LayoutDashboard, Users, CalendarDays,
  DollarSign, BarChart3, FileText,
  Star, Settings, Download,
  ChevronDown, ChevronRight, Ticket, Layers,
  GraduationCap, Award, Flag,
} from 'lucide-react';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  path: string;
  permission?: string;
  children?: { label: string; path: string; permission?: string }[];
}

const allNavItems: NavItem[] = [
  { icon: <LayoutDashboard className="h-5 w-5" />, label: 'Dashboard', path: '/admin' },
  {
    icon: <Users className="h-5 w-5" />, label: 'People', path: '/admin', permission: 'platform:users_manage',
    children: [
      { label: 'Users', path: '/admin/users', permission: 'platform:users_manage' },
      { label: 'Vendors', path: '/admin/vendors', permission: 'vendor:approve' },
      { label: 'Teachers', path: '/admin/teachers', permission: 'event:read' },
      { label: 'Students', path: '/admin/students', permission: 'student:read' },
      { label: 'Schools', path: '/admin/schools', permission: 'school:approve' },
      { label: 'Employees', path: '/admin/employees' },
    ],
  },
  {
    icon: <CalendarDays className="h-5 w-5" />, label: 'Events', path: '/admin', permission: 'event:read',
    children: [
      { label: 'All Events', path: '/admin/events', permission: 'event:read' },
      { label: 'Teaching Events', path: '/admin/teaching-events', permission: 'event:read' },
      { label: 'Collections', path: '/admin/collections' },
      { label: 'Calendar', path: '/admin/calendar', permission: 'event:read' },
    ],
  },
  {
    icon: <DollarSign className="h-5 w-5" />, label: 'Finance', path: '/admin', permission: 'revenue:read',
    children: [
      { label: 'Orders', path: '/admin/orders', permission: 'booking:read' },
      { label: 'Payouts', path: '/admin/payouts', permission: 'payout:read' },
      { label: 'Commissions', path: '/admin/commissions', permission: 'commission:read' },
      { label: 'Coupons', path: '/admin/coupons' },
    ],
  },
  {
    icon: <GraduationCap className="h-5 w-5" />, label: 'LMS', path: '/admin', permission: 'course:read',
    children: [
      { label: 'Courses', path: '/admin/lms/courses', permission: 'course:read' },
    ],
  },
  {
    icon: <Award className="h-5 w-5" />, label: 'Certificates', path: '/admin/certificates', permission: 'certificate:read',
  },
  {
    icon: <FileText className="h-5 w-5" />, label: 'Content', path: '/admin', permission: 'blog:read',
    children: [
      { label: 'Blogs', path: '/admin/blogs', permission: 'blog:read' },
      { label: 'Blog Categories', path: '/admin/blog-categories', permission: 'blog:categories_manage' },
      { label: 'Media', path: '/admin/media', permission: 'media:read' },
      { label: 'Banners', path: '/admin/banners', permission: 'banners:manage' },
      { label: 'Popups', path: '/admin/popups', permission: 'popups:manage' },
      { label: 'Announcements', path: '/admin/announcements', permission: 'announcements:manage' },
      { label: 'Reels', path: '/admin/reels', permission: 'reels:manage' },
      { label: 'SEO', path: '/admin/seo', permission: 'seo_content:manage' },
    ],
  },
  { icon: <Star className="h-5 w-5" />, label: 'Reviews', path: '/admin/reviews', permission: 'review:moderate' },
  { icon: <Flag className="h-5 w-5" />, label: 'Complaints', path: '/admin/complaints', permission: 'complaint:manage' },
  { icon: <BarChart3 className="h-5 w-5" />, label: 'Analytics', path: '/admin/analytics', permission: 'analytics:read' },
  { icon: <Ticket className="h-5 w-5" />, label: 'Categories', path: '/admin/categories' },
  { icon: <Layers className="h-5 w-5" />, label: 'Partnerships', path: '/admin/partnerships' },
  { icon: <Download className="h-5 w-5" />, label: 'Bulk Import', path: '/admin/bulk-import' },
  { icon: <Settings className="h-5 w-5" />, label: 'Settings', path: '/admin/settings', permission: 'settings:manage' },
];

export function AdminSidebar({ collapsed = false, userRole }: { collapsed?: boolean; userRole?: string }) {
  const location = useLocation();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ People: true });
  const permissions = useMemo(() => getUserPermissions(userRole), [userRole]);

  const toggleSection = (label: string) => {
    setExpandedSections(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  const filterItems = (items: NavItem[]): NavItem[] => {
    return items.filter(item => {
      if (!item.permission) return true;
      if (hasPermission(permissions, item.permission)) return true;
      if (item.children) {
        const visibleChildren = item.children.filter(child => !child.permission || hasPermission(permissions, child.permission));
        return visibleChildren.length > 0;
      }
      return false;
    }).map(item => {
      if (item.children) {
        return {
          ...item,
          children: item.children.filter(child => !child.permission || hasPermission(permissions, child.permission)),
        };
      }
      return item;
    });
  };

  const navItems = useMemo(() => filterItems(allNavItems), [permissions]);

  return (
    <aside className={cn(
      'bg-gray-900 text-gray-300 h-screen overflow-y-auto transition-all duration-300 flex-shrink-0',
      collapsed ? 'w-16' : 'w-64',
    )}>
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-gray-800">
        <Link to="/admin" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">G</span>
          </div>
          {!collapsed && <span className="text-white font-semibold">GEMA Admin</span>}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="p-3 space-y-1">
        {navItems.map((item) => (
          <div key={item.label}>
            {item.children ? (
              <>
                <button
                  onClick={() => toggleSection(item.label)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-gray-800 transition-colors',
                    collapsed && 'justify-center',
                  )}
                >
                  {item.icon}
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      {expandedSections[item.label] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </>
                  )}
                </button>
                {!collapsed && expandedSections[item.label] && (
                  <div className="ml-8 mt-1 space-y-1">
                    {item.children.map((child) => (
                      <Link
                        key={child.path}
                        to={child.path}
                        className={cn(
                          'block px-3 py-1.5 rounded-md text-sm hover:bg-gray-800 transition-colors',
                          isActive(child.path) ? 'bg-gray-800 text-white' : 'text-gray-400',
                        )}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <Link
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-gray-800 transition-colors',
                  isActive(item.path) ? 'bg-gray-800 text-white' : '',
                  collapsed && 'justify-center',
                )}
                title={collapsed ? item.label : undefined}
              >
                {item.icon}
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}
