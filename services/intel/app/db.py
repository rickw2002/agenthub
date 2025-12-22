"""
Database connection pool using asyncpg.
"""
import asyncpg
from typing import Optional, Any
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
from app.config import settings

# Global connection pool
_pool: Optional[asyncpg.Pool] = None


def _ensure_ssl_in_url(database_url: str) -> str:
    """
    Ensure SSL parameters are in the database URL for Supabase/cloud Postgres.
    If sslmode is not present, add sslmode=require.
    """
    parsed = urlparse(database_url)
    query_params = parse_qs(parsed.query)
    
    # If sslmode is not set, add it
    if 'sslmode' not in query_params:
        query_params['sslmode'] = ['require']
    
    # Rebuild query string
    new_query = urlencode(query_params, doseq=True)
    new_parsed = parsed._replace(query=new_query)
    
    return urlunparse(new_parsed)


async def create_pool() -> asyncpg.Pool:
    """Create and return database connection pool."""
    global _pool
    
    if _pool is not None:
        return _pool
    
    if not settings.DATABASE_URL:
        raise ValueError("DATABASE_URL not configured")
    
    # Ensure SSL is enabled for Supabase/cloud Postgres
    database_url = _ensure_ssl_in_url(settings.DATABASE_URL)
    
    try:
        # asyncpg automatically respects sslmode in the connection string
        # We've already ensured sslmode=require is in the URL via _ensure_ssl_in_url
        _pool = await asyncpg.create_pool(
            database_url,
            min_size=1,
            max_size=10,
            command_timeout=60
        )
        print(f"✅ Database pool created successfully")
        return _pool
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Failed to create database pool: {error_msg}")
        print(f"   DATABASE_URL format: {settings.DATABASE_URL[:50]}... (hidden)")
        print(f"   Check:")
        print(f"   - DATABASE_URL is correct and accessible")
        print(f"   - Database server is running and reachable")
        print(f"   - SSL/TLS is properly configured")
        print(f"   - Firewall allows connections from Render")
        raise


async def close_pool() -> None:
    """Close database connection pool."""
    global _pool
    
    if _pool is not None:
        await _pool.close()
        _pool = None


async def get_pool() -> asyncpg.Pool:
    """Get existing pool or create new one."""
    if _pool is None:
        if not settings.DATABASE_URL:
            raise RuntimeError("DATABASE_URL not configured. Cannot connect to database.")
        return await create_pool()
    return _pool


async def fetchrow(query: str, *args) -> Optional[asyncpg.Record]:
    """Execute query and fetch one row."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        return await conn.fetchrow(query, *args)


async def fetch(query: str, *args) -> list[asyncpg.Record]:
    """Execute query and fetch all rows."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        return await conn.fetch(query, *args)


async def execute(query: str, *args) -> str:
    """Execute query (INSERT/UPDATE/DELETE) and return status."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        return await conn.execute(query, *args)


async def fetchval(query: str, *args) -> Optional[Any]:
    """Execute query and fetch single value."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        return await conn.fetchval(query, *args)


async def executemany(query: str, args_list: list[tuple]) -> None:
    """Execute query multiple times with different parameters."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.executemany(query, args_list)

