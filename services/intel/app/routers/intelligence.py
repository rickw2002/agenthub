"""
Intelligence generation endpoints (InsightV2 pipeline).
"""
import json
import os
import uuid
from datetime import datetime
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from openai import OpenAI

from app.db import fetch, execute
from app.middleware.auth import require_intel_key

router = APIRouter()


class IntelligenceGenerateRequest(BaseModel):
  """Request body for intelligence generation."""

  workspaceId: str = Field(..., description="Workspace ID")
  periodStart: datetime = Field(..., description="Start of analysis period (inclusive, UTC)")
  periodEnd: datetime = Field(..., description="End of analysis period (exclusive, UTC)")


def _get_openai_client() -> OpenAI:
  api_key = os.getenv("OPENAI_API_KEY")
  if not api_key:
    raise RuntimeError("OPENAI_API_KEY not configured for intel service")

  return OpenAI(api_key=api_key)


def _build_intelligence_prompt(
  workspace_id: str,
  period_start: datetime,
  period_end: datetime,
  selected_signals: List[Dict[str, Any]],
) -> str:
  """
  Build a compact but precise prompt for the LLM.

  Each observation MUST be grounded in the provided signals.
  Hypotheses MUST be clearly labelled as hypotheses.
  """
  period_str = f"{period_start.date().isoformat()} t/m {period_end.date().isoformat()}"

  # Compress signals into a text table-like summary
  lines: List[str] = []
  for s in selected_signals:
    dims = s.get("dimensions") or {}
    dim_parts = []
    for key in ["channel", "page", "campaign", "sourceProvider"]:
      if key in dims:
        dim_parts.append(f"{key}={dims[key]}")
    dim_str = ", ".join(dim_parts) if dim_parts else "global"
    lines.append(
      f"- [{s['type']}] {s['key']} = {s['value']} {s['unit']} ({dim_str}, signalId={s['id']})"
    )

  signals_block = "\n".join(lines)

  return (
    "You are an analytics strategist for B2B companies.\n"
    "You receive normalized Signals from multiple data providers.\n"
    "Each signal has a type (TRAFFIC, ENGAGEMENT, CONVERSION, COST, CONTENT, REVENUE), "
    "a numeric value, and optional dimensions like channel, page or campaign.\n\n"
    f"Workspace: {workspace_id}\n"
    f"Period: {period_str}\n\n"
    "Signals (id, type, key, value, unit, dimensions):\n"
    f"{signals_block}\n\n"
    "TASK:\n"
    "1) Create 3–6 factual observations that are DIRECTLY grounded in the signals above.\n"
    "   - Each observation MUST reference at least one signalId from the list.\n"
    "2) Create 2–4 hypotheses that explain WHY these patterns might be happening.\n"
    "   - Clearly label them as hypotheses (e.g. start text with 'Hypothesis:').\n"
    "   - Each hypothesis must also reference at least one signalId.\n"
    "3) Create 3–6 opportunities for content/experiments based on the signals.\n"
    "   - Each opportunity should have: topic, angle, whyNow, ctaStyle, and signalIds.\n\n"
    "Respond ONLY with a single JSON object using this exact structure:\n"
    "{\n"
    '  "observations": [\n'
    '    { "text": string, "signalIds": [string, ...] }\n'
    "  ],\n"
    '  "hypotheses": [\n'
    '    { "text": string, "signalIds": [string, ...] }\n'
    "  ],\n"
    '  "opportunities": [\n'
    '    { "topic": string, "angle": string, "whyNow": string, "ctaStyle": string, "signalIds": [string, ...] }\n'
    "  ]\n"
    "}\n"
    "The JSON must be valid and parseable. Do not add explanations outside the JSON."
  )


def _validate_intel_response(data: Dict[str, Any]) -> Dict[str, Any]:
  """
  Basic validator to ensure required keys/shape exist.
  """
  if not isinstance(data, dict):
    raise ValueError("Response is not a JSON object")

  for key in ["observations", "hypotheses", "opportunities"]:
    if key not in data:
      raise ValueError(f"Missing key '{key}' in response")
    if not isinstance(data[key], list):
      raise ValueError(f"Field '{key}' must be a list")

  return data


def _select_signals(signals: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
  """
  Rule-based selection of top signals for the given period.

  Strategy (MVP):
  - Top TRAFFIC signals by value (e.g. sessions, users, pageviews)
  - Top ENGAGEMENT signals by value
  - Top CONVERSION signals by value
  """
  def top_by_type(t: str, limit: int = 5) -> List[Dict[str, Any]]:
    filtered = [s for s in signals if s.get("type") == t]
    return sorted(filtered, key=lambda s: float(s.get("value", 0.0)), reverse=True)[:limit]

  selected: List[Dict[str, Any]] = []
  selected.extend(top_by_type("TRAFFIC"))
  selected.extend(top_by_type("ENGAGEMENT"))
  selected.extend(top_by_type("CONVERSION"))

  # De-duplicate by id
  seen = set()
  unique: List[Dict[str, Any]] = []
  for s in selected:
    sid = s.get("id")
    if sid and sid not in seen:
      seen.add(sid)
      unique.append(s)

  return unique


@router.post("/intelligence/generate")
async def generate_intelligence(
  request: IntelligenceGenerateRequest,
  intel_auth: bool = Depends(require_intel_key),
) -> Dict[str, Any]:
  """
  Generate an InsightV2 object for a workspace/period using Signals + LLM.

  - Protected by X-Intel-API-Key.
  - Reads Signals from the shared Postgres DB.
  - Calls OpenAI to produce structured JSON.
  - Stores result in InsightV2 with sources = selected signal IDs.
  """
  workspace_id = request.workspaceId
  period_start = request.periodStart
  period_end = request.periodEnd

  if period_start >= period_end:
    raise HTTPException(
      status_code=status.HTTP_400_BAD_REQUEST,
      detail="periodStart must be before periodEnd",
    )

  # Fetch signals for workspace/period
  rows = await fetch(
    '''SELECT id, type, "sourceProvider", key, value, unit, dimensions, "createdAt"
       FROM "Signal"
       WHERE "workspaceId"=$1
         AND "periodStart" >= $2
         AND "periodEnd" <= $3''',
    workspace_id,
    period_start,
    period_end,
  )

  signals: List[Dict[str, Any]] = []
  for r in rows:
    d = dict(r)
    # dimensions is JSONB, ensure it is a dict
    dims = d.get("dimensions")
    if isinstance(dims, str):
      try:
        dims = json.loads(dims)
      except Exception:
        dims = {}
    d["dimensions"] = dims or {}
    signals.append(d)

  if not signals:
    raise HTTPException(
      status_code=status.HTTP_400_BAD_REQUEST,
      detail="No Signals found for the given workspace/period",
    )

  selected_signals = _select_signals(signals)
  if not selected_signals:
    raise HTTPException(
      status_code=status.HTTP_400_BAD_REQUEST,
      detail="No Signals selected for intelligence generation",
    )

  # Build prompt and call OpenAI
  prompt = _build_intelligence_prompt(
    workspace_id=workspace_id,
    period_start=period_start,
    period_end=period_end,
    selected_signals=selected_signals,
  )

  try:
    client = _get_openai_client()
  except RuntimeError as e:
    raise HTTPException(
      status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
      detail=str(e),
    )

  try:
    completion = client.chat.completions.create(
      model=os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
      messages=[
        {"role": "system", "content": "You are a precise analytics strategist. Respond only with valid JSON."},
        {"role": "user", "content": prompt},
      ],
      response_format={"type": "json_object"},
      temperature=0.3,
    )
    raw_text = completion.choices[0].message.content or "{}"
    data = json.loads(raw_text)
    intel_json = _validate_intel_response(data)
  except Exception as e:
    print(f"❌ OpenAI intelligence generation failed for workspace {workspace_id}: {e}")
    raise HTTPException(
      status_code=status.HTTP_502_BAD_GATEWAY,
      detail="LLM generation failed",
    )

  # Persist InsightV2
  insight_id = str(uuid.uuid4())
  now = datetime.utcnow()
  source_signal_ids = [s["id"] for s in selected_signals if s.get("id")]

  await execute(
    '''INSERT INTO "InsightV2"(
           id, "workspaceId",
           "periodStart", "periodEnd",
           observations, hypotheses, opportunities,
           sources, "createdAt")
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)''',
    insight_id,
    workspace_id,
    period_start,
    period_end,
    json.dumps(intel_json.get("observations", [])),
    json.dumps(intel_json.get("hypotheses", [])),
    json.dumps(intel_json.get("opportunities", [])),
    json.dumps({"signalIds": source_signal_ids}),
    now,
  )

  return {
    "ok": True,
    "insightId": insight_id,
    "workspaceId": workspace_id,
    "periodStart": period_start,
    "periodEnd": period_end,
    "sources": {"signalIds": source_signal_ids},
  }


