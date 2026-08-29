"""Abstract base for ML classification providers.

The provider architecture decouples the ClassificationService interface
(owned by the backend) from the underlying model or API.  Swap providers
without changing any routes, schemas, or pipeline code.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Mapping


@dataclass
class ProviderClassificationResult:
    """Internal result returned by a classification provider."""

    category: str
    department: str
    confidence: float
    severity_keywords: list[str] = field(default_factory=list)


class MLProvider(ABC):
    """Abstract base class for ML classification providers."""

    @abstractmethod
    def classify(
        self,
        text: str,
        language: str,
        complaint: Mapping[str, Any],
    ) -> ProviderClassificationResult:
        """Classify complaint text into a category with confidence."""
        raise NotImplementedError

    @abstractmethod
    def extract_severity_keywords(
        self, text: str, language: str,
    ) -> list[str]:
        """Extract severity-related keywords from text."""
        raise NotImplementedError
