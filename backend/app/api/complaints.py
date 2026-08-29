from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Complaint, Feedback
from app.schemas import ComplaintCreate, ComplaintResponse, FeedbackCreate, FeedbackResponse
from app.services.classification import ClassificationService
from app.services.deduplication import DeduplicationService
from app.services.dependencies import (
    get_classification_service,
    get_deduplication_service,
    get_scoring_service,
)
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
) -> Complaint:
    return process_complaint(
        db,
        payload,
        classification_service,
        deduplication_service,
        scoring_service,
    )


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
