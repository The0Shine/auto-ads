# =============================================================================
# AI Optimizer — Background Scheduler
# =============================================================================

import logging
from apscheduler.schedulers.background import BackgroundScheduler
from app.config import settings

logger = logging.getLogger(__name__)
scheduler = BackgroundScheduler()


def run_optimization_cycle():
    """Periodic job: analyze all active campaigns and optimize."""
    logger.info("🔄 Running optimization cycle...")
    # TODO: Fetch all active campaigns and run OptimizerService.analyze_campaign
    # This will be called every `optimization_interval_minutes`


def run_metrics_sync():
    """Periodic job: trigger metrics collection from all platform adapters."""
    logger.info("📊 Running metrics sync...")
    # TODO: Send Kafka events to trigger metrics collection from adapters


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
