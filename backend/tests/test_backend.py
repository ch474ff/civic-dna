from datetime import UTC, datetime, timedelta, timezone
from unittest.mock import Mock

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import app
from app.services.deduplication import MultiSignalDeduplicationService
from app.services.dependencies import get_graph_service
from app.services.graph import InMemoryGraphService, NodeLabel, RelationshipType

VALID_COMPLAINT = {
    "title": "Broken streetlight on Main St",
    "description": "The light has been out for three nights near the intersection.",
    "lat": 28.6139,
    "lng": 77.209,
    "images": ["https://example.com/light.jpg"],
    "audio": None,
    "language": "en",
}


def _officer_headers(client: TestClient) -> dict[str, str]:
    response = client.post(
        "/api/auth/login",
        json={"username": "officer", "password": "changeme"},
    )
    assert response.status_code == 200, response.text
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_valid_complaint_creation(client: TestClient):
    response = client.post("/api/complaints", json=VALID_COMPLAINT)
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["title"] == VALID_COMPLAINT["title"]
    assert body["complaint_id"]
    assert body["cluster_id"]
    assert body["department"] == "general"
    assert body["category"] == "unclassified"
    assert body["images"] == VALID_COMPLAINT["images"]
    assert body["language"] == "en"
    assert "created_at" in body
    assert datetime.fromisoformat(body["created_at"].replace("Z", "+00:00")).tzinfo is not None


def test_invalid_complaint(client: TestClient):
    response = client.post(
        "/api/complaints",
        json={"title": "", "description": "x", "lat": 999, "lng": 0},
    )
    assert response.status_code == 422
    body = response.json()
    assert body["error"]["code"] == "validation_error"


def test_classification_stub_called(client: TestClient, classification_spy: Mock):
    client.post("/api/complaints", json=VALID_COMPLAINT)
    classification_spy.classify_complaint.assert_called()


def test_duplicate_detection_stub_called(client: TestClient, deduplication_spy: Mock):
    client.post("/api/complaints", json=VALID_COMPLAINT)
    deduplication_spy.find_duplicate_cluster.assert_called()


def test_priority_scoring_stub_called(client: TestClient, scoring_spy: Mock):
    client.post("/api/complaints", json=VALID_COMPLAINT)
    scoring_spy.score_priority.assert_called()


def test_new_cluster_creation(client: TestClient):
    first = client.post("/api/complaints", json=VALID_COMPLAINT).json()
    second_payload = {**VALID_COMPLAINT, "title": "Pothole on 2nd Ave", "lat": 19.07, "lng": 72.87}
    second = client.post("/api/complaints", json=second_payload).json()
    assert first["cluster_id"] != second["cluster_id"]
    listing = client.get("/api/clusters?sort=priority_desc", headers=_officer_headers(client))
    assert listing.status_code == 200
    assert len(listing.json()) == 2


def test_existing_cluster_assignment(client: TestClient, deduplication_spy: Mock):
    first = client.post("/api/complaints", json=VALID_COMPLAINT).json()
    cluster_id = first["cluster_id"]
    deduplication_spy.find_duplicate_cluster.return_value = cluster_id
    second_payload = {**VALID_COMPLAINT, "title": "Same streetlight still dark"}
    second = client.post("/api/complaints", json=second_payload).json()
    assert second["cluster_id"] == cluster_id
    cluster = client.get(f"/api/clusters/{cluster_id}", headers=_officer_headers(client)).json()
    assert first["complaint_id"] in cluster["member_complaint_ids"]
    assert second["complaint_id"] in cluster["member_complaint_ids"]


def test_sla_generation(client: TestClient):
    body = client.post("/api/complaints", json=VALID_COMPLAINT).json()
    cluster = client.get(f"/api/clusters/{body['cluster_id']}", headers=_officer_headers(client)).json()
    deadline = datetime.fromisoformat(cluster["sla_deadline"].replace("Z", "+00:00"))
    assert deadline.tzinfo is not None
    assert deadline > datetime.now(timezone.utc)
    assert cluster["status"] == "submitted"


def test_feedback_submission(client: TestClient):
    created = client.post("/api/complaints", json=VALID_COMPLAINT).json()
    response = client.post(
        f"/api/complaints/{created['complaint_id']}/feedback",
        json={"rating": 4, "comment": "Acknowledged quickly"},
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["complaint_id"] == created["complaint_id"]
    assert body["rating"] == 4
    fetched = client.get(f"/api/complaints/{created['complaint_id']}")
    assert fetched.status_code == 200


def test_officer_authentication(client: TestClient):
    denied = client.post("/api/auth/login", json={"username": "officer", "password": "wrong"})
    assert denied.status_code == 401
    assert denied.json()["error"]["code"] == "unauthorized"
    ok = client.post("/api/auth/login", json={"username": "officer", "password": "changeme"})
    assert ok.status_code == 200
    assert ok.json()["token_type"] == "bearer"
    assert ok.json()["access_token"]


def test_officer_patch_operations(client: TestClient):
    created = client.post("/api/complaints", json=VALID_COMPLAINT).json()
    cluster_id = created["cluster_id"]
    unauth = client.patch(f"/api/clusters/{cluster_id}", json={"status": "in_progress"})
    assert unauth.status_code == 401
    patched = client.patch(
        f"/api/clusters/{cluster_id}",
        json={"status": "in_progress", "root_cause_asset": "pole-114"},
        headers=_officer_headers(client),
    )
    assert patched.status_code == 200, patched.text
    body = patched.json()
    assert body["status"] == "in_progress"
    assert body["root_cause_asset"] == "pole-114"


def test_analytics_summary(client: TestClient):
    # Empty database first
    response = client.get("/api/analytics/summary")
    assert response.status_code == 200
    body = response.json()
    assert "complaints_total" in body
    assert "clusters_total" in body
    assert "clusters_by_status" in body
    assert "complaints_by_department" in body
    assert "average_priority_score" in body

    # After creating a complaint
    client.post("/api/complaints", json=VALID_COMPLAINT)
    response = client.get("/api/analytics/summary")
    assert response.status_code == 200
    body = response.json()
    assert body["complaints_total"] >= 1
    assert body["clusters_total"] >= 1
    assert isinstance(body["average_priority_score"], float)


def test_health_check(client: TestClient):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_escalations_endpoint(client: TestClient):
    client.post("/api/complaints", json=VALID_COMPLAINT)
    response = client.get("/api/clusters/escalations", headers=_officer_headers(client))
    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, list)
    assert len(body) >= 1
    item = body[0]
    assert "cluster_id" in item
    assert item["level"] in ("normal", "warning", "overdue")
    assert "hours_remaining" in item
    assert "sla_deadline" in item


def test_temporal_deduplication_behavior():
    service = MultiSignalDeduplicationService(
        threshold=0.65,
        temporal_window_hours=72.0,
    )
    now = datetime.now(UTC)
    existing = [
        {
            "complaint_id": "c-old",
            "cluster_id": "clust-1",
            "title": "Broken streetlight on Main St",
            "description": "The light has been out for three nights near the intersection.",
            "lat": 28.6139,
            "lng": 77.2090,
            "department": "Electricity Board",
            "category": "Street Lighting",
            "created_at": (now - timedelta(hours=100)).isoformat(),
        }
    ]
    # Complaint 100 hours after the old one — should not be merged (temporal score 0.0)
    incoming_after_100h = {
        "complaint_id": "c-new-100",
        "cluster_id": None,
        "title": "Broken streetlight on Main St",
        "description": "The light has been out for three nights near the intersection.",
        "lat": 28.6139,
        "lng": 77.2090,
        "department": "Electricity Board",
        "category": "Street Lighting",
        "created_at": now.isoformat(),
    }
    # 100h apart should fail threshold or not merge
    breakdown_100h = service.score_pair(incoming_after_100h, existing[0])
    assert breakdown_100h.temporal_score == 0.0

    # Complaint 1 hour after — should merge (high temporal score)
    existing_recent = [
        {
            **existing[0],
            "created_at": (now - timedelta(hours=1)).isoformat(),
        }
    ]
    matched_id = service.find_duplicate_cluster(incoming_after_100h, existing_recent)
    assert matched_id == "clust-1"


# =========================================================================
# HARDENING TESTS: Issue 1 (Graph Pipeline), Issue 2 (Officer Protection),
# Issue 3 (Production Safety), Issue 4 (CORS Configuration)
# =========================================================================

def test_officer_token_endpoints_protection(client: TestClient):
    created = client.post("/api/complaints", json=VALID_COMPLAINT).json()
    cluster_id = created["cluster_id"]

    # 1. Unauthenticated requests must return 401
    assert client.get("/api/clusters").status_code == 401
    assert client.get(f"/api/clusters/{cluster_id}").status_code == 401
    assert client.get("/api/clusters/escalations").status_code == 401

    # 2. Invalid JWT token must return 401
    bad_headers = {"Authorization": "Bearer invalid.jwt.token.here"}
    assert client.get("/api/clusters", headers=bad_headers).status_code == 401
    assert client.get(f"/api/clusters/{cluster_id}", headers=bad_headers).status_code == 401
    assert client.get("/api/clusters/escalations", headers=bad_headers).status_code == 401

    # 3. Valid officer JWT must return 200
    auth_headers = _officer_headers(client)
    assert client.get("/api/clusters", headers=auth_headers).status_code == 200
    assert client.get(f"/api/clusters/{cluster_id}", headers=auth_headers).status_code == 200
    assert client.get("/api/clusters/escalations", headers=auth_headers).status_code == 200


def test_graph_intelligence_pipeline_integration(client: TestClient, deduplication_spy: Mock):
    # Isolated in-memory graph service
    test_graph = InMemoryGraphService()
    app.dependency_overrides[get_graph_service] = lambda: test_graph

    try:
        # Step 1: Submit complaint A
        resp_a = client.post("/api/complaints", json=VALID_COMPLAINT)
        assert resp_a.status_code == 201
        data_a = resp_a.json()
        complaint_a_id = data_a["complaint_id"]
        token_a_id = data_a["cluster_id"]

        # Confirm Token A node and Complaint A node exist in graph
        node_a = test_graph.get_node(complaint_a_id)
        assert node_a is not None
        assert node_a.label == NodeLabel.COMPLAINT
        assert node_a.properties["title"] == VALID_COMPLAINT["title"]

        cluster_node = test_graph.get_node(token_a_id)
        assert cluster_node is not None
        assert cluster_node.label == NodeLabel.CLUSTER

        # Confirm Complaint A -> Token A edge
        rels_a = test_graph.get_relationships(node_id=complaint_a_id, rel_type=RelationshipType.BELONGS_TO)
        assert len(rels_a) == 1
        assert rels_a[0].target_id == token_a_id

        # Step 2: Submit similar complaint B (dedup matches token A)
        deduplication_spy.find_duplicate_cluster.return_value = token_a_id
        complaint_b_payload = {
            **VALID_COMPLAINT,
            "title": "Same streetlight still dark and broken",
            "lat": 28.6140,
            "lng": 77.2091,
        }
        resp_b = client.post("/api/complaints", json=complaint_b_payload)
        assert resp_b.status_code == 201
        data_b = resp_b.json()
        complaint_b_id = data_b["complaint_id"]
        assert data_b["cluster_id"] == token_a_id

        # Confirm Complaint B node and edge Complaint B -> Token A exist in graph
        node_b = test_graph.get_node(complaint_b_id)
        assert node_b is not None
        assert node_b.label == NodeLabel.COMPLAINT

        rels_b = test_graph.get_relationships(node_id=complaint_b_id, rel_type=RelationshipType.BELONGS_TO)
        assert len(rels_b) == 1
        assert rels_b[0].target_id == token_a_id

        # Confirm Token A has both incoming neighbors
        neighbors = test_graph.get_neighbors(token_a_id, rel_type=RelationshipType.BELONGS_TO, direction="in")
        neighbor_ids = {n.id for n in neighbors}
        assert complaint_a_id in neighbor_ids
        assert complaint_b_id in neighbor_ids

        # Confirm cluster metadata nodes (Department, Location, Category)
        cluster_rels = test_graph.get_relationships(node_id=token_a_id)
        rel_types = {r.rel_type for r in cluster_rels}
        assert RelationshipType.ASSIGNED_TO in rel_types
        assert RelationshipType.LOCATED_AT in rel_types
        assert RelationshipType.CATEGORIZED_AS in rel_types

    finally:
        app.dependency_overrides.pop(get_graph_service, None)


def test_graph_failure_is_non_fatal_for_complaints(client: TestClient):
    failing_graph = Mock()
    failing_graph.link_complaint_to_cluster.side_effect = RuntimeError("Graph backend connection failed")
    failing_graph.link_cluster_metadata.side_effect = RuntimeError("Graph database unreachable")
    app.dependency_overrides[get_graph_service] = lambda: failing_graph

    try:
        response = client.post("/api/complaints", json=VALID_COMPLAINT)
        # Complaint creation MUST still succeed despite graph outage
        assert response.status_code == 201
        body = response.json()
        assert body["complaint_id"]
        assert body["cluster_id"]

        # Confirm complaint was persisted in SQLite database
        fetched = client.get(f"/api/complaints/{body['complaint_id']}")
        assert fetched.status_code == 200
        assert fetched.json()["complaint_id"] == body["complaint_id"]
    finally:
        app.dependency_overrides.pop(get_graph_service, None)


def test_production_security_validation():
    # In development mode: default values are accepted
    dev_settings = Settings(environment="development")
    assert dev_settings.environment == "development"

    # In production mode with default JWT secret: must raise ValueError
    with pytest.raises(ValueError, match="Insecure JWT_SECRET"):
        Settings(environment="production", jwt_secret="change-me-in-local-env")

    # In production mode with default bootstrap password: must raise ValueError
    with pytest.raises(ValueError, match="Insecure OFFICER_BOOTSTRAP_PASSWORD"):
        Settings(
            environment="production",
            jwt_secret="a" * 32,
            officer_bootstrap_password="changeme",
        )

    # In production mode with secure configurations: must succeed
    prod_valid = Settings(
        environment="production",
        jwt_secret="a" * 32,
        officer_bootstrap_password="strong-production-password-123",
    )
    assert prod_valid.environment == "production"


def test_cors_configuration_parsing():
    settings = Settings(
        cors_allowed_origins="https://civicdna.city.gov, https://officer.civicdna.city.gov"
    )
    assert settings.cors_allowed_origins == [
        "https://civicdna.city.gov",
        "https://officer.civicdna.city.gov",
    ]
