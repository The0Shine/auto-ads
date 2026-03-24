# =============================================================================
# AI Optimizer — Configuration
# =============================================================================

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    database_url: str = "postgresql://autoads:autoads_dev@postgres:5432/autoads"
    timescale_url: str = "postgresql://autoads:autoads_dev@timescaledb:5432/autoads_metrics"

    # Kafka
    kafka_brokers: str = "kafka:9092"

    # Redis
    redis_host: str = "redis"
    redis_port: int = 6379
    redis_password: str = "autoads_dev"

    # Internal service URLs
    campaign_service_url: str = "http://campaign-service:3003"

    # ML model path
    ai_model_path: str = "app/model.joblib"

    # AI decision threshold — only act if confidence >= this value
    ai_confidence_threshold: float = 0.70

    # Optimization Thresholds (configurable per workspace in the future)
    max_cpa_multiplier: float = 3.0
    min_ctr_search: float = 0.005
    min_ctr_social: float = 0.008
    min_roas: float = 1.0
    max_spend_without_conversion: float = 0.3
    min_impressions_for_eval: int = 1000
    max_frequency: float = 3.0
    max_budget_shift_percent: float = 0.2

    # Scheduler
    optimization_interval_minutes: int = 60
    metrics_sync_interval_minutes: int = 15

    class Config:
        env_file = ".env"


settings = Settings()
