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
# Advisory lock ID for weekly-report
WEEKLY_REPORT_LOCK_ID = 12346


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


@router.post("/internal/cron/weekly-report")
async def weekly_report(
    cron_auth: bool = Depends(require_cron_secret),
    body: Optional[dict] = Body(None)
):
    """
    Weekly report generation endpoint.
    Protected with X-Cron-Secret header.
    
    Generates WeeklyReportV2 for all active workspaces (last week: Monday 00:00 to Sunday 23:59:59).
    
    Body (optional):
        {
            "dryRun": true | false  # If true, only count workspaces, no writes
        }
    """
    from app.weekly_report import generate_weekly_report_for_workspace
    from datetime import datetime, timedelta
    
    dry_run = body.get("dryRun", False) if body else False
    
    # Try to acquire advisory lock
    lock_acquired = await fetchval("SELECT pg_try_advisory_lock($1)", WEEKLY_REPORT_LOCK_ID)
    
    if not lock_acquired:
        return {
            "status": "skipped",
            "reason": "already_running",
            "message": "Another weekly report generation is already running"
        }
    
    try:
        # Calculate last week (Monday 00:00 to Sunday 23:59:59)
        # Find last Monday
        today = datetime.utcnow().date()
        days_since_monday = (today.weekday()) % 7
        last_monday = today - timedelta(days=days_since_monday + 7)  # Go back to last Monday
        week_start = datetime.combine(last_monday, datetime.min.time())
        week_end = week_start + timedelta(days=7) - timedelta(seconds=1)
        
        # Find active workspaces (have CONNECTED connections OR Signals in last 30 days OR InsightV2 in last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        
        active_workspaces_query = '''
            SELECT DISTINCT w.id, w.name
            FROM "Workspace" w
            WHERE EXISTS (
                SELECT 1 FROM "Connection" c
                WHERE c."workspaceId" = w.id AND c."status" = 'CONNECTED'
            )
            OR EXISTS (
                SELECT 1 FROM "Signal" s
                WHERE s."workspaceId" = w.id AND s."createdAt" >= $1
            )
            OR EXISTS (
                SELECT 1 FROM "InsightV2" i
                WHERE i."workspaceId" = w.id AND i."createdAt" >= $1
            )
        '''
        
        workspaces = await fetch(active_workspaces_query, thirty_days_ago)
        
        if dry_run:
            return {
                "status": "dry_run",
                "active_workspaces": len(workspaces),
                "week_start": week_start.isoformat(),
                "week_end": week_end.isoformat(),
                "message": "No writes performed"
            }
        
        generated_count = 0
        failed_count = 0
        failures = []
        
        for ws_row in workspaces:
            workspace_id = ws_row["id"]
            workspace_name = ws_row.get("name", "Unknown")
            
            try:
                await generate_weekly_report_for_workspace(
                    workspace_id=workspace_id,
                    week_start=week_start,
                    week_end=week_end
                )
                generated_count += 1
            except Exception as e:
                failed_count += 1
                error_msg = str(e)
                
                if len(failures) < 10:
                    failures.append({
                        "workspaceId": workspace_id,
                        "workspaceName": workspace_name,
                        "reason": error_msg
                    })
        
        return {
            "status": "success",
            "generated": generated_count,
            "failed": failed_count,
            "failures": failures,
            "week_start": week_start.isoformat(),
            "week_end": week_end.isoformat()
        }
    
    finally:
        # Always release lock
        await fetchval("SELECT pg_advisory_unlock($1)", WEEKLY_REPORT_LOCK_ID)

