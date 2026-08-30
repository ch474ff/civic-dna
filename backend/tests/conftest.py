import os

os.environ["DATABASE_URL"] = "sqlite://"
os.environ["JWT_SECRET"] = "test-secret-do-not-use-32b-min-key"
os.environ["JWT_ALGORITHM"] = "HS256"
os.environ["CIVIC_CREATE_TABLES"] = "true"
os.environ["OFFICER_BOOTSTRAP_USERNAME"] = "officer"
os.environ["OFFICER_BOOTSTRAP_PASSWORD"] = "changeme"

from unittest.mock import Mock

import pytest
from fastapi.testclient import TestClient

from app.config import get_settings

get_settings.cache_clear()

from app.main import app
from app.services.classification import StubClassificationService
from app.services.deduplication import MultiSignalDeduplicationService, StubDeduplicationService
from app.services.dependencies import (
    get_classification_service,
    get_deduplication_service,
    get_scoring_service,
)
from app.services.scoring import StubScoringService


@pytest.fixture
def classification_spy() -> Mock:
    return Mock(wraps=StubClassificationService())


@pytest.fixture
def deduplication_spy() -> Mock:
    return Mock(wraps=MultiSignalDeduplicationService())



@pytest.fixture
def scoring_spy() -> Mock:
    return Mock(wraps=StubScoringService())


@pytest.fixture
def client(classification_spy: Mock, deduplication_spy: Mock, scoring_spy: Mock):
    app.dependency_overrides[get_classification_service] = lambda: classification_spy
    app.dependency_overrides[get_deduplication_service] = lambda: deduplication_spy
    app.dependency_overrides[get_scoring_service] = lambda: scoring_spy
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
