"""
Database connection pool using asyncpg.
"""
import asyncpg
from typing import Optional, Any
from app.config import settings

# Global connection pool
_pool: Optional[asyncpg.Pool] = None


async def create_pool() -> asyncpg.Pool:
    """Create and return database connection pool."""
    global _pool
    
    if _pool is not None:
        return _pool
    
    if not settings.DATABASE_URL:
        raise ValueError("DATABASE_URL not configured")
    
    _pool = await asyncpg.create_pool(
        settings.DATABASE_URL,
        min_size=1,
        max_size=10,
        command_timeout=60
    )
    
    return _pool


async def close_pool() -> None:
    """Close database connection pool."""
    global _pool
    
    if _pool is not None:
        await _pool.close()
        _pool = None


async def get_pool() -> asyncpg.Pool:
    """Get existing pool or create new one."""
    if _pool is None:
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

