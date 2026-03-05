import random
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models import RateLimitHit, User


async def _count_hits(db: AsyncSession, identifier: str, action: str, window: timedelta) -> int:
    cutoff = datetime.now(timezone.utc) - window
    result = await db.execute(
        select(func.count())
        .select_from(RateLimitHit)
        .where(
            RateLimitHit.identifier == identifier,
            RateLimitHit.action == action,
            RateLimitHit.created_at >= cutoff,
        )
    )
    return result.scalar_one()


async def _record_hit(db: AsyncSession, identifier: str, action: str) -> None:
    db.add(RateLimitHit(identifier=identifier, action=action))
    await db.flush()


async def _cleanup_old_hits(db: AsyncSession) -> None:
    """Probabilistic cleanup: ~5% of requests trigger a purge of records older than 48h."""
    if random.random() > 0.05:
        return
    cutoff = datetime.now(timezone.utc) - timedelta(hours=48)
    await db.execute(
        delete(RateLimitHit).where(RateLimitHit.created_at < cutoff)
    )


def _get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


class RateLimiter:
    """Configurable per-action rate limiter that checks both user and IP limits."""

    def __init__(
        self,
        action: str,
        user_limit: int,
        ip_limit: int,
        window: timedelta = timedelta(hours=24),
    ):
        self.action = action
        self.user_limit = user_limit
        self.ip_limit = ip_limit
        self.window = window

    async def __call__(
        self,
        request: Request,
        user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        client_ip = _get_client_ip(request)

        user_hits = await _count_hits(db, user.email, self.action, self.window)
        if user_hits >= self.user_limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded: {self.user_limit} {self.action}s per day. Try again tomorrow.",
            )

        ip_hits = await _count_hits(db, f"ip:{client_ip}", self.action, self.window)
        if ip_hits >= self.ip_limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded from this network. Try again later.",
            )

        await _record_hit(db, user.email, self.action)
        await _record_hit(db, f"ip:{client_ip}", self.action)
        await _cleanup_old_hits(db)

        return user


upload_rate_limit = RateLimiter(action="upload", user_limit=10, ip_limit=20)
download_rate_limit = RateLimiter(action="download", user_limit=100, ip_limit=200)
