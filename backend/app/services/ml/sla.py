"""Department-aware SLA calculation.

Extends the base ``calculate_sla`` (in ``services/sla.py``) with
per-department deadline configuration.  The base function is left unchanged
so the existing pipeline continues to work.

Usage::

    from app.services.ml.sla import get_sla_deadline
    deadline = get_sla_deadline(priority_score=0.85, department="Public Safety")
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from app.services.ml.config import SLA_HOURS, sla_tier


def get_sla_deadline(
    priority_score: float,
    department: str = "default",
    now: datetime | None = None,
) -> datetime:
    """Return an SLA deadline considering department-specific rules.

    Falls back to the ``default`` tier config if the department has no
    specific entry in ``SLA_HOURS``.
    """
    moment = now or datetime.now(UTC)
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=UTC)

    tier = sla_tier(priority_score)
    dept_config = SLA_HOURS.get(department, SLA_HOURS["default"])
    hours = dept_config.get(tier, SLA_HOURS["default"].get(tier, 72))

    return moment + timedelta(hours=hours)
