from fastapi import APIRouter, Depends

from .models import AgentRunInput, AgentRunOutput, AdditionalReasoningItem
from .security import verify_secret_header


router = APIRouter()


@router.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@router.post(
    "/v1/agents/run",
    response_model=AgentRunOutput,
    dependencies=[Depends(verify_secret_header)],
)
async def run_agent(input: AgentRunInput) -> AgentRunOutput:  # noqa: A002 - input is descriptive here
    """
    Dummy implementation of the agent runtime.

    Echoes back the message in a simple "OK: {message}" format and fills
    other fields with placeholder data.
    """
    reply_text = f"OK: {input.message}"

    return AgentRunOutput(
        reply=reply_text,
        answer_from_sources=[],
        additional_reasoning=[
            AdditionalReasoningItem(
                text="Placeholder: no sources used.",
                label="placeholder",
            )
        ],
        missing_info_questions=[],
    )



