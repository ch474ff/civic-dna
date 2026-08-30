from __future__ import annotations

import re
from collections import Counter
from datetime import UTC, datetime
from typing import Any, Mapping, Sequence

from app.services.deduplication import STOPWORDS


def _parse_dt(val: Any) -> datetime | None:
    if isinstance(val, datetime):
        return val if val.tzinfo is not None else val.replace(tzinfo=UTC)
    if isinstance(val, str):
        try:
            dt = datetime.fromisoformat(val.replace("Z", "+00:00"))
            return dt if dt.tzinfo is not None else dt.replace(tzinfo=UTC)
        except (ValueError, TypeError):
            return None
    return None


def compute_cluster_complaint_count(complaints: Sequence[Mapping[str, Any]]) -> int:
    """Return total number of complaints in the cluster."""
    return len(complaints)


def compute_geographic_centroid(
    complaints: Sequence[Mapping[str, Any]],
) -> tuple[float, float] | None:
    """Compute the arithmetic mean (latitude, longitude) of all valid coordinates in the cluster."""
    valid_coords: list[tuple[float, float]] = []
    for c in complaints:
        lat, lng = c.get("lat"), c.get("lng")
        if lat is not None and lng is not None:
            try:
                lat_f, lng_f = float(lat), float(lng)
                if -90 <= lat_f <= 90 and -180 <= lng_f <= 180:
                    valid_coords.append((lat_f, lng_f))
            except (ValueError, TypeError):
                continue

    if not valid_coords:
        return None

    avg_lat = sum(coord[0] for coord in valid_coords) / len(valid_coords)
    avg_lng = sum(coord[1] for coord in valid_coords) / len(valid_coords)
    return round(avg_lat, 6), round(avg_lng, 6)


def compute_dominant_category(complaints: Sequence[Mapping[str, Any]]) -> str | None:
    """Compute the dominant category among member complaints.

    Prefers specific categories over 'unclassified' when available.
    """
    categories: list[str] = []
    for c in complaints:
        cat = (c.get("category") or "").strip()
        if cat:
            categories.append(cat)

    if not categories:
        return None

    # Filter out unclassified if specific categories are present
    specific = [c for c in categories if c.lower() != "unclassified"]
    target_pool = specific if specific else categories

    counts = Counter(target_pool)
    return counts.most_common(1)[0][0]


def compute_dominant_department(complaints: Sequence[Mapping[str, Any]]) -> str | None:
    """Compute the dominant department among member complaints.

    Prefers specific departments over 'general' when available.
    """
    departments: list[str] = []
    for c in complaints:
        dept = (c.get("department") or "").strip()
        if dept:
            departments.append(dept)

    if not departments:
        return None

    specific = [d for d in departments if d.lower() != "general"]
    target_pool = specific if specific else departments

    counts = Counter(target_pool)
    return counts.most_common(1)[0][0]


def compute_complaint_time_span(
    complaints: Sequence[Mapping[str, Any]],
) -> dict[str, Any]:
    """Compute the temporal span (earliest, latest, duration) of member complaints."""
    parsed_dts: list[datetime] = []
    for c in complaints:
        dt = _parse_dt(c.get("created_at") or c.get("timestamp"))
        if dt is not None:
            parsed_dts.append(dt)

    if not parsed_dts:
        return {
            "earliest": None,
            "latest": None,
            "duration_seconds": 0.0,
            "duration_hours": 0.0,
        }

    earliest = min(parsed_dts)
    latest = max(parsed_dts)
    duration_sec = max(0.0, (latest - earliest).total_seconds())

    return {
        "earliest": earliest.isoformat(),
        "latest": latest.isoformat(),
        "duration_seconds": duration_sec,
        "duration_hours": round(duration_sec / 3600.0, 2),
    }


def compute_recurring_keywords(
    complaints: Sequence[Mapping[str, Any]],
    top_k: int = 5,
) -> list[tuple[str, int]]:
    """Extract most frequent recurring keywords across complaints.

    Combines extracted_severity_keywords and normalized tokens from titles and descriptions.
    """
    keyword_counts: Counter[str] = Counter()

    for c in complaints:
        # Extracted severity keywords
        kws = c.get("extracted_severity_keywords") or []
        for kw in kws:
            kw_clean = str(kw).strip().lower()
            if kw_clean:
                keyword_counts[kw_clean] += 3  # Higher weight for extracted keywords

        # Title tokens
        title = c.get("title") or ""
        cleaned_title = re.sub(r"[^\w\s]", " ", title.lower())
        for token in cleaned_title.split():
            if len(token) > 2 and token not in STOPWORDS:
                keyword_counts[token] += 2

        # Description tokens
        desc = c.get("description") or ""
        cleaned_desc = re.sub(r"[^\w\s]", " ", desc.lower())
        for token in cleaned_desc.split():
            if len(token) > 2 and token not in STOPWORDS:
                keyword_counts[token] += 1

    return keyword_counts.most_common(top_k)


def summarize_cluster_intelligence(
    cluster_id: str,
    complaints: Sequence[Mapping[str, Any]],
) -> dict[str, Any]:
    """Generate a comprehensive intelligence summary for a cluster."""
    centroid = compute_geographic_centroid(complaints)
    time_span = compute_complaint_time_span(complaints)

    return {
        "cluster_id": cluster_id,
        "complaint_count": compute_cluster_complaint_count(complaints),
        "centroid_lat": centroid[0] if centroid else None,
        "centroid_lng": centroid[1] if centroid else None,
        "dominant_category": compute_dominant_category(complaints),
        "dominant_department": compute_dominant_department(complaints),
        "time_span": time_span,
        "top_keywords": compute_recurring_keywords(complaints, top_k=5),
    }
