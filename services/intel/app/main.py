"""
FastAPI application entry point for Intel service.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import settings
from app.routers import health, internal, oauth_ga4, intel, providers, intelligence
from app.db import create_pool, close_pool


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan events: startup and shutdown."""
    # Startup: create DB pool (required for service operation)
    if not settings.DATABASE_URL:
        print("❌ DATABASE_URL not set - service cannot start")
        raise RuntimeError("DATABASE_URL environment variable is required")
    
    try:
        await create_pool()
    except Exception as e:
        print(f"❌ Failed to create database pool - service cannot start")
        print(f"   Error: {e}")
        raise RuntimeError(f"Database connection failed: {e}") from e
    
    yield
    
    # Shutdown: close DB pool
    try:
        await close_pool()
        print("✅ Database pool closed")
    except Exception as e:
        print(f"⚠️  Error closing database pool: {e}")


# Create FastAPI app
app = FastAPI(
    title="Bureau-AI Intel Service",
    description="OAuth, data sync, and intelligence analysis for Data Hub",
    version="0.1.0",
    lifespan=lifespan
)

# CORS configuration
allowed_origins = [
    "http://localhost:3000",  # Local Next.js dev
]

# Add NEXTJS_BASE_URL if configured
if settings.NEXTJS_BASE_URL:
    allowed_origins.append(settings.NEXTJS_BASE_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router)
app.include_router(internal.router)
app.include_router(oauth_ga4.router)
app.include_router(intel.router, prefix="/analyze")
app.include_router(providers.router)
app.include_router(intelligence.router)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": "intel",
        "status": "ok",
        "version": "0.1.0"
    }

