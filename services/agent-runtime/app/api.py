from typing import Any

from fastapi import APIRouter, Depends

from .callback import post_run_callback
from .db import extract_keywords, fetch_workspace_context, search_document_chunks
from .llm import generate_grounded_doc_answer
from .models import AgentRunInput, AgentRunOutput, AdditionalReasoningItem
from .security import verify_secret_header
from .settings import AGENT_RUNTIME_DEBUG
from .verifier import verify_grounded_output


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
    Agent runtime implementation.

    For agentId == "doc-qa-v1": fetches workspace context and searches document chunks.
    Otherwise: returns dummy response.
    """
    # Special handling for doc-qa-v1 agent
    if input.agentId == "doc-qa-v1":
        # Fetch workspace context
        workspace_context = fetch_workspace_context(input.workspaceId)

        # Retrieve chunks with keyword scoring and project scoping
        keywords = extract_keywords(input.message)
        chunks = search_document_chunks(
            workspace_id=input.workspaceId,
            query=input.message,
            organization_id=input.organizationId,
            project_id=input.projectId,
            use_global_library=input.useGlobalLibrary,
            limit=8,
        )

        # Build allowed_citations set from retrieved chunks
        allowed_citations: set[tuple[str, str, int]] = set()
        for chunk in chunks:
            doc_id = str(chunk.get("documentId", ""))
            chunk_id = str(chunk.get("id", ""))  # DB chunk id
            page = int(chunk.get("chunkIndex", 0))
            allowed_citations.add((doc_id, chunk_id, page))

        # Call OpenAI to generate grounded answer
        raw_result = generate_grounded_doc_answer(input.message, workspace_context, chunks)

        # Handle OpenAI / parsing errors
        error_info = raw_result.get("__error__") if isinstance(raw_result, dict) else None
        if error_info:
            # Callback on failure if runId is present
            if input.runId:
                await post_run_callback(
                    run_id=input.runId,
                    status="failed",
                    summary="doc-qa-v1 failed",
                    error=str(error_info),
                    metadata={
                        "retrievedChunkIds": [str(c.get("id", "")) for c in chunks],
                        "citationsCount": 0,
                        "verifierMovedCount": 0,
                    },
                )

            return AgentRunOutput(
                reply="Ik kan op dit moment geen betrouwbaar antwoord genereren.",
                answer_from_sources=[],
                additional_reasoning=[
                    AdditionalReasoningItem(
                        text=str(error_info),
                        label="error",
                    )
                ],
                missing_info_questions=[
                    "Kun je je vraag iets specifieker maken?",
                ],
            )

        # Verify and clean the output (enforce real citations)
        try:
            verified = verify_grounded_output(raw_result, allowed_citations)
        except Exception as verify_error:
            # If verification fails, return safe fallback
            error_msg = f"verification_error: {type(verify_error).__name__}: {verify_error}"

            # Callback on failure if runId is present
            if input.runId:
                await post_run_callback(
                    run_id=input.runId,
                    status="failed",
                    summary="doc-qa-v1 failed",
                    error=error_msg,
                    metadata={
                        "retrievedChunkIds": [str(c.get("id", "")) for c in chunks],
                        "citationsCount": 0,
                        "verifierMovedCount": 0,
                    },
                )

            return AgentRunOutput(
                reply="Ik kan op dit moment geen betrouwbaar antwoord genereren.",
                answer_from_sources=[],
                additional_reasoning=[
                    AdditionalReasoningItem(
                        text=error_msg,
                        label="error",
                    )
                ],
                missing_info_questions=[
                    "Kun je je vraag iets specifieker maken?",
                ],
            )

        # Try to map the verified result to AgentRunOutput schema
        try:
            reply = str(verified.get("reply", "") or "")

            # answer_from_sources: already verified by verifier, just map to our format
            answer_from_sources_raw = verified.get("answer_from_sources") or []
            answer_from_sources: list[dict] = []
            for item in answer_from_sources_raw:
                if not isinstance(item, dict):
                    continue
                text = str(item.get("text", "") or "")
                citations_raw = item.get("citations") or []
                citations: list[dict] = []
                for c in citations_raw:
                    if not isinstance(c, dict):
                        continue
                    citations.append(
                        {
                            "docId": str(c.get("docId", "") or ""),
                            "chunkId": str(c.get("chunkId", "") or ""),
                            "page": int(c.get("page", 0) or 0),
                        }
                    )
                # Verifier already ensures citations exist, but double-check
                if not citations:
                    continue
                answer_from_sources.append(
                    {
                        "text": text,
                        "citations": citations,
                    }
                )

            # additional_reasoning: already verified by verifier (includes moved texts)
            additional_reasoning_raw = verified.get("additional_reasoning") or []
            additional_reasoning: list[AdditionalReasoningItem] = []
            for item in additional_reasoning_raw:
                if not isinstance(item, dict):
                    continue
                text = str(item.get("text", "") or "")
                label = str(item.get("label", "") or "")
                additional_reasoning.append(
                    AdditionalReasoningItem(
                        text=text,
                        label=label or "reasoning",
                    )
                )

            # Optioneel: één debug-item met keywords en scores (alleen als AGENT_RUNTIME_DEBUG == "1")
            if AGENT_RUNTIME_DEBUG == "1" and chunks:
                debug_parts: list[str] = []
                if keywords:
                    debug_parts.append(f"keywords={', '.join(keywords)}")
                top_chunks = [f"chunk-{c['id']}:score-{c.get('score', 0)}" for c in chunks[:5]]
                if top_chunks:
                    debug_parts.append(f"top_chunks={', '.join(top_chunks)}")

                if debug_parts:
                    additional_reasoning.append(
                        AdditionalReasoningItem(
                            text=" | ".join(debug_parts),
                            label="debug",
                        )
                    )

            missing_info_questions_raw = verified.get("missing_info_questions") or []
            missing_info_questions: list[str] = []
            for q in missing_info_questions_raw:
                missing_info_questions.append(str(q))

            # Calculate metadata for callback
            retrieved_chunk_ids = [str(c.get("id", "")) for c in chunks]
            citations_count = sum(len(item.get("citations", [])) for item in answer_from_sources)
            verifier_moved_count = sum(
                1 for item in additional_reasoning_raw if item.get("label") == "not_from_sources"
            )

            # Build metadata (include keywords only if debug enabled)
            metadata: dict[str, Any] = {
                "retrievedChunkIds": retrieved_chunk_ids,
                "citationsCount": citations_count,
                "verifierMovedCount": verifier_moved_count,
            }
            if AGENT_RUNTIME_DEBUG == "1" and keywords:
                metadata["keywords"] = keywords

            # Callback on success if runId is present
            if input.runId:
                await post_run_callback(
                    run_id=input.runId,
                    status="success",
                    summary="doc-qa-v1 completed",
                    metadata=metadata,
                )

            return AgentRunOutput(
                reply=reply or "Ik kan op dit moment geen betrouwbaar antwoord genereren.",
                answer_from_sources=answer_from_sources,
                additional_reasoning=additional_reasoning,
                missing_info_questions=missing_info_questions,
            )
        except Exception as parse_error:
            error_msg = f"parse_error: {type(parse_error).__name__}: {parse_error}"

            # Callback on failure if runId is present
            if input.runId:
                await post_run_callback(
                    run_id=input.runId,
                    status="failed",
                    summary="doc-qa-v1 failed",
                    error=error_msg,
                    metadata={
                        "retrievedChunkIds": [str(c.get("id", "")) for c in chunks],
                        "citationsCount": 0,
                        "verifierMovedCount": 0,
                    },
                )

            return AgentRunOutput(
                reply="Ik kan op dit moment geen betrouwbaar antwoord genereren.",
                answer_from_sources=[],
                additional_reasoning=[
                    AdditionalReasoningItem(
                        text=error_msg,
                        label="error",
                    )
                ],
                missing_info_questions=[
                    "Kun je je vraag iets specifieker maken?",
                ],
            )

    # Default dummy implementation for other agents
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



