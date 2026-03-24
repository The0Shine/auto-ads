# =============================================================================
# AI Optimizer — FastAPI Application
# =============================================================================

from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.config import settings
from app.routes import optimizer_router, health_router
from app.services.scheduler import start_scheduler, stop_scheduler
from app.services.predictor import predictor


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup & shutdown events."""
    print("🧠 AI Optimizer starting up...")
    # Load XGBoost model once at startup
    predictor.load(settings.ai_model_path)
    start_scheduler()
    yield
    print("🧠 AI Optimizer shutting down...")
    stop_scheduler()


app = FastAPI(
    title="Auto-Ads AI Optimizer",
    description="AI-powered ad performance analysis using XGBoost — auto-pause, scale recommendations",
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(health_router,    prefix="",           tags=["Health"])
app.include_router(optimizer_router, prefix="/optimizer", tags=["Optimizer"])
