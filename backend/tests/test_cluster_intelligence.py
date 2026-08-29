from datetime import UTC, datetime, timedelta

from app.services.cluster_intelligence import (
    compute_cluster_complaint_count,
    compute_complaint_time_span,
    compute_dominant_category,
    compute_dominant_department,
    compute_geographic_centroid,
    compute_recurring_keywords,
    summarize_cluster_intelligence,
)


def test_compute_cluster_complaint_count():
    assert compute_cluster_complaint_count([]) == 0
    assert compute_cluster_complaint_count([{"id": "1"}, {"id": "2"}]) == 2


def test_compute_geographic_centroid():
    complaints = [
        {"lat": 12.9710, "lng": 77.5940},
        {"lat": 12.9720, "lng": 77.5950},
        {"lat": None, "lng": None},  # Missing
        {"lat": 999.0, "lng": 77.0},  # Out of range
    ]
    centroid = compute_geographic_centroid(complaints)
    assert centroid is not None
    assert centroid[0] == 12.9715
    assert centroid[1] == 77.5945

    assert compute_geographic_centroid([]) is None


def test_compute_dominant_category():
    complaints = [
        {"category": "unclassified"},
        {"category": "Pothole"},
        {"category": "Pothole"},
        {"category": "Streetlight"},
    ]
    assert compute_dominant_category(complaints) == "Pothole"
    assert compute_dominant_category([{"category": "unclassified"}]) == "unclassified"
    assert compute_dominant_category([]) is None


def test_compute_dominant_department():
    complaints = [
        {"department": "general"},
        {"department": "Public Works"},
        {"department": "Public Works"},
        {"department": "Sanitation"},
    ]
    assert compute_dominant_department(complaints) == "Public Works"
    assert compute_dominant_department([]) is None


def test_compute_complaint_time_span():
    t0 = datetime(2026, 8, 30, 10, 0, 0, tzinfo=UTC)
    t1 = t0 + timedelta(hours=5)
    complaints = [
        {"created_at": t0.isoformat()},
        {"created_at": t1.isoformat()},
    ]
    span = compute_complaint_time_span(complaints)
    assert span["earliest"] == t0.isoformat()
    assert span["latest"] == t1.isoformat()
    assert span["duration_seconds"] == 18000.0
    assert span["duration_hours"] == 5.0

    empty_span = compute_complaint_time_span([])
    assert empty_span["earliest"] is None


def test_compute_recurring_keywords():
    complaints = [
        {
            "title": "Severe road water leakage",
            "description": "The water pipeline burst flooding the road.",
            "extracted_severity_keywords": ["flooding", "burst pipe"],
        },
        {
            "title": "Water leakage problem",
            "description": "Massive flooding on the road.",
            "extracted_severity_keywords": ["flooding"],
        },
    ]
    keywords = compute_recurring_keywords(complaints, top_k=3)
    keyword_names = [k[0] for k in keywords]
    assert "flooding" in keyword_names
    assert "water" in keyword_names or "leakage" in keyword_names


def test_summarize_cluster_intelligence():
    t0 = datetime(2026, 8, 30, 12, 0, 0, tzinfo=UTC)
    complaints = [
        {
            "complaint_id": "c1",
            "title": "Broken light",
            "description": "Streetlight pole broken",
            "lat": 28.6139,
            "lng": 77.2090,
            "category": "Streetlight",
            "department": "Electricity",
            "created_at": t0.isoformat(),
            "extracted_severity_keywords": ["darkness"],
        }
    ]
    summary = summarize_cluster_intelligence("clust-1", complaints)
    assert summary["cluster_id"] == "clust-1"
    assert summary["complaint_count"] == 1
    assert summary["centroid_lat"] == 28.6139
    assert summary["centroid_lng"] == 77.2090
    assert summary["dominant_category"] == "Streetlight"
    assert summary["dominant_department"] == "Electricity"
    assert summary["time_span"]["earliest"] == t0.isoformat()
    assert len(summary["top_keywords"]) >= 1
