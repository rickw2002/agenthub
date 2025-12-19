"""
Internal endpoints (cron jobs, admin, etc.).
"""
from fastapi import APIRouter, Depends, Body
from typing import Optional
from app.middleware.auth import require_cron_secret
from app.db import fetch, fetchval, execute
from app.providers.ga4_sync import sync_ga4_daily
from app.providers.common import load_connection_auth, save_connection_auth

router = APIRouter()

# Advisory lock ID for sync-daily (arbitrary integer, must be consistent)
SYNC_DAILY_LOCK_ID = 12345


@router.post("/internal/cron/sync-daily")
async def sync_daily(
    cron_auth: bool = Depends(require_cron_secret),
    body: Optional[dict] = Body(None)
):
    """
    Daily sync endpoint for all providers.
    Protected with X-Cron-Secret header.
    
    Body (optional):
        {
            "provider": "GOOGLE_ANALYTICS" | null,  # If null, sync all providers
            "dryRun": true | false  # If true, only count connections, no writes
        }
    """
    provider_filter = body.get("provider") if body else None
    dry_run = body.get("dryRun", False) if body else False
    
    # Try to acquire advisory lock
    lock_acquired = await fetchval("SELECT pg_try_advisory_lock($1)", SYNC_DAILY_LOCK_ID)
    
    if not lock_acquired:
        return {
            "status": "skipped",
            "reason": "already_running",
            "message": "Another sync is already running"
        }
    
    try:
        # Build query for CONNECTED connections
        if provider_filter:
            query = '''SELECT id, "userId", "workspaceId", provider, "status", "authJson"
                       FROM "Connection"
                       WHERE provider=$1 AND "status"=$2'''
            connections = await fetch(query, provider_filter, "CONNECTED")
        else:
            # Sync all CONNECTED providers (for MVP, only GA4)
            query = '''SELECT id, "userId", "workspaceId", provider, "status", "authJson"
                       FROM "Connection"
                       WHERE provider=$1 AND "status"=$2'''
            connections = await fetch(query, "GOOGLE_ANALYTICS", "CONNECTED")
        
        # Filter connections with selected property (for GA4)
        eligible_connections = []
        for conn in connections:
            conn_dict = dict(conn)
            if conn_dict["provider"] == "GOOGLE_ANALYTICS":
                try:
                    auth_data = load_connection_auth(conn_dict["authJson"])
                    ga4_data = auth_data.get("ga4", {})
                    if ga4_data.get("selectedPropertyId"):
                        eligible_connections.append(conn_dict)
                except Exception:
                    # Skip if authJson invalid
                    pass
        
        # Dry run: just return count
        if dry_run:
            return {
                "status": "dry_run",
                "eligible_connections": len(eligible_connections),
                "total_connections": len(connections),
                "message": "No writes performed"
            }
        
        synced_count = 0
        failed_count = 0
        failures = []
        
        for conn_dict in eligible_connections:
            try:
                # Sync this connection
                result = await sync_ga4_daily(conn_dict)
                synced_count += 1
                
            except Exception as e:
                failed_count += 1
                error_msg = str(e)
                
                # Log failure (max 10)
                if len(failures) < 10:
                    failures.append({
                        "workspaceId": conn_dict["workspaceId"],
                        "provider": conn_dict["provider"],
                        "reason": error_msg
                    })
                
                # Optionally update Connection status to ERROR
                # For MVP, we'll leave status as-is but log the error
                # Uncomment below if you want to mark as ERROR:
                # try:
                #     await execute(
                #         '''UPDATE "Connection" SET "status"=$1, "updatedAt"=NOW() WHERE id=$2''',
                #         "ERROR",
                #         conn_dict["id"]
                #     )
                # except Exception:
                #     pass  # Ignore update errors
        
        return {
            "status": "success",
            "synced": synced_count,
            "failed": failed_count,
            "failures": failures
        }
    
    finally:
        # Always release lock
        await fetchval("SELECT pg_advisory_unlock($1)", SYNC_DAILY_LOCK_ID)

