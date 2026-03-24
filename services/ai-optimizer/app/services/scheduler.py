# =============================================================================
# AI Optimizer — Background Scheduler
# Runs optimization cycle every N minutes (default: 60)
# =============================================================================

import logging
import asyncio

from apscheduler.schedulers.background import BackgroundScheduler

from app.config import settings

logger = logging.getLogger(__name__)
scheduler = BackgroundScheduler()


def run_optimization_cycle():
    """
    Periodic job: fetch all ACTIVE campaigns and run AI analysis on each.
    Runs in a new event loop since APScheduler uses a background thread.
    """
    logger.info("🔄 Running AI optimization cycle...")

    from app.services.db import get_active_campaigns
    from app.services.optimizer import OptimizerService

    campaigns = get_active_campaigns()
    if not campaigns:
        logger.info("[Scheduler] No active campaigns to optimize")
        return

    logger.info(f"[Scheduler] Found {len(campaigns)} active campaign(s)")

    optimizer = OptimizerService()

    async def _run():
        for campaign in campaigns:
            campaign_id  = str(campaign['id'])
            workspace_id = str(campaign['workspace_id'])
            try:
                result = await optimizer.analyze_campaign(campaign_id, workspace_id)
                s = result.get('summary', {})
                logger.info(
                    f"[Scheduler] Campaign {campaign_id}: "
                    f"paused={s.get('paused', 0)} scaled={s.get('scaled', 0)} "
                    f"kept={s.get('kept', 0)} skipped={s.get('skipped', 0)}"
                )
            except Exception as e:
                logger.error(f"[Scheduler] Error analyzing campaign {campaign_id}: {e}")

    asyncio.run(_run())


def run_metrics_sync():
    """
    Periodic job: verify metrics are flowing into TimescaleDB.
    Logs a warning if no recent data found across all active campaigns.
    """
    logger.info("📊 Running metrics sync check...")

    from app.services.db import get_active_campaigns, get_metrics_for_ad_set, get_ad_sets_for_campaign

    campaigns = get_active_campaigns()
    total_adsets = 0
    adsets_with_data = 0

    for campaign in campaigns:
        ad_sets = get_ad_sets_for_campaign(str(campaign['id']))
        for ad_set in ad_sets:
            total_adsets += 1
            m = get_metrics_for_ad_set(str(ad_set['id']), days=1)
            if m and int(m.get('impressions') or 0) > 0:
                adsets_with_data += 1

    if total_adsets == 0:
        logger.info("[Scheduler] Metrics sync: no active ad sets")
    else:
        logger.info(
            f"[Scheduler] Metrics sync: {adsets_with_data}/{total_adsets} ad sets "
            f"have data in the last 24h"
        )
        if adsets_with_data == 0:
            logger.warning("[Scheduler] ⚠️ No metrics found for any active ad set in last 24h")


def start_scheduler():
    """Start the background scheduler with periodic jobs."""
    scheduler.add_job(
        run_optimization_cycle,
        "interval",
        minutes=settings.optimization_interval_minutes,
        id="optimization_cycle",
        replace_existing=True,
    )
    scheduler.add_job(
        run_metrics_sync,
        "interval",
        minutes=settings.metrics_sync_interval_minutes,
        id="metrics_sync",
        replace_existing=True,
    )
    scheduler.start()
    logger.info(
        f"⏰ Scheduler started: optimization every {settings.optimization_interval_minutes}min, "
        f"metrics sync every {settings.metrics_sync_interval_minutes}min"
    )


def stop_scheduler():
    """Gracefully stop the scheduler."""
    scheduler.shutdown()
    logger.info("⏰ Scheduler stopped")
