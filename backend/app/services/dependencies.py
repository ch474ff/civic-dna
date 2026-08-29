from app.services.classification import ClassificationService
from app.services.deduplication import DeduplicationService, MultiSignalDeduplicationService
from app.services.graph import GraphService, create_graph_service
from app.services.ml.classifier import MLClassificationService
from app.services.ml.scorer import MLScoringService
from app.services.scoring import ScoringService


def get_classification_service() -> ClassificationService:
    return MLClassificationService()


def get_deduplication_service() -> DeduplicationService:
    return MultiSignalDeduplicationService()


def get_scoring_service() -> ScoringService:
    return MLScoringService()


def get_graph_service() -> GraphService:
    return create_graph_service()
