"""
Google Analytics 4 OAuth endpoints.
"""
import secrets
import httpx
from datetime import datetime, timedelta
from fastapi import APIRouter, Query, HTTPException, status
from fastapi.responses import RedirectResponse
from app.config import settings, get_oauth_flow_requirements
from app.db import fetchrow, fetch, execute
from app.crypto import encrypt_dict, decrypt_dict
import uuid

router = APIRouter()


def generate_state() -> str:
    """Generate secure random state for OAuth."""
    return secrets.token_urlsafe(32)


@router.get("/oauth/ga4/start")
async def oauth_ga4_start(
    workspaceId: str = Query(..., description="Workspace ID"),
    userId: str = Query(..., description="User ID")
):
    """
    Start GA4 OAuth flow.
    Creates/updates Connection row with PENDING status and encrypted OAuth state.
    Redirects user to Google OAuth consent screen.
    """
    # Validate all required settings for OAuth flow
    requirements = get_oauth_flow_requirements()
    if not requirements["ready"]:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": "OAuth flow not configured",
                "message": "Missing required environment variables",
                "missing": requirements["missing"]
            }
        )
    
    # Validate inputs
    if not workspaceId or not userId:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="workspaceId and userId are required"
        )
    
    # Generate OAuth state
    state = generate_state()
    
    # Prepare encrypted authJson with OAuth state
    auth_data = {
        "oauth": {
            "state": state,
            "createdAt": datetime.utcnow().isoformat(),
            "provider": "GOOGLE_ANALYTICS"
        }
    }
    
    encrypted_auth = encrypt_dict(auth_data)
    
    # Check if Connection exists
    existing = await fetchrow(
        'SELECT id, "authJson" FROM "Connection" WHERE "workspaceId"=$1 AND provider=$2 LIMIT 1',
        workspaceId,
        "GOOGLE_ANALYTICS"
    )
    
    connection_id = str(uuid.uuid4())
    
    if existing:
        # Update existing connection
        connection_id = existing["id"]
        await execute(
            '''UPDATE "Connection" 
               SET "authJson"=$1, "status"=$2, "updatedAt"=NOW(), "userId"=$3
               WHERE "workspaceId"=$4 AND provider=$5''',
            encrypted_auth,
            "PENDING",
            userId,
            workspaceId,
            "GOOGLE_ANALYTICS"
        )
    else:
        # Insert new connection
        await execute(
            '''INSERT INTO "Connection"(id, "userId", "workspaceId", provider, "status", "authJson", "createdAt", "updatedAt")
               VALUES($1, $2, $3, $4, $5, $6, NOW(), NOW())''',
            connection_id,
            userId,
            workspaceId,
            "GOOGLE_ANALYTICS",
            "PENDING",
            encrypted_auth
        )
    
    # Build Google OAuth URL
    # Using GA4 Admin API scope for listing properties
    scope = "https://www.googleapis.com/auth/analytics.readonly"
    
    oauth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={settings.GOOGLE_CLIENT_ID}&"
        f"redirect_uri={settings.GOOGLE_REDIRECT_URI}&"
        f"response_type=code&"
        f"scope={scope}&"
        f"access_type=offline&"
        f"prompt=consent&"
        f"state={state}"
    )
    
    # Redirect to Google
    return RedirectResponse(url=oauth_url, status_code=302)


@router.get("/oauth/ga4/callback")
async def oauth_ga4_callback(
    code: str = Query(..., description="OAuth authorization code"),
    state: str = Query(..., description="OAuth state parameter")
):
    """
    Handle Google OAuth callback.
    Exchanges code for tokens, fetches GA4 properties, stores encrypted tokens.
    Redirects back to Next.js.
    """
    # Validate inputs
    if not code or not state:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="code and state are required"
        )
    
    # Validate all required settings for OAuth callback
    requirements = get_oauth_flow_requirements()
    if not requirements["ready"]:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": "OAuth flow not configured",
                "message": "Missing required environment variables",
                "missing": requirements["missing"]
            }
        )
    
    # Find all PENDING connections and check state match
    # Note: We need to check state in encrypted authJson, so we fetch all PENDING and decrypt
    all_pending = await fetch(
        'SELECT id, "workspaceId", "userId", "authJson" FROM "Connection" WHERE provider=$1 AND "status"=$2',
        "GOOGLE_ANALYTICS",
        "PENDING"
    )
    
    connection_match = None
    
    # Find connection with matching state
    for conn in all_pending:
        try:
            auth_data = decrypt_dict(conn["authJson"])
            stored_state = auth_data.get("oauth", {}).get("state")
            if stored_state == state:
                connection_match = conn
                break
        except Exception:
            # Skip connections with invalid authJson
            continue
    
    if not connection_match:
        # Redirect with error
        redirect_url = f"{settings.NEXTJS_BASE_URL or 'http://localhost:3000'}/data/google-analytics?error=no_pending_connection"
        return RedirectResponse(url=redirect_url, status_code=302)
    
    workspace_id = connection_match["workspaceId"]
    user_id = connection_match["userId"]
    connection_id = connection_match["id"]
    
    # Re-decrypt for later use
    auth_data = decrypt_dict(connection_match["authJson"])
    
    # Exchange code for tokens
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code"
            }
        )
        
        if token_response.status_code != 200:
            redirect_url = f"{settings.NEXTJS_BASE_URL or 'http://localhost:3000'}/data/google-analytics?error=token_exchange_failed"
            return RedirectResponse(url=redirect_url, status_code=302)
        
        token_data = token_response.json()
        access_token = token_data["access_token"]
        refresh_token = token_data.get("refresh_token")
        expires_in = token_data.get("expires_in", 3600)
        expires_at = (datetime.utcnow() + timedelta(seconds=expires_in)).isoformat()
        
        # Fetch GA4 properties using Admin API
        # Using Google Analytics Admin API v1beta to list account summaries
        # This gives us access to properties
        # Reference: https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/accounts/listAccountSummaries
        properties = []
        
        try:
            # Get account summaries (which include properties)
            # This endpoint returns all accounts the user has access to, with their properties
            admin_response = await client.get(
                "https://analyticsadmin.googleapis.com/v1beta/accountSummaries",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            if admin_response.status_code == 200:
                admin_data = admin_response.json()
                account_summaries = admin_data.get("accountSummaries", [])
                
                for account in account_summaries:
                    for property_summary in account.get("propertySummaries", []):
                        # property field format: "properties/123456789"
                        property_path = property_summary.get("property", "")
                        property_id = property_path.split("/")[-1] if "/" in property_path else property_path
                        
                        properties.append({
                            "propertyId": property_id,
                            "displayName": property_summary.get("displayName", "Unknown Property")
                        })
            else:
                print(f"Warning: Admin API returned {admin_response.status_code}: {admin_response.text}")
        except Exception as e:
            # If Admin API fails, log error but continue
            # User will see empty properties list and can retry OAuth
            print(f"Warning: Failed to fetch properties via Admin API: {e}")
            properties = []
        
        # Update authJson with tokens and properties
        auth_data["ga4"] = {
            "tokens": {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "expires_at": expires_at
            },
            "properties": properties,
            "selectedPropertyId": None
        }
        
        # Encrypt updated authJson
        encrypted_auth = encrypt_dict(auth_data)
        
        # Update Connection (status stays PENDING until property is selected)
        await execute(
            '''UPDATE "Connection" 
               SET "authJson"=$1, "updatedAt"=NOW()
               WHERE id=$2''',
            encrypted_auth,
            connection_id
        )
        
        # Redirect back to Next.js
        if properties:
            redirect_url = f"{settings.NEXTJS_BASE_URL or 'http://localhost:3000'}/data/google-analytics?connected=1"
        else:
            redirect_url = f"{settings.NEXTJS_BASE_URL or 'http://localhost:3000'}/data/google-analytics?connected=1&error=no_properties"
        
        return RedirectResponse(url=redirect_url, status_code=302)
