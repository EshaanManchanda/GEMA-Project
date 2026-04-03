import React from 'react';
import { Edit, Trash2, ExternalLink, GripVertical, Power, Eye, MousePointer, X } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { AnnouncementBar } from '@/types/announcementBar';
import { format } from 'date-fns';

interface AnnouncementBarListProps {
  announcements: AnnouncementBar[];
  isLoading: boolean;
  onEdit: (announcement: AnnouncementBar) => void;
  onDelete: (announcementId: string) => void;
  onToggleActive: (announcement: AnnouncementBar) => void;
  onReorder: () => void;
}

const AnnouncementBarList: React.FC<AnnouncementBarListProps> = ({
  announcements,
  isLoading,
  onEdit,
  onDelete,
  onToggleActive
}) => {
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'default';
      case 'scheduled':
        return 'default';
      default:
        return 'default';
    }
  };

  const getVariantColor = (variant: string) => {
    switch (variant) {
      case 'info':
        return 'bg-blue-100 text-blue-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (announcements.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-12">
        <div className="text-center">
          <div className="inline-block p-4 bg-gray-100 rounded-full mb-4">
            <svg
              className="w-12 h-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No announcements found</h3>
          <p className="text-gray-600 mb-6">
            Get started by creating your first announcement bar
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Order
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Message
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Variant
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Link
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Schedule
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Analytics
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {announcements.map((announcement) => (
              <tr key={announcement._id} className="hover:bg-gray-50 transition-colors">
                {/* Order */}
                <td className="px-3 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
                    <span className="text-sm font-medium text-gray-900">
                      {announcement.displayOrder}
                    </span>
                  </div>
                </td>

                {/* Message */}
                <td className="px-6 py-4">
                  <div className="max-w-xs">
                    <div className="text-sm font-medium text-gray-900">
                      {announcement.message.length > 60
                        ? `${announcement.message.substring(0, 60)}...`
                        : announcement.message}
                    </div>
                    {announcement.linkText && (
                      <div className="text-xs text-blue-600 mt-1">
                        CTA: {announcement.linkText}
                      </div>
                    )}
                    {announcement.icon && (
                      <div className="text-xs text-gray-500 mt-1">
                        Icon: {announcement.icon}
                      </div>
                    )}
                  </div>
                </td>

                {/* Variant */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getVariantColor(announcement.variant)}`}>
                    {announcement.variant}
                  </span>
                </td>

                {/* Link */}
                <td className="px-6 py-4 whitespace-nowrap">
                  {announcement.link ? (
                    <a
                      href={announcement.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <span className="truncate max-w-[100px]">{announcement.link}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-sm text-gray-400">No link</span>
                  )}
                </td>

                {/* Status */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col gap-1">
                    <Badge variant={getStatusBadgeVariant(announcement.status)}>
                      {announcement.status}
                    </Badge>
                    {!announcement.isActive && (
                      <Badge variant="warning" className="text-xs">
                        Disabled
                      </Badge>
                    )}
                  </div>
                </td>

                {/* Schedule */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-xs text-gray-500">
                    {announcement.startDate && (
                      <div>
                        Start: {format(new Date(announcement.startDate), 'MMM dd, yyyy')}
                      </div>
                    )}
                    {announcement.endDate && (
                      <div>
                        End: {format(new Date(announcement.endDate), 'MMM dd, yyyy')}
                      </div>
                    )}
                    {!announcement.startDate && !announcement.endDate && (
                      <span className="text-gray-400">Always</span>
                    )}
                  </div>
                </td>

                {/* Analytics */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-xs text-gray-600 space-y-1">
                    <div className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      <span>{announcement.impressions.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MousePointer className="w-3 h-3" />
                      <span>{announcement.clicks.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <X className="w-3 h-3" />
                      <span>{announcement.dismissals.toLocaleString()}</span>
                    </div>
                  </div>
                </td>

                {/* Actions */}
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onToggleActive(announcement)}
                      className="flex items-center gap-1"
                      title={announcement.isActive ? 'Deactivate' : 'Activate'}
                    >
                      <Power className={`w-4 h-4 ${announcement.isActive ? 'text-green-600' : 'text-gray-400'}`} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(announcement)}
                      className="flex items-center gap-1"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => onDelete(announcement._id)}
                      className="flex items-center gap-1"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AnnouncementBarList;
