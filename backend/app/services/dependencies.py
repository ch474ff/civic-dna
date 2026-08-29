from app.services.classification import ClassificationService, StubClassificationService
from app.services.deduplication import DeduplicationService, StubDeduplicationService
from app.services.scoring import ScoringService, StubScoringService


def get_classification_service() -> ClassificationService:
    return StubClassificationService()


def get_deduplication_service() -> DeduplicationService:
    return StubDeduplicationService()


def get_scoring_service() -> ScoringService:
    return StubScoringService()
