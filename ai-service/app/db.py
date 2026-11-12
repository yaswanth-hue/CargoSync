"""Async Postgres access (asyncpg) against the same Supabase DB Prisma uses.

Every query the AI runs goes through read_conn(), which opens a READ ONLY
transaction. Even if a bug or a prompt injection tried to write, Postgres
itself would refuse. That is what keeps the AI advisory-only.
"""
import datetime
import decimal
import uuid
from contextlib import asynccontextmanager
from urllib.parse import urlsplit, urlunsplit

import asyncpg

from .config import settings

_pool: asyncpg.Pool | None = None


def clean_dsn(url: str) -> str:
    """Prisma URLs carry params like ?pgbouncer=true that asyncpg rejects."""
    p = urlsplit(url)
    return urlunsplit((p.scheme, p.netloc, p.path, "", ""))


async def init_pool() -> None:
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(
            clean_dsn(settings.database_url),
            min_size=1,
            max_size=5,
            command_timeout=20,
            ssl="require",
            statement_cache_size=0,  # required behind Supabase's PgBouncer pooler
        )


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


@asynccontextmanager
async def read_conn():
    if _pool is None:
        raise RuntimeError("DB pool not initialised")
    async with _pool.acquire() as conn:
        async with conn.transaction(readonly=True):
            yield conn


def jsonable(value):
    """Convert asyncpg/Postgres types into plain JSON-safe Python values."""
    if isinstance(value, (datetime.datetime, datetime.date)):
        return value.isoformat()
    if isinstance(value, decimal.Decimal):
        return float(value)
    if isinstance(value, uuid.UUID):
        return str(value)
    if isinstance(value, dict):
        return {k: jsonable(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [jsonable(v) for v in value]
    return value


def rows(records) -> list[dict]:
    return [jsonable(dict(r)) for r in records]