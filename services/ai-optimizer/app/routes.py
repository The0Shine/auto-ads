# =============================================================================
# AI Optimizer — Routes
# =============================================================================

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


health_router    = APIRouter()
optimizer_router = APIRouter()


# ─── Health ──────────────────────────────────────────────────────────────────

@health_router.get("/health")
async def health_check():
    return {
        "status":    "ok",
        "service":   "ai-optimizer",
        "timestamp": datetime.utcnow().isoformat(),
    }


@optimizer_router.get("/health")
async def optimizer_health():
    return {
        "status":    "ok",
        "service":   "ai-optimizer",
        "timestamp": datetime.utcnow().isoformat(),
    }


# ─── Request models ───────────────────────────────────────────────────────────

class OptimizationRequest(BaseModel):
    campaign_id:  str
    workspace_id: str
    force:        bool = False


class PredictRequest(BaseModel):
    """Direct prediction for a single ad set's metrics."""
    impressions: int
    clicks:      int
    spent:       float
    age:         Optional[int] = 1    # 0=30-34, 1=35-39, 2=40-44, 3=45-49
    gender:      Optional[int] = 0    # 0=M, 1=F
    interest:    Optional[int] = 15


# ─── Optimizer endpoints ──────────────────────────────────────────────────────

@optimizer_router.post("/analyze/{campaign_id}")
async def analyze_campaign(campaign_id: str, req: OptimizationRequest):
    """
    Trigger AI analysis for a campaign.
    Evaluates all ad sets, applies PAUSE if confidence >= threshold.
    """
    from app.services.optimizer import OptimizerService
    optimizer = OptimizerService()
    try:
        result = await optimizer.analyze_campaign(campaign_id, req.workspace_id, force=req.force)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@optimizer_router.post("/trigger")
async def trigger_cycle(background_tasks: BackgroundTasks):
    """
    Manually trigger a full optimization cycle across all active campaigns.
    Runs in the background so the HTTP response returns immediately.
    """
    from app.services.scheduler import run_optimization_cycle
    background_tasks.add_task(run_optimization_cycle)
    return {
        "success": True,
        "message": "Optimization cycle triggered",
        "timestamp": datetime.utcnow().isoformat(),
    }


@optimizer_router.post("/predict")
async def predict(req: PredictRequest):
    """
    Run a single XGBoost prediction without touching the database.
    Useful for testing and frontend previews.
    """
    from app.services.predictor import predictor
    try:
        action, confidence = predictor.predict(
            impressions=req.impressions,
            clicks=req.clicks,
            spent=req.spent,
            age=req.age,
            gender=req.gender,
            interest=req.interest,
        )
        return {
            "success": True,
            "data": {
                "action":     action,
                "confidence": round(confidence, 4),
            },
        }
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
    """Get AI-calculated performance score for an ad set (0-100)."""
    from app.services.optimizer import OptimizerService
    optimizer = OptimizerService()
    score = await optimizer.get_performance_score(ad_set_id)
    return {"success": True, "data": score}
