// =============================================================================
// Auto-Ads Platform — Shared Types
// =============================================================================

// ─── User Types ──────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type UserRole = 'admin' | 'user';
export type UserStatus = 'active' | 'suspended' | 'deleted';

// ─── Workspace Types ─────────────────────────────────────────────────────────

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  plan: WorkspacePlan;
  settings: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export type WorkspacePlan = 'free' | 'pro' | 'enterprise';
export type WorkspaceMemberRole = 'owner' | 'admin' | 'member' | 'viewer';

// ─── Platform Types ──────────────────────────────────────────────────────────

export type Platform = 'facebook' | 'google' | 'tiktok';

export interface PlatformConnection {
  id: string;
  userId: string;
  workspaceId: string;
  platform: Platform;
  platformUserId?: string;
  adAccounts: string[];
  status: 'active' | 'expired' | 'revoked';
  tokenExpiresAt?: Date;
}

// ─── Campaign Types ──────────────────────────────────────────────────────────

export interface Campaign {
  id: string;
  workspaceId: string;
  createdBy: string;
  name: string;
  description?: string;
  objective: CampaignObjective;
  status: CampaignStatus;
  totalBudget?: number;
  dailyBudget?: number;
  currency: string;
  startDate?: Date;
  endDate?: Date;
  platforms: Platform[];
  targeting: TargetingConfig;
  settings: Record<string, any>;
  totalSpend: number;
  createdAt: Date;
  updatedAt: Date;
}

export type CampaignObjective =
  | 'AWARENESS'
  | 'TRAFFIC'
  | 'ENGAGEMENT'
  | 'LEADS'
  | 'CONVERSIONS'
  | 'SALES';

export type CampaignStatus =
  | 'DRAFT'
  | 'REVIEW'
  | 'DISTRIBUTING'
  | 'ACTIVE'
  | 'PARTIALLY_ACTIVE'
  | 'PAUSED'
  | 'COMPLETED'
  | 'ARCHIVED';

// ─── Ad Set Types ────────────────────────────────────────────────────────────

export interface AdSet {
  id: string;
  campaignId: string;
  name: string;
  status: AdSetStatus;
  budget?: number;
  budgetType: 'DAILY' | 'LIFETIME';
  bidStrategy?: BidStrategy;
  bidAmount?: number;
  targeting: TargetingConfig;
  placements: PlacementConfig;
  schedule: ScheduleConfig;
  optimizationGoal?: string;
  autoPaused: boolean;
  autoPauseReason?: string;
  performanceScore?: number;
  createdAt: Date;
  updatedAt: Date;
}

export type AdSetStatus = 'ACTIVE' | 'PAUSED' | 'DELETED';

export type BidStrategy =
  | 'LOWEST_COST'
  | 'COST_CAP'
  | 'BID_CAP'
  | 'TARGET_CPA'
  | 'MAXIMIZE_CONVERSIONS'
  | 'TARGET_ROAS';

// ─── Targeting Config ────────────────────────────────────────────────────────

export interface TargetingConfig {
  ageMin?: number;
  ageMax?: number;
  genders?: ('male' | 'female' | 'all')[];
  locations?: LocationTarget[];
  languages?: string[];
  interests?: string[];
  behaviors?: string[];
  customAudiences?: string[];
  excludedAudiences?: string[];
  devicePlatforms?: string[];
}

export interface LocationTarget {
  type: 'country' | 'region' | 'city';
  key: string;
  name: string;
  radius?: number;
  radiusUnit?: 'km' | 'mile';
}

export interface PlacementConfig {
  type: 'AUTOMATIC' | 'MANUAL';
  platforms?: string[];
  positions?: string[];
}

export interface ScheduleConfig {
  startDate?: string;
  endDate?: string;
  dayparting?: DaypartingRule[];
}

export interface DaypartingRule {
  days: number[];        // 0=Sun, 1=Mon, ..., 6=Sat
  startHour: number;     // 0-23
  endHour: number;       // 0-23
  timezone: string;
}

// ─── Creative Types ──────────────────────────────────────────────────────────

export interface Creative {
  id: string;
  workspaceId: string;
  createdBy: string;
  name?: string;
  type: CreativeType;
  headline?: string;
  body?: string;
  callToAction?: string;
  destinationUrl?: string;
  mediaUrls: string[];
  thumbnailUrl?: string;
  metadata: Record<string, any>;
}

export type CreativeType = 'IMAGE' | 'VIDEO' | 'CAROUSEL' | 'COLLECTION';

// ─── Ad Types ────────────────────────────────────────────────────────────────

export interface Ad {
  id: string;
  adSetId: string;
  creativeId: string;
  name?: string;
  status: 'ACTIVE' | 'PAUSED' | 'DELETED';
}

// ─── Metrics Types ───────────────────────────────────────────────────────────

export interface AdMetrics {
  time: Date;
  workspaceId: string;
  campaignId: string;
  adSetId?: string;
  adId?: string;
  platform: Platform;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  revenue: number;
  reach: number;
  frequency: number;
  ctr: number;
  cpc: number;
  cpm: number;
  cpa: number;
  roas: number;
}

// ─── Platform Mapping Types ──────────────────────────────────────────────────

export interface PlatformMapping {
  id: string;
  entityType: 'CAMPAIGN' | 'AD_SET' | 'AD' | 'CREATIVE';
  internalId: string;
  platform: Platform;
  platformId: string;
  platformStatus?: string;
  syncStatus: SyncStatus;
  lastSyncedAt?: Date;
  errorMessage?: string;
  retryCount: number;
}

export type SyncStatus = 'SYNCED' | 'PENDING' | 'SYNCING' | 'ERROR';

// ─── Optimization Types ──────────────────────────────────────────────────────

export interface OptimizationLog {
  id: string;
  workspaceId: string;
  campaignId: string;
  adSetId?: string;
  actionType: OptimizationAction;
  reason: string;
  metricsSnapshot: Record<string, any>;
  oldValue: Record<string, any>;
  newValue: Record<string, any>;
  status: 'PENDING' | 'EXECUTED' | 'REVERTED' | 'REJECTED';
  approvedBy?: string;
  createdAt: Date;
}

export type OptimizationAction =
  | 'AUTO_PAUSE'
  | 'BUDGET_SHIFT'
  | 'REACTIVATE'
  | 'ALERT'
  | 'TARGETING_SUGGESTION';

// ─── API Response Types ──────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: PaginationMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
