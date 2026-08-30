from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import uuid4

from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.models import Cluster, ClusterStatusHistory, Complaint, Department
from app.schemas import ComplaintCreate
from app.services.classification import ClassificationResult, ClassificationService
from app.services.deduplication import DeduplicationService
from app.services.graph import GraphService
from app.services.ml.sla import get_sla_deadline
from app.services.scoring import ScoringService

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
        "created_at": complaint.created_at.isoformat() if hasattr(complaint, "created_at") and complaint.created_at else None,
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
    graph_service: GraphService | None = None,
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

    # Attach classified attributes and creation timestamp to draft before deduplication matching
    draft["category"] = classified.category
    draft["department"] = classified.department
    draft["confidence"] = classified.confidence
    draft["extracted_severity_keywords"] = list(classified.extracted_severity_keywords or [])
    draft["created_at"] = datetime.now(UTC).isoformat()

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
        sla_deadline = get_sla_deadline(priority_score, department=classified.department)
    except Exception:
        logger.exception("SLA calculation failed; using 72h fallback")
        sla_deadline = datetime.now(UTC) + timedelta(hours=72)

    _ensure_department(db, classified.department)

    is_new_cluster = False
    now_utc = datetime.now(UTC)

    if cluster is None:
        is_new_cluster = True
        cluster = Cluster(
            cluster_id=str(uuid4()),
            member_complaint_ids=[complaint_id],
            department=classified.department,
            priority_score=priority_score,
            sla_deadline=sla_deadline,
            status="submitted",
            root_cause_asset=None,
            created_at=now_utc,
            updated_at=now_utc,
        )
        db.add(cluster)
        db.flush()

        # Record initial status in status history
        initial_history = ClusterStatusHistory(
            cluster_id=cluster.cluster_id,
            old_status=None,
            new_status="submitted",
            changed_at=now_utc,
            changed_by_officer_id=None,
        )
        db.add(initial_history)
    else:
        members = list(cluster.member_complaint_ids or [])
        if complaint_id not in members:
            members.append(complaint_id)
        cluster.member_complaint_ids = members
        flag_modified(cluster, "member_complaint_ids")
        cluster.priority_score = max(cluster.priority_score or 0.0, priority_score)
        existing_deadline = cluster.sla_deadline
        if existing_deadline is not None and existing_deadline.tzinfo is None:
            existing_deadline = existing_deadline.replace(tzinfo=UTC)
        if existing_deadline is None or sla_deadline < existing_deadline:
            cluster.sla_deadline = sla_deadline
        cluster.updated_at = now_utc

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
        created_at=datetime.fromisoformat(draft["created_at"]) if isinstance(draft.get("created_at"), str) else (draft.get("created_at") or now_utc),
    )
    db.add(complaint)
    db.commit()
    db.refresh(complaint)

    # Update Graph Intelligence (non-fatal if graph service fails)
    if graph_service is None:
        try:
            from app.services.dependencies import get_graph_service
            graph_service = get_graph_service()
        except Exception:
            logger.exception("Could not obtain default graph service")
            graph_service = None

    if graph_service is not None:
        try:
            snapshot = _complaint_snapshot(complaint)
            graph_service.link_complaint_to_cluster(
                complaint_id=complaint.complaint_id,
                cluster_id=cluster.cluster_id,
                complaint_data=snapshot,
            )
            graph_service.link_cluster_metadata(
                cluster_id=cluster.cluster_id,
                department=cluster.department,
                category=complaint.category,
                location=(complaint.lat, complaint.lng),
            )

            # Discover related clusters (same department or nearby existing cluster that is not itself)
            if is_new_cluster:
                other_clusters = (
                    db.query(Cluster)
                    .filter(Cluster.cluster_id != cluster.cluster_id, Cluster.department == cluster.department)
                    .limit(5)
                    .all()
                )
                for other in other_clusters:
                    if other.cluster_id != cluster.cluster_id:
                        graph_service.link_related_clusters(
                            cluster.cluster_id,
                            other.cluster_id,
                            weight=0.7,
                            reason="Same department incident",
                        )
        except Exception:
            logger.exception("Graph service update failed; continuing without failing complaint")

    return complaint
