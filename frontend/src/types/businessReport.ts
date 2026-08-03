/**
 * Types for the Business Optimization / Report Center (KBOS Phase 1).
 * Mirrors backend/src/models/VendorBusinessSnapshot.ts and
 * backend/src/services/businessReport.service.ts — keep in sync.
 */

export type DimensionKey = 'listing' | 'sales' | 'marketing' | 'customer' | 'operations';
export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type SnapshotStatus = 'draft' | 'locked' | 'archived';
export type RecommendationSeverity = 'critical' | 'high' | 'medium' | 'low';
export type MetricSource = 'auto' | 'manual';
export type TrendDirection = 'up' | 'down' | 'flat';
export type BusinessReportFormat = 'pdf' | 'csv';
export type BusinessReportType = 'promotion' | 'health';

export interface VendorScores {
  overall: number | null;
  listing: number | null;
  sales: number | null;
  marketing: number | null;
  customer: number | null;
  operations: number | null;
}

export interface Confidence {
  level: ConfidenceLevel;
  dimensionsScored: number;
  dimensionsTotal: number;
}

export interface ProfileCompletionItem {
  key: string;
  label: string;
  done: boolean;
}

export interface ProfileCompletion {
  percent: number;
  items: ProfileCompletionItem[];
}

export interface MetricEntry {
  key: string;
  label: string;
  value: number | null;
  unit?: string;
  source: MetricSource;
  previousValue?: number;
  changePercent?: number;
  direction?: TrendDirection;
}

export interface ScoreTrend {
  previousValue?: number;
  changePercent?: number;
  direction?: TrendDirection;
}

export type ScoreTrends = Partial<Record<'overall' | DimensionKey, ScoreTrend>>;

export interface TopEventEntry {
  eventId: string;
  title: string;
  coverImage?: string;
  revenue: number;
  orders: number;
  tickets: number;
  viewsAllTime: number;
  averageRating?: number;
}

export interface Recommendation {
  code: string;
  title: string;
  severity: RecommendationSeverity;
  currentValue: string;
  targetValue: string;
  reason: string;
  estimatedImpact: 'high' | 'medium' | 'low';
  documentationUrl?: string;
}

export interface BusinessTask {
  code: string;
  label: string;
  done: boolean;
  completedAt?: string;
  completedBy?: string;
}

export interface SnapshotNotes {
  vendorVisible?: string;
  internal?: string;
}

export interface AuditTrailEntry {
  action: 'created' | 'regenerated' | 'edited' | 'locked' | 'reopened' | 'archived' | 'downloaded';
  actorId: string;
  at: string;
  detail?: string;
}

/** Live (unsaved) computation — GET /insights/vendors/:vendorId/health */
export interface VendorHealthResult {
  vendorId: string;
  period: string;
  periodStart: string;
  periodEnd: string;
  scores: VendorScores;
  confidence: Confidence;
  profileCompletion: ProfileCompletion;
  metrics: MetricEntry[];
  topEvents: TopEventEntry[];
  recommendations: Recommendation[];
  tasks: BusinessTask[];
}

/** Persisted snapshot document */
export interface VendorBusinessSnapshot {
  _id: string;
  vendorId: string;
  period: string;
  periodStart: string;
  periodEnd: string;
  scores: VendorScores;
  scoreTrends?: ScoreTrends;
  profileCompletion: ProfileCompletion;
  confidence: Confidence;
  metrics: MetricEntry[];
  topEvents?: TopEventEntry[];
  recommendations: Recommendation[];
  tasks: BusinessTask[];
  notes: SnapshotNotes;
  status: SnapshotStatus;
  rulesetVersion: string;
  reportVersion: string;
  /** Shape of this stored doc. Absent on legacy docs — backend infers 1, never fabricates "current". */
  schemaVersion?: number;
  generatedAt: string;
  generatedBy: 'manual' | 'scheduled';
  auditTrail?: AuditTrailEntry[];
}

export interface SnapshotHistoryEntry {
  period: string;
  periodStart: string;
  scores: VendorScores;
  confidence: Confidence;
  status: SnapshotStatus;
}

export type LifecycleSegment = 'inactive' | 'new' | 'top_performer' | 'declining' | 'growing' | 'steady';

export interface VendorSegments {
  lifecycle: LifecycleSegment;
  plan?: 'premium' | 'enterprise';
  all: string[];
}

export interface OverviewRow {
  vendorId: string;
  businessName: string;
  logo?: string;
  verificationStatus: string;
  hasSnapshot: boolean;
  snapshotId: string | null;
  snapshotStatus: SnapshotStatus | null;
  scores: VendorScores | null;
  confidence: Confidence | null;
  overallDelta: number | null;
  segments: VendorSegments;
}

export interface OverviewResponse {
  period: string;
  rows: OverviewRow[];
  pagination: { page: number; limit: number; total: number };
}

export interface SocialReach {
  instagram?: number;
  facebook?: number;
  tiktok?: number;
  youtube?: number;
}

export interface BannerPlacement {
  label: string;
  placement?: string;
  impressions?: number;
  clicks?: number;
  startDate?: string;
  endDate?: string;
}

export interface FeaturedListing {
  eventTitle: string;
  placement?: string;
  startDate?: string;
  endDate?: string;
}

export interface TopPost {
  platform: 'instagram' | 'facebook' | 'tiktok' | 'youtube' | 'other';
  url?: string;
  caption?: string;
  reach?: number;
  engagement?: number;
  postedAt?: string;
}

export type OfflineCampaignType =
  | 'billboard'
  | 'magazine'
  | 'tv'
  | 'radio'
  | 'influencer'
  | 'school_visit'
  | 'exhibition'
  | 'workshop'
  | 'other';

export interface OfflineCampaign {
  type: OfflineCampaignType;
  label: string;
  details?: string;
  cost?: number;
  startDate?: string;
  endDate?: string;
}

export interface VendorPromotionInput {
  vendorId: string;
  period: string;
  socialReach?: SocialReach;
  impressions?: number;
  bannerPlacements?: BannerPlacement[];
  homepagePromotion?: string;
  featuredListings?: FeaturedListing[];
  topPosts?: TopPost[];
  offlineCampaigns?: OfflineCampaign[];
  notes?: string;
}

/** Non-blocking data-quality flag on a saved promotion input — mirrors backend/src/services/promotionInputQuality.service.ts's InputWarning. */
export interface InputWarning {
  field: string;
  code: string;
  message: string;
  severity: 'warning';
  value?: number;
}

export interface SavePromotionInputResult {
  input: VendorPromotionInput;
  warnings: InputWarning[];
}

export interface OverviewFilters {
  page?: number;
  limit?: number;
  period?: string;
  sortBy?: DimensionKey | 'overall';
  filter?: 'low_performers' | 'declining' | 'inactive' | 'new' | 'growing' | 'top_performer' | 'steady';
}

export interface BulkGenerateJob {
  jobId: string;
  state: string;
  progress: number | object;
  returnValue?: unknown;
  failedReason?: string;
}
