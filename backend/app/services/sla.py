from datetime import UTC, datetime, timedelta


def calculate_sla(priority_score: float, now: datetime | None = None) -> datetime:
    """Return an SLA deadline. Higher priority_score means a shorter window."""
    moment = now or datetime.now(UTC)
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=UTC)
    if priority_score >= 0.8:
        hours = 24
    elif priority_score >= 0.5:
        hours = 72
    else:
        hours = 168
    return moment + timedelta(hours=hours)
