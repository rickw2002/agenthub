"""
GA4 daily sync implementation.

Extended for v2:
- Still writes daily aggregates into MetricDaily (backwards compatibility)
- Additionally writes provider-agnostic Signals into the Signal table.
"""
import json
import uuid
import httpx
from datetime import datetime, timedelta
from typing import Dict, Any
from app.db import execute, fetchval, executemany
from app.providers.common import load_connection_auth, save_connection_auth
from app.providers.google_tokens import refresh_google_token_if_needed


async def sync_ga4_daily(conn_row: Dict[str, Any]) -> Dict[str, Any]:
    """
    Sync GA4 metrics for a single connection (yesterday's data).

    Args:
        conn_row: Connection row dict with id, workspaceId, userId, provider, status, authJson

    Returns:
        Dict with success status and metrics count (raw GA4 metrics)

    Raises:
        ValueError: If connection is invalid or sync fails
    """
    connection_id = conn_row["id"]
    workspace_id = conn_row["workspaceId"]
    user_id = conn_row["userId"]
    provider = conn_row["provider"]
    status = conn_row["status"]
    auth_json_str = conn_row.get("authJson")
    
    if not auth_json_str:
        raise ValueError("authJson is missing")
    
    if status != "CONNECTED":
        raise ValueError(f"Connection status is {status}, expected CONNECTED")
    
    # Load and decrypt authJson
    auth_data = load_connection_auth(auth_json_str)
    ga4_data = auth_data.get("ga4", {})
    
    # Get selected property
    selected_property_id = ga4_data.get("selectedPropertyId")
    if not selected_property_id:
        raise ValueError("No GA4 property selected for this connection")
    
    # Get tokens and refresh if needed
    tokens = ga4_data.get("tokens", {})
    if not tokens.get("access_token"):
        raise ValueError("access_token missing in auth data")
    
    # Refresh token if needed
    try:
        auth_data = await refresh_google_token_if_needed(auth_data)
        ga4_data = auth_data.get("ga4", {})
        tokens = ga4_data.get("tokens", {})
        access_token = tokens["access_token"]
    except ValueError as e:
        # If refresh fails, mark connection as ERROR
        error_msg = str(e)
        auth_data["ga4"]["error"] = error_msg
        auth_data["ga4"]["errorAt"] = datetime.utcnow().isoformat()
        encrypted_auth = save_connection_auth(auth_data)
        
        await execute(
            '''UPDATE "Connection" SET "status"=$1, "authJson"=$2, "updatedAt"=NOW() WHERE id=$3''',
            "ERROR",
            encrypted_auth,
            connection_id
        )
        
        raise ValueError(f"Token refresh failed: {error_msg}") from e
    
    access_token = tokens["access_token"]
    
    # Calculate yesterday's date (UTC, date-only)
    # Use UTC to avoid timezone issues
    yesterday_utc = datetime.utcnow().date() - timedelta(days=1)
    yesterday_str = yesterday_utc.isoformat()  # YYYY-MM-DD
    
    # Call GA4 Data API runReport
    # Using GA4 Data API v1
    # Reference: https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/runReport
    property_name = f"properties/{selected_property_id}"
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"https://analyticsdata.googleapis.com/v1beta/{property_name}:runReport",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            },
            json={
                "dateRanges": [
                    {
                        "startDate": yesterday_str,
                        "endDate": yesterday_str
                    }
                ],
                "metrics": [
                    {"name": "sessions"},
                    {"name": "totalUsers"},
                    {"name": "screenPageViews"},
                    {"name": "conversions"},
                    {"name": "totalRevenue"}
                ],
                "dimensions": []  # No dimensions for daily aggregate
            },
            timeout=30.0
        )
        
        if response.status_code != 200:
            error_text = response.text
            raise ValueError(f"GA4 API call failed: {response.status_code} - {error_text}")
        
        report_data = response.json()
        
        # Extract metrics from first row (aggregate for the day)
        rows = report_data.get("rows", [])
        if not rows:
            # No data for yesterday (empty day)
            metrics_data = {
                "sessions": 0,
                "totalUsers": 0,
                "screenPageViews": 0,
                "conversions": 0,
                "totalRevenue": 0.0
            }
        else:
            # GA4 returns metric values in order
            row = rows[0]
            metric_values = row.get("metricValues", [])
            
            # Map metric values to our schema
            metrics_data = {
                "sessions": float(metric_values[0].get("value", "0")) if len(metric_values) > 0 else 0,
                "totalUsers": float(metric_values[1].get("value", "0")) if len(metric_values) > 1 else 0,
                "screenPageViews": float(metric_values[2].get("value", "0")) if len(metric_values) > 2 else 0,
                "conversions": float(metric_values[3].get("value", "0")) if len(metric_values) > 3 else 0,
                "totalRevenue": float(metric_values[4].get("value", "0")) if len(metric_values) > 4 else 0.0
            }
        
        # Prepare dimensions (shared between MetricDaily + Signals)
        dimensions_data = {
            "propertyId": selected_property_id,
            "source": "GA4"
        }

        # ------------------------------------------------------------------
        # Backwards-compatible write to MetricDaily (v1 Data Hub)
        # ------------------------------------------------------------------
        metrics_json = json.dumps(metrics_data)
        dimensions_json = json.dumps(dimensions_data)

        # Idempotent write: check if MetricDaily row exists for (workspaceId, provider, date)
        # date is stored as DateTime, so we need to match on date part only
        existing_id = await fetchval(
            '''SELECT id FROM "MetricDaily"
               WHERE "workspaceId"=$1 AND provider=$2 AND DATE("date")=$3
               LIMIT 1''',
            workspace_id,
            provider,
            yesterday_str
        )

        if existing_id:
            # Update existing row
            await execute(
                '''UPDATE "MetricDaily"
                   SET "metricsJson"=$1, "dimensionsJson"=$2, "updatedAt"=NOW()
                   WHERE id=$3''',
                metrics_json,
                dimensions_json,
                existing_id
            )
        else:
            # Insert new row
            # date should be DateTime at midnight UTC
            date_dt = datetime.combine(yesterday_utc, datetime.min.time())

            # Generate ID (using uuid4)
            metric_id = str(uuid.uuid4())

            await execute(
                '''INSERT INTO "MetricDaily"(
                   id, "userId", "workspaceId", provider, "date", "metricsJson", "dimensionsJson", "createdAt", "updatedAt")
                   VALUES($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())''',
                metric_id,
                user_id,
                workspace_id,
                provider,
                date_dt,
                metrics_json,
                dimensions_json
            )

        # ------------------------------------------------------------------
        # v2 Signals write (TRAFFIC / ENGAGEMENT / CONVERSION minimal set)
        # ------------------------------------------------------------------
        try:
            # Normalize period as [start, end) for the UTC day
            period_start = datetime.combine(yesterday_utc, datetime.min.time())
            period_end = period_start + timedelta(days=1)

            # Remove existing Signals for this workspace/provider/day to keep it idempotent
            await execute(
                '''DELETE FROM "Signal"
                   WHERE "workspaceId"=$1
                     AND "sourceProvider"=$2
                     AND "periodStart"=$3
                     AND "periodEnd"=$4''',
                workspace_id,
                "GA4",
                period_start,
                period_end,
            )

            # Build minimal TRAFFIC / ENGAGEMENT / CONVERSION signals
            signals_args = []

            # TRAFFIC
            signals_args.append((
                str(uuid.uuid4()),
                workspace_id,
                "TRAFFIC",
                "GA4",
                period_start,
                period_end,
                "sessions",
                float(metrics_data.get("sessions", 0.0)),
                "count",
                json.dumps(dimensions_data),
                datetime.utcnow(),
            ))
            signals_args.append((
                str(uuid.uuid4()),
                workspace_id,
                "TRAFFIC",
                "GA4",
                period_start,
                period_end,
                "users",
                float(metrics_data.get("totalUsers", 0.0)),
                "count",
                json.dumps(dimensions_data),
                datetime.utcnow(),
            ))
            signals_args.append((
                str(uuid.uuid4()),
                workspace_id,
                "TRAFFIC",
                "GA4",
                period_start,
                period_end,
                "pageviews",
                float(metrics_data.get("screenPageViews", 0.0)),
                "count",
                json.dumps(dimensions_data),
                datetime.utcnow(),
            ))

            # ENGAGEMENT (simple: reuse pageviews as engagement proxy)
            signals_args.append((
                str(uuid.uuid4()),
                workspace_id,
                "ENGAGEMENT",
                "GA4",
                period_start,
                period_end,
                "pageviews",
                float(metrics_data.get("screenPageViews", 0.0)),
                "count",
                json.dumps(dimensions_data),
                datetime.utcnow(),
            ))

            # CONVERSION
            signals_args.append((
                str(uuid.uuid4()),
                workspace_id,
                "CONVERSION",
                "GA4",
                period_start,
                period_end,
                "conversions",
                float(metrics_data.get("conversions", 0.0)),
                "count",
                json.dumps(dimensions_data),
                datetime.utcnow(),
            ))

            await executemany(
                '''INSERT INTO "Signal"(
                       id, "workspaceId", type, "sourceProvider",
                       "periodStart", "periodEnd",
                       key, value, unit, dimensions, "createdAt")
                   VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)''',
                signals_args,
            )
        except Exception as e:
            # Log, but do not fail the whole sync if Signals write fails
            print(f"⚠️  Failed to write GA4 Signals for workspace {workspace_id}: {e}")

        # Always update authJson (in case token was refreshed)
        # refresh_google_token_if_needed updates auth_data in-place
        encrypted_auth = save_connection_auth(auth_data)
        await execute(
            '''UPDATE "Connection" SET "authJson"=$1, "updatedAt"=NOW() WHERE id=$2''',
            encrypted_auth,
            connection_id
        )

        return {
            "success": True,
            "date": yesterday_str,
            "metrics": metrics_data
        }

