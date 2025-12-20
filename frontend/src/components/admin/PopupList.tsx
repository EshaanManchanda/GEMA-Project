import React from 'react';
import { Edit, Trash2, Power, Eye, MousePointer, X, Image as ImageIcon } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { PopupNotification } from '@/types/popup';
import { format } from 'date-fns';

interface PopupListProps {
  popups: PopupNotification[];
  isLoading: boolean;
  onEdit: (popup: PopupNotification) => void;
  onDelete: (popupId: string) => void;
  onToggleActive: (popup: PopupNotification) => void;
  onReorder: () => void;
}

const PopupList: React.FC<PopupListProps> = ({
  popups,
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

  const getTriggerLabel = (trigger: string, value?: number) => {
    switch (trigger) {
      case 'pageLoad':
        return 'Page Load';
      case 'timeDelay':
        return `${value || 3}s Delay`;
      case 'scrollPercent':
        return `${value || 50}% Scroll`;
      case 'exitIntent':
        return 'Exit Intent';
      default:
        return trigger;
    }
  };

  const getFrequencyLabel = (frequency: string) => {
    const labels: Record<string, string> = {
      once: 'Once',
      session: 'Per Session',
      daily: 'Daily',
      always: 'Always'
    };
    return labels[frequency] || frequency;
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

  if (popups.length === 0) {
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
                d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No popups found</h3>
          <p className="text-gray-600 mb-6">
            Get started by creating your first popup notification
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Title & Preview
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Targeting
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Trigger
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Frequency
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
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
            {popups.map((popup) => (
              <tr key={popup._id} className="hover:bg-gray-50 transition-colors">
                {/* Title & Preview */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {popup.image ? (
                      <img
                        src={popup.image.url}
                        alt={popup.title}
                        className="w-12 h-12 object-cover rounded"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-medium text-gray-900">{popup.title}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {popup.message.substring(0, 50)}
                        {popup.message.length > 50 && '...'}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Targeting */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-xs text-gray-600 space-y-1">
                    <div className="capitalize">{popup.targetAudience}</div>
                    {popup.targetRoles && popup.targetRoles.length > 0 && (
                      <div className="text-blue-600">{popup.targetRoles.join(', ')}</div>
                    )}
                    <div className="text-gray-500">
                      {popup.targetPages === 'all' ? 'All pages' : `${popup.specificPages?.length || 0} pages`}
                    </div>
                  </div>
                </td>

                {/* Trigger */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    {getTriggerLabel(popup.trigger, popup.triggerValue)}
                  </span>
                </td>

                {/* Frequency */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {getFrequencyLabel(popup.frequency)}
                  </span>
                </td>

                {/* Status */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col gap-1">
                    <Badge variant={getStatusBadgeVariant(popup.status)}>
                      {popup.status}
                    </Badge>
                    {!popup.isActive && (
                      <Badge variant="warning" className="text-xs">
                        Disabled
                      </Badge>
                    )}
                  </div>
                </td>

                {/* Analytics */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-xs text-gray-600 space-y-1">
                    <div className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      <span>{popup.impressions.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MousePointer className="w-3 h-3" />
                      <span>{popup.clicks.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <X className="w-3 h-3" />
                      <span>{popup.dismissals.toLocaleString()}</span>
                    </div>
                  </div>
                </td>

                {/* Actions */}
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onToggleActive(popup)}
                      className="flex items-center gap-1"
                      title={popup.isActive ? 'Deactivate' : 'Activate'}
                    >
                      <Power className={`w-4 h-4 ${popup.isActive ? 'text-green-600' : 'text-gray-400'}`} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(popup)}
                      className="flex items-center gap-1"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => onDelete(popup._id)}
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

export default PopupList;
