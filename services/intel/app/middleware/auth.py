"""
Authentication middleware for Intel service endpoints.
"""
from fastapi import Header, HTTPException, status
from typing import Optional
from app.config import settings


async def require_intel_key(
    x_intel_api_key: str = Header(..., alias="X-Intel-API-Key")
) -> bool:
    """
    Dependency to require X-Intel-API-Key header matching INTEL_API_KEY.
    Used for /analyze endpoints.
    """
    if not settings.INTEL_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Intel API key not configured"
        )
    
    if x_intel_api_key != settings.INTEL_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Intel API key"
        )
    
    return True


async def require_cron_secret(
    x_cron_secret: str = Header(..., alias="X-Cron-Secret")
) -> bool:
    """
    Dependency to require X-Cron-Secret header matching CRON_SECRET.
    Used for /internal/cron endpoints.
    """
    if not settings.CRON_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Cron secret not configured"
        )
    
    if x_cron_secret != settings.CRON_SECRET:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid cron secret"
        )
    
    return True

