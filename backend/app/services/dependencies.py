from app.services.classification import ClassificationService, StubClassificationService
from app.services.deduplication import DeduplicationService, MultiSignalDeduplicationService
from app.services.graph import GraphService, create_graph_service
from app.services.scoring import ScoringService, StubScoringService


def get_classification_service() -> ClassificationService:
    return StubClassificationService()


def get_deduplication_service() -> DeduplicationService:
    return MultiSignalDeduplicationService()


def get_scoring_service() -> ScoringService:
    return StubScoringService()


def get_graph_service() -> GraphService:
    return create_graph_service()


