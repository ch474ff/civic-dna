from datetime import UTC, datetime, timedelta
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.services.deduplication import (
    MultiSignalDeduplicationService,
    TextSimilarityEngine,
)


def _base_complaint(**overrides: Any) -> dict[str, Any]:
    base: dict[str, Any] = {
        "complaint_id": "comp-1",
        "title": "Pothole on 5th Main Road",
        "description": "Large pothole in the middle of the road causing traffic slowdowns.",
        "lat": 12.9716,
        "lng": 77.5946,
        "department": "Roads & Traffic",
        "category": "Pothole",
        "cluster_id": "cluster-101",
        "created_at": datetime.now(UTC).isoformat(),
        "extracted_severity_keywords": ["traffic slowdown", "deep pothole"],
    }
    base.update(overrides)
    return base


def _officer_headers(client: TestClient) -> dict[str, str]:
    response = client.post(
        "/api/auth/login",
        json={"username": "officer", "password": "changeme"},
    )
    assert response.status_code == 200, response.text
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# 1. Text Similarity Engine Tests
def test_text_similarity_identical():
    sim = TextSimilarityEngine.compute_text_similarity(
        {"title": "Broken water pipeline", "description": "Water leaking on road"},
        {"title": "Broken water pipeline", "description": "Water leaking on road"},
    )
    assert sim == pytest.approx(1.0, rel=1e-2)


def test_text_similarity_semantically_similar():
    c1 = {"title": "Water pipe burst leaking everywhere", "description": "Clean drinking water wasted on street"}
    c2 = {"title": "Burst water line flooding street", "description": "Water pipe leak wasting drinking water"}
    sim = TextSimilarityEngine.compute_text_similarity(c1, c2)
    assert sim >= 0.50


def test_text_similarity_clearly_different():
    c1 = {"title": "Streetlight broken and dark", "description": "No lights at night on 2nd avenue"}
    c2 = {"title": "Garbage dump overflowing", "description": "Trash not collected for a week"}
    sim = TextSimilarityEngine.compute_text_similarity(c1, c2)
    assert sim < 0.20


def test_text_similarity_empty_and_stopwords():
    assert TextSimilarityEngine.string_similarity("", "") == 1.0
    assert TextSimilarityEngine.string_similarity("the and or", "in on at") == 0.0


# 2. Geographic Haversine Distance & Proximity Tests
def test_haversine_distance_accurate():
    # Connaught Place to India Gate in New Delhi (~2.2 km)
    lat1, lng1 = 28.6315, 77.2167
    lat2, lng2 = 28.6129, 77.2295
    dist = MultiSignalDeduplicationService.haversine_distance(lat1, lng1, lat2, lng2)
    assert dist is not None
    assert 2200 <= dist <= 2500


def test_haversine_distance_zero():
    dist = MultiSignalDeduplicationService.haversine_distance(12.9716, 77.5946, 12.9716, 77.5946)
    assert dist == pytest.approx(0.0, abs=1e-3)


def test_haversine_distance_missing_or_invalid():
    assert MultiSignalDeduplicationService.haversine_distance(None, 77.0, 12.0, 77.0) is None
    assert MultiSignalDeduplicationService.haversine_distance(12.0, None, 12.0, 77.0) is None
    assert MultiSignalDeduplicationService.haversine_distance(999.0, 77.0, 12.0, 77.0) is None


def test_geo_similarity_nearby_vs_distant():
    service = MultiSignalDeduplicationService(geo_radius_meters=300.0)
    c_base = {"lat": 12.9716, "lng": 77.5946}
    # ~50 meters away
    c_near = {"lat": 12.9719, "lng": 77.5948}
    score_near, dist_near = service.compute_geo_similarity(c_base, c_near)
    assert dist_near is not None and dist_near < 100.0
    assert score_near > 0.60

    # ~5 km away
    c_far = {"lat": 13.0100, "lng": 77.6200}
    score_far, dist_far = service.compute_geo_similarity(c_base, c_far)
    assert dist_far is not None and dist_far > 1000.0
    assert score_far == 0.0


# 3. Category & Department Compatibility Tests
def test_category_similarity():
    # Same category
    assert MultiSignalDeduplicationService.compute_category_similarity(
        {"category": "Pothole"}, {"category": "Pothole"}
    ) == 1.0
    # Different category
    assert MultiSignalDeduplicationService.compute_category_similarity(
        {"category": "Pothole"}, {"category": "Streetlight"}
    ) == 0.0
    # Neutral with unclassified
    assert MultiSignalDeduplicationService.compute_category_similarity(
        {"category": "Pothole"}, {"category": "unclassified"}
    ) == 0.5


def test_department_similarity():
    # Same department
    assert MultiSignalDeduplicationService.compute_department_similarity(
        {"department": "Public Works"}, {"department": "Public Works"}
    ) == 1.0
    # Different department
    assert MultiSignalDeduplicationService.compute_department_similarity(
        {"department": "Public Works"}, {"department": "Health"}
    ) == 0.0
    # Neutral with general
    assert MultiSignalDeduplicationService.compute_department_similarity(
        {"department": "Public Works"}, {"department": "general"}
    ) == 0.5


# 4. Temporal Proximity Tests
def test_temporal_proximity_recent_vs_old():
    service = MultiSignalDeduplicationService(temporal_window_hours=48.0)
    now = datetime.now(UTC)
    c_now = {"created_at": now.isoformat()}
    c_recent = {"created_at": (now - timedelta(hours=6)).isoformat()}
    c_old = {"created_at": (now - timedelta(hours=100)).isoformat()}

    score_recent, delta_recent = service.compute_temporal_similarity(c_now, c_recent)
    assert score_recent > 0.80
    assert delta_recent is not None

    score_old, delta_old = service.compute_temporal_similarity(c_now, c_old)
    assert score_old == 0.0
    assert delta_old is not None and delta_old > 300000


def test_temporal_proximity_missing():
    service = MultiSignalDeduplicationService(temporal_window_hours=48.0)
    score, delta = service.compute_temporal_similarity({}, {})
    assert score == 0.8
    assert delta is None


# 5. MultiSignal Deduplication & Cluster Matching Tests
def test_find_duplicate_cluster_identical_complaint():
    service = MultiSignalDeduplicationService(threshold=0.65)
    existing = [_base_complaint(complaint_id="c-1", cluster_id="clust-1")]
    incoming = _base_complaint(complaint_id="c-2", cluster_id=None)

    cluster_id = service.find_duplicate_cluster(incoming, existing)
    assert cluster_id == "clust-1"


def test_find_duplicate_cluster_semantically_similar_and_nearby():
    service = MultiSignalDeduplicationService(threshold=0.60)
    existing = [
        _base_complaint(
            complaint_id="c-1",
            title="Massive crater pothole on 5th main",
            description="Deep road cavity damaging car tires near 5th main road junction.",
            lat=12.9716,
            lng=77.5946,
            cluster_id="clust-pothole",
        )
    ]
    incoming = {
        "complaint_id": "c-2",
        "title": "Severe pothole on 5th Main Road",
        "description": "Large hole in road causing vehicle damage at 5th main junction.",
        "lat": 12.9718,
        "lng": 77.5947,
        "department": "Roads & Traffic",
        "category": "Pothole",
        "created_at": datetime.now(UTC).isoformat(),
    }

    cluster_id = service.find_duplicate_cluster(incoming, existing)
    assert cluster_id == "clust-pothole"


def test_find_duplicate_cluster_clearly_different_returns_none():
    service = MultiSignalDeduplicationService(threshold=0.65)
    existing = [_base_complaint(complaint_id="c-1", cluster_id="clust-pothole")]
    incoming = {
        "complaint_id": "c-2",
        "title": "Noise pollution from late night party",
        "description": "Loud music playing after midnight near residency.",
        "lat": 12.9716,
        "lng": 77.5946,
        "department": "Police",
        "category": "Noise",
        "created_at": datetime.now(UTC).isoformat(),
    }

    cluster_id = service.find_duplicate_cluster(incoming, existing)
    assert cluster_id is None


def test_find_duplicate_cluster_distant_location_returns_none():
    service = MultiSignalDeduplicationService(threshold=0.65, geo_radius_meters=300.0)
    existing = [_base_complaint(complaint_id="c-1", lat=12.9716, lng=77.5946, cluster_id="clust-blr")]
    # Delhi coordinates ~1700km away
    incoming = _base_complaint(complaint_id="c-2", lat=28.6139, lng=77.2090, cluster_id=None)

    cluster_id = service.find_duplicate_cluster(incoming, existing)
    assert cluster_id is None


def test_find_duplicate_cluster_different_department_returns_none():
    service = MultiSignalDeduplicationService(threshold=0.65)
    existing = [_base_complaint(complaint_id="c-1", department="Public Works", cluster_id="clust-1")]
    incoming = _base_complaint(
        complaint_id="c-2",
        title="Illegal parking blocking driveway",
        description="Vehicles parked illegally on sidewalk",
        department="Traffic Police",
        cluster_id=None,
    )

    cluster_id = service.find_duplicate_cluster(incoming, existing)
    assert cluster_id is None


def test_find_duplicate_cluster_missing_coordinates():
    service = MultiSignalDeduplicationService(threshold=0.60)
    existing = [_base_complaint(complaint_id="c-1", lat=None, lng=None, cluster_id="clust-nocoord")]
    incoming = _base_complaint(complaint_id="c-2", lat=None, lng=None, cluster_id=None)

    # Should still evaluate text, category, dept, temporal signals safely without crashing
    cluster_id = service.find_duplicate_cluster(incoming, existing)
    assert cluster_id == "clust-nocoord"


def test_find_duplicate_cluster_missing_optional_metadata():
    service = MultiSignalDeduplicationService(threshold=0.65)
    existing = [
        {
            "complaint_id": "c-1",
            "title": "Broken pipeline",
            "description": "Water overflowing everywhere",
            "lat": 12.9716,
            "lng": 77.5946,
            "cluster_id": "clust-pipe",
        }
    ]
    incoming = {
        "complaint_id": "c-2",
        "title": "Broken pipeline",
        "description": "Water overflowing everywhere",
        "lat": 12.9716,
        "lng": 77.5946,
    }

    cluster_id = service.find_duplicate_cluster(incoming, existing)
    assert cluster_id == "clust-pipe"


def test_find_duplicate_cluster_old_complaint_outside_window():
    service = MultiSignalDeduplicationService(threshold=0.92, temporal_window_hours=24.0)
    old_time = (datetime.now(UTC) - timedelta(days=10)).isoformat()
    existing = [_base_complaint(complaint_id="c-1", created_at=old_time, cluster_id="clust-old")]
    incoming = _base_complaint(complaint_id="c-2", created_at=datetime.now(UTC).isoformat(), cluster_id=None)

    # Stricter threshold with expired temporal window reduces total score below 0.92
    cluster_id = service.find_duplicate_cluster(incoming, existing)
    assert cluster_id is None



def test_threshold_behavior():
    existing = [_base_complaint(complaint_id="c-1", cluster_id="clust-1")]
    incoming = _base_complaint(
        complaint_id="c-2",
        title="Road surface damaged",
        description="Minor cracks on the pavement.",
        cluster_id=None,
    )

    # Lenient threshold matches
    lenient_service = MultiSignalDeduplicationService(threshold=0.40)
    assert lenient_service.find_duplicate_cluster(incoming, existing) == "clust-1"

    # Strict threshold rejects
    strict_service = MultiSignalDeduplicationService(threshold=0.95)
    assert strict_service.find_duplicate_cluster(incoming, existing) is None


def test_empty_existing_complaints_returns_none():
    service = MultiSignalDeduplicationService()
    incoming = _base_complaint()
    assert service.find_duplicate_cluster(incoming, []) is None


# 6. Pipeline Integration: Duplicate Complaint Remains Persisted
def test_duplicate_complaint_remains_persisted(client: TestClient):
    """Ensure duplicate complaints are never discarded; every complaint must be saved and linked."""
    # First complaint creates cluster
    c1_payload = {
        "title": "Flooded road near 8th cross",
        "description": "Drainage blocked, stormwater overflowing onto road.",
        "lat": 12.9500,
        "lng": 77.6000,
        "images": [],
        "language": "en",
    }
    r1 = client.post("/api/complaints", json=c1_payload)
    assert r1.status_code == 201
    c1 = r1.json()
    assert c1["complaint_id"]
    cluster_id = c1["cluster_id"]
    assert cluster_id

    # Second similar complaint near the same location
    c2_payload = {
        "title": "Flooded road on 8th cross",
        "description": "Stormwater overflowing due to blocked drainage pipe.",
        "lat": 12.9502,
        "lng": 77.6001,
        "images": [],
        "language": "en",
    }
    r2 = client.post("/api/complaints", json=c2_payload)
    assert r2.status_code == 201
    c2 = r2.json()

    # Verify both complaints exist and are distinct
    assert c2["complaint_id"] != c1["complaint_id"]
    # Verify both share the same cluster
    assert c2["cluster_id"] == cluster_id

    # Check that both are accessible via GET /api/complaints/{id}
    get_c1 = client.get(f"/api/complaints/{c1['complaint_id']}")
    assert get_c1.status_code == 200
    assert get_c1.json()["complaint_id"] == c1["complaint_id"]

    get_c2 = client.get(f"/api/complaints/{c2['complaint_id']}")
    assert get_c2.status_code == 200
    assert get_c2.json()["complaint_id"] == c2["complaint_id"]

    # Verify cluster member list includes both complaint IDs
    cluster_resp = client.get(f"/api/clusters/{cluster_id}", headers=_officer_headers(client))
    assert cluster_resp.status_code == 200
    members = cluster_resp.json()["member_complaint_ids"]
    assert c1["complaint_id"] in members
    assert c2["complaint_id"] in members
