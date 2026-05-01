from functools import lru_cache
from typing import Union

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "TeamDashboard"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True

    DATABASE_URL: str = (
        "postgresql+asyncpg://teamdash:teamdash_pass@localhost:5437/teamdash"
    )

    # Comma-separated origins, e.g. "http://localhost:5177,https://failsafe.amd.com"
    CORS_ORIGINS: Union[list[str], str] = (
        "http://localhost:5177,http://failsafe.amd.com,https://failsafe.amd.com"
    )

    # Comma-separated initial team roster (display names). Seeded only if
    # team_members is empty. Edit roster from the UI afterwards.
    SEED_MEMBERS: str = (
        "Ajay,Member 2,Member 3,Member 4,Member 5,"
        "Member 6,Member 7,Member 8,Member 9,Member 10"
    )

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def _split_cors(cls, v):
        if isinstance(v, str):
            return [s.strip() for s in v.split(",") if s.strip()]
        return v

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)


@lru_cache
def get_settings() -> Settings:
    return Settings()
