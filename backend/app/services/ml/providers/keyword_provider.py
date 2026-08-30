"""Default keyword-based classification provider.

Works entirely offline with no external API.  Deterministic and fully
testable.  Supports: English, Hindi, Tamil, Bengali, Marathi.

Classification approach:
1. Concatenate title + description into a single text blob.
2. For each category, count how many unique keywords from any language
   appear in the text (word-boundary regex match for Latin script,
   substring match for non-Latin scripts).
3. The category with the most keyword hits wins.
4. Confidence = min(hits / 4, 0.95), so 4+ hits reaches maximum
   confidence.  Zero hits → category "Other", confidence 0.0.
5. Severity keywords are extracted similarly across all languages.
"""

from __future__ import annotations

import re
from typing import Any, Mapping

from app.services.ml.config import CATEGORY_DEPARTMENT_MAP
from app.services.ml.keywords import (
    CATEGORY_KEYWORDS,
    SEVERITY_KEYWORDS,
)
from app.services.ml.providers.base import MLProvider, ProviderClassificationResult


def _matches_keyword(keyword: str, text_lower: str) -> bool:
    """Match keyword using word-boundary regex for Latin script and substring match for other scripts."""
    kw_lower = keyword.lower()
    if kw_lower.isascii():
        return bool(re.search(r"\b" + re.escape(kw_lower) + r"\b", text_lower))
    return kw_lower in text_lower


class KeywordMLProvider(MLProvider):
    """Classify complaints using multilingual keyword matching."""

    def classify(
        self,
        text: str,
        language: str,
        complaint: Mapping[str, Any],
    ) -> ProviderClassificationResult:
        text_lower = text.lower()

        # Score each category by unique keyword hits across all languages
        scores: dict[str, int] = {}
        for category, lang_keywords in CATEGORY_KEYWORDS.items():
            hits = 0
            for _lang, keywords in lang_keywords.items():
                for keyword in keywords:
                    if _matches_keyword(keyword, text_lower):
                        hits += 1
            scores[category] = hits

        # Determine best category
        best_category = (
            max(scores, key=lambda k: scores[k])
            if any(scores.values())
            else "Other"
        )
        best_score = scores.get(best_category, 0)

        if best_score == 0:
            return ProviderClassificationResult(
                category="Other",
                department="general",
                confidence=0.0,
                severity_keywords=[],
            )

        # Confidence from hit count: 1→0.25, 2→0.50, 3→0.75, 4+→0.95
        confidence = round(min(best_score / 4.0, 0.95), 4)
        department = CATEGORY_DEPARTMENT_MAP.get(best_category, "general")
        severity = self.extract_severity_keywords(text, language)

        return ProviderClassificationResult(
            category=best_category,
            department=department,
            confidence=confidence,
            severity_keywords=severity,
        )

    def extract_severity_keywords(
        self, text: str, language: str,
    ) -> list[str]:
        text_lower = text.lower()
        found: list[str] = []
        seen_lower: set[str] = set()
        for _lang, keywords in SEVERITY_KEYWORDS.items():
            for keyword in keywords:
                kw_lower = keyword.lower()
                if kw_lower not in seen_lower and _matches_keyword(keyword, text_lower):
                    found.append(keyword)
                    seen_lower.add(kw_lower)
        return found
