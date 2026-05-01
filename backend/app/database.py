import logging

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

logger = logging.getLogger(__name__)

engine = None
async_session_factory = None


class Base(DeclarativeBase):
    pass


def init_engine(database_url: str) -> None:
    global engine, async_session_factory
    engine = create_async_engine(database_url, echo=False, pool_size=5, max_overflow=10)
    async_session_factory = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    logger.info("Database engine initialized")


async def create_tables() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created")


async def get_async_session() -> AsyncSession:
    async with async_session_factory() as session:
        yield session


async def dispose_engine() -> None:
    global engine
    if engine:
        await engine.dispose()
        engine = None
