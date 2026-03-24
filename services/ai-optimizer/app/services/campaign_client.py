# =============================================================================
# AI Optimizer — Campaign Service HTTP Client
# Calls campaign-service REST API to apply AI decisions (PAUSE / RESUME)
# =============================================================================

import logging
import httpx

from app.config import settings

logger = logging.getLogger(__name__)

TIMEOUT = 10.0  # seconds


async def pause_campaign(campaign_id: str, reason: str = "AI auto-pause") -> bool:
    """
    Tell campaign-service to pause a campaign.
    POST /campaigns/:id/pause
    """
    url = f"{settings.campaign_service_url}/campaigns/{campaign_id}/pause"
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            res = await client.post(url, json={"reason": reason})
        if res.status_code in (200, 204):
            logger.info(f"[CampaignClient] Campaign {campaign_id} paused via API")
            return True
        logger.warning(f"[CampaignClient] Pause returned {res.status_code}: {res.text}")
        return False
    except Exception as e:
        logger.error(f"[CampaignClient] pause_campaign error: {e}")
        return False


async def resume_campaign(campaign_id: str) -> bool:
    """
    Tell campaign-service to resume a campaign.
    POST /campaigns/:id/resume
    """
    url = f"{settings.campaign_service_url}/campaigns/{campaign_id}/resume"
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            res = await client.post(url)
        if res.status_code in (200, 204):
            logger.info(f"[CampaignClient] Campaign {campaign_id} resumed via API")
            return True
        logger.warning(f"[CampaignClient] Resume returned {res.status_code}: {res.text}")
        return False
    except Exception as e:
        logger.error(f"[CampaignClient] resume_campaign error: {e}")
        return False
