from abc import ABC, abstractmethod
from typing import Any, Mapping

from pydantic import BaseModel, Field


class ClassificationResult(BaseModel):
    department: str
    category: str
    confidence: float = 0.0
    extracted_severity_keywords: list[str] = Field(default_factory=list)


class ClassificationService(ABC):
    """Replace this implementation to plug in a real classifier."""

    @abstractmethod
    def classify_complaint(self, complaint: Mapping[str, Any]) -> ClassificationResult:
        raise NotImplementedError


class StubClassificationService(ClassificationService):
    def classify_complaint(self, complaint: Mapping[str, Any]) -> ClassificationResult:
        del complaint
        return ClassificationResult(
            department="general",
            category="unclassified",
            confidence=0.0,
            extracted_severity_keywords=[],
        )
