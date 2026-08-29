"""ML-powered priority scoring service.

Implements ``ScoringService`` (the backend ABC).

Formula
-------
score = w_severity   × severity_factor
      + w_cluster    × cluster_factor
      + w_location   × location_factor
      + w_category   × category_risk

Default weights  (severity=0.40, cluster=0.20, location=0.20, category=0.20)
ensure that a life-safety issue can outrank a large but low-severity cluster.

All factors are in [0, 1].  The final score is clamped to [0, 1].
"""

from __future__ import annotations

from typing import Any, Mapping

from app.services.ml.config import (
    CATEGORY_RISK,
    CLUSTER_SIZE_CAP,
    DEFAULT_SCORING_WEIGHTS,
    DEPARTMENT_CATEGORY_MAP,
    ScoringWeights,
)
from app.services.ml.keywords import SENSITIVE_LOCATION_KEYWORDS, SEVERITY_KEYWORDS
from app.services.scoring import ScoringService


class MLScoringService(ScoringService):
    """Priority scorer driven by severity, cluster size, location, and category."""

    def __init__(self, weights: ScoringWeights | None = None) -> None:
        self._weights = weights or DEFAULT_SCORING_WEIGHTS

    # -- public interface (matches ScoringService ABC) -----------------------

    def score_priority(
        self,
        complaint: Mapping[str, Any],
        cluster_context: Mapping[str, Any],
    ) -> float:
        text = f"{complaint.get('title', '')} {complaint.get('description', '')}"

        severity_factor = self._severity_factor(text)
        cluster_factor = self._cluster_factor(cluster_context)
        location_factor = self._location_factor(text)
        category_risk = self._category_risk(cluster_context)

        score = (
            self._weights.severity * severity_factor
            + self._weights.cluster_size * cluster_factor
            + self._weights.location_sensitivity * location_factor
            + self._weights.category_risk * category_risk
        )
        return round(min(1.0, max(0.0, score)), 4)

    # -- private helpers -----------------------------------------------------

    @staticmethod
    def _severity_factor(text: str) -> float:
        """Count severity keyword hits → normalise to [0, 1]."""
        text_lower = text.lower()
        hits = 0
        seen: set[str] = set()
        for _lang, keywords in SEVERITY_KEYWORDS.items():
            for kw in keywords:
                kw_lower = kw.lower()
                if kw_lower not in seen and kw_lower in text_lower:
                    hits += 1
                    seen.add(kw_lower)
        # 3 severity keywords → factor = 1.0
        return min(hits / 3.0, 1.0)

    @staticmethod
    def _cluster_factor(cluster_context: Mapping[str, Any]) -> float:
        member_count = int(cluster_context.get("member_count") or 0)
        return min(member_count / CLUSTER_SIZE_CAP, 1.0)

    @staticmethod
    def _location_factor(text: str) -> float:
        text_lower = text.lower()
        hits = 0
        seen: set[str] = set()
        for _lang, keywords in SENSITIVE_LOCATION_KEYWORDS.items():
            for kw in keywords:
                kw_lower = kw.lower()
                if kw_lower not in seen and kw_lower in text_lower:
                    hits += 1
                    seen.add(kw_lower)
        # 2 location keywords → factor = 1.0
        return min(hits / 2.0, 1.0)

    @staticmethod
    def _category_risk(cluster_context: Mapping[str, Any]) -> float:
        department = str(cluster_context.get("department") or "general")
        category = DEPARTMENT_CATEGORY_MAP.get(department, "Other")
        return CATEGORY_RISK.get(category, CATEGORY_RISK["Other"])
