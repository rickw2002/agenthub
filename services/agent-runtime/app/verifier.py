from typing import Any


def verify_grounded_output(
    raw_result: dict[str, Any],
    allowed_citations: set[tuple[str, str, int]],
) -> dict[str, Any]:
    """
    Verify and clean the LLM output to ensure citations are real and unsupported content
    is moved to additional_reasoning.

    Args:
        raw_result: The raw dict from the LLM (should have reply, answer_from_sources, etc.)
        allowed_citations: Set of tuples (docId, chunkId, page) that are valid citations

    Returns:
        Cleaned dict with verified citations and moved content
    """
    # Ensure all required keys exist with defaults
    verified: dict[str, Any] = {
        "reply": str(raw_result.get("reply", "") or ""),
        "answer_from_sources": [],
        "additional_reasoning": raw_result.get("additional_reasoning", []),
        "missing_info_questions": raw_result.get("missing_info_questions", []),
    }

    # Process answer_from_sources: keep only items with valid citations
    answer_from_sources_raw = raw_result.get("answer_from_sources") or []
    moved_texts: list[str] = []

    for item in answer_from_sources_raw:
        if not isinstance(item, dict):
            continue

        text = str(item.get("text", "") or "").strip()
        if not text:
            continue  # Skip empty text

        citations_raw = item.get("citations") or []
        if not isinstance(citations_raw, list):
            continue

        # Normalize and filter citations
        valid_citations: list[dict[str, Any]] = []
        for c in citations_raw:
            if not isinstance(c, dict):
                continue

            # Normalize fields
            doc_id = str(c.get("docId", "") or "").strip()
            chunk_id = str(c.get("chunkId", "") or "").strip()
            try:
                page = int(c.get("page", 0) or 0)
            except (ValueError, TypeError):
                page = 0

            # Check if citation is allowed
            citation_tuple = (doc_id, chunk_id, page)
            if citation_tuple in allowed_citations:
                valid_citations.append(
                    {
                        "docId": doc_id,
                        "chunkId": chunk_id,
                        "page": page,
                    }
                )

        # If we have valid citations, keep the item
        if valid_citations:
            verified["answer_from_sources"].append(
                {
                    "text": text,
                    "citations": valid_citations,
                }
            )
        else:
            # No valid citations: move text to additional_reasoning
            if text:
                moved_texts.append(text)

    # Add moved texts to additional_reasoning with label "not_from_sources"
    for moved_text in moved_texts:
        verified["additional_reasoning"].append(
            {
                "text": moved_text,
                "label": "not_from_sources",
            }
        )

    # Ensure additional_reasoning is a list of {text, label}
    additional_reasoning_cleaned: list[dict[str, Any]] = []
    for item in verified["additional_reasoning"]:
        if not isinstance(item, dict):
            continue
        text = str(item.get("text", "") or "").strip()
        label = str(item.get("label", "") or "").strip()
        if text:  # Only keep non-empty text
            additional_reasoning_cleaned.append(
                {
                    "text": text,
                    "label": label or "reasoning",
                }
            )
    verified["additional_reasoning"] = additional_reasoning_cleaned

    # Ensure missing_info_questions is a list of non-empty strings
    missing_questions_cleaned: list[str] = []
    missing_questions_raw = verified["missing_info_questions"]
    if isinstance(missing_questions_raw, list):
        for q in missing_questions_raw:
            q_str = str(q).strip()
            if q_str:
                missing_questions_cleaned.append(q_str)
    verified["missing_info_questions"] = missing_questions_cleaned

    # If answer_from_sources is empty AND missing_info_questions is empty, add default question
    if not verified["answer_from_sources"] and not verified["missing_info_questions"]:
        verified["missing_info_questions"].append("Welke documenten of onderwerpen moet ik hiervoor gebruiken?")

    return verified

