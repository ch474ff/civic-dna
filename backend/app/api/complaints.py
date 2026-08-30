from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Cluster, ClusterStatusHistory, Complaint, Feedback
from app.schemas import (
    ComplaintCreate,
    ComplaintResponse,
    ComplaintStatusResponse,
    ComplaintTimelineItem,
    FeedbackCreate,
    FeedbackResponse,
)
from app.services.classification import ClassificationService
from app.services.deduplication import DeduplicationService
from app.services.dependencies import (
    get_classification_service,
    get_deduplication_service,
    get_graph_service,
    get_scoring_service,
)
from app.services.graph import GraphService
from app.services.pipeline import process_complaint
from app.services.scoring import ScoringService

router = APIRouter()


@router.post("", response_model=ComplaintResponse, status_code=status.HTTP_201_CREATED)
def create_complaint(
    payload: ComplaintCreate,
    db: Session = Depends(get_db),
    classification_service: ClassificationService = Depends(get_classification_service),
    deduplication_service: DeduplicationService = Depends(get_deduplication_service),
    scoring_service: ScoringService = Depends(get_scoring_service),
    graph_service: GraphService = Depends(get_graph_service),
) -> Complaint:
    return process_complaint(
        db,
        payload,
        classification_service,
        deduplication_service,
        scoring_service,
        graph_service=graph_service,
    )


@router.get("/{complaint_id}/status", response_model=ComplaintStatusResponse)
def get_complaint_status(complaint_id: str, db: Session = Depends(get_db)) -> ComplaintStatusResponse:
    complaint = db.get(Complaint, complaint_id)
    if complaint is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": "Complaint not found", "details": {"complaint_id": complaint_id}}},
        )
    cluster: Cluster | None = None
    if complaint.cluster_id:
        cluster = db.get(Cluster, complaint.cluster_id)

    return ComplaintStatusResponse(
        complaint_id=complaint.complaint_id,
        cluster_id=complaint.cluster_id,
        status=cluster.status if cluster else "submitted",
        department=complaint.department,
        category=complaint.category,
        priority_score=cluster.priority_score if cluster else 0.0,
        sla_deadline=cluster.sla_deadline if cluster else None,
        root_cause_asset=cluster.root_cause_asset if cluster else None,
        created_at=complaint.created_at,
        updated_at=cluster.updated_at if cluster else None,
    )


@router.get("/{complaint_id}/timeline", response_model=list[ComplaintTimelineItem])
def get_complaint_timeline(complaint_id: str, db: Session = Depends(get_db)) -> list[ComplaintTimelineItem]:
    complaint = db.get(Complaint, complaint_id)
    if complaint is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": "Complaint not found", "details": {"complaint_id": complaint_id}}},
        )

    timeline: list[ComplaintTimelineItem] = []
    if complaint.cluster_id:
        history_records = (
            db.query(ClusterStatusHistory)
            .filter(ClusterStatusHistory.cluster_id == complaint.cluster_id)
            .order_by(ClusterStatusHistory.changed_at.asc())
            .all()
        )
        for rec in history_records:
            timeline.append(
                ComplaintTimelineItem(
                    status=rec.new_status,
                    timestamp=rec.changed_at,
                )
            )

    if not timeline:
        cluster = db.get(Cluster, complaint.cluster_id) if complaint.cluster_id else None
        timeline.append(
            ComplaintTimelineItem(
                status=cluster.status if cluster else "submitted",
                timestamp=complaint.created_at,
            )
        )

    return timeline


@router.get("/{complaint_id}", response_model=ComplaintResponse)
def get_complaint(complaint_id: str, db: Session = Depends(get_db)) -> Complaint:
    complaint = db.get(Complaint, complaint_id)
    if complaint is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": "Complaint not found", "details": {"complaint_id": complaint_id}}},
        )
    return complaint


@router.post(
    "/{complaint_id}/feedback",
    response_model=FeedbackResponse,
    status_code=status.HTTP_201_CREATED,
)
def submit_feedback(
    complaint_id: str,
    payload: FeedbackCreate,
    db: Session = Depends(get_db),
) -> Feedback:
    complaint = db.get(Complaint, complaint_id)
    if complaint is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": "Complaint not found", "details": {"complaint_id": complaint_id}}},
        )
    feedback = Feedback(
        feedback_id=str(uuid4()),
        complaint_id=complaint_id,
        rating=payload.rating,
        comment=payload.comment,
        created_at=datetime.now(UTC),
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return feedback
