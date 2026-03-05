// =============================================================================
// Auto-Ads Platform — Kafka Event Payloads
// =============================================================================

import { Platform, CampaignStatus, AdSetStatus, OptimizationAction } from './types';

// ─── Campaign Events ─────────────────────────────────────────────────────────

export interface CampaignCreatedEvent {
  campaignId: string;
  workspaceId: string;
  name: string;
  objective: string;
  platforms: Platform[];
  budget: { total?: number; daily?: number; currency: string };
  targeting: Record<string, any>;
  createdBy: string;
  timestamp: string;
}

export interface CampaignUpdatedEvent {
  campaignId: string;
  workspaceId: string;
  changes: Record<string, { old: any; new: any }>;
  updatedBy: string;
  timestamp: string;
}

export interface CampaignStatusChangedEvent {
  campaignId: string;
  workspaceId: string;
  platform?: Platform;
  oldStatus: CampaignStatus;
  newStatus: CampaignStatus;
  reason?: string;
  timestamp: string;
}

export interface CampaignDistributeEvent {
  campaignId: string;
  workspaceId: string;
  platforms: Platform[];
  adSets: Array<{
    id: string;
    name: string;
    budget: number;
    targeting: Record<string, any>;
    ads: Array<{
      id: string;
      creativeId: string;
    }>;
  }>;
  timestamp: string;
}

// ─── Ad Set Events ───────────────────────────────────────────────────────────

export interface AdSetStatusChangedEvent {
  adSetId: string;
  campaignId: string;
  workspaceId: string;
  platform?: Platform;
  oldStatus: AdSetStatus;
  newStatus: AdSetStatus;
  reason?: string;
  autoTriggered: boolean;
  timestamp: string;
}

// ─── Metrics Events ──────────────────────────────────────────────────────────

export interface MetricsCollectedEvent {
  workspaceId: string;
  campaignId: string;
  adSetId?: string;
  adId?: string;
  platform: Platform;
  metrics: {
    impressions: number;
    clicks: number;
    conversions: number;
    spend: number;
    revenue: number;
    reach: number;
    frequency: number;
  };
  periodStart: string;
  periodEnd: string;
  timestamp: string;
}

export interface MetricsAggregatedEvent {
  workspaceId: string;
  campaignId: string;
  adSetId?: string;
  platform: Platform;
  aggregation: 'hourly' | 'daily';
  metrics: {
    impressions: number;
    clicks: number;
    conversions: number;
    spend: number;
    revenue: number;
    ctr: number;
    cpc: number;
    cpa: number;
    roas: number;
  };
  period: string;
  timestamp: string;
}

// ─── Optimization Events ─────────────────────────────────────────────────────

export interface OptimizationActionEvent {
  workspaceId: string;
  campaignId: string;
  adSetId?: string;
  action: OptimizationAction;
  reason: string;
  confidence: number;
  metricsSnapshot: Record<string, any>;
  suggestedChanges: Record<string, any>;
  autoExecute: boolean;
  timestamp: string;
}

// ─── Notification Events ─────────────────────────────────────────────────────

export interface NotificationSendEvent {
  userId: string;
  workspaceId: string;
  type: 'auto_pause' | 'budget_alert' | 'campaign_status' | 'daily_report' | 'optimization';
  title: string;
  message: string;
  data?: Record<string, any>;
  channels: ('email' | 'in_app' | 'slack')[];
  priority: 'low' | 'medium' | 'high';
  timestamp: string;
}

// ─── Platform Sync Events ────────────────────────────────────────────────────

export interface PlatformSyncRequestEvent {
  entityType: 'CAMPAIGN' | 'AD_SET' | 'AD';
  internalId: string;
  platform: Platform;
  action: 'CREATE' | 'UPDATE' | 'PAUSE' | 'RESUME' | 'DELETE';
  data: Record<string, any>;
  timestamp: string;
}

export interface PlatformSyncResultEvent {
  entityType: 'CAMPAIGN' | 'AD_SET' | 'AD';
  internalId: string;
  platform: Platform;
  platformId?: string;
  success: boolean;
  error?: string;
  timestamp: string;
}
