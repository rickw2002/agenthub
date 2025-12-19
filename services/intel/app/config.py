"""
Configuration management for Intel service using Pydantic Settings.
"""
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
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_REDIRECT_URI: Optional[str] = None
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Global settings instance
settings = Settings()


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
    
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        warnings.append("GOOGLE_CLIENT_ID/SECRET not set - GA4 OAuth will fail")
    
    if warnings:
        print("⚠️  Configuration warnings:")
        for warning in warnings:
            print(f"   - {warning}")
        print("   Service will start but protected endpoints may not work.")


# Validate on import
validate_settings()

