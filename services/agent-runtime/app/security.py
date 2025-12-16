from fastapi import Header, HTTPException, status

from .settings import AGENT_RUNTIME_SECRET


async def verify_secret_header(
    x_agent_runtime_secret: str | None = Header(default=None, alias="x-agent-runtime-secret"),
) -> None:
    """
    Verify that the incoming request includes the correct shared secret header.

    Raises HTTP 401 Unauthorized if the header is missing or does not match.
    """
    if not x_agent_runtime_secret or x_agent_runtime_secret != AGENT_RUNTIME_SECRET:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing agent runtime secret.",
        )


