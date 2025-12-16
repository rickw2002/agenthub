import json
import os
from typing import Any, Dict, List, Optional

from openai import OpenAI


OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise RuntimeError("Environment variable OPENAI_API_KEY is required for OpenAI access.")

OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")

_client: Optional[OpenAI] = None


def get_client() -> OpenAI:
    """
    Lazily create a reusable OpenAI client instance.
    """
    global _client
    if _client is None:
        _client = OpenAI(api_key=OPENAI_API_KEY)
    return _client


def _build_system_prompt() -> str:
    return (
        "Je bent een behulpzame Nederlandse assistent die antwoorden geeft op basis van aangeleverde "
        "documentfragmenten. Je mag alleen feiten gebruiken die expliciet in de fragmenten staan. "
        "Als de informatie ontbreekt, geef je dat duidelijk aan en stel je verduidelijkende vragen."
    )


def _build_user_payload(
    question: str,
    workspace_context: Optional[Dict[str, Any]],
    chunks: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Bouwt de payload met context en chunks voor de LLM.
    """
    context_parts: List[str] = []
    if workspace_context:
        context_parts.append("WORKSPACE_CONTEXT:")
        context_parts.append(json.dumps(workspace_context, ensure_ascii=False))

    context_parts.append("DOCUMENT_CHUNKS:")
    # Truncate each chunk text to safe max length before building prompts
    MAX_CHUNK_TEXT_LENGTH = 4000
    for chunk in chunks:
        # We geven expliciete metadata mee zodat de LLM goede citations kan maken
        # Ensure chunkId matches the DB chunk id string (it's the "id" field from the chunk dict)
        meta = {
            "docId": str(chunk.get("documentId", "")),
            "chunkId": str(chunk.get("id", "")),  # This is the DB chunk id
            "page": int(chunk.get("chunkIndex", 0)),
        }
        # Truncate chunk text to safe max length
        chunk_text = str(chunk.get("text", ""))
        if len(chunk_text) > MAX_CHUNK_TEXT_LENGTH:
            chunk_text = chunk_text[:MAX_CHUNK_TEXT_LENGTH]
        context_parts.append(
            json.dumps(
                {
                    "meta": meta,
                    "text": chunk_text,
                },
                ensure_ascii=False,
            )
        )

    context_str = "\n".join(context_parts)

    instructions = {
        "question": question,
        "context": context_str,
        "output_schema": {
            "reply": "string",
            "answer_from_sources": [
                {
                    "text": "string",
                    "citations": [
                        {"docId": "string", "chunkId": "string", "page": 0},
                    ],
                }
            ],
            "additional_reasoning": [
                {"text": "string", "label": "string"},
            ],
            "missing_info_questions": ["string"],
        },
        "rules": [
            "Gebruik ALLEEN de meegegeven documentfragmenten als bron voor 'answer_from_sources'.",
            "Elke 'answer_from_sources' entry MOET minimaal 1 citation bevatten.",
            "Als de fragmenten onvoldoende informatie bevatten, vul je relevante vragen in 'missing_info_questions'.",
            "'additional_reasoning' is alleen voor uitleg / meta-commentaar en moet duidelijk NIET als bron worden gepresenteerd.",
            "Geen hallucinatie: verzin geen feiten die niet in de fragmenten staan.",
            "Schrijf alle antwoorden in het Nederlands.",
        ],
    }

    return instructions


def generate_grounded_doc_answer(
    question: str,
    workspace_context: Optional[Dict[str, Any]],
    chunks: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Genereer een gegrond antwoord op basis van document-chunks via OpenAI.

    Retourneert een dict die het verwachte JSON-schema probeert te volgen.
    Bij fouten wordt een dict met een __error__-sleutel teruggegeven.
    """
    client = get_client()

    messages = [
        {"role": "system", "content": _build_system_prompt()},
        {
            "role": "user",
            "content": (
                "Je krijgt een vraag en een set documentfragmenten met metadata. "
                "Gebruik het volgende JSON-schema EXACT voor je antwoord:\n"
                "{\n"
                '  "reply": "string",\n'
                '  "answer_from_sources": [\n'
                "     {\n"
                '       "text": "string",\n'
                '       "citations": [\n'
                '          { "docId": "string", "chunkId": "string", "page": 0 }\n'
                "       ]\n"
                "     }\n"
                "  ],\n"
                '  "additional_reasoning": [\n'
                '     { "text": "string", "label": "string" }\n'
                "  ],\n"
                '  "missing_info_questions": ["string"]\n'
                "}\n\n"
                "BELANGRIJK: retourneer ALLEEN geldige JSON zonder uitleg eromheen.\n"
                "Hier is de input (in JSON):\n"
                + json.dumps(
                    _build_user_payload(question, workspace_context, chunks),
                    ensure_ascii=False,
                )
            ),
        },
    ]

    try:
        # Eerst proberen met response_format als de SDK/model dit ondersteunt.
        try:
            completion = client.chat.completions.create(
                model=OPENAI_MODEL,
                messages=messages,
                temperature=0.2,
                response_format={"type": "json_object"},
            )
        except Exception:
            # Fallback zonder response_format, de prompt eist dan geldige JSON.
            completion = client.chat.completions.create(
                model=OPENAI_MODEL,
                messages=messages,
                temperature=0.2,
            )

        content = completion.choices[0].message.content or "{}"

        data = json.loads(content)
        if not isinstance(data, dict):
            raise ValueError("Model response is not a JSON object")

        return data
    except Exception as e:  # Laat de caller beslissen wat hiermee te doen
        return {
            "__error__": f"openai_error: {type(e).__name__}: {e}",
        }