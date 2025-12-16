import json
import os
import re
from typing import Any

import psycopg

# Common stopwords (NL + EN)
_STOPWORDS = {
    "de", "het", "een", "en", "van", "in", "op", "is", "te", "dat", "die", "voor", "met", "aan", "als", "bij",
    "the", "be", "to", "of", "and", "a", "in", "that", "have", "i", "it", "for", "not", "on", "with", "he", "as",
    "you", "do", "at", "this", "but", "his", "by", "from", "they", "we", "say", "her", "she", "or", "an", "will",
    "my", "one", "all", "would", "there", "their",
}


def get_conn():
    """
    Create a PostgreSQL connection using DATABASE_URL from environment.
    Supabase DATABASE_URL typically includes sslmode=require already.
    """
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("Environment variable DATABASE_URL is required for database access.")

    # Connect using the connection string as-is
    # Supabase URLs typically already include sslmode=require
    conn = psycopg.connect(database_url)

    return conn


def fetch_workspace_context(workspace_id: str) -> dict[str, Any] | None:
    """
    Fetch workspace context (profile, goals, preferences) from the database.

    Args:
        workspace_id: The workspace ID to fetch context for

    Returns:
        Dictionary with keys: profileJson, goalsJson, preferencesJson
        Values are parsed JSON objects if valid JSON, otherwise raw strings.
        Returns None if workspace not found.
    """
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT "profileJson", "goalsJson", "preferencesJson"
                FROM "WorkspaceContext"
                WHERE "workspaceId" = %s
                LIMIT 1
                """,
                (workspace_id,),
            )
            row = cur.fetchone()
            if not row:
                return None

            profile_json, goals_json, preferences_json = row

            result: dict[str, Any] = {}

            # Parse profileJson if it's a JSON string
            if profile_json:
                try:
                    result["profileJson"] = json.loads(profile_json) if isinstance(profile_json, str) else profile_json
                except (json.JSONDecodeError, TypeError):
                    result["profileJson"] = profile_json

            # Parse goalsJson if it's a JSON string
            if goals_json:
                try:
                    result["goalsJson"] = json.loads(goals_json) if isinstance(goals_json, str) else goals_json
                except (json.JSONDecodeError, TypeError):
                    result["goalsJson"] = goals_json

            # Parse preferencesJson if it's a JSON string
            if preferences_json:
                try:
                    result["preferencesJson"] = (
                        json.loads(preferences_json) if isinstance(preferences_json, str) else preferences_json
                    )
                except (json.JSONDecodeError, TypeError):
                    result["preferencesJson"] = preferences_json

            return result
    finally:
        conn.close()


def normalize_text(s: str) -> str:
    """
    Normalize text: lowercase and strip whitespace.

    Args:
        s: Input string

    Returns:
        Normalized string
    """
    return s.lower().strip()


def extract_keywords(query: str) -> list[str]:
    """
    Extract meaningful keywords from a query string.

    - Split on non-alphanumeric characters
    - Drop keywords shorter than 3 characters
    - Drop common stopwords (NL + EN)
    - Deduplicate and keep max 12 keywords

    Args:
        query: The search query string

    Returns:
        List of extracted keywords (normalized, lowercase)
    """
    # Split on non-alphanumeric characters
    words = re.split(r"[^\w]+", query.lower())

    # Filter: min 3 chars, not in stopwords
    keywords = []
    seen = set()
    for word in words:
        word = word.strip()
        if len(word) >= 3 and word not in _STOPWORDS and word not in seen:
            keywords.append(word)
            seen.add(word)
            if len(keywords) >= 12:
                break

    return keywords


def search_document_chunks(workspace_id: str, query: str, limit: int = 8) -> list[dict[str, Any]]:
    """
    Search for document chunks using keyword scoring.

    If no keywords extracted -> fallback to most recent chunks.
    Otherwise -> fetch candidates with ILIKE, score by keyword matches, return top N.

    Args:
        workspace_id: The workspace ID to search within
        query: The search query string
        limit: Maximum number of results to return (default: 8)

    Returns:
        List of dictionaries with keys: id, documentId, workspaceId, chunkIndex, text, score
    """
    keywords = extract_keywords(query)

    conn = get_conn()
    try:
        with conn.cursor() as cur:
            # If no keywords, fallback to most recent chunks
            if not keywords:
                # Try ordering by createdAt DESC, fallback to id DESC if column doesn't exist
                try:
                    cur.execute(
                        """
                        SELECT "id", "documentId", "workspaceId", "chunkIndex", "text"
                        FROM "DocumentChunk"
                        WHERE "workspaceId" = %s
                        ORDER BY "createdAt" DESC
                        LIMIT %s
                        """,
                        (workspace_id, limit),
                    )
                except Exception:
                    # Fallback to id DESC if createdAt doesn't exist
                    cur.execute(
                        """
                        SELECT "id", "documentId", "workspaceId", "chunkIndex", "text"
                        FROM "DocumentChunk"
                        WHERE "workspaceId" = %s
                        ORDER BY "id" DESC
                        LIMIT %s
                        """,
                        (workspace_id, limit),
                    )

                rows = cur.fetchall()
                results = []
                for row in rows:
                    results.append(
                        {
                            "id": row[0],
                            "documentId": row[1],
                            "workspaceId": row[2],
                            "chunkIndex": row[3],
                            "text": row[4],
                            "score": 0,  # No scoring for fallback
                        }
                    )
                return results

            # Build ILIKE OR conditions for each keyword
            keyword_patterns = [f"%{kw}%" for kw in keywords]
            conditions = " OR ".join(['"text" ILIKE %s'] * len(keyword_patterns))

            # Fetch candidate set (up to 50)
            cur.execute(
                f"""
                SELECT "id", "documentId", "workspaceId", "chunkIndex", "text"
                FROM "DocumentChunk"
                WHERE "workspaceId" = %s AND ({conditions})
                LIMIT 50
                """,
                (workspace_id, *keyword_patterns),
            )
            rows = cur.fetchall()

            # Score each chunk in Python
            scored_chunks = []
            for row in rows:
                chunk_id = row[0]
                document_id = row[1]
                workspace_id_val = row[2]
                chunk_index = row[3]
                text = row[4] if row[4] else ""

                # Normalize text for scoring
                text_lower = normalize_text(text)
                text_first_200 = text_lower[:200] if len(text_lower) > 200 else text_lower

                # Count keyword matches
                score = 0
                for keyword in keywords:
                    if keyword in text_lower:
                        score += 1
                        # Bonus if keyword appears in first 200 chars
                        if keyword in text_first_200:
                            score += 1

                scored_chunks.append(
                    {
                        "id": chunk_id,
                        "documentId": document_id,
                        "workspaceId": workspace_id_val,
                        "chunkIndex": chunk_index,
                        "text": text,
                        "score": score,
                    }
                )

            # Sort by score DESC, then by chunkIndex ASC
            scored_chunks.sort(key=lambda x: (-x["score"], x["chunkIndex"]))

            # Return top limit
            return scored_chunks[:limit]

    finally:
        conn.close()

