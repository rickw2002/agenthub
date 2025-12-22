"""
Weekly report generation logic for WeeklyReportV2.
"""
import json
import os
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List

from openai import OpenAI

from app.db import fetch, fetchrow, execute


def _get_openai_client() -> OpenAI:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY not configured for intel service")
    
    return OpenAI(api_key=api_key)


async def generate_weekly_report_for_workspace(
    workspace_id: str,
    week_start: datetime,
    week_end: datetime,
) -> str:
    """
    Generate a WeeklyReportV2 for a workspace.
    
    Returns the report ID.
    """
    # Check if report already exists for this week
    existing = await fetchrow(
        '''SELECT id FROM "WeeklyReportV2"
           WHERE "workspaceId"=$1 AND "weekStart"=$2 AND "weekEnd"=$3
           LIMIT 1''',
        workspace_id,
        week_start,
        week_end
    )
    
    if existing:
        # Report already exists, skip
        return existing["id"]
    
    # Fetch Signals for this week
    signals = await fetch(
        '''SELECT id, type, "sourceProvider", key, value, unit, dimensions, "createdAt"
           FROM "Signal"
           WHERE "workspaceId"=$1
             AND "periodStart" >= $2
             AND "periodEnd" <= $3
           ORDER BY "createdAt" DESC''',
        workspace_id,
        week_start,
        week_end
    )
    
    # Fetch previous week's signals for comparison (scoreboard deltas)
    prev_week_start = week_start - timedelta(days=7)
    prev_week_end = week_start - timedelta(seconds=1)
    
    prev_signals = await fetch(
        '''SELECT type, key, SUM(value) as total_value
           FROM "Signal"
           WHERE "workspaceId"=$1
             AND "periodStart" >= $2
             AND "periodEnd" <= $3
           GROUP BY type, key''',
        workspace_id,
        prev_week_start,
        prev_week_end
    )
    
    # Fetch latest InsightV2 for this week (or most recent if none in week)
    insight = await fetchrow(
        '''SELECT id, observations, hypotheses, opportunities, sources, "createdAt"
           FROM "InsightV2"
           WHERE "workspaceId"=$1
             AND "periodStart" >= $2
             AND "periodEnd" <= $3
           ORDER BY "createdAt" DESC
           LIMIT 1''',
        workspace_id,
        week_start,
        week_end
    )
    
    if not insight:
        # Fallback: get most recent insight
        insight = await fetchrow(
            '''SELECT id, observations, hypotheses, opportunities, sources, "createdAt"
               FROM "InsightV2"
               WHERE "workspaceId"=$1
               ORDER BY "createdAt" DESC
               LIMIT 1''',
            workspace_id
        )
    
    # Build scoreboard (key metrics deltas)
    scoreboard = {}
    signal_totals = {}
    
    for sig in signals:
        sig_type = sig["type"]
        sig_key = sig["key"]
        sig_value = float(sig["value"])
        
        key = f"{sig_type}_{sig_key}"
        signal_totals[key] = signal_totals.get(key, 0) + sig_value
    
    # Compare with previous week
    prev_totals = {}
    for prev_sig in prev_signals:
        key = f"{prev_sig['type']}_{prev_sig['key']}"
        prev_totals[key] = float(prev_sig["total_value"] or 0)
    
    for key, current_value in signal_totals.items():
        prev_value = prev_totals.get(key, 0)
        delta = current_value - prev_value
        delta_pct = ((delta / prev_value * 100) if prev_value > 0 else 0) if prev_value > 0 else None
        
        scoreboard[key] = {
            "current": current_value,
            "previous": prev_value,
            "delta": delta,
            "deltaPercent": delta_pct
        }
    
    # Build insights highlights (from InsightV2 if available)
    insights_highlights = []
    if insight:
        try:
            observations = json.loads(insight["observations"]) if isinstance(insight["observations"], str) else insight["observations"]
            insights_highlights = [obs.get("text", str(obs)) for obs in observations[:3]]  # Top 3
        except Exception:
            insights_highlights = []
    
    # Generate summary, decisions, and risks using LLM
    client = _get_openai_client()
    
    signals_summary_text = "\n".join([
        f"- {sig['type']} {sig['key']}: {sig['value']} {sig['unit']}"
        for sig in signals[:20]  # Limit to top 20
    ])
    
    insight_summary = ""
    if insight:
        try:
            obs = json.loads(insight["observations"]) if isinstance(insight["observations"], str) else insight["observations"]
            opps = json.loads(insight["opportunities"]) if isinstance(insight["opportunities"], str) else insight["opportunities"]
            insight_summary = f"Observations: {len(obs)}. Opportunities: {len(opps)}."
        except Exception:
            pass
    
    prompt = f"""Generate a weekly business report for the week {week_start.date().isoformat()} to {week_end.date().isoformat()}.

Key metrics (this week):
{signals_summary_text}

{insight_summary if insight_summary else "No insights available for this week."}

Provide a JSON response with:
- summary: A 2-3 sentence human-readable summary of the week
- decisions: Array of 1-3 suggested decisions/actions (each as {{"action": "...", "reason": "..."}})
- risks: Array of 1-2 identified risks or noise factors (each as {{"risk": "...", "severity": "LOW|MEDIUM|HIGH"}})

Output ONLY valid JSON, no markdown or extra text."""

    try:
        completion = client.chat.completions.create(
            model=os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
            messages=[
                {"role": "system", "content": "You are a business intelligence analyst. Generate concise, actionable weekly reports."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
        )
        
        raw_text = completion.choices[0].message.content or "{}"
        report_data = json.loads(raw_text)
        
        summary = report_data.get("summary", "No summary available.")
        decisions = report_data.get("decisions", [])
        risks = report_data.get("risks", [])
    except Exception as e:
        # Fallback if LLM fails
        summary = f"Weekly report for {week_start.date().isoformat()} to {week_end.date().isoformat()}. {len(signals)} signals recorded."
        decisions = []
        risks = []
    
    # Create WeeklyReportV2
    report_id = str(uuid.uuid4())
    
    await execute(
        '''INSERT INTO "WeeklyReportV2"(
               id, "workspaceId", "weekStart", "weekEnd",
               summary, scoreboard, insights, decisions, risks, "createdAt")
           VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)''',
        report_id,
        workspace_id,
        week_start,
        week_end,
        summary,
        json.dumps(scoreboard),
        json.dumps(insights_highlights),
        json.dumps(decisions),
        json.dumps(risks),
        datetime.utcnow()
    )
    
    return report_id

