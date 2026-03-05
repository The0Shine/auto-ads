// =============================================================================
// Auto-Ads Platform — Constants
// =============================================================================

// ─── Platform Constants ──────────────────────────────────────────────────────

export const PLATFORMS = ['facebook', 'google', 'tiktok'] as const;

// ─── Campaign Objectives Mapping ─────────────────────────────────────────────

export const OBJECTIVE_MAPPING = {
  facebook: {
    AWARENESS: 'OUTCOME_AWARENESS',
    TRAFFIC: 'OUTCOME_TRAFFIC',
    ENGAGEMENT: 'OUTCOME_ENGAGEMENT',
    LEADS: 'OUTCOME_LEADS',
    CONVERSIONS: 'OUTCOME_SALES',
    SALES: 'OUTCOME_SALES',
  },
  google: {
    AWARENESS: 'BRAND_AWARENESS_AND_REACH',
    TRAFFIC: 'WEBSITE_TRAFFIC',
    ENGAGEMENT: 'PRODUCT_AND_BRAND_CONSIDERATION',
    LEADS: 'LEAD_GENERATION',
    CONVERSIONS: 'SALES',
    SALES: 'SALES',
  },
  tiktok: {
    AWARENESS: 'REACH',
    TRAFFIC: 'TRAFFIC',
    ENGAGEMENT: 'VIDEO_VIEWS',
    LEADS: 'LEAD_GENERATION',
    CONVERSIONS: 'CONVERSIONS',
    SALES: 'PRODUCT_SALES',
  },
} as const;

// ─── Default Optimization Thresholds ─────────────────────────────────────────

export const DEFAULT_THRESHOLDS = {
  /** Multiplier on target CPA — auto-pause if actual CPA exceeds this */
  maxCpaMultiplier: 3.0,
  /** Minimum CTR for search ads */
  minCtrSearch: 0.005,
  /** Minimum CTR for social ads */
  minCtrSocial: 0.008,
  /** Minimum ROAS to keep running */
  minRoas: 1.0,
  /** Max % of daily budget spent with 0 conversions → flag/pause */
  maxSpendWithoutConversion: 0.3,
  /** Minimum impressions before evaluation */
  minImpressionsForEval: 1000,
  /** Max frequency before audience fatigue warning */
  maxFrequency: 3.0,
  /** Max budget shift per reallocation (±20%) */
  maxBudgetShiftPercent: 0.2,
} as const;

// ─── Service Ports ───────────────────────────────────────────────────────────

export const SERVICE_PORTS = {
  API_GATEWAY: 3000,
  AUTH_SERVICE: 3001,
  USER_SERVICE: 3002,
  CAMPAIGN_SERVICE: 3003,
  ANALYTICS_SERVICE: 3004,
  FACEBOOK_ADAPTER: 3010,
  GOOGLE_ADAPTER: 3011,
  TIKTOK_ADAPTER: 3012,
  AI_OPTIMIZER: 8000,
} as const;

// ─── Kafka Topics ────────────────────────────────────────────────────────────

export const KAFKA_TOPICS = {
  CAMPAIGN_CREATED: 'campaign.created',
  CAMPAIGN_UPDATED: 'campaign.updated',
  CAMPAIGN_DELETED: 'campaign.deleted',
  CAMPAIGN_STATUS_CHANGED: 'campaign.status.changed',
  CAMPAIGN_DISTRIBUTE: 'campaign.distribute',
  ADSET_CREATED: 'adset.created',
  ADSET_UPDATED: 'adset.updated',
  ADSET_STATUS_CHANGED: 'adset.status.changed',
  METRICS_COLLECTED: 'metrics.collected',
  METRICS_AGGREGATED: 'metrics.aggregated',
  OPTIMIZATION_ACTION: 'optimization.action',
  OPTIMIZATION_RESULT: 'optimization.result',
  NOTIFICATION_SEND: 'notification.send',
  PLATFORM_SYNC_REQUEST: 'platform.sync.request',
  PLATFORM_SYNC_RESULT: 'platform.sync.result',
} as const;

// ─── Cache Keys ──────────────────────────────────────────────────────────────

export const CACHE_KEYS = {
  campaign: (id: string) => `campaign:${id}`,
  campaignList: (workspaceId: string) => `campaigns:${workspaceId}`,
  adSetList: (campaignId: string) => `adsets:${campaignId}`,
  metrics: (entityId: string, period: string) => `metrics:${entityId}:${period}`,
  platformToken: (userId: string, platform: string) => `token:${userId}:${platform}`,
  rateLimitKey: (userId: string) => `ratelimit:${userId}`,
} as const;

// ─── Cache TTLs (seconds) ────────────────────────────────────────────────────

export const CACHE_TTL = {
  SHORT: 60,          // 1 minute
  MEDIUM: 300,        // 5 minutes
  LONG: 3600,         // 1 hour
  DAY: 86400,         // 1 day
} as const;
