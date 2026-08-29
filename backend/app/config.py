from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Civic DNA API"
    database_url: str = "postgresql+psycopg://civic:civic@localhost:5432/civic_dna"
    jwt_secret: str = "change-me-in-local-env"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60
    officer_bootstrap_username: str | None = "officer"
    officer_bootstrap_password: str | None = "changeme"
    civic_create_tables: bool = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
