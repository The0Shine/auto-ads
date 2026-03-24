-- =============================================================================
-- Auto-Ads Platform — TimescaleDB Init Script (Metrics)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS timescaledb;

-- ─── Ad Performance Metrics (Time-series) ────────────────────────────────────

CREATE TABLE ad_metrics (
    time            TIMESTAMPTZ NOT NULL,
    workspace_id    UUID NOT NULL,
    campaign_id     UUID NOT NULL,
    ad_set_id       UUID,
    ad_id           UUID,
    platform        VARCHAR(20) NOT NULL,       -- facebook, google, tiktok
    impressions     BIGINT DEFAULT 0,
    clicks          BIGINT DEFAULT 0,
    conversions     INTEGER DEFAULT 0,
    spend           DECIMAL(12,4) DEFAULT 0,
    revenue         DECIMAL(12,4) DEFAULT 0,
    reach           BIGINT DEFAULT 0,
    frequency       DECIMAL(6,2) DEFAULT 0,
    ctr             DECIMAL(8,6),               -- click-through rate
    cpc             DECIMAL(12,4),              -- cost per click
    cpm             DECIMAL(12,4),              -- cost per 1000 impressions
    cpa             DECIMAL(12,4),              -- cost per acquisition
    roas            DECIMAL(8,4),               -- return on ad spend
    video_views     BIGINT DEFAULT 0,
    video_view_rate DECIMAL(8,6),
    engagement_rate DECIMAL(8,6),
    bounce_rate     DECIMAL(8,6)
);

-- Convert to hypertable
SELECT create_hypertable('ad_metrics', 'time');

-- ─── Indexes for common queries ──────────────────────────────────────────────

CREATE INDEX idx_metrics_campaign_time ON ad_metrics (campaign_id, time DESC);
CREATE INDEX idx_metrics_adset_time ON ad_metrics (ad_set_id, time DESC);
CREATE INDEX idx_metrics_platform_time ON ad_metrics (platform, time DESC);
CREATE INDEX idx_metrics_workspace_time ON ad_metrics (workspace_id, time DESC);

-- ─── Continuous Aggregates ───────────────────────────────────────────────────

-- Hourly aggregation
CREATE MATERIALIZED VIEW metrics_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', time) AS bucket,
    workspace_id,
    campaign_id,
    ad_set_id,
    platform,
    SUM(impressions) AS impressions,
    SUM(clicks) AS clicks,
    SUM(conversions) AS conversions,
    SUM(spend) AS spend,
    SUM(revenue) AS revenue,
    SUM(reach) AS reach,
    CASE WHEN SUM(impressions) > 0
        THEN SUM(clicks)::DECIMAL / SUM(impressions)
        ELSE 0 END AS ctr,
    CASE WHEN SUM(clicks) > 0
        THEN SUM(spend) / SUM(clicks)
        ELSE 0 END AS cpc,
    CASE WHEN SUM(impressions) > 0
        THEN (SUM(spend) / SUM(impressions)) * 1000
        ELSE 0 END AS cpm,
    CASE WHEN SUM(conversions) > 0
        THEN SUM(spend) / SUM(conversions)
        ELSE 0 END AS cpa,
    CASE WHEN SUM(spend) > 0
        THEN SUM(revenue) / SUM(spend)
        ELSE 0 END AS roas
FROM ad_metrics
GROUP BY bucket, workspace_id, campaign_id, ad_set_id, platform
WITH NO DATA;

-- Daily aggregation
CREATE MATERIALIZED VIEW metrics_daily
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 day', time) AS bucket,
    workspace_id,
    campaign_id,
    ad_set_id,
    platform,
    SUM(impressions) AS impressions,
    SUM(clicks) AS clicks,
    SUM(conversions) AS conversions,
    SUM(spend) AS spend,
    SUM(revenue) AS revenue,
    SUM(reach) AS reach,
    CASE WHEN SUM(impressions) > 0
        THEN SUM(clicks)::DECIMAL / SUM(impressions)
        ELSE 0 END AS ctr,
    CASE WHEN SUM(clicks) > 0
        THEN SUM(spend) / SUM(clicks)
        ELSE 0 END AS cpc,
    CASE WHEN SUM(impressions) > 0
        THEN (SUM(spend) / SUM(impressions)) * 1000
        ELSE 0 END AS cpm,
    CASE WHEN SUM(conversions) > 0
        THEN SUM(spend) / SUM(conversions)
        ELSE 0 END AS cpa,
    CASE WHEN SUM(spend) > 0
        THEN SUM(revenue) / SUM(spend)
        ELSE 0 END AS roas
FROM ad_metrics
GROUP BY bucket, workspace_id, campaign_id, ad_set_id, platform
WITH NO DATA;

-- Refresh policies
SELECT add_continuous_aggregate_policy('metrics_hourly',
    start_offset => INTERVAL '3 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour');

SELECT add_continuous_aggregate_policy('metrics_daily',
    start_offset => INTERVAL '3 days',
    end_offset => INTERVAL '1 day',
    schedule_interval => INTERVAL '1 day');

-- Data retention: keep raw metrics for 90 days
SELECT add_retention_policy('ad_metrics', INTERVAL '90 days');

-- campaign_metrics removed: use ad_metrics (hypertable above) for all metrics.
-- ad_metrics supports workspace_id, ad_set_id, ad_id, platform dimensions
-- and pre-computed ctr, cpc, cpm, cpa, roas — consumed by AI Optimizer directly.

