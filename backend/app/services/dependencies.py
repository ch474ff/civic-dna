from app.services.classification import ClassificationService
from app.services.deduplication import DeduplicationService, StubDeduplicationService
from app.services.ml.classifier import MLClassificationService
from app.services.ml.scorer import MLScoringService
from app.services.scoring import ScoringService


def get_classification_service() -> ClassificationService:
    return MLClassificationService()


def get_deduplication_service() -> DeduplicationService:
    return StubDeduplicationService()


def get_scoring_service() -> ScoringService:
    return MLScoringService()
