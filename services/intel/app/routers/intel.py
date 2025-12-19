"""
Intel analysis endpoints.
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from app.middleware.auth import require_intel_key

router = APIRouter()


class Tenant(BaseModel):
    """Tenant information."""
    userId: str
    workspaceId: str


class ChatAnalyzeRequest(BaseModel):
    """Request model for chat analysis."""
    tenant: Tenant
    scope: str
    message: str
    context: Optional[Dict[str, Any]] = None


@router.post("/analyze/chat")
async def analyze_chat(
    request: ChatAnalyzeRequest,
    intel_auth: bool = Depends(require_intel_key)
):
    """
    Chat analysis endpoint (stub).
    Protected with X-Intel-API-Key header.
    """
    return {
        "ok": True,
        "facts": [],
        "actions": [],
        "warnings": ["stub"]
    }

