// Registration system types

export enum RegistrationStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded'
}

export enum ReviewStatus {
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

// Alias for consistency with backend naming
export { ReviewStatus as RegistrationReviewStatus };

export type FieldType =
  | 'text'
  | 'email'
  | 'number'
  | 'tel'
  | 'textarea'
  | 'dropdown'
  | 'checkbox'
  | 'radio'
  | 'file'
  | 'date'
  | 'address'
  | 'website'
  | 'datetime'
  | 'time'
  | 'country'
  | 'city'
  | 'html'
  | 'pagebreak';

export interface FieldValidation {
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
}

export interface FormField {
  id: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required: boolean;
  validation?: FieldValidation;
  options?: string[]; // For dropdown, checkbox, radio
  accept?: string[]; // For file uploads
  maxFileSize?: number; // In bytes
  section?: string;
  order: number;
  helpText?: string;
}

export interface EmailNotifications {
  toVendor: boolean;
  toParticipant: boolean;
  customMessage?: string;
}

export interface RegistrationConfig {
  enabled: boolean;
  fields: FormField[];
  maxRegistrations?: number;
  registrationDeadline?: Date | string;
  requiresApproval: boolean;
  emailNotifications: EmailNotifications;
}

export interface FileData {
  _id?: string;
  fieldId: string;
  fieldLabel: string;
  originalName: string;
  url: string;
  publicId: string;
  size: number;
  mimetype: string;
  uploadedAt: Date | string;
}

export interface RegistrationData {
  fieldId: string;
  fieldLabel: string;
  fieldType: string;
  value: any; // string | number | string[] | boolean
}

export interface VendorReview {
  reviewedBy: string; // User ID
  reviewedAt: Date | string;
  status: ReviewStatus;
  remarks?: string;
}

export interface PaymentInfo {
  status: PaymentStatus;
  amount: number;
  currency: string;
  stripePaymentIntentId?: string;
  paidAt?: Date | string;
}

export interface RegistrationMetadata {
  ipAddress?: string;
  userAgent?: string;
  submittedAt?: Date | string;
  lastModifiedAt: Date | string;
}

export interface Registration {
  _id: string;
  eventId: string;
  userId: string;
  registrationData: RegistrationData[];
  files: FileData[];
  payment: PaymentInfo;
  status: RegistrationStatus;
  vendorReview?: VendorReview;
  metadata: RegistrationMetadata;
  createdAt: Date | string;
  updatedAt: Date | string;
  confirmationNumber?: string;
}

// API Request/Response types

export interface SubmitRegistrationRequest {
  eventId: string;
  registrationData: RegistrationData[];
  files?: File[];
  saveAsDraft?: boolean;
}

export interface SubmitRegistrationResponse {
  success: boolean;
  message: string;
  data: {
    registration: {
      id: string;
      confirmationNumber: string;
      status: RegistrationStatus;
      paymentStatus: PaymentStatus;
    };
    payment?: {
      paymentIntentId: string;
      clientSecret: string;
      amount: number;
      currency: string;
    };
  };
}

export interface ConfirmPaymentRequest {
  registrationId: string;
  paymentIntentId: string;
}

export interface ConfirmPaymentResponse {
  success: boolean;
  message: string;
  data: {
    registration: {
      id: string;
      confirmationNumber: string;
      status: RegistrationStatus;
      paymentStatus: PaymentStatus;
    };
  };
}

export interface GetRegistrationsParams {
  page?: number;
  limit?: number;
  status?: RegistrationStatus;
  search?: string;
}

export interface GetRegistrationsResponse {
  success: boolean;
  message?: string;
  data: {
    registrations: Registration[];
    pagination: {
      currentPage: number;
      totalPages: number;
      total: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
    stats?: {
      byStatus: Record<string, number>;
    };
  };
}

export interface UpdateRegistrationRequest {
  registrationId: string;
  registrationData: RegistrationData[];
  files?: File[];
}

export interface WithdrawRegistrationRequest {
  registrationId: string;
  reason?: string;
}

export interface ReviewRegistrationRequest {
  registrationId: string;
  status: 'approved' | 'rejected';
  remarks?: string;
}

export interface CreateOrUpdateConfigRequest {
  eventId: string;
  enabled?: boolean;
  fields?: FormField[];
  maxRegistrations?: number;
  registrationDeadline?: Date | string;
  requiresApproval?: boolean;
  emailNotifications?: EmailNotifications;
}

export interface GetConfigResponse {
  success: boolean;
  data: {
    eventTitle: string;
    registrationConfig: RegistrationConfig;
  };
}

export interface DuplicateConfigRequest {
  eventId: string;
  sourceEventId: string;
}

// Form Builder types for UI

export interface DraggedField {
  type: FieldType;
  label: string;
}

export interface FormBuilderState {
  fields: FormField[];
  selectedFieldId: string | null;
  isDirty: boolean;
}

// Registration form submission state

export interface RegistrationFormValues {
  [fieldId: string]: any;
}

export interface RegistrationFormErrors {
  [fieldId: string]: string;
}

// Dashboard filter/sort types

export type RegistrationSortField = 'createdAt' | 'status' | 'payment.amount';
export type SortOrder = 'asc' | 'desc';

export interface RegistrationFilters {
  status?: RegistrationStatus | RegistrationStatus[];
  dateFrom?: Date | string;
  dateTo?: Date | string;
  search?: string;
}

export interface RegistrationSort {
  field: RegistrationSortField;
  order: SortOrder;
}
