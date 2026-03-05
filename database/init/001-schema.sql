-- =============================================================================
-- Auto-Ads Platform — PostgreSQL Init Script
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Users & Auth ────────────────────────────────────────────────────────────

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255),
    avatar_url      TEXT,
    role            VARCHAR(30) DEFAULT 'user',     -- admin, user
    status          VARCHAR(30) DEFAULT 'active',   -- active, suspended, deleted
    email_verified  BOOLEAN DEFAULT FALSE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE workspaces (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,
    owner_id        UUID NOT NULL REFERENCES users(id),
    plan            VARCHAR(30) DEFAULT 'free',     -- free, pro, enterprise
    settings        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE workspace_members (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role            VARCHAR(30) DEFAULT 'member',   -- owner, admin, member, viewer
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, user_id)
);

-- ─── OAuth / Platform Connections ────────────────────────────────────────────

CREATE TABLE platform_connections (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    platform        VARCHAR(20) NOT NULL,           -- facebook, google, tiktok
    platform_user_id VARCHAR(255),
    access_token    TEXT NOT NULL,
    refresh_token   TEXT,
    token_expires_at TIMESTAMPTZ,
    ad_accounts     JSONB DEFAULT '[]',             -- platform ad account IDs
    scopes          JSONB DEFAULT '[]',
    status          VARCHAR(30) DEFAULT 'active',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, platform, workspace_id)
);

-- ─── Campaigns ───────────────────────────────────────────────────────────────

CREATE TABLE campaigns (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id),
    created_by      UUID NOT NULL REFERENCES users(id),
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    objective       VARCHAR(50) NOT NULL,           -- AWARENESS, TRAFFIC, ENGAGEMENT, LEADS, CONVERSIONS, SALES
    status          VARCHAR(30) DEFAULT 'DRAFT',    -- DRAFT, REVIEW, DISTRIBUTING, ACTIVE, PARTIALLY_ACTIVE, PAUSED, COMPLETED, ARCHIVED
    total_budget    DECIMAL(12,2),
    daily_budget    DECIMAL(12,2),
    currency        VARCHAR(3) DEFAULT 'USD',
    start_date      TIMESTAMPTZ,
    end_date        TIMESTAMPTZ,
    platforms       JSONB NOT NULL DEFAULT '[]',    -- ["facebook","google","tiktok"]
    targeting       JSONB DEFAULT '{}',             -- unified targeting config
    settings        JSONB DEFAULT '{}',             -- platform-specific overrides
    total_spend     DECIMAL(12,2) DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_campaigns_workspace ON campaigns(workspace_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_dates ON campaigns(start_date, end_date);

-- ─── Ad Sets ─────────────────────────────────────────────────────────────────

CREATE TABLE ad_sets (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id     UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    status          VARCHAR(30) DEFAULT 'ACTIVE',
    budget          DECIMAL(12,2),
    budget_type     VARCHAR(20) DEFAULT 'DAILY',    -- DAILY, LIFETIME
    bid_strategy    VARCHAR(50),                    -- LOWEST_COST, COST_CAP, BID_CAP, TARGET_CPA, MAXIMIZE_CONVERSIONS
    bid_amount      DECIMAL(12,2),
    targeting       JSONB DEFAULT '{}',
    placements      JSONB DEFAULT '{}',
    schedule        JSONB DEFAULT '{}',
    optimization_goal VARCHAR(50),
    auto_paused     BOOLEAN DEFAULT FALSE,
    auto_pause_reason TEXT,
    performance_score DECIMAL(5,2),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ad_sets_campaign ON ad_sets(campaign_id);
CREATE INDEX idx_ad_sets_status ON ad_sets(status);

-- ─── Creatives ───────────────────────────────────────────────────────────────

CREATE TABLE creatives (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id),
    created_by      UUID NOT NULL REFERENCES users(id),
    name            VARCHAR(255),
    type            VARCHAR(30) NOT NULL,           -- IMAGE, VIDEO, CAROUSEL, COLLECTION
    headline        TEXT,
    body            TEXT,
    call_to_action  VARCHAR(50),
    destination_url TEXT,
    media_urls      JSONB DEFAULT '[]',
    thumbnail_url   TEXT,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Ads ─────────────────────────────────────────────────────────────────────

CREATE TABLE ads (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ad_set_id       UUID NOT NULL REFERENCES ad_sets(id) ON DELETE CASCADE,
    creative_id     UUID NOT NULL REFERENCES creatives(id),
    name            VARCHAR(255),
    status          VARCHAR(30) DEFAULT 'ACTIVE',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ads_ad_set ON ads(ad_set_id);

-- ─── Platform Mappings ───────────────────────────────────────────────────────

CREATE TABLE platform_mappings (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type     VARCHAR(30) NOT NULL,           -- CAMPAIGN, AD_SET, AD, CREATIVE
    internal_id     UUID NOT NULL,
    platform        VARCHAR(20) NOT NULL,           -- facebook, google, tiktok
    platform_id     VARCHAR(255) NOT NULL,
    platform_status VARCHAR(50),
    platform_data   JSONB DEFAULT '{}',             -- extra platform-specific data
    sync_status     VARCHAR(30) DEFAULT 'PENDING',  -- SYNCED, PENDING, SYNCING, ERROR
    last_synced_at  TIMESTAMPTZ,
    error_message   TEXT,
    retry_count     INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(entity_type, internal_id, platform)
);

CREATE INDEX idx_platform_mappings_internal ON platform_mappings(entity_type, internal_id);
CREATE INDEX idx_platform_mappings_platform ON platform_mappings(platform, platform_id);
CREATE INDEX idx_platform_mappings_sync ON platform_mappings(sync_status);

-- ─── Optimization Logs ───────────────────────────────────────────────────────

CREATE TABLE optimization_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id),
    campaign_id     UUID NOT NULL REFERENCES campaigns(id),
    ad_set_id       UUID REFERENCES ad_sets(id),
    action_type     VARCHAR(50) NOT NULL,           -- AUTO_PAUSE, BUDGET_SHIFT, REACTIVATE, ALERT
    reason          TEXT,
    metrics_snapshot JSONB DEFAULT '{}',
    old_value       JSONB DEFAULT '{}',
    new_value       JSONB DEFAULT '{}',
    status          VARCHAR(30) DEFAULT 'EXECUTED', -- PENDING, EXECUTED, REVERTED, REJECTED
    approved_by     UUID REFERENCES users(id),      -- NULL = auto
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_optimization_logs_campaign ON optimization_logs(campaign_id);

-- ─── Notification Settings ───────────────────────────────────────────────────

CREATE TABLE notification_preferences (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel         VARCHAR(30) NOT NULL,           -- email, in_app, slack
    event_type      VARCHAR(50) NOT NULL,           -- auto_pause, budget_alert, campaign_status, daily_report
    enabled         BOOLEAN DEFAULT TRUE,
    settings        JSONB DEFAULT '{}',
    UNIQUE(user_id, channel, event_type)
);

-- ─── Refresh Tokens ──────────────────────────────────────────────────────────

CREATE TABLE refresh_tokens (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token           VARCHAR(500) NOT NULL UNIQUE,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);
