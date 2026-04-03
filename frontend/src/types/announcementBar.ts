export interface AnnouncementBar {
  _id: string;
  message: string;
  link?: string;
  linkText?: string;
  icon?: string;
  backgroundColor: string;
  textColor: string;
  variant: 'info' | 'warning' | 'success' | 'error';
  displayOrder: number;
  status: 'active' | 'inactive' | 'scheduled';
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  targetPages: 'all' | 'specific';
  specificPages?: string[];
  excludePages?: string[];
  isDismissible: boolean;
  dismissalDuration?: number;
  impressions: number;
  clicks: number;
  dismissals: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAnnouncementBarData {
  message: string;
  link?: string;
  linkText?: string;
  icon?: string;
  backgroundColor: string;
  textColor: string;
  variant: 'info' | 'warning' | 'success' | 'error';
  displayOrder: number;
  status: 'active' | 'inactive' | 'scheduled';
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  targetPages: 'all' | 'specific';
  specificPages?: string[];
  excludePages?: string[];
  isDismissible: boolean;
  dismissalDuration?: number;
}

export interface UpdateAnnouncementBarData extends Partial<CreateAnnouncementBarData> {}

export interface AnnouncementBarListResponse {
  announcements: AnnouncementBar[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface AnnouncementBarFilters {
  status?: 'active' | 'inactive' | 'scheduled';
  search?: string;
  page?: number;
  limit?: number;
}
