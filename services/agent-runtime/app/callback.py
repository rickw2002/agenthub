import logging
from typing import Any

import httpx

from .settings import AGENTHUB_BASE_URL, AGENT_SERVICE_KEY

logger = logging.getLogger(__name__)


async def post_run_callback(
    run_id: str,
    status: str,
    summary: str | None = None,
    result_url: str | None = None,
    error: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    """
    POST a callback to Next.js /api/runs/callback to update RunLog.

    If AGENTHUB_BASE_URL or AGENT_SERVICE_KEY is missing, does nothing silently.
    All errors are caught and logged, never raised to caller.

    Args:
        run_id: The run ID to update
        status: "success" or "failed"
        summary: Optional summary text
        result_url: Optional result URL
        error: Optional error message
        metadata: Optional metadata object
    """
    # If env vars are missing, do nothing
    if not AGENTHUB_BASE_URL or not AGENT_SERVICE_KEY:
        return

    # Build callback URL
    base_url = AGENTHUB_BASE_URL.rstrip("/")
    callback_url = f"{base_url}/api/runs/callback"

    # Build request body
    body: dict[str, Any] = {
        "runId": run_id,
        "status": status,
    }

    if summary is not None:
        body["summary"] = summary
    if result_url is not None:
        body["resultUrl"] = result_url
    if error is not None:
        body["error"] = error
    if metadata is not None:
        body["metadata"] = metadata

    # Make async POST request with timeout
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                callback_url,
                headers={
                    "Content-Type": "application/json",
                    "X-AGENT-SERVICE-KEY": AGENT_SERVICE_KEY,
                },
                json=body,
            )
            # Log non-2xx responses but don't raise
            if response.status_code >= 400:
                logger.warning(
                    f"Callback POST to {callback_url} returned status {response.status_code}: {response.text}"
                )
    except Exception as e:
        # Catch all exceptions and log, never raise
        logger.error(f"Failed to POST callback to {callback_url}: {type(e).__name__}: {e}")

