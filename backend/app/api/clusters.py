from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth.jwt import get_current_officer
from app.database import get_db
from app.models import Cluster, Officer
from app.schemas import ClusterPatch, ClusterResponse, EscalationItemResponse
from app.services.ml.escalation import check_escalations

router = APIRouter()


@router.get("", response_model=list[ClusterResponse])
def list_clusters(
    sort: str = Query(default="priority_desc"),
    db: Session = Depends(get_db),
) -> list[Cluster]:
    query = db.query(Cluster)
    if sort in ("priority_desc", "priority_asc"):
        order = Cluster.priority_score.desc() if sort == "priority_desc" else Cluster.priority_score.asc()
        query = query.order_by(order)
    return query.all()


@router.get("/escalations", response_model=list[EscalationItemResponse])
def get_escalations(db: Session = Depends(get_db)) -> list[dict]:
    clusters = db.query(Cluster).all()
    cluster_dicts = [
        {"cluster_id": c.cluster_id, "sla_deadline": c.sla_deadline}
        for c in clusters
    ]
    results = check_escalations(cluster_dicts)
    return [
        {
            "cluster_id": r.cluster_id,
            "level": r.level,
            "sla_deadline": r.sla_deadline,
            "hours_remaining": r.hours_remaining,
        }
        for r in results
    ]


@router.get("/{cluster_id}", response_model=ClusterResponse)
def get_cluster(cluster_id: str, db: Session = Depends(get_db)) -> Cluster:
    cluster = db.get(Cluster, cluster_id)
    if cluster is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": "Cluster not found", "details": {"cluster_id": cluster_id}}},
        )
    return cluster


@router.patch("/{cluster_id}", response_model=ClusterResponse)
def patch_cluster(
    cluster_id: str,
    payload: ClusterPatch,
    db: Session = Depends(get_db),
    _: Officer = Depends(get_current_officer),
) -> Cluster:
    cluster = db.get(Cluster, cluster_id)
    if cluster is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": "Cluster not found", "details": {"cluster_id": cluster_id}}},
        )
    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(cluster, field, value)
    db.commit()
    db.refresh(cluster)
    return cluster
