from datetime import UTC, datetime, timedelta
from typing import Any
import pytest
from fastapi.testclient import TestClient

from app.services.deduplication import MultiSignalDeduplicationService, TextSimilarityEngine
from app.services.ml.classifier import MLClassificationService
from app.services.ml.scorer import MLScoringService
from app.services.dependencies import get_classification_service, get_deduplication_service, get_scoring_service
from app.main import app


@pytest.fixture
def real_pipeline_client():
    """Test client configured with real ML classification and multi-signal deduplication services."""
    app.dependency_overrides[get_classification_service] = lambda: MLClassificationService()
    app.dependency_overrides[get_deduplication_service] = lambda: MultiSignalDeduplicationService()
    app.dependency_overrides[get_scoring_service] = lambda: MLScoringService()
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


def _officer_headers(client: TestClient) -> dict[str, str]:
    response = client.post(
        "/api/auth/login",
        json={"username": "officer", "password": "changeme"},
    )
    assert response.status_code == 200, response.text
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# Test 1: Paraphrased Pothole Complaints (large pothole vs huge pothole)
def test_grouping_paraphrased_pothole_complaints(real_pipeline_client: TestClient):
    c1_payload = {
        "title": "Road damage report",
        "description": "There is a large pothole on MG Road near the bus stop.",
        "lat": 28.6139,
        "lng": 77.2090,
        "images": [],
        "language": "en",
    }
    r1 = real_pipeline_client.post("/api/complaints", json=c1_payload)
    assert r1.status_code == 201
    c1 = r1.json()

    c2_payload = {
        "title": "MG Road pothole",
        "description": "MG Road has a huge pothole beside the bus stop.",
        "lat": 28.6142,
        "lng": 77.2093,
        "images": [],
        "language": "en",
    }
    r2 = real_pipeline_client.post("/api/complaints", json=c2_payload)
    assert r2.status_code == 201
    c2 = r2.json()

    assert c1["complaint_id"] != c2["complaint_id"]
    assert c1["cluster_id"] == c2["cluster_id"]


# Test 2: Paraphrased Water Supply Complaints
def test_grouping_paraphrased_water_supply_complaints(real_pipeline_client: TestClient):
    c1_payload = {
        "title": "Water problem",
        "description": "The water supply has stopped in our neighborhood.",
        "lat": 12.9716,
        "lng": 77.5946,
        "images": [],
        "language": "en",
    }
    r1 = real_pipeline_client.post("/api/complaints", json=c1_payload)
    assert r1.status_code == 201
    c1 = r1.json()

    c2_payload = {
        "title": "No tap water",
        "description": "There has been no water coming from the taps in our area.",
        "lat": 12.9718,
        "lng": 77.5948,
        "images": [],
        "language": "en",
    }
    r2 = real_pipeline_client.post("/api/complaints", json=c2_payload)
    assert r2.status_code == 201
    c2 = r2.json()

    assert c1["cluster_id"] == c2["cluster_id"]


# Test 3: Different Issue Categories at Same Location
def test_different_issues_same_location_separated(real_pipeline_client: TestClient):
    c1_payload = {
        "title": "Pothole on MG Road",
        "description": "Large pothole on MG Road causing traffic slowdown.",
        "lat": 28.6139,
        "lng": 77.2090,
        "images": [],
        "language": "en",
    }
    r1 = real_pipeline_client.post("/api/complaints", json=c1_payload)
    assert r1.status_code == 201
    c1 = r1.json()

    c2_payload = {
        "title": "Streetlight failure",
        "description": "Broken streetlight on MG Road, dark street lamp pole.",
        "lat": 28.6139,
        "lng": 77.2090,
        "images": [],
        "language": "en",
    }
    r2 = real_pipeline_client.post("/api/complaints", json=c2_payload)
    assert r2.status_code == 201
    c2 = r2.json()

    assert c1["cluster_id"] != c2["cluster_id"]


# Test 4: Similar Issue in Different Cities
def test_same_issue_different_cities_separated(real_pipeline_client: TestClient):
    # Delhi coordinates
    c1_payload = {
        "title": "Pothole on MG Road in Delhi",
        "description": "Deep road crater on MG Road in Delhi.",
        "lat": 28.6139,
        "lng": 77.2090,
        "images": [],
        "language": "en",
    }
    r1 = real_pipeline_client.post("/api/complaints", json=c1_payload)
    assert r1.status_code == 201
    c1 = r1.json()

    # Bangalore coordinates (~1700km away)
    c2_payload = {
        "title": "Pothole on MG Road in another city",
        "description": "Deep road crater on MG Road in Bangalore.",
        "lat": 12.9716,
        "lng": 77.5946,
        "images": [],
        "language": "en",
    }
    r2 = real_pipeline_client.post("/api/complaints", json=c2_payload)
    assert r2.status_code == 201
    c2 = r2.json()

    assert c1["cluster_id"] != c2["cluster_id"]


# Test 5: Same Issue with Nearby Coordinates within 300m Radius
def test_same_issue_nearby_coordinates_grouped(real_pipeline_client: TestClient):
    c1_payload = {
        "title": "Sewer overflow",
        "description": "Blocked drainage pipe overflowing foul smelling sewage onto street.",
        "lat": 13.0827,
        "lng": 80.2707,
        "images": [],
        "language": "en",
    }
    r1 = real_pipeline_client.post("/api/complaints", json=c1_payload)
    assert r1.status_code == 201
    c1 = r1.json()

    # ~80 meters away
    c2_payload = {
        "title": "Drainage gutter blocked",
        "description": "Drain overflowing with dirty sewage water on road.",
        "lat": 13.0832,
        "lng": 80.2711,
        "images": [],
        "language": "en",
    }
    r2 = real_pipeline_client.post("/api/complaints", json=c2_payload)
    assert r2.status_code == 201
    c2 = r2.json()

    assert c1["cluster_id"] == c2["cluster_id"]


# Test 6: Same Issue with Different Wording Submitted Shortly After
def test_same_issue_different_wording_submitted_shortly_after(real_pipeline_client: TestClient):
    c1_payload = {
        "title": "Exposed high voltage wire",
        "description": "Dangerous electric cable dangling from transformer pole sparking.",
        "lat": 19.0760,
        "lng": 72.8777,
        "images": [],
        "language": "en",
    }
    r1 = real_pipeline_client.post("/api/complaints", json=c1_payload)
    assert r1.status_code == 201
    c1 = r1.json()

    c2_payload = {
        "title": "Sparking power wire",
        "description": "Broken power cord hanging down near electric pole hazard.",
        "lat": 19.0763,
        "lng": 72.8780,
        "images": [],
        "language": "en",
    }
    r2 = real_pipeline_client.post("/api/complaints", json=c2_payload)
    assert r2.status_code == 201
    c2 = r2.json()

    assert c1["cluster_id"] == c2["cluster_id"]


# Test 7: Garbage vs Road Damage at Same Location
def test_different_issues_same_spot(real_pipeline_client: TestClient):
    c1_payload = {
        "title": "Garbage dump overflowing",
        "description": "Trash and waste dumped on corner emitting foul odor.",
        "lat": 28.5355,
        "lng": 77.3910,
        "images": [],
        "language": "en",
    }
    r1 = real_pipeline_client.post("/api/complaints", json=c1_payload)
    assert r1.status_code == 201
    c1 = r1.json()

    c2_payload = {
        "title": "Road cavity",
        "description": "Deep asphalt pothole damaging car tires.",
        "lat": 28.5355,
        "lng": 77.3910,
        "images": [],
        "language": "en",
    }
    r2 = real_pipeline_client.post("/api/complaints", json=c2_payload)
    assert r2.status_code == 201
    c2 = r2.json()

    assert c1["cluster_id"] != c2["cluster_id"]


# Test 8 & End-to-End Pipeline: Three Paraphrased Complaints -> ONE Token with 3 Members
def test_three_paraphrased_complaints_single_token_integration(real_pipeline_client: TestClient):
    # Complaint 1: "There is a large pothole on MG Road near the bus stop."
    c1_payload = {
        "title": "Pothole report 1",
        "description": "There is a large pothole on MG Road near the bus stop.",
        "lat": 28.6139,
        "lng": 77.2090,
        "images": [],
        "language": "en",
    }
    r1 = real_pipeline_client.post("/api/complaints", json=c1_payload)
    assert r1.status_code == 201
    c1 = r1.json()

    # Complaint 2: "MG Road has a huge pothole near the bus stop that is causing problems."
    c2_payload = {
        "title": "Pothole report 2",
        "description": "MG Road has a huge pothole near the bus stop that is causing problems.",
        "lat": 28.6141,
        "lng": 77.2092,
        "images": [],
        "language": "en",
    }
    r2 = real_pipeline_client.post("/api/complaints", json=c2_payload)
    assert r2.status_code == 201
    c2 = r2.json()

    # Complaint 3: "There is a big pothole at the bus stop on MG Road."
    c3_payload = {
        "title": "Pothole report 3",
        "description": "There is a big pothole at the bus stop on MG Road.",
        "lat": 28.6140,
        "lng": 77.2089,
        "images": [],
        "language": "en",
    }
    r3 = real_pipeline_client.post("/api/complaints", json=c3_payload)
    assert r3.status_code == 201
    c3 = r3.json()

    # 1. Verify all three complaints reference the same cluster_id
    token_id = c1["cluster_id"]
    assert token_id
    assert c2["cluster_id"] == token_id
    assert c3["cluster_id"] == token_id

    # 2. Retrieve resulting token and verify member count = 3
    token_resp = real_pipeline_client.get(f"/api/clusters/{token_id}", headers=_officer_headers(real_pipeline_client))
    assert token_resp.status_code == 200
    token_data = token_resp.json()
    members = token_data["member_complaint_ids"]

    assert len(members) == 3
    assert c1["complaint_id"] in members
    assert c2["complaint_id"] in members
    assert c3["complaint_id"] in members


def test_grouping_hinglish_and_english_equivalent_complaints(real_pipeline_client: TestClient):
    # Complaint 1 (English): "The water pipeline near the market is leaking badly."
    c1_payload = {
        "title": "Leaking pipeline near market",
        "description": "The water pipeline near the market is leaking badly.",
        "lat": 28.6139,
        "lng": 77.2090,
        "images": [],
        "language": "en",
    }
    r1 = real_pipeline_client.post("/api/complaints", json=c1_payload)
    assert r1.status_code == 201
    c1 = r1.json()

    # Complaint 2 (Hinglish): "Market ke paas water pipeline bahut badly leak ho rahi hai."
    c2_payload = {
        "title": "Paani pipeline leak market ke paas",
        "description": "Market ke paas water pipeline bahut badly leak ho rahi hai.",
        "lat": 28.6141,
        "lng": 77.2092,
        "images": [],
        "language": "hinglish",
    }
    r2 = real_pipeline_client.post("/api/complaints", json=c2_payload)
    assert r2.status_code == 201
    c2 = r2.json()

    # Confirm both English and Hinglish complaints are merged into the same Token
    assert c1["cluster_id"] == c2["cluster_id"]
    token_id = c1["cluster_id"]
    token_resp = real_pipeline_client.get(f"/api/clusters/{token_id}", headers=_officer_headers(real_pipeline_client))
    assert token_resp.status_code == 200
    token_data = token_resp.json()
    members = token_data["member_complaint_ids"]
    assert c1["complaint_id"] in members
    assert c2["complaint_id"] in members
