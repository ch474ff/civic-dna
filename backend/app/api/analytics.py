from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth.jwt import get_current_officer
from app.database import get_db
from app.models import Cluster, Complaint, Officer
from app.schemas import AnalyticsSummary

router = APIRouter()


@router.get("/summary", response_model=AnalyticsSummary)
def analytics_summary(
    db: Session = Depends(get_db),
    _: Officer = Depends(get_current_officer),
) -> AnalyticsSummary:
    complaints_total = db.query(func.count(Complaint.complaint_id)).scalar() or 0
    clusters_total = db.query(func.count(Cluster.cluster_id)).scalar() or 0

    clusters_by_status: dict[str, int] = {}
    for status_value, count in db.query(Cluster.status, func.count(Cluster.cluster_id)).group_by(Cluster.status):
        clusters_by_status[status_value] = count

    complaints_by_department: dict[str, int] = {}
    for department, count in db.query(Complaint.department, func.count(Complaint.complaint_id)).group_by(
        Complaint.department
    ):
        complaints_by_department[department] = count

    average_priority = db.query(func.avg(Cluster.priority_score)).scalar()
    return AnalyticsSummary(
        complaints_total=complaints_total,
        clusters_total=clusters_total,
        clusters_by_status=clusters_by_status,
        complaints_by_department=complaints_by_department,
        average_priority_score=float(average_priority or 0.0),
    )
