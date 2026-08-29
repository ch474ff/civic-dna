"""Department routing for complaints.

Uses the centralised ``CATEGORY_DEPARTMENT_MAP`` in ``config.py``.
Unknown or unrecognised categories fall back to ``"general"``.
"""

from __future__ import annotations

from app.services.ml.config import CATEGORY_DEPARTMENT_MAP


def route_to_department(category: str) -> str:
    """Return the department responsible for *category*.

    Falls back to ``"general"`` for unknown categories.
    """
    return CATEGORY_DEPARTMENT_MAP.get(category, "general")
