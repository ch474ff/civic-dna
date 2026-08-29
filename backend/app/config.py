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


@lru_cache
def get_settings() -> Settings:
    return Settings()
