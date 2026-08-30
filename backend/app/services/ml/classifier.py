"""ML-powered complaint classification service.

Implements ``ClassificationService`` (the backend ABC) by delegating to a
configurable ML provider.  The default provider is keyword-based and works
offline.  Swap the provider without changing any routes or schemas.
"""

from __future__ import annotations

from typing import Any, Mapping

from app.services.classification import ClassificationResult, ClassificationService
from app.services.ml.providers.base import MLProvider
from app.services.ml.providers.keyword_provider import KeywordMLProvider


class MLClassificationService(ClassificationService):
    """Production classification service with pluggable provider."""

    def __init__(self, provider: MLProvider | None = None) -> None:
        self._provider = provider or KeywordMLProvider()

    def classify_complaint(
        self, complaint: Mapping[str, Any],
    ) -> ClassificationResult:
        title = str(complaint.get("title", ""))
        description = str(complaint.get("description", ""))
        language = str(complaint.get("language", "en"))
        text = f"{title} {description}"

        result = self._provider.classify(text, language, complaint)

        return ClassificationResult(
            department=result.department,
            category=result.category,
            confidence=result.confidence,
            extracted_severity_keywords=result.severity_keywords,
        )
