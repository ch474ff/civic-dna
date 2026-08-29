from __future__ import annotations

import math
import re
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import UTC, datetime
from difflib import SequenceMatcher
from typing import Any, Mapping, Sequence

from app.config import Settings, get_settings

# Common English stopwords for lightweight token filtering
STOPWORDS: frozenset[str] = frozenset(
    {
        "a",
        "about",
        "above",
        "after",
        "again",
        "against",
        "all",
        "am",
        "an",
        "and",
        "any",
        "are",
        "as",
        "at",
        "be",
        "because",
        "been",
        "before",
        "being",
        "below",
        "between",
        "both",
        "but",
        "by",
        "could",
        "did",
        "do",
        "does",
        "doing",
        "down",
        "during",
        "each",
        "few",
        "for",
        "from",
        "further",
        "had",
        "has",
        "have",
        "having",
        "he",
        "her",
        "here",
        "hers",
        "herself",
        "him",
        "himself",
        "his",
        "how",
        "i",
        "if",
        "in",
        "into",
        "is",
        "it",
        "its",
        "itself",
        "just",
        "me",
        "more",
        "most",
        "my",
        "myself",
        "near",
        "no",
        "nor",
        "not",
        "now",
        "of",
        "off",
        "on",
        "once",
        "only",
        "or",
        "other",
        "our",
        "ours",
        "ourselves",
        "out",
        "over",
        "own",
        "same",
        "she",
        "should",
        "so",
        "some",
        "such",
        "than",
        "that",
        "the",
        "their",
        "theirs",
        "them",
        "themselves",
        "then",
        "there",
        "these",
        "they",
        "this",
        "those",
        "through",
        "to",
        "too",
        "under",
        "until",
        "up",
        "very",
        "was",
        "we",
        "were",
        "what",
        "when",
        "where",
        "which",
        "while",
        "who",
        "whom",
        "why",
        "with",
        "you",
        "your",
        "yours",
        "yourself",
        "yourselves",
    }
)


@dataclass(frozen=True)
class SimilarityBreakdown:
    total_score: float
    text_score: float
    geo_score: float
    category_score: float
    dept_score: float
    temporal_score: float
    distance_meters: float | None
    time_delta_seconds: float | None


class TextSimilarityEngine:
    """Lightweight, deterministic text and semantic similarity engine.

    Uses token overlap (Jaccard/Dice), light stemming, character n-gram matching, and sequence similarity.
    Isolate behind this class so future implementations can substitute embeddings / vector search.
    """

    @staticmethod
    def stem(word: str) -> str:
        """Lightweight heuristic stemmer for common English civic domain suffixes."""
        w = word.lower()
        if len(w) <= 3:
            return w
        for suffix in ("ing", "tion", "ment", "ness", "able", "ible", "ed", "es", "ly", "s"):
            if w.endswith(suffix) and len(w) - len(suffix) >= 3:
                return w[: -len(suffix)]
        return w

    @classmethod
    def tokenize(cls, text: str) -> list[str]:
        if not text:
            return []
        cleaned = re.sub(r"[^\w\s]", " ", text.lower())
        tokens = [
            cls.stem(t)
            for t in cleaned.split()
            if t and t not in STOPWORDS and len(t) > 1
        ]
        return tokens

    @staticmethod
    def char_ngrams(text: str, n: int = 3) -> set[str]:
        if not text:
            return set()
        cleaned = re.sub(r"\s+", " ", text.lower().strip())
        if len(cleaned) < n:
            return {cleaned} if cleaned else set()
        return {cleaned[i : i + n] for i in range(len(cleaned) - n + 1)}

    @classmethod
    def token_dice(cls, tokens1: Sequence[str], tokens2: Sequence[str]) -> float:
        if not tokens1 and not tokens2:
            return 0.0
        set1, set2 = set(tokens1), set(tokens2)
        if not set1 or not set2:
            return 0.0
        intersection = len(set1 & set2)
        return (2.0 * intersection) / (len(set1) + len(set2))

    @classmethod
    def ngram_dice(cls, text1: str, text2: str, n: int = 3) -> float:
        t1, t2 = text1.strip().lower(), text2.strip().lower()
        if not t1 or not t2:
            return 0.0
        grams1 = cls.char_ngrams(t1, n)
        grams2 = cls.char_ngrams(t2, n)
        if not grams1 or not grams2:
            return 0.0
        intersection = len(grams1 & grams2)
        return (2.0 * intersection) / (len(grams1) + len(grams2))

    @classmethod
    def string_similarity(cls, text1: str, text2: str) -> float:
        t1, t2 = (text1 or "").strip().lower(), (text2 or "").strip().lower()
        if not t1 and not t2:
            return 1.0
        if not t1 or not t2:
            return 0.0
        if t1 == t2:
            return 1.0

        tokens1, tokens2 = cls.tokenize(t1), cls.tokenize(t2)
        # If neither string contains content tokens (e.g. only stopwords), return 0 unless identical
        if not tokens1 and not tokens2:
            return 1.0 if t1 == t2 else 0.0

        tok_sim = cls.token_dice(tokens1, tokens2)
        ngram_sim = cls.ngram_dice(t1, t2, n=3)
        seq_sim = SequenceMatcher(None, t1, t2).ratio()
        return 0.50 * tok_sim + 0.30 * ngram_sim + 0.20 * seq_sim

    @classmethod
    def compute_text_similarity(
        cls,
        c1: Mapping[str, Any],
        c2: Mapping[str, Any],
    ) -> float:
        title1, title2 = (c1.get("title") or "").strip(), (c2.get("title") or "").strip()
        desc1, desc2 = (c1.get("description") or "").strip(), (c2.get("description") or "").strip()

        if not title1 and not desc1 and not title2 and not desc2:
            return 1.0

        title_sim = cls.string_similarity(title1, title2)
        desc_sim = cls.string_similarity(desc1, desc2)

        # Full text similarity
        full1 = f"{title1} {desc1}".strip()
        full2 = f"{title2} {desc2}".strip()
        full_sim = cls.string_similarity(full1, full2)

        # Cross-comparison (title against description)
        cross_sim_1 = cls.string_similarity(title1, desc2) if title1 and desc2 else 0.0
        cross_sim_2 = cls.string_similarity(title2, desc1) if title2 and desc1 else 0.0
        cross_sim = 0.5 * (cross_sim_1 + cross_sim_2)

        combined = max(
            0.55 * title_sim + 0.45 * desc_sim,
            full_sim,
            0.40 * title_sim + 0.30 * desc_sim + 0.30 * cross_sim,
        )

        # Keyword similarity if extracted_severity_keywords are present
        kw1 = set(str(k).lower().strip() for k in (c1.get("extracted_severity_keywords") or []))
        kw2 = set(str(k).lower().strip() for k in (c2.get("extracted_severity_keywords") or []))
        if kw1 and kw2:
            kw_sim = (2.0 * len(kw1 & kw2)) / (len(kw1) + len(kw2))
            combined = 0.80 * combined + 0.20 * kw_sim

        return max(0.0, min(1.0, combined))


class DeduplicationService(ABC):
    """Abstract interface for duplicate complaint cluster matching."""

    @abstractmethod
    def find_duplicate_cluster(
        self,
        complaint: Mapping[str, Any],
        existing_complaints: Sequence[Mapping[str, Any]],
    ) -> str | None:
        """Return an existing cluster_id or None to create a new cluster."""
        raise NotImplementedError


class StubDeduplicationService(DeduplicationService):
    """Default stub returning None (creates a new cluster for every complaint)."""

    def find_duplicate_cluster(
        self,
        complaint: Mapping[str, Any],
        existing_complaints: Sequence[Mapping[str, Any]],
    ) -> str | None:
        del complaint, existing_complaints
        return None


class MultiSignalDeduplicationService(DeduplicationService):
    """Multi-signal deduplication combining text, geographic, category, department, and temporal signals."""

    def __init__(
        self,
        threshold: float | None = None,
        geo_radius_meters: float | None = None,
        temporal_window_hours: float | None = None,
        weight_text: float | None = None,
        weight_geo: float | None = None,
        weight_dept: float | None = None,
        weight_category: float | None = None,
        weight_temporal: float | None = None,
        text_engine: TextSimilarityEngine | None = None,
    ) -> None:
        settings: Settings = get_settings()
        self.threshold = threshold if threshold is not None else settings.dedup_threshold
        self.geo_radius_meters = (
            geo_radius_meters if geo_radius_meters is not None else settings.dedup_geo_radius_meters
        )
        self.temporal_window_hours = (
            temporal_window_hours if temporal_window_hours is not None else settings.dedup_temporal_window_hours
        )
        self.weight_text = weight_text if weight_text is not None else settings.dedup_weight_text
        self.weight_geo = weight_geo if weight_geo is not None else settings.dedup_weight_geo
        self.weight_dept = weight_dept if weight_dept is not None else settings.dedup_weight_dept
        self.weight_category = (
            weight_category if weight_category is not None else settings.dedup_weight_category
        )
        self.weight_temporal = (
            weight_temporal if weight_temporal is not None else settings.dedup_weight_temporal
        )
        self.text_engine = text_engine or TextSimilarityEngine()

    @staticmethod
    def haversine_distance(
        lat1: float | None,
        lng1: float | None,
        lat2: float | None,
        lng2: float | None,
    ) -> float | None:
        """Compute surface distance in meters using Haversine formula."""
        if lat1 is None or lng1 is None or lat2 is None or lng2 is None:
            return None
        try:
            lat1, lng1, lat2, lng2 = float(lat1), float(lng1), float(lat2), float(lng2)
        except (ValueError, TypeError):
            return None

        if not (-90 <= lat1 <= 90 and -180 <= lng1 <= 180 and -90 <= lat2 <= 90 and -180 <= lng2 <= 180):
            return None

        # Earth radius in meters
        r = 6371000.0
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lng2 - lng1)

        a = (
            math.sin(delta_phi / 2.0) ** 2
            + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
        )
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        return r * c

    def compute_geo_similarity(
        self,
        c1: Mapping[str, Any],
        c2: Mapping[str, Any],
    ) -> tuple[float, float | None]:
        """Return geographic similarity [0.0, 1.0] and raw distance in meters."""
        lat1, lng1 = c1.get("lat"), c1.get("lng")
        lat2, lng2 = c2.get("lat"), c2.get("lng")

        dist = self.haversine_distance(lat1, lng1, lat2, lng2)
        if dist is None:
            # Missing coordinates: return 0.0 with None distance
            return 0.0, None

        if dist <= 0.0:
            return 1.0, 0.0
        if dist >= self.geo_radius_meters:
            return 0.0, dist

        # Linear decay within radius
        score = 1.0 - (dist / self.geo_radius_meters)
        return max(0.0, min(1.0, score)), dist

    @staticmethod
    def compute_category_similarity(
        c1: Mapping[str, Any],
        c2: Mapping[str, Any],
    ) -> float:
        cat1 = (c1.get("category") or "").strip().lower()
        cat2 = (c2.get("category") or "").strip().lower()

        if not cat1 or not cat2 or cat1 == "unclassified" or cat2 == "unclassified":
            # Neutral compatibility score
            return 0.5
        if cat1 == cat2:
            return 1.0
        return 0.0

    @staticmethod
    def compute_department_similarity(
        c1: Mapping[str, Any],
        c2: Mapping[str, Any],
    ) -> float:
        dept1 = (c1.get("department") or "").strip().lower()
        dept2 = (c2.get("department") or "").strip().lower()

        if not dept1 or not dept2 or dept1 == "general" or dept2 == "general":
            # Neutral compatibility score
            return 0.5
        if dept1 == dept2:
            return 1.0
        return 0.0

    @staticmethod
    def _parse_datetime(val: Any) -> datetime | None:
        if isinstance(val, datetime):
            return val if val.tzinfo is not None else val.replace(tzinfo=UTC)
        if isinstance(val, str):
            try:
                dt = datetime.fromisoformat(val.replace("Z", "+00:00"))
                return dt if dt.tzinfo is not None else dt.replace(tzinfo=UTC)
            except (ValueError, TypeError):
                return None
        return None

    def compute_temporal_similarity(
        self,
        c1: Mapping[str, Any],
        c2: Mapping[str, Any],
    ) -> tuple[float, float | None]:
        """Compute temporal proximity between two complaints."""
        t1 = self._parse_datetime(c1.get("created_at") or c1.get("timestamp"))
        t2 = self._parse_datetime(c2.get("created_at") or c2.get("timestamp"))

        if t1 is None or t2 is None:
            # Neutral score when timestamps are absent
            return 0.8, None

        delta_seconds = abs((t1 - t2).total_seconds())
        window_seconds = max(1.0, self.temporal_window_hours * 3600.0)

        if delta_seconds >= window_seconds:
            return 0.0, delta_seconds

        score = 1.0 - (delta_seconds / window_seconds)
        return max(0.0, min(1.0, score)), delta_seconds

    def score_pair(
        self,
        complaint: Mapping[str, Any],
        candidate: Mapping[str, Any],
    ) -> SimilarityBreakdown:
        """Compute detailed multi-signal similarity between two complaints."""
        text_score = self.text_engine.compute_text_similarity(complaint, candidate)
        geo_score, distance_meters = self.compute_geo_similarity(complaint, candidate)
        cat_score = self.compute_category_similarity(complaint, candidate)
        dept_score = self.compute_department_similarity(complaint, candidate)
        temporal_score, delta_seconds = self.compute_temporal_similarity(complaint, candidate)

        # Gating: If both complaints have valid coordinates but are beyond the geographic radius,
        # they represent physically different incidents and cannot belong to the same duplicate cluster.
        if distance_meters is not None and distance_meters > self.geo_radius_meters:
            return SimilarityBreakdown(
                total_score=0.0,
                text_score=text_score,
                geo_score=0.0,
                category_score=cat_score,
                dept_score=dept_score,
                temporal_score=temporal_score,
                distance_meters=distance_meters,
                time_delta_seconds=delta_seconds,
            )

        # Dynamic weight adjustment if geographic or temporal information is missing
        w_text = self.weight_text
        w_geo = self.weight_geo if distance_meters is not None else 0.0
        w_cat = self.weight_category
        w_dept = self.weight_dept
        w_time = self.weight_temporal if delta_seconds is not None else 0.0

        total_weight = w_text + w_geo + w_cat + w_dept + w_time
        if total_weight <= 0.0:
            weighted_score = text_score
        else:
            weighted_score = (
                w_text * text_score
                + w_geo * geo_score
                + w_cat * cat_score
                + w_dept * dept_score
                + w_time * temporal_score
            ) / total_weight

        total_score = max(0.0, min(1.0, weighted_score))

        return SimilarityBreakdown(
            total_score=total_score,
            text_score=text_score,
            geo_score=geo_score,
            category_score=cat_score,
            dept_score=dept_score,
            temporal_score=temporal_score,
            distance_meters=distance_meters,
            time_delta_seconds=delta_seconds,
        )

    def find_duplicate_cluster(
        self,
        complaint: Mapping[str, Any],
        existing_complaints: Sequence[Mapping[str, Any]],
    ) -> str | None:
        """Evaluate candidate complaints and return the best matching cluster_id if score >= threshold."""
        if not existing_complaints:
            return None

        current_id = complaint.get("complaint_id")
        best_cluster_id: str | None = None
        best_score: float = -1.0

        for candidate in existing_complaints:
            candidate_cluster_id = candidate.get("cluster_id")
            if not candidate_cluster_id:
                continue

            # Skip comparing the complaint to itself
            candidate_id = candidate.get("complaint_id")
            if current_id and candidate_id and current_id == candidate_id:
                continue

            breakdown = self.score_pair(complaint, candidate)
            if breakdown.total_score >= self.threshold and breakdown.total_score > best_score:
                best_score = breakdown.total_score
                best_cluster_id = str(candidate_cluster_id)

        return best_cluster_id

