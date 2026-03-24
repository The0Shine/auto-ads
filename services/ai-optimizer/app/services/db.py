# =============================================================================
# AI Optimizer — Database Layer
# PostgreSQL  : campaigns, ad_sets, optimization_logs  (main app DB)
# TimescaleDB : ad_metrics  (time-series metrics DB)
# =============================================================================

import logging
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional

import psycopg2
import psycopg2.extras

from app.config import settings

logger = logging.getLogger(__name__)


# ─── Connection helpers ───────────────────────────────────────────────────────

def _pg_conn():
    """Open a synchronous PostgreSQL connection (main DB)."""
    return psycopg2.connect(settings.database_url)


def _ts_conn():
    """Open a synchronous TimescaleDB connection (metrics DB)."""
    return psycopg2.connect(settings.timescale_url)


# ─── Campaigns ───────────────────────────────────────────────────────────────

def get_active_campaigns() -> List[Dict[str, Any]]:
    """Return all campaigns with status ACTIVE."""
    sql = """
        SELECT id, workspace_id, name, objective, daily_budget
        FROM campaigns
        WHERE status = 'ACTIVE'
    """
    try:
        with _pg_conn() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(sql)
                rows = cur.fetchall()
                return [dict(r) for r in rows]
    except Exception as e:
        logger.error(f"[DB] get_active_campaigns error: {e}")
        return []


# ─── Ad Sets ─────────────────────────────────────────────────────────────────

def get_ad_sets_for_campaign(campaign_id: str) -> List[Dict[str, Any]]:
    """Return all ad_sets for a campaign."""
    sql = """
        SELECT id, campaign_id, name, status, budget, targeting,
               auto_paused, performance_score
        FROM ad_sets
        WHERE campaign_id = %s
    """
    try:
        with _pg_conn() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(sql, (campaign_id,))
                rows = cur.fetchall()
                return [dict(r) for r in rows]
    except Exception as e:
        logger.error(f"[DB] get_ad_sets_for_campaign error: {e}")
        return []


def pause_ad_set(ad_set_id: str, reason: str):
    """Mark an ad_set as PAUSED with auto_paused=true."""
    sql = """
        UPDATE ad_sets
        SET status = 'PAUSED',
            auto_paused = TRUE,
            auto_pause_reason = %s,
            updated_at = NOW()
        WHERE id = %s
    """
    try:
        with _pg_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, (reason, ad_set_id))
            conn.commit()
        logger.info(f"[DB] Ad set {ad_set_id} paused: {reason}")
    except Exception as e:
        logger.error(f"[DB] pause_ad_set error: {e}")


def update_performance_score(ad_set_id: str, score: float):
    """Persist performance score on the ad_set row."""
    sql = """
        UPDATE ad_sets
        SET performance_score = %s, updated_at = NOW()
        WHERE id = %s
    """
    try:
        with _pg_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, (score, ad_set_id))
            conn.commit()
    except Exception as e:
        logger.error(f"[DB] update_performance_score error: {e}")


# ─── Metrics (TimescaleDB) ───────────────────────────────────────────────────

def get_metrics_for_ad_set(ad_set_id: str, days: int = 7) -> Optional[Dict[str, Any]]:
    """
    Aggregate ad_metrics for an ad_set over the last `days` days.
    Returns a single dict with summed impressions/clicks/conversions/spend/revenue
    and averaged frequency; returns None if no rows found.
    """
    sql = """
        SELECT
            SUM(impressions)  AS impressions,
            SUM(clicks)       AS clicks,
            SUM(conversions)  AS conversions,
            SUM(spend)        AS spend,
            SUM(revenue)      AS revenue,
            AVG(frequency)    AS frequency
        FROM ad_metrics
        WHERE ad_set_id = %s
          AND time >= NOW() - INTERVAL '%s days'
    """
    try:
        with _ts_conn() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(sql, (ad_set_id, days))
                row = cur.fetchone()
                if row is None or row['impressions'] is None:
                    return None
                return dict(row)
    except Exception as e:
        logger.error(f"[DB] get_metrics_for_ad_set error: {e}")
        return None


# ─── Optimization Logs ───────────────────────────────────────────────────────

def insert_optimization_log(
    workspace_id: str,
    campaign_id: str,
    ad_set_id: str,
    action_type: str,
    reason: str,
    metrics_snapshot: Dict[str, Any],
    old_value: Dict[str, Any],
    new_value: Dict[str, Any],
):
    sql = """
        INSERT INTO optimization_logs
            (workspace_id, campaign_id, ad_set_id, action_type,
             reason, metrics_snapshot, old_value, new_value, status)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'EXECUTED')
    """
    import json
    try:
        with _pg_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, (
                    workspace_id, campaign_id, ad_set_id, action_type,
                    reason,
                    json.dumps(metrics_snapshot),
                    json.dumps(old_value),
                    json.dumps(new_value),
                ))
            conn.commit()
        logger.info(f"[DB] Optimization log inserted: {action_type} for ad_set {ad_set_id}")
    except Exception as e:
        logger.error(f"[DB] insert_optimization_log error: {e}")


def get_optimization_logs(campaign_id: str, limit: int = 50) -> List[Dict[str, Any]]:
    sql = """
        SELECT id, ad_set_id, action_type, reason, metrics_snapshot,
               old_value, new_value, status, created_at
        FROM optimization_logs
        WHERE campaign_id = %s
        ORDER BY created_at DESC
        LIMIT %s
    """
    try:
        with _pg_conn() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(sql, (campaign_id, limit))
                rows = cur.fetchall()
                return [dict(r) for r in rows]
    except Exception as e:
        logger.error(f"[DB] get_optimization_logs error: {e}")
        return []
