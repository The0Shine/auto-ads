# =============================================================================
# AI Optimizer — Core Optimization Engine
# =============================================================================

import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum

from app.config import settings

logger = logging.getLogger(__name__)


class OptimizationAction(str, Enum):
    AUTO_PAUSE = "AUTO_PAUSE"
    BUDGET_SHIFT = "BUDGET_SHIFT"
    REACTIVATE = "REACTIVATE"
    ALERT = "ALERT"


@dataclass
class AdSetMetrics:
    ad_set_id: str
    campaign_id: str
    platform: str
    impressions: int = 0
    clicks: int = 0
    conversions: int = 0
    spend: float = 0.0
    revenue: float = 0.0
    ctr: float = 0.0
    cpc: float = 0.0
    cpa: float = 0.0
    roas: float = 0.0
    frequency: float = 0.0
    daily_budget: float = 0.0
    target_cpa: Optional[float] = None


@dataclass
class OptimizationResult:
    ad_set_id: str
    action: OptimizationAction
    reason: str
    confidence: float
    metrics_snapshot: Dict[str, Any]
    suggested_changes: Dict[str, Any]


class OptimizerService:
    """
    AI-powered ad set optimization engine.

    Evaluates ad set performance using rule-based analysis and ML scoring.
    Capable of:
    - Auto-pausing underperforming ad sets
    - Suggesting budget reallocation
    - Detecting audience fatigue
    - Generating performance scores
    """

    def __init__(self):
        self.thresholds = {
            "max_cpa_multiplier": settings.max_cpa_multiplier,
            "min_ctr_search": settings.min_ctr_search,
            "min_ctr_social": settings.min_ctr_social,
            "min_roas": settings.min_roas,
            "max_spend_without_conversion": settings.max_spend_without_conversion,
            "min_impressions_for_eval": settings.min_impressions_for_eval,
            "max_frequency": settings.max_frequency,
            "max_budget_shift_percent": settings.max_budget_shift_percent,
        }

    async def analyze_campaign(
        self, campaign_id: str, workspace_id: str, force: bool = False
    ) -> Dict[str, Any]:
        """
        Analyze all ad sets in a campaign and return optimization recommendations.
        """
        # TODO: Fetch real metrics from TimescaleDB
        # For now, return the analysis structure
        logger.info(f"Analyzing campaign {campaign_id} for workspace {workspace_id}")

        return {
            "campaign_id": campaign_id,
            "analyzed_at": datetime.utcnow().isoformat(),
            "ad_sets_analyzed": 0,
            "recommendations": [],
            "summary": {
                "total_ad_sets": 0,
                "healthy": 0,
                "warning": 0,
                "critical": 0,
                "auto_paused": 0,
            },
        }

    def evaluate_ad_set(self, metrics: AdSetMetrics) -> List[OptimizationResult]:
        """
        Evaluate a single ad set's performance against thresholds.
        Returns a list of optimization recommendations.
        """
        results: List[OptimizationResult] = []

        # Skip if not enough data
        if metrics.impressions < self.thresholds["min_impressions_for_eval"]:
            return results

        snapshot = {
            "impressions": metrics.impressions,
            "clicks": metrics.clicks,
            "conversions": metrics.conversions,
            "spend": metrics.spend,
            "ctr": metrics.ctr,
            "cpa": metrics.cpa,
            "roas": metrics.roas,
            "frequency": metrics.frequency,
        }

        # ── Check 1: CPA too high ────────────────────────────────────────
        if metrics.target_cpa and metrics.cpa > 0:
            cpa_threshold = metrics.target_cpa * self.thresholds["max_cpa_multiplier"]
            if metrics.cpa > cpa_threshold:
                results.append(OptimizationResult(
                    ad_set_id=metrics.ad_set_id,
                    action=OptimizationAction.AUTO_PAUSE,
                    reason=f"CPA ({metrics.cpa:.2f}) exceeds {self.thresholds['max_cpa_multiplier']}x target ({metrics.target_cpa:.2f})",
                    confidence=0.85,
                    metrics_snapshot=snapshot,
                    suggested_changes={"status": "PAUSED", "auto_paused": True},
                ))

        # ── Check 2: CTR too low ─────────────────────────────────────────
        min_ctr = (
            self.thresholds["min_ctr_search"]
            if metrics.platform == "google"
            else self.thresholds["min_ctr_social"]
        )
        if metrics.ctr < min_ctr and metrics.impressions > self.thresholds["min_impressions_for_eval"] * 2:
            results.append(OptimizationResult(
                ad_set_id=metrics.ad_set_id,
                action=OptimizationAction.ALERT,
                reason=f"CTR ({metrics.ctr:.4f}) below minimum threshold ({min_ctr})",
                confidence=0.7,
                metrics_snapshot=snapshot,
                suggested_changes={"warning": "low_ctr"},
            ))

        # ── Check 3: ROAS too low ────────────────────────────────────────
        if metrics.roas < self.thresholds["min_roas"] and metrics.spend > 0 and metrics.conversions > 0:
            results.append(OptimizationResult(
                ad_set_id=metrics.ad_set_id,
                action=OptimizationAction.AUTO_PAUSE,
                reason=f"ROAS ({metrics.roas:.2f}) below minimum ({self.thresholds['min_roas']})",
                confidence=0.8,
                metrics_snapshot=snapshot,
                suggested_changes={"status": "PAUSED", "auto_paused": True},
            ))

        # ── Check 4: Spending without conversions ────────────────────────
        if metrics.daily_budget > 0 and metrics.conversions == 0:
            spend_ratio = metrics.spend / metrics.daily_budget
            if spend_ratio > self.thresholds["max_spend_without_conversion"]:
                results.append(OptimizationResult(
                    ad_set_id=metrics.ad_set_id,
                    action=OptimizationAction.AUTO_PAUSE,
                    reason=f"Spent {spend_ratio:.0%} of daily budget with 0 conversions",
                    confidence=0.75,
                    metrics_snapshot=snapshot,
                    suggested_changes={"status": "PAUSED", "auto_paused": True},
                ))

        # ── Check 5: Audience fatigue (high frequency) ───────────────────
        if metrics.frequency > self.thresholds["max_frequency"]:
            results.append(OptimizationResult(
                ad_set_id=metrics.ad_set_id,
                action=OptimizationAction.ALERT,
                reason=f"Frequency ({metrics.frequency:.1f}) exceeds threshold ({self.thresholds['max_frequency']}). Audience fatigue detected.",
                confidence=0.65,
                metrics_snapshot=snapshot,
                suggested_changes={"warning": "audience_fatigue"},
            ))

        return results

    def calculate_performance_score(self, metrics: AdSetMetrics) -> float:
        """
        Calculate a composite performance score (0-100) for an ad set.
        Uses weighted scoring across multiple KPIs.
        """
        if metrics.impressions < 100:
            return 0.0

        scores = []
        weights = []

        # CTR score (0-100)
        if metrics.ctr > 0:
            ctr_benchmark = 0.02  # 2% CTR as good benchmark
            ctr_score = min(100, (metrics.ctr / ctr_benchmark) * 100)
            scores.append(ctr_score)
            weights.append(0.25)

        # CPA score (inversed — lower is better)
        if metrics.cpa > 0 and metrics.target_cpa:
            cpa_ratio = metrics.target_cpa / metrics.cpa  # 1.0 = exactly on target
            cpa_score = min(100, cpa_ratio * 100)
            scores.append(cpa_score)
            weights.append(0.30)

        # ROAS score
        if metrics.roas > 0:
            roas_benchmark = 4.0  # 4x ROAS as good benchmark
            roas_score = min(100, (metrics.roas / roas_benchmark) * 100)
            scores.append(roas_score)
            weights.append(0.30)

        # Frequency score (inversed — lower is better)
        if metrics.frequency > 0:
            freq_score = max(0, 100 - (metrics.frequency / self.thresholds["max_frequency"]) * 100)
            scores.append(freq_score)
            weights.append(0.15)

        if not scores:
            return 50.0  # Default neutral score

        total_weight = sum(weights)
        weighted_score = sum(s * w for s, w in zip(scores, weights)) / total_weight
        return round(weighted_score, 2)

    async def get_history(self, campaign_id: str, limit: int = 50) -> List[Dict]:
        """Get optimization history for a campaign."""
        # TODO: Query optimization_logs table
        return []

    async def get_performance_score(self, ad_set_id: str) -> Dict[str, Any]:
        """Get performance score for an ad set."""
        # TODO: Fetch metrics and calculate score
        return {
            "ad_set_id": ad_set_id,
            "score": 0,
            "calculated_at": datetime.utcnow().isoformat(),
            "details": {},
        }
