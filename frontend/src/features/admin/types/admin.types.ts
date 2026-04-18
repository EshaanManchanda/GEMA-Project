export interface AdminTableColumn<T = any> {
  header: string;
  accessor?: keyof T;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

export interface AdminPagination {
  currentPage: number;
  totalPages: number;
  total: number;
}

export interface AdminFilterOption {
  label: string;
  value: string;
}

export interface AdminNavItem {
  icon: React.ReactNode;
  label: string;
  path: string;
  permission?: string;
  children?: AdminNavItem[];
}

export interface AdminStatData {
  label: string;
  value: string | number;
  change?: { value: number; isPositive: boolean };
  icon: React.ReactNode;
  color?: string;
}

export interface AdminAction {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'warning' | 'success';
  disabled?: boolean;
}
