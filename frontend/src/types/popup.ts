export interface PopupNotification {
  _id: string;
  title: string;
  message: string;
  image?: {
    _id: string;
    url: string;
    filename: string;
    width?: number;
    height?: number;
  };
  ctaText?: string;
  ctaLink?: string;
  dismissText?: string;
  targetAudience: 'all' | 'authenticated' | 'anonymous';
  targetRoles?: ('admin' | 'vendor' | 'customer' | 'employee')[];
  targetPages: 'all' | 'specific';
  specificPages?: string[];
  excludePages?: string[];
  trigger: 'pageLoad' | 'timeDelay' | 'scrollPercent' | 'exitIntent';
  triggerValue?: number;
  frequency: 'once' | 'session' | 'daily' | 'always';
  displayOrder: number;
  status: 'active' | 'inactive' | 'scheduled';
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  backgroundColor?: string;
  textColor?: string;
  overlayOpacity?: number;
  position?: 'center' | 'top' | 'bottom';
  size?: 'small' | 'medium' | 'large';
  impressions: number;
  clicks: number;
  dismissals: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePopupData {
  title: string;
  message: string;
  image?: string;
  ctaText?: string;
  ctaLink?: string;
  dismissText?: string;
  targetAudience: 'all' | 'authenticated' | 'anonymous';
  targetRoles?: string[];
  targetPages: 'all' | 'specific';
  specificPages?: string[];
  excludePages?: string[];
  trigger: 'pageLoad' | 'timeDelay' | 'scrollPercent' | 'exitIntent';
  triggerValue?: number;
  frequency: 'once' | 'session' | 'daily' | 'always';
  displayOrder: number;
  status: 'active' | 'inactive' | 'scheduled';
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  backgroundColor?: string;
  textColor?: string;
  overlayOpacity?: number;
  position?: 'center' | 'top' | 'bottom';
  size?: 'small' | 'medium' | 'large';
}

export interface UpdatePopupData extends Partial<CreatePopupData> {}

export interface PopupListResponse {
  popups: PopupNotification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface PopupFilters {
  status?: 'active' | 'inactive' | 'scheduled';
  search?: string;
  page?: number;
  limit?: number;
}
