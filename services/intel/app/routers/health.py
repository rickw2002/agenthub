"""
Health check endpoint.
"""
from fastapi import APIRouter, Depends
from app.config import get_oauth_config_status, get_oauth_flow_requirements
from app.middleware.auth import require_intel_key

router = APIRouter()


@router.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "intel",
        "version": "0.1.0"
    }


@router.get("/health/config")
async def health_config(
    intel_auth: bool = Depends(require_intel_key)
):
    """
    Configuration status endpoint (protected by Intel API key).
    Returns OAuth configuration status without exposing secrets.
    Only enabled when INTEL_API_KEY is set (protection).
    """
    oauth_status = get_oauth_config_status()
    flow_requirements = get_oauth_flow_requirements()
    
    return {
        "oauthConfigured": oauth_status["oauth_configured"],
        "oauthMissing": oauth_status["missing"],
        "flowReady": flow_requirements["ready"],
        "flowMissing": flow_requirements["missing"]
    }

