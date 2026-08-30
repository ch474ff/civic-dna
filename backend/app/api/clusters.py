from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth.jwt import get_current_officer
from app.database import get_db
from app.models import Cluster, ClusterStatusHistory, Officer
from app.schemas import (
    VALID_CLUSTER_STATUSES,
    ClusterPatch,
    ClusterResponse,
    EscalationItemResponse,
)
from app.services.ml.escalation import check_escalations
from app.services.ml.sla import get_sla_deadline

router = APIRouter()


@router.get("", response_model=list[ClusterResponse])
def list_clusters(
    sort: str = Query(default="priority_desc"),
    db: Session = Depends(get_db),
    _: Officer = Depends(get_current_officer),
) -> list[Cluster]:
    query = db.query(Cluster)
    if sort in ("priority_desc", "priority_asc"):
        order = Cluster.priority_score.desc() if sort == "priority_desc" else Cluster.priority_score.asc()
        query = query.order_by(order)
    return query.all()


@router.get("/escalations", response_model=list[EscalationItemResponse])
def get_escalations(
    db: Session = Depends(get_db),
    _: Officer = Depends(get_current_officer),
) -> list[dict]:
    # Only active (non-resolved, non-closed) clusters should be evaluated for escalations
    clusters = (
        db.query(Cluster)
        .filter(Cluster.status.notin_(["resolved", "closed"]))
        .all()
    )
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
def get_cluster(
    cluster_id: str,
    db: Session = Depends(get_db),
    _: Officer = Depends(get_current_officer),
) -> Cluster:
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
    officer: Officer = Depends(get_current_officer),
) -> Cluster:
    cluster = db.get(Cluster, cluster_id)
    if cluster is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": "Cluster not found", "details": {"cluster_id": cluster_id}}},
        )

    updates = payload.model_dump(exclude_unset=True)

    # 1. Status transition & history tracking
    if "status" in updates and updates["status"] is not None:
        new_status = updates["status"]
        if new_status not in VALID_CLUSTER_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"error": {"code": "validation_error", "message": f"Invalid status '{new_status}'", "details": None}},
            )
        old_status = cluster.status
        if old_status != new_status:
            history_record = ClusterStatusHistory(
                cluster_id=cluster.cluster_id,
                old_status=old_status,
                new_status=new_status,
                changed_at=datetime.now(UTC),
                changed_by_officer_id=officer.officer_id if officer else None,
            )
            db.add(history_record)
            cluster.status = new_status

    # 2. SLA & Priority recalculation consistency
    priority_changed = "priority_score" in updates and updates["priority_score"] is not None
    department_changed = "department" in updates and updates["department"] is not None

    if priority_changed:
        cluster.priority_score = updates["priority_score"]
    if department_changed:
        cluster.department = updates["department"]
    if "root_cause_asset" in updates:
        cluster.root_cause_asset = updates["root_cause_asset"]

    if priority_changed or department_changed:
        # Recalculate SLA deadline based on updated priority and department
        base_time = cluster.created_at or datetime.now(UTC)
        if base_time.tzinfo is None:
            base_time = base_time.replace(tzinfo=UTC)
        cluster.sla_deadline = get_sla_deadline(
            cluster.priority_score,
            department=cluster.department,
            base_time=base_time,
        )
    elif "sla_deadline" in updates and updates["sla_deadline"] is not None:
        cluster.sla_deadline = updates["sla_deadline"]

    cluster.updated_at = datetime.now(UTC)

    db.commit()
    db.refresh(cluster)
    return cluster
