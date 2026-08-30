from __future__ import annotations

from app.services.classification import ClassificationService
from app.services.deduplication import DeduplicationService, MultiSignalDeduplicationService
from app.services.graph import GraphService, create_graph_service
from app.services.ml.classifier import MLClassificationService
from app.services.ml.scorer import MLScoringService
from app.services.scoring import ScoringService

_graph_service_instance: GraphService | None = None


def get_classification_service() -> ClassificationService:
    return MLClassificationService()


def get_deduplication_service() -> DeduplicationService:
    return MultiSignalDeduplicationService()


def get_scoring_service() -> ScoringService:
    return MLScoringService()


def get_graph_service() -> GraphService:
    global _graph_service_instance
    if _graph_service_instance is None:
        _graph_service_instance = create_graph_service()
    return _graph_service_instance
