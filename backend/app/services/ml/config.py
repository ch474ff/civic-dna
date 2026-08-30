"""Central ML configuration for Civic DNA.

All category definitions, department mappings, scoring weights, SLA rules,
and escalation thresholds live here.  Do not scatter ML configuration across
the codebase.
"""

from __future__ import annotations

from dataclasses import dataclass


# ---------------------------------------------------------------------------
# Supported complaint categories
# ---------------------------------------------------------------------------

CATEGORIES: list[str] = [
    "Roads & Potholes",
    "Water Supply",
    "Electricity",
    "Sanitation & Waste",
    "Street Lighting",
    "Drainage",
    "Public Safety",
    "Other",
]

# ---------------------------------------------------------------------------
# Category → Department mapping
# ---------------------------------------------------------------------------

CATEGORY_DEPARTMENT_MAP: dict[str, str] = {
    "Roads & Potholes": "Public Works",
    "Water Supply": "Water Department",
    "Electricity": "Electricity Board",
    "Sanitation & Waste": "Sanitation Department",
    "Street Lighting": "Street Lighting Division",
    "Drainage": "Drainage & Sewerage",
    "Public Safety": "Public Safety",
    "Other": "general",
}

# Reverse lookup: Department → Category
DEPARTMENT_CATEGORY_MAP: dict[str, str] = {
    v: k for k, v in CATEGORY_DEPARTMENT_MAP.items()
}

# ---------------------------------------------------------------------------
# Category inherent risk scores (0.0 – 1.0)
# ---------------------------------------------------------------------------

CATEGORY_RISK: dict[str, float] = {
    "Roads & Potholes": 0.5,
    "Water Supply": 0.4,
    "Electricity": 0.7,
    "Sanitation & Waste": 0.3,
    "Street Lighting": 0.4,
    "Drainage": 0.4,
    "Public Safety": 0.8,
    "Other": 0.2,
}

# ---------------------------------------------------------------------------
# Priority scoring weights  (must sum to 1.0)
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class ScoringWeights:
    """Configurable weights for the priority scoring formula."""

    severity: float = 0.40
    cluster_size: float = 0.20
    location_sensitivity: float = 0.20
    category_risk: float = 0.20


DEFAULT_SCORING_WEIGHTS = ScoringWeights()

# Cluster-size normalisation cap: member_count >= this → factor = 1.0
CLUSTER_SIZE_CAP: int = 20

# ---------------------------------------------------------------------------
# SLA configuration  (hours by priority tier, per department)
# ---------------------------------------------------------------------------

SLA_HOURS: dict[str, dict[str, int]] = {
    "Public Safety": {"critical": 12, "high": 24, "medium": 48, "low": 120},
    "Electricity Board": {"critical": 12, "high": 24, "medium": 72, "low": 168},
    "Water Department": {"critical": 24, "high": 48, "medium": 72, "low": 168},
    "Drainage & Sewerage": {"critical": 24, "high": 48, "medium": 72, "low": 168},
    "default": {"critical": 24, "high": 72, "medium": 72, "low": 168},
}


def sla_tier(priority_score: float) -> str:
    """Map a priority score in [0, 1] to a named SLA tier."""
    if priority_score >= 0.8:
        return "critical"
    if priority_score >= 0.6:
        return "high"
    if priority_score >= 0.4:
        return "medium"
    return "low"


# ---------------------------------------------------------------------------
# Escalation thresholds
# ---------------------------------------------------------------------------

ESCALATION_WARNING_HOURS: float = 6.0  # hours before SLA deadline → "warning"

# ---------------------------------------------------------------------------
# Confidence threshold for manual review
# ---------------------------------------------------------------------------

DEFAULT_CONFIDENCE_THRESHOLD: float = 0.5
