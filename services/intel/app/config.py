"""
Configuration management for Intel service using Pydantic Settings.
"""
import os
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Database
    DATABASE_URL: Optional[str] = None
    
    # API Keys & Secrets
    INTEL_API_KEY: Optional[str] = None
    CRON_SECRET: Optional[str] = None
    ENCRYPTION_KEY: Optional[str] = None  # Base64-encoded 32-byte key for AES-256-GCM
    
    # External service URLs
    NEXTJS_BASE_URL: Optional[str] = None
    
    # Google OAuth
    # Support both GOOGLE_REDIRECT_URI and GOOGLE_OAUTH_REDIRECT_URL for backwards compatibility
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_REDIRECT_URI: Optional[str] = None
    
    model_config = {
        "env_file": ".env",
        "case_sensitive": True,
        "populate_by_name": True,
    }
    
    def model_post_init(self, __context):
        """Support both GOOGLE_REDIRECT_URI and GOOGLE_OAUTH_REDIRECT_URL env vars."""
        # If GOOGLE_REDIRECT_URI is not set, try GOOGLE_OAUTH_REDIRECT_URL
        if not self.GOOGLE_REDIRECT_URI:
            self.GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_OAUTH_REDIRECT_URL")


# Global settings instance
settings = Settings()


def get_oauth_config_status() -> dict:
    """Get OAuth configuration status (for debugging, never exposes secrets)."""
    missing = []
    
    if not settings.GOOGLE_CLIENT_ID:
        missing.append("GOOGLE_CLIENT_ID")
    if not settings.GOOGLE_CLIENT_SECRET:
        missing.append("GOOGLE_CLIENT_SECRET")
    if not settings.GOOGLE_REDIRECT_URI:
        missing.append("GOOGLE_REDIRECT_URI (or GOOGLE_OAUTH_REDIRECT_URL)")
    
    return {
        "oauth_configured": len(missing) == 0,
        "missing": missing
    }


def get_oauth_flow_requirements() -> dict:
    """
    Get all required env vars for OAuth flow (OAuth + DB + encryption).
    Returns detailed status for error messages.
    """
    missing = []
    
    # OAuth requirements
    if not settings.GOOGLE_CLIENT_ID:
        missing.append("GOOGLE_CLIENT_ID")
    if not settings.GOOGLE_CLIENT_SECRET:
        missing.append("GOOGLE_CLIENT_SECRET")
    if not settings.GOOGLE_REDIRECT_URI:
        missing.append("GOOGLE_REDIRECT_URI (or GOOGLE_OAUTH_REDIRECT_URL)")
    
    # Database requirement
    if not settings.DATABASE_URL:
        missing.append("DATABASE_URL")
    
    # Encryption requirement
    if not settings.ENCRYPTION_KEY:
        missing.append("ENCRYPTION_KEY")
    
    return {
        "ready": len(missing) == 0,
        "missing": missing
    }


def validate_settings() -> None:
    """Validate critical settings and warn if missing (but don't fail startup)."""
    warnings = []
    
    if not settings.INTEL_API_KEY:
        warnings.append("INTEL_API_KEY not set - /analyze endpoints will fail")
    
    if not settings.CRON_SECRET:
        warnings.append("CRON_SECRET not set - /internal/cron endpoints will fail")
    
    if not settings.DATABASE_URL:
        warnings.append("DATABASE_URL not set - OAuth and sync will fail")
    
    if not settings.ENCRYPTION_KEY:
        warnings.append("ENCRYPTION_KEY not set - OAuth token encryption will fail")
    
    # Check OAuth config
    oauth_status = get_oauth_config_status()
    if not oauth_status["oauth_configured"]:
        missing_str = ", ".join(oauth_status["missing"])
        warnings.append(f"Google OAuth not fully configured - missing: {missing_str}")
    
    if warnings:
        print("⚠️  Configuration warnings:")
        for warning in warnings:
            print(f"   - {warning}")
        print("   Service will start but protected endpoints may not work.")
    
    # Log OAuth status on startup (safe debug info)
    oauth_status = get_oauth_config_status()
    print(f"🔐 OAuth config: oauth_configured={oauth_status['oauth_configured']}")
    if oauth_status["missing"]:
        print(f"   Missing fields: {', '.join(oauth_status['missing'])}")


# Validate on import
validate_settings()

