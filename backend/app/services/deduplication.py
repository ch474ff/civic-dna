from abc import ABC, abstractmethod
from typing import Any, Mapping, Sequence


class DeduplicationService(ABC):
    """Replace this implementation to plug in duplicate / cluster matching."""

    @abstractmethod
    def find_duplicate_cluster(
        self,
        complaint: Mapping[str, Any],
        existing_complaints: Sequence[Mapping[str, Any]],
    ) -> str | None:
        """Return an existing cluster_id or None to create a new cluster."""
        raise NotImplementedError


class StubDeduplicationService(DeduplicationService):
    def find_duplicate_cluster(
        self,
        complaint: Mapping[str, Any],
        existing_complaints: Sequence[Mapping[str, Any]],
    ) -> str | None:
        del complaint, existing_complaints
        return None
