# =============================================================================
# AI Optimizer — Routes
# =============================================================================

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


health_router = APIRouter()
optimizer_router = APIRouter()


# ─── Health ──────────────────────────────────────────────────────────────────

@health_router.get("/health")
async def health_check():
    return {"status": "ok", "service": "ai-optimizer", "timestamp": datetime.utcnow().isoformat()}


# ─── Optimizer Endpoints ─────────────────────────────────────────────────────

class OptimizationRequest(BaseModel):
    campaign_id: str
    workspace_id: str
    force: bool = False


class ThresholdUpdate(BaseModel):
    max_cpa_multiplier: Optional[float] = None
    min_ctr_search: Optional[float] = None
    min_ctr_social: Optional[float] = None
    min_roas: Optional[float] = None
    max_spend_without_conversion: Optional[float] = None
    min_impressions_for_eval: Optional[int] = None


@optimizer_router.post("/analyze/{campaign_id}")
async def analyze_campaign(campaign_id: str, req: OptimizationRequest):
    """
    Trigger AI analysis for a specific campaign.
    Evaluates all ad sets and returns optimization recommendations.
    """
    from app.services.optimizer import OptimizerService

    optimizer = OptimizerService()
    try:
        result = await optimizer.analyze_campaign(campaign_id, req.workspace_id, force=req.force)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@optimizer_router.get("/history/{campaign_id}")
async def get_optimization_history(campaign_id: str, limit: int = 50):
    """Get optimization action history for a campaign."""
    from app.services.optimizer import OptimizerService

    optimizer = OptimizerService()
    history = await optimizer.get_history(campaign_id, limit)
    return {"success": True, "data": history}


@optimizer_router.get("/score/{ad_set_id}")
async def get_performance_score(ad_set_id: str):
    """Get the AI-calculated performance score for an ad set."""
    from app.services.optimizer import OptimizerService

    optimizer = OptimizerService()
    score = await optimizer.get_performance_score(ad_set_id)
    return {"success": True, "data": score}


@optimizer_router.put("/thresholds/{workspace_id}")
async def update_thresholds(workspace_id: str, thresholds: ThresholdUpdate):
    """Update optimization thresholds for a workspace."""
    return {
        "success": True,
        "data": {
            "message": "Thresholds updated",
            "workspace_id": workspace_id,
            "thresholds": thresholds.model_dump(exclude_none=True),
        },
    }
