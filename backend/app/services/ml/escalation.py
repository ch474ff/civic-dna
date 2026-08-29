"""Escalation checker for open clusters.

Compares the current time against each cluster's SLA deadline and returns
an escalation level:

* **normal** — SLA deadline is more than ``ESCALATION_WARNING_HOURS`` away.
* **warning** — SLA deadline is within ``ESCALATION_WARNING_HOURS``.
* **overdue** — SLA deadline has passed.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any, Mapping, Sequence

from app.services.ml.config import ESCALATION_WARNING_HOURS


@dataclass
class EscalationResult:
    """Escalation status for a single cluster."""

    cluster_id: str
    level: str  # "normal" | "warning" | "overdue"
    sla_deadline: datetime
    hours_remaining: float


def check_escalations(
    clusters: Sequence[Mapping[str, Any]],
    now: datetime | None = None,
) -> list[EscalationResult]:
    """Check escalation status of clusters against their SLA deadlines.

    Parameters
    ----------
    clusters:
        Sequence of cluster mappings.  Each must contain ``cluster_id``
        and ``sla_deadline`` (datetime or ISO-8601 string).
    now:
        Reference time.  Defaults to ``datetime.now(UTC)``.
    """
    moment = now or datetime.now(UTC)
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=UTC)

    results: list[EscalationResult] = []
    for cluster in clusters:
        cluster_id = str(cluster["cluster_id"])
        sla_deadline = cluster["sla_deadline"]

        if isinstance(sla_deadline, str):
            sla_deadline = datetime.fromisoformat(sla_deadline)
        if sla_deadline.tzinfo is None:
            sla_deadline = sla_deadline.replace(tzinfo=UTC)

        remaining_hours = (sla_deadline - moment).total_seconds() / 3600.0

        if remaining_hours <= 0:
            level = "overdue"
        elif remaining_hours <= ESCALATION_WARNING_HOURS:
            level = "warning"
        else:
            level = "normal"

        results.append(
            EscalationResult(
                cluster_id=cluster_id,
                level=level,
                sla_deadline=sla_deadline,
                hours_remaining=round(remaining_hours, 2),
            )
        )

    return results
