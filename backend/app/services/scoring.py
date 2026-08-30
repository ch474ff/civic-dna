from abc import ABC, abstractmethod
from typing import Any, Mapping


class ScoringService(ABC):
    """Replace this implementation to plug in priority scoring."""

    @abstractmethod
    def score_priority(self, complaint: Mapping[str, Any], cluster_context: Mapping[str, Any]) -> float:
        raise NotImplementedError


class StubScoringService(ScoringService):
    def score_priority(self, complaint: Mapping[str, Any], cluster_context: Mapping[str, Any]) -> float:
        del complaint
        member_count = int(cluster_context.get("member_count") or 0)
        score = 0.4 + min(member_count, 5) * 0.05
        return round(min(1.0, max(0.0, score)), 4)
