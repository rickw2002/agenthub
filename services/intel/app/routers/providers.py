"""
Provider-specific endpoints (GA4 property selection, provider status, etc.).
"""
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.config import settings
from app.db import fetchrow, fetch, fetchval, execute
from app.crypto import decrypt_dict, encrypt_dict
from app.middleware.auth import require_intel_key

router = APIRouter()


class Tenant(BaseModel):
    """Tenant information."""
    userId: str
    workspaceId: str


class SelectPropertyRequest(BaseModel):
    """Request to select a GA4 property."""
    tenant: Tenant
    propertyId: str


@router.get("/providers/ga4/properties")
async def get_ga4_properties(
    workspaceId: str,
    userId: str,
    intel_auth: bool = Depends(require_intel_key)
):
    """
    Get available GA4 properties for a workspace.
    Protected with X-Intel-API-Key header.
    """
    # Validate inputs
    if not workspaceId or not userId:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="workspaceId and userId are required"
        )
    
    # Find Connection
    connection = await fetchrow(
        'SELECT id, "authJson", "status" FROM "Connection" WHERE "workspaceId"=$1 AND provider=$2 AND "userId"=$3 LIMIT 1',
        workspaceId,
        "GOOGLE_ANALYTICS",
        userId
    )
    
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Connection not found"
        )
    
    # Decrypt authJson
    try:
        auth_data = decrypt_dict(connection["authJson"])
        ga4_data = auth_data.get("ga4", {})
        properties = ga4_data.get("properties", [])
        selected_property_id = ga4_data.get("selectedPropertyId")
        
        return {
            "properties": properties,
            "selectedPropertyId": selected_property_id,
            "status": connection["status"]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to decrypt connection data: {str(e)}"
        )


@router.post("/providers/ga4/select-property")
async def select_ga4_property(
    request: SelectPropertyRequest,
    intel_auth: bool = Depends(require_intel_key)
):
    """
    Select a GA4 property for a workspace.
    Updates Connection.authJson and sets status to CONNECTED.
    Protected with X-Intel-API-Key header.
    """
    # Validate inputs
    if not request.tenant.workspaceId or not request.tenant.userId:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="tenant.workspaceId and tenant.userId are required"
        )
    
    if not request.propertyId:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="propertyId is required"
        )
    
    # Find Connection
    connection = await fetchrow(
        'SELECT id, "authJson" FROM "Connection" WHERE "workspaceId"=$1 AND provider=$2 AND "userId"=$3 LIMIT 1',
        request.tenant.workspaceId,
        "GOOGLE_ANALYTICS",
        request.tenant.userId
    )
    
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Connection not found"
        )
    
    # Decrypt authJson
    try:
        auth_data = decrypt_dict(connection["authJson"])
        ga4_data = auth_data.get("ga4", {})
        properties = ga4_data.get("properties", [])
        
        # Validate propertyId exists in properties list
        property_ids = [p.get("propertyId") for p in properties]
        if request.propertyId not in property_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Property ID {request.propertyId} not found in available properties"
            )
        
        # Update selectedPropertyId
        ga4_data["selectedPropertyId"] = request.propertyId
        auth_data["ga4"] = ga4_data
        
        # Encrypt updated authJson
        encrypted_auth = encrypt_dict(auth_data)
        
        # Update Connection
        await execute(
            '''UPDATE "Connection" 
               SET "authJson"=$1, "status"=$2, "updatedAt"=NOW()
               WHERE id=$3''',
            encrypted_auth,
            "CONNECTED",
            connection["id"]
        )
        
        return {
            "ok": True,
            "message": "Property selected successfully",
            "propertyId": request.propertyId
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update connection: {str(e)}"
        )


@router.get("/providers/status")
async def get_providers_status(
    workspaceId: str,
    intel_auth: bool = Depends(require_intel_key),
) -> List[Dict[str, Any]]:
    """
    Provider status overview for a workspace.

    Returns, per provider:
    - provider: internal provider key (e.g. GOOGLE_ANALYTICS)
    - status: connection status from Connection.status
    - lastSyncAt: latest Signal or MetricDaily timestamp (if available)
    - lastSyncStatus: 'OK' | 'WARN' | 'FAIL'
    - lastError: last error message from encrypted authJson (if present)
    """
    if not workspaceId:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="workspaceId is required",
        )

    # Fetch all connections for this workspace
    connections = await fetch(
        '''SELECT id, provider, "status", "authJson", "updatedAt"
           FROM "Connection"
           WHERE "workspaceId"=$1''',
        workspaceId,
    )

    results: List[Dict[str, Any]] = []

    for conn in connections:
        provider = conn["provider"]
        status_value = conn["status"]
        auth_json = conn["authJson"]

        # Map Connection.provider -> Signal.sourceProvider (current scope: GA4 only)
        if provider == "GOOGLE_ANALYTICS":
            signal_source_provider = "GA4"
        else:
            signal_source_provider = provider

        # Determine lastSyncAt from Signals (preferred) or MetricDaily as fallback
        last_signal_at = await fetchval(
            '''SELECT MAX("createdAt") FROM "Signal"
               WHERE "workspaceId"=$1 AND "sourceProvider"=$2''',
            workspaceId,
            signal_source_provider,
        )

        if last_signal_at is None:
            last_metric_at = await fetchval(
                '''SELECT MAX("updatedAt") FROM "MetricDaily"
                   WHERE "workspaceId"=$1 AND provider=$2''',
                workspaceId,
                provider,
            )
        else:
            last_metric_at = None

        last_sync_at = last_signal_at or last_metric_at

        # Infer lastSyncStatus
        if last_sync_at and status_value == "CONNECTED":
            last_sync_status = "OK"
        elif status_value == "ERROR":
            last_sync_status = "FAIL"
        elif last_sync_at is None and status_value == "CONNECTED":
            # Connected but never synced
            last_sync_status = "WARN"
        else:
            last_sync_status = "WARN"

        # Try to pull lastError from encrypted authJson (if GA4)
        last_error: Optional[str] = None
        if auth_json and provider == "GOOGLE_ANALYTICS":
            try:
                auth_data = decrypt_dict(auth_json)
                ga4_data = auth_data.get("ga4", {})
                last_error = ga4_data.get("error")
            except Exception:
                # Don't fail status endpoint on decrypt issues
                last_error = None

        results.append(
            {
                "provider": provider,
                "status": status_value,
                "lastSyncAt": last_sync_at,
                "lastSyncStatus": last_sync_status,
                "lastError": last_error,
            }
        )

    return results