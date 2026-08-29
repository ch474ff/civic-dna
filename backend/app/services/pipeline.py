from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import uuid4

from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.models import Cluster, Complaint, Department
from app.schemas import ComplaintCreate
from app.services.classification import ClassificationResult, ClassificationService
from app.services.deduplication import DeduplicationService
from app.services.scoring import ScoringService
from app.services.sla import calculate_sla

logger = logging.getLogger(__name__)


def _complaint_snapshot(complaint: Complaint) -> dict[str, Any]:
    return {
        "complaint_id": complaint.complaint_id,
        "title": complaint.title,
        "description": complaint.description,
        "lat": complaint.lat,
        "lng": complaint.lng,
        "images": complaint.images or [],
        "audio": complaint.audio,
        "language": complaint.language,
        "department": complaint.department,
        "category": complaint.category,
        "confidence": complaint.confidence,
        "extracted_severity_keywords": complaint.extracted_severity_keywords or [],
        "cluster_id": complaint.cluster_id,
    }


def _ensure_department(db: Session, name: str) -> None:
    existing = db.query(Department).filter(Department.name == name).one_or_none()
    if existing:
        return
    db.add(Department(department_id=str(uuid4()), name=name, description=None))


def process_complaint(
    db: Session,
    payload: ComplaintCreate,
    classification_service: ClassificationService,
    deduplication_service: DeduplicationService,
    scoring_service: ScoringService,
) -> Complaint:
    complaint_id = str(uuid4())
    draft = payload.model_dump()
    draft["complaint_id"] = complaint_id

    try:
        classified = classification_service.classify_complaint(draft)
    except Exception:
        logger.exception("Classification service failed; using fallback")
        classified = ClassificationResult(
            department="general",
            category="unclassified",
            confidence=0.0,
            extracted_severity_keywords=[],
        )

    existing = [_complaint_snapshot(row) for row in db.query(Complaint).all()]
    try:
        duplicate_cluster_id = deduplication_service.find_duplicate_cluster(draft, existing)
    except Exception:
        logger.exception("Deduplication service failed; creating a new cluster")
        duplicate_cluster_id = None

    cluster: Cluster | None = None
    if duplicate_cluster_id:
        cluster = db.get(Cluster, duplicate_cluster_id)

    cluster_context = {
        "cluster_id": cluster.cluster_id if cluster else None,
        "member_count": len(cluster.member_complaint_ids or []) if cluster else 0,
        "department": classified.department,
    }

    try:
        priority_score = float(scoring_service.score_priority(draft, cluster_context))
        priority_score = min(1.0, max(0.0, priority_score))
    except Exception:
        logger.exception("Scoring service failed; using fallback priority")
        priority_score = 0.5

    try:
        sla_deadline = calculate_sla(priority_score)
    except Exception:
        logger.exception("SLA calculation failed; using 72h fallback")
        sla_deadline = datetime.now(UTC) + timedelta(hours=72)

    _ensure_department(db, classified.department)

    if cluster is None:
        cluster = Cluster(
            cluster_id=str(uuid4()),
            member_complaint_ids=[complaint_id],
            department=classified.department,
            priority_score=priority_score,
            sla_deadline=sla_deadline,
            status="submitted",
            root_cause_asset=None,
        )
        db.add(cluster)
        db.flush()
    else:
        members = list(cluster.member_complaint_ids or [])
        members.append(complaint_id)
        cluster.member_complaint_ids = members
        flag_modified(cluster, "member_complaint_ids")
        cluster.priority_score = max(cluster.priority_score or 0.0, priority_score)
        existing_deadline = cluster.sla_deadline
        if existing_deadline is not None and existing_deadline.tzinfo is None:
            existing_deadline = existing_deadline.replace(tzinfo=UTC)
        if existing_deadline is None or sla_deadline < existing_deadline:
            cluster.sla_deadline = sla_deadline

    complaint = Complaint(
        complaint_id=complaint_id,
        title=payload.title,
        description=payload.description,
        lat=payload.lat,
        lng=payload.lng,
        images=list(payload.images or []),
        audio=payload.audio,
        language=payload.language,
        department=classified.department,
        category=classified.category,
        confidence=classified.confidence,
        extracted_severity_keywords=list(classified.extracted_severity_keywords or []),
        cluster_id=cluster.cluster_id,
    )
    db.add(complaint)
    db.commit()
    db.refresh(complaint)
    return complaint
