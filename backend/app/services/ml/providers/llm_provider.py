"""Optional LLM-based classification provider.

This module is a template / adapter for production LLM integration.
It is NOT loaded or used by default.  The keyword provider is the default.

To use an LLM provider:
1. Install the SDK for your chosen model (e.g. ``pip install openai``).
2. Set ``ML_PROVIDER=llm``, ``ML_API_KEY``, and ``ML_MODEL_NAME`` in ``.env``.
3. Subclass ``LLMMLProvider`` or fill in the ``classify`` / ``extract_severity_keywords`` methods.

The provider must return the same ``ProviderClassificationResult`` as any
other provider so the ``MLClassificationService`` adapter works unchanged.
"""

from __future__ import annotations

import logging
from typing import Any, Mapping

from app.services.ml.providers.base import MLProvider, ProviderClassificationResult

logger = logging.getLogger(__name__)


class LLMMLProvider(MLProvider):
    """LLM-based classification provider (template).

    Requires ``ML_API_KEY`` and ``ML_MODEL_NAME`` environment variables.
    Subclass or implement the abstract methods for your chosen model.
    """

    def __init__(self, api_key: str, model_name: str) -> None:
        if not api_key:
            raise ValueError(
                "ML_API_KEY is required for the LLM provider. "
                "Set it in .env or use ML_PROVIDER=keyword instead."
            )
        self._api_key = api_key
        self._model_name = model_name

    def classify(
        self,
        text: str,
        language: str,
        complaint: Mapping[str, Any],
    ) -> ProviderClassificationResult:
        raise NotImplementedError(
            f"LLM provider ({self._model_name}) requires a concrete "
            "implementation.  Override this method with your LLM API call."
        )

    def extract_severity_keywords(
        self, text: str, language: str,
    ) -> list[str]:
        raise NotImplementedError(
            f"LLM provider ({self._model_name}) requires a concrete "
            "implementation.  Override this method with your LLM API call."
        )
