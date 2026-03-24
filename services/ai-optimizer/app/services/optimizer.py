# =============================================================================
# AI Optimizer — Core Optimization Engine
# Uses trained XGBoost model to predict SCALE / KEEP / PAUSE per ad set,
# then applies the decision via campaign-service HTTP API.
# =============================================================================

import logging
from datetime import datetime
from typing import List, Dict, Any

from app.config import settings
from app.services.predictor import predictor
from app.services import db
from app.services import campaign_client

logger = logging.getLogger(__name__)


class OptimizerService:
    """
    Orchestrates per-campaign AI optimization:
      1. Load metrics from TimescaleDB
      2. Run XGBoost prediction per ad set
      3. Apply PAUSE action if confidence >= threshold
      4. Log every decision to optimization_logs
    """

    async def analyze_campaign(
        self, campaign_id: str, workspace_id: str, force: bool = False
    ) -> Dict[str, Any]:
        """
        Analyze all ad sets in a campaign and apply optimization recommendations.
        Returns a summary dict.
        """
        logger.info(f"[Optimizer] Analyzing campaign {campaign_id}")

        ad_sets = db.get_ad_sets_for_campaign(campaign_id)
        if not ad_sets:
            logger.info(f"[Optimizer] No ad sets found for campaign {campaign_id}")
            return self._empty_summary(campaign_id)

        summary = {"healthy": 0, "paused": 0, "kept": 0, "scaled": 0, "skipped": 0}
        recommendations = []

        for ad_set in ad_sets:
            ad_set_id = str(ad_set['id'])

            # Skip already auto-paused ad sets (unless forced)
            if ad_set.get('auto_paused') and not force:
                summary['skipped'] += 1
                continue

            # ── 1. Fetch aggregated metrics from TimescaleDB ──────────────
            metrics = db.get_metrics_for_ad_set(ad_set_id, days=7)
            if metrics is None:
                logger.debug(f"[Optimizer] No metrics for ad_set {ad_set_id}, skipping")
                summary['skipped'] += 1
                continue

            impressions = int(metrics.get('impressions') or 0)
            clicks      = int(metrics.get('clicks')      or 0)
            spend       = float(metrics.get('spend')     or 0.0)

            if impressions < settings.min_impressions_for_eval:
                logger.debug(f"[Optimizer] ad_set {ad_set_id}: not enough impressions ({impressions})")
                summary['skipped'] += 1
                continue

            # ── 2. Parse targeting for model features ─────────────────────
            targeting = ad_set.get('targeting') or {}
            age, gender, interest = predictor.parse_targeting(targeting)

            # ── 3. XGBoost prediction ─────────────────────────────────────
            action, confidence = predictor.predict(
                impressions=impressions,
                clicks=clicks,
                spent=spend,
                age=age,
                gender=gender,
                interest=interest,
            )

            logger.info(
                f"[Optimizer] ad_set {ad_set_id}: action={action} "
                f"confidence={confidence:.2f} impressions={impressions} spend={spend:.2f}"
            )

            metrics_snapshot = {
                "impressions": impressions,
                "clicks":      clicks,
                "spend":       spend,
                "conversions": int(metrics.get('conversions') or 0),
                "frequency":   float(metrics.get('frequency') or 0),
            }

            # ── 4. Apply action ───────────────────────────────────────────
            # confidence = P(conversion). PAUSE when low conversion prob (< 1-threshold).
            # e.g. threshold=0.70 → pause if confidence < 0.30
            pause_threshold = 1.0 - settings.ai_confidence_threshold
            if action == "PAUSE" and confidence <= pause_threshold:
                reason = (
                    f"AI auto-pause: confidence={confidence:.0%}, "
                    f"impressions={impressions}, spend={spend:.2f}"
                )
                db.pause_ad_set(ad_set_id, reason)
                await campaign_client.pause_campaign(campaign_id, reason)
                db.insert_optimization_log(
                    workspace_id=workspace_id,
                    campaign_id=campaign_id,
                    ad_set_id=ad_set_id,
                    action_type="AUTO_PAUSE",
                    reason=reason,
                    metrics_snapshot=metrics_snapshot,
                    old_value={"status": ad_set.get('status', 'ACTIVE')},
                    new_value={"status": "PAUSED", "auto_paused": True},
                )
                summary['paused'] += 1

            elif action == "SCALE":
                db.insert_optimization_log(
                    workspace_id=workspace_id,
                    campaign_id=campaign_id,
                    ad_set_id=ad_set_id,
                    action_type="ALERT",
                    reason=f"AI recommends SCALE: confidence={confidence:.0%}",
                    metrics_snapshot=metrics_snapshot,
                    old_value={},
                    new_value={"recommendation": "SCALE"},
                )
                summary['scaled'] += 1

            else:  # KEEP or PAUSE below threshold
                db.insert_optimization_log(
                    workspace_id=workspace_id,
                    campaign_id=campaign_id,
                    ad_set_id=ad_set_id,
                    action_type="ALERT",
                    reason=f"AI decision={action}: confidence={confidence:.0%} (below threshold, no action)",
                    metrics_snapshot=metrics_snapshot,
                    old_value={},
                    new_value={"recommendation": action},
                )
                summary['kept'] += 1

            pause_applied = action == "PAUSE" and confidence <= pause_threshold
            recommendations.append({
                "ad_set_id":  ad_set_id,
                "action":     action,
                "confidence": round(confidence, 4),
                "applied":    pause_applied,
            })

        return {
            "campaign_id":  campaign_id,
            "analyzed_at":  datetime.utcnow().isoformat(),
            "ad_sets_analyzed": len(ad_sets),
            "recommendations":  recommendations,
            "summary": {
                "total_ad_sets": len(ad_sets),
                **summary,
            },
        }

    async def get_history(self, campaign_id: str, limit: int = 50) -> List[Dict]:
        """Get optimization history for a campaign from optimization_logs table."""
        rows = db.get_optimization_logs(campaign_id, limit)
        # Convert datetime objects to ISO strings for JSON serialization
        for row in rows:
            if isinstance(row.get('created_at'), datetime):
                row['created_at'] = row['created_at'].isoformat()
        return rows

    async def get_performance_score(self, ad_set_id: str) -> Dict[str, Any]:
        """Get AI performance score for an ad set."""
        metrics = db.get_metrics_for_ad_set(ad_set_id, days=7)
        if metrics is None:
            return {
                "ad_set_id":     ad_set_id,
                "score":         None,
                "calculated_at": datetime.utcnow().isoformat(),
                "reason":        "No metrics available",
            }

        impressions = int(metrics.get('impressions') or 0)
        clicks      = int(metrics.get('clicks')      or 0)
        spend       = float(metrics.get('spend')     or 0.0)

        if impressions < 100:
            return {
                "ad_set_id":     ad_set_id,
                "score":         None,
                "calculated_at": datetime.utcnow().isoformat(),
                "reason":        f"Not enough impressions ({impressions} < 100)",
            }

        action, confidence = predictor.predict(impressions, clicks, spend)

        # Map action + confidence to 0-100 score
        base = {"SCALE": 80, "KEEP": 50, "PAUSE": 20}.get(action, 50)
        score = round(base + (confidence - 0.5) * 40, 2)
        score = max(0.0, min(100.0, score))

        return {
            "ad_set_id":     ad_set_id,
            "score":         score,
            "action":        action,
            "confidence":    round(confidence, 4),
            "calculated_at": datetime.utcnow().isoformat(),
            "metrics": {
                "impressions": impressions,
                "clicks":      clicks,
                "spend":       spend,
            },
        }

    @staticmethod
    def _empty_summary(campaign_id: str) -> Dict[str, Any]:
        return {
            "campaign_id":      campaign_id,
            "analyzed_at":      datetime.utcnow().isoformat(),
            "ad_sets_analyzed": 0,
            "recommendations":  [],
            "summary": {
                "total_ad_sets": 0,
                "healthy": 0, "paused": 0, "kept": 0,
                "scaled": 0, "skipped": 0,
            },
        }
