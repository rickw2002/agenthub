"""
Google OAuth token refresh utilities.
"""
import httpx
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from app.config import settings


def _parse_expires_at(expires_at: Any) -> Optional[datetime]:
    """
    Parse expires_at from various formats (ISO string, unix timestamp, datetime).
    Returns None if invalid or missing.
    """
    if expires_at is None:
        return None
    
    if isinstance(expires_at, datetime):
        return expires_at
    
    if isinstance(expires_at, str):
        # Try ISO format
        try:
            return datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
        except ValueError:
            pass
        # Try unix timestamp (seconds)
        try:
            return datetime.fromtimestamp(float(expires_at), tz=None)
        except (ValueError, TypeError):
            pass
    
    if isinstance(expires_at, (int, float)):
        # Unix timestamp (seconds)
        try:
            return datetime.fromtimestamp(float(expires_at), tz=None)
        except (ValueError, OSError):
            pass
    
    return None


def _is_token_expiring_soon(expires_at: Optional[datetime], buffer_minutes: int = 5) -> bool:
    """Check if token expires within buffer_minutes."""
    if expires_at is None:
        return True  # Assume expired if unknown
    
    # Convert to UTC if timezone-aware, otherwise assume UTC
    if expires_at.tzinfo is not None:
        expires_utc = expires_at.astimezone(tz=None).replace(tzinfo=None)
    else:
        expires_utc = expires_at
    
    now_utc = datetime.utcnow()
    threshold = now_utc + timedelta(minutes=buffer_minutes)
    
    return expires_utc <= threshold


async def refresh_google_token_if_needed(auth: Dict[str, Any]) -> Dict[str, Any]:
    """
    Refresh Google OAuth token if it's expiring soon (within 5 minutes).
    
    Args:
        auth: Auth dict containing ga4.tokens with access_token, refresh_token, expires_at
        
    Returns:
        Updated auth dict with refreshed tokens if needed
        
    Raises:
        ValueError: If refresh_token is missing or refresh fails
    """
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise ValueError("Google OAuth credentials not configured")
    
    ga4_data = auth.get("ga4", {})
    tokens = ga4_data.get("tokens", {})
    
    access_token = tokens.get("access_token")
    refresh_token = tokens.get("refresh_token")
    expires_at_str = tokens.get("expires_at")
    
    if not access_token:
        raise ValueError("access_token missing in auth data")
    
    # Parse expires_at
    expires_at = _parse_expires_at(expires_at_str)
    
    # Check if refresh needed
    if not _is_token_expiring_soon(expires_at, buffer_minutes=5):
        # Token still valid, return as-is
        return auth
    
    # Token expiring soon or expired, refresh needed
    if not refresh_token:
        raise ValueError(
            "refresh_token missing - cannot refresh. "
            "User may need to re-authorize with offline access."
        )
    
    # Refresh token via Google OAuth endpoint
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token"
            }
        )
        
        if response.status_code != 200:
            error_text = response.text
            raise ValueError(f"Token refresh failed: {response.status_code} - {error_text}")
        
        token_data = response.json()
        new_access_token = token_data["access_token"]
        new_expires_in = token_data.get("expires_in", 3600)
        
        # Calculate new expires_at (ISO format)
        new_expires_at = (datetime.utcnow() + timedelta(seconds=new_expires_in)).isoformat()
        
        # Update auth dict
        tokens["access_token"] = new_access_token
        tokens["expires_at"] = new_expires_at
        # refresh_token stays the same (unless revoked)
        
        ga4_data["tokens"] = tokens
        auth["ga4"] = ga4_data
        
        return auth

