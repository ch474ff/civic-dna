from __future__ import annotations

from functools import lru_cache
from typing import Any
from typing_extensions import Self

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    environment: str = "development"
    app_name: str = "Civic DNA API"
    database_url: str = "postgresql+psycopg://civic:civic@localhost:5432/civic_dna"
    jwt_secret: str = "change-me-in-local-env"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60
    officer_bootstrap_username: str | None = "officer"
    officer_bootstrap_password: str | None = "changeme"
    civic_create_tables: bool = False
    cors_allowed_origins: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]

    # Deduplication and clustering configuration
    dedup_threshold: float = 0.65
    dedup_geo_radius_meters: float = 300.0
    dedup_temporal_window_hours: float = 72.0
    dedup_weight_text: float = 0.35
    dedup_weight_geo: float = 0.30
    dedup_weight_dept: float = 0.15
    dedup_weight_category: float = 0.10
    dedup_weight_temporal: float = 0.10

    # Optional Neo4j configuration
    neo4j_uri: str | None = None
    neo4j_user: str | None = None
    neo4j_password: str | None = None

    @field_validator("cors_allowed_origins", mode="before")
    @classmethod
    def parse_cors_allowed_origins(cls, v: Any) -> list[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        if isinstance(v, (list, tuple, set)):
            return [str(origin).strip() for origin in v if str(origin).strip()]
        return []

    @model_validator(mode="after")
    def validate_production_security(self) -> Self:
        is_prod = self.environment.strip().lower() in ("production", "prod")
        if is_prod:
            insecure_secrets = {
                "change-me-in-local-env",
                "test-secret-do-not-use-32b-min-key",
                "secret",
                "changeme",
                "password",
            }
            if self.jwt_secret in insecure_secrets or len(self.jwt_secret) < 16:
                raise ValueError(
                    "Insecure JWT_SECRET detected in production environment. "
                    "You must provide a secure, secret key of at least 16 characters in production."
                )
            if self.officer_bootstrap_password == "changeme":
                raise ValueError(
                    "Insecure OFFICER_BOOTSTRAP_PASSWORD ('changeme') detected in production environment. "
                    "Please set a strong bootstrap password or disable automatic officer bootstrap."
                )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
