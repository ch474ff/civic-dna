from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Cluster, Complaint
from app.schemas import PublicMapCentroid, PublicMapClusterResponse

router = APIRouter()


@router.get("/map", response_model=list[PublicMapClusterResponse])
def get_public_map(
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    category: str | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
) -> list[PublicMapClusterResponse]:
    query = db.query(Cluster)
    if status:
        query = query.filter(Cluster.status == status)

    clusters = query.offset(offset).limit(limit).all()
    results: list[PublicMapClusterResponse] = []

    for c in clusters:
        # Fetch complaints for centroid and category calculation
        member_ids = list(c.member_complaint_ids or [])
        complaints: list[Complaint] = []
        if member_ids:
            complaints = (
                db.query(Complaint)
                .filter(Complaint.complaint_id.in_(member_ids))
                .all()
            )

        if complaints:
            avg_lat = sum(comp.lat for comp in complaints) / len(complaints)
            avg_lng = sum(comp.lng for comp in complaints) / len(complaints)
            dominant_category = complaints[0].category
        else:
            avg_lat = 28.6139
            avg_lng = 77.2090
            dominant_category = "General"

        if category and dominant_category.lower() != category.lower():
            continue

        results.append(
            PublicMapClusterResponse(
                cluster_id=c.cluster_id,
                category=dominant_category,
                department=c.department,
                status=c.status,
                priority_score=round(c.priority_score or 0.0, 2),
                centroid=PublicMapCentroid(
                    lat=round(avg_lat, 4),
                    lng=round(avg_lng, 4),
                ),
                complaint_count=len(member_ids) or 1,
            )
        )

    return results
