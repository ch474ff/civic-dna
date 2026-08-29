"""Civic DNA ML intelligence layer.

Public API
----------
* ``MLClassificationService``  — plug-in replacement for the classification stub.
* ``MLScoringService``         — plug-in replacement for the scoring stub.
* ``get_sla_deadline``         — department-aware SLA calculation.
* ``check_escalations``        — cluster escalation checker.
* ``route_to_department``      — category → department routing.
"""

from app.services.ml.classifier import MLClassificationService
from app.services.ml.escalation import EscalationResult, check_escalations
from app.services.ml.routing import route_to_department
from app.services.ml.scorer import MLScoringService
from app.services.ml.sla import get_sla_deadline

__all__ = [
    "MLClassificationService",
    "MLScoringService",
    "EscalationResult",
    "check_escalations",
    "get_sla_deadline",
    "route_to_department",
]
