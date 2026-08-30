"""Unit tests for Civic DNA ML intelligence layer.

Tests all required aspects:
- Multilingual complaint classification (EN, HI, TA, BN, MR)
- Category matching & low-confidence fallbacks
- Severity & location keyword extractions
- Priority scoring & life-safety outranking
- SLA calculation across departments and priority tiers
- Cluster escalation detection (normal, warning, overdue)
- Department routing
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest

from app.services.ml.classifier import MLClassificationService
from app.services.ml.config import (
    CATEGORIES,
    CATEGORY_DEPARTMENT_MAP,
    ScoringWeights,
)
from app.services.ml.escalation import check_escalations
from app.services.ml.routing import route_to_department
from app.services.ml.scorer import MLScoringService
from app.services.ml.sla import get_sla_deadline


# ===========================================================================
# Fixtures
# ===========================================================================

@pytest.fixture
def classifier() -> MLClassificationService:
    return MLClassificationService()


@pytest.fixture
def scorer() -> MLScoringService:
    return MLScoringService()


# ===========================================================================
# 1. Classification Tests
# ===========================================================================

def test_classification_english_road(classifier: MLClassificationService):
    complaint = {
        "title": "Severe pothole on 5th Avenue",
        "description": "Large pothole causing vehicle damage and traffic backup.",
        "language": "en",
    }
    result = classifier.classify_complaint(complaint)
    assert result.category == "Roads & Potholes"
    assert result.department == "Public Works"
    assert result.confidence > 0.0


def test_classification_hindi_complaint(classifier: MLClassificationService):
    complaint = {
        "title": "टूटी सड़क और बड़े गड्ढे",
        "description": "मुख्य सड़क पर बहुत बड़ा गड्ढा है जिससे दुर्घटना का खतरा है।",
        "language": "hi",
    }
    result = classifier.classify_complaint(complaint)
    assert result.category == "Roads & Potholes"
    assert result.department == "Public Works"
    assert result.confidence > 0.0


def test_classification_tamil_complaint(classifier: MLClassificationService):
    complaint = {
        "title": "குடிநீர் விநியோகம் இல்லை",
        "description": "எங்கள் பகுதியில் தண்ணீர் குழாய் உடைந்து நீர் கசிவு ஏற்பட்டுள்ளது.",
        "language": "ta",
    }
    result = classifier.classify_complaint(complaint)
    assert result.category == "Water Supply"
    assert result.department == "Water Department"
    assert result.confidence > 0.0


def test_classification_bengali_and_marathi_complaints(classifier: MLClassificationService):
    # Bengali (Electricity)
    complaint_bn = {
        "title": "বিদ্যুৎ বিভ্রাট ও খোলা তার",
        "description": "ট্রান্সফরমার বিকল হয়ে গেছে এবং রাস্তায় খোলা তার ঝুলছে।",
        "language": "bn",
    }
    result_bn = classifier.classify_complaint(complaint_bn)
    assert result_bn.category == "Electricity"
    assert result_bn.department == "Electricity Board"

    # Marathi (Sanitation)
    complaint_mr = {
        "title": "रस्त्यावर कचरा आणि घाण",
        "description": "कचराकुंडी भरून वाहते आहे आणि खूप दुर्गंधी येत आहे.",
        "language": "mr",
    }
    result_mr = classifier.classify_complaint(complaint_mr)
    assert result_mr.category == "Sanitation & Waste"
    assert result_mr.department == "Sanitation Department"


def test_classification_hinglish_complaints(classifier: MLClassificationService):
    # Water Supply Hinglish
    water_complaint = {
        "title": "Main water pipeline leak ho rahi hai",
        "description": "Hamare area mein main water pipeline bahut badly leak ho rahi hai. Road par kaafi paani bhar gaya hai aur bahut saara paani waste ho raha hai. Jaldi se water department ko bhejiye.",
        "language": "hinglish",
    }
    water_res = classifier.classify_complaint(water_complaint)
    assert water_res.category == "Water Supply"
    assert water_res.department == "Water Department"

    # Roads & Potholes Hinglish
    road_complaint = {
        "title": "Sadak par bada gaddha hai",
        "description": "Kharaab sadak par bahut bada gaddha ho gaya hai jisse vehicles damage ho rahe hain.",
        "language": "hinglish",
    }
    road_res = classifier.classify_complaint(road_complaint)
    assert road_res.category == "Roads & Potholes"


def test_classification_kannada_complaints(classifier: MLClassificationService):
    # 1. Water Supply
    water_c = {
        "title": "ದೊಡ್ಡ ನೀರಿನ ಪೈಪ್ ಸೋರಿಕೆ",
        "description": "ಮಾರುಕಟ್ಟೆ ಹತ್ತಿರ ಮುಖ್ಯ ನೀರಿನ ಪೈಪ್ಲೈನ್ ತುಂಬಾ ಸೋರಿಕೆಯಾಗುತ್ತಿದೆ. ಕುಡಿಯುವ ನೀರು ವ್ಯರ್ಥವಾಗಿದೆ.",
        "language": "kn",
    }
    water_res = classifier.classify_complaint(water_c)
    assert water_res.category == "Water Supply"
    assert water_res.department == "Water Department"
    assert water_res.confidence > 0.0

    # 2. Roads & Potholes
    road_c = {
        "title": "ರಸ್ತೆಯ ದೊಡ್ಡ ಗುಂಡಿಗಳು",
        "description": "ಹಾಳಾದ ರಸ್ತೆ ಮತ್ತು ದೊಡ್ಡ ಗುಂಡಿ ಬಿದ್ದಿದೆ ವಾಹನಗಳಿಗೆ ತೊಂದರೆಯಾಗುತ್ತಿದೆ.",
        "language": "kn",
    }
    road_res = classifier.classify_complaint(road_c)
    assert road_res.category == "Roads & Potholes"
    assert road_res.department == "Public Works"

    # 3. Electricity
    elec_c = {
        "title": "ವಿದ್ಯುತ್ ಕಡಿತ ಮತ್ತು ಕಂಬದ ತಂತಿ",
        "description": "ಕರೆಂಟ್ ಇಲ್ಲ, ಟ್ರಾನ್ಸ್ಫಾರ್ಮರ್ ಕಿಡಿ ಹಾರುತ್ತಿದೆ ಮತ್ತು ಕತ್ತಲೆ ಆವರಿಸಿದೆ.",
        "language": "kn",
    }
    elec_res = classifier.classify_complaint(elec_c)
    assert elec_res.category == "Electricity"
    assert elec_res.department == "Electricity Board"

    # 4. Sanitation & Waste
    san_c = {
        "title": "ರಸ್ತೆಯಲ್ಲಿ ಕಸದ ರಾಶಿ",
        "description": "ಕಸದ ಬುಟ್ಟಿ ತುಂಬಿದೆ, ಕಸ ವಿಲೇವಾರಿ ಮಾಡಿಲ್ಲ ಮತ್ತು ತೀವ್ರ ದುರ್ವಾಸನೆ ಬರುತ್ತಿದೆ.",
        "language": "kn",
    }
    san_res = classifier.classify_complaint(san_c)
    assert san_res.category == "Sanitation & Waste"
    assert san_res.department == "Sanitation Department"

    # 5. Drainage
    drain_c = {
        "title": "ಒಳಚರಂಡಿ ಮುಚ್ಚಿದೆ",
        "description": "ಚರಂಡಿ ತುಂಬಿ ರಸ್ತೆಯಲ್ಲಿ ಕೊಳಕು ನೀರು ನಿಂತಿದೆ ಮತ್ತು ಗಟಾರ್ ಹರಿಯುತ್ತಿಲ್ಲ.",
        "language": "kn",
    }
    drain_res = classifier.classify_complaint(drain_c)
    assert drain_res.category == "Drainage"
    assert drain_res.department == "Drainage & Sewerage"

    # 6. Street Lighting
    light_c = {
        "title": "ಬೀದಿ ದೀಪ ಕೆಲಸ ಮಾಡುತ್ತಿಲ್ಲ",
        "description": "ರಸ್ತೆ ದೀಪ ಕೆಟ್ಟಿದೆ ಮತ್ತು ರಾತ್ರಿ ವೇಳೆ ಸಂಪೂರ್ಣ ಕತ್ತಲೆ ಇದೆ.",
        "language": "kn",
    }
    light_res = classifier.classify_complaint(light_c)
    assert light_res.category == "Street Lighting"
    assert light_res.department == "Street Lighting Division"

    # 7. Public Safety
    safety_c = {
        "title": "ತೀವ್ರ ಅಪಾಯ ಮತ್ತು ಅಪಘಾತ ಸಾಧ್ಯತೆ",
        "description": "ಇಲ್ಲಿ ಜೀವಕ್ಕೆ ಅಪಾಯಕಾರಿ ಪರಿಸ್ಥಿತಿ ಇದೆ, ತಕ್ಷಣ ರಕ್ಷಣೆ ಮತ್ತು ತುರ್ತು ಕ್ರಮ ಕೈಗೊಳ್ಳಬೇಕು.",
        "language": "kn",
    }
    safety_res = classifier.classify_complaint(safety_c)
    assert safety_res.category == "Public Safety"
    assert safety_res.department == "Public Safety"

    # Electricity Hinglish
    elec_complaint = {
        "title": "Transformer se sparks aur bijli gul",
        "description": "Transformer kharab ho gaya hai, bijli chali gayi hai aur khula taar latak raha hai.",
        "language": "hinglish",
    }
    elec_res = classifier.classify_complaint(elec_complaint)
    assert elec_res.category == "Electricity"
    assert elec_res.department == "Electricity Board"

    # Sanitation & Waste Hinglish
    san_complaint = {
        "title": "Kachra aur kooda ka dher",
        "description": "Colony mein kachre ka dher laga hai aur bahut gandi badboo aa rahi hai, safai nahi hui.",
        "language": "hinglish",
    }
    san_res = classifier.classify_complaint(san_complaint)
    assert san_res.category == "Sanitation & Waste"
    assert san_res.department == "Sanitation Department"

    # Street Lighting Hinglish
    light_complaint = {
        "title": "Street light band hai andhera",
        "description": "Sadak ki street light kharab hai aur pura andhera rehta hai.",
        "language": "hinglish",
    }
    light_res = classifier.classify_complaint(light_complaint)
    assert light_res.category == "Street Lighting"
    assert light_res.department == "Street Lighting Division"

    # Drainage Hinglish
    drain_complaint = {
        "title": "Band naali aur ganda nala overflow",
        "description": "Naali band hone se sadak par ganda paani overflow ho raha hai jalbharav ho gaya.",
        "language": "hinglish",
    }
    drain_res = classifier.classify_complaint(drain_complaint)
    assert drain_res.category == "Drainage"
    assert drain_res.department == "Drainage & Sewerage"


def test_classification_water_complaint(classifier: MLClassificationService):
    complaint = {
        "title": "Burst pipeline flooding the street",
        "description": "Drinking water supply is disrupted due to leaking pipe.",
        "language": "en",
    }
    result = classifier.classify_complaint(complaint)
    assert result.category == "Water Supply"
    assert result.department == "Water Department"


def test_classification_electricity_complaint(classifier: MLClassificationService):
    complaint = {
        "title": "Power outage and sparking transformer",
        "description": "Short circuit on the electric pole, exposed wire on street.",
        "language": "en",
    }
    result = classifier.classify_complaint(complaint)
    assert result.category == "Electricity"
    assert result.department == "Electricity Board"


def test_classification_safety_critical_complaint(classifier: MLClassificationService):
    complaint = {
        "title": "Dangerous collapsed structure after fire",
        "description": "Urgent emergency hazard, building collapse risk.",
        "language": "en",
    }
    result = classifier.classify_complaint(complaint)
    assert result.category == "Public Safety"
    assert result.department == "Public Safety"
    assert len(result.extracted_severity_keywords) > 0


def test_classification_low_confidence_and_unknown(classifier: MLClassificationService):
    complaint = {
        "title": "Random gibberish xyz abc",
        "description": "Nothing meaningful here foo bar baz",
        "language": "en",
    }
    result = classifier.classify_complaint(complaint)
    assert result.category == "Other"
    assert result.department == "general"
    assert result.confidence == 0.0


def test_severity_keyword_extraction(classifier: MLClassificationService):
    complaint = {
        "title": "Major accident with severe injury",
        "description": "Exposed wire and flooding near open manhole.",
        "language": "en",
    }
    result = classifier.classify_complaint(complaint)
    keywords_lower = [k.lower() for k in result.extracted_severity_keywords]
    assert any("accident" in k for k in keywords_lower)
    assert any("injury" in k for k in keywords_lower)
    assert any("exposed wire" in k for k in keywords_lower)
    assert any("flooding" in k for k in keywords_lower)


def test_false_positive_keyword_avoidance(classifier: MLClassificationService):
    # 'deadline' should NOT extract 'dead'
    # 'cabinet' should NOT extract 'bin'
    # 'maintain' should NOT extract 'main'
    complaint = {
        "title": "The report deadline is Friday",
        "description": "Please maintain the cabinet in the office.",
        "language": "en",
    }
    result = classifier.classify_complaint(complaint)
    keywords_lower = [k.lower() for k in result.extracted_severity_keywords]
    assert "dead" not in keywords_lower
    assert "death" not in keywords_lower
    assert len(keywords_lower) == 0


def test_unknown_category_fallback(classifier: MLClassificationService):
    complaint = {"title": "Unknown issue 123", "description": "unrelated matter"}
    result = classifier.classify_complaint(complaint)
    assert result.category == "Other"
    assert result.department == "general"


# ===========================================================================
# 2. Priority Scoring Tests
# ===========================================================================

def test_priority_life_safety_complaint(scorer: MLScoringService):
    complaint = {
        "title": "Exposed wire fire emergency",
        "description": "Severe electrocution accident risk near school.",
    }
    context = {"member_count": 1, "department": "Public Safety"}
    score = scorer.score_priority(complaint, context)
    assert score >= 0.7


def test_priority_large_low_severity_cluster(scorer: MLScoringService):
    complaint = {
        "title": "Dim street light",
        "description": "Light is somewhat dim at night.",
    }
    context = {"member_count": 20, "department": "Street Lighting Division"}
    score = scorer.score_priority(complaint, context)
    # Even with 20 members, lack of severity keywords keeps score moderate
    assert score < 0.6


def test_priority_sensitive_location_boost(scorer: MLScoringService):
    base_complaint = {
        "title": "Pothole on road",
        "description": "Small pothole on local street.",
    }
    sensitive_complaint = {
        "title": "Pothole outside children school and hospital",
        "description": "Dangerous pothole right in front of primary school gate.",
    }
    context = {"member_count": 1, "department": "Public Works"}

    base_score = scorer.score_priority(base_complaint, context)
    sensitive_score = scorer.score_priority(sensitive_complaint, context)
    assert sensitive_score > base_score


def test_priority_cluster_size_scaling(scorer: MLScoringService):
    complaint = {
        "title": "Garbage dump",
        "description": "Waste piling up on side of street.",
    }
    small_context = {"member_count": 1, "department": "Sanitation Department"}
    large_context = {"member_count": 15, "department": "Sanitation Department"}

    score_small = scorer.score_priority(complaint, small_context)
    score_large = scorer.score_priority(complaint, large_context)
    assert score_large > score_small


def test_life_safety_outranks_large_low_severity(scorer: MLScoringService):
    life_safety = {
        "title": "Live electric wire sparking and fire hazard",
        "description": "Dangerous emergency accident risk next to hospital.",
    }
    life_safety_context = {"member_count": 1, "department": "Electricity Board"}

    low_severity_large = {
        "title": "Litter on pavement",
        "description": "Some uncollected waste and leaves.",
    }
    large_cluster_context = {"member_count": 20, "department": "Sanitation Department"}

    score_safety = scorer.score_priority(life_safety, life_safety_context)
    score_large_cluster = scorer.score_priority(low_severity_large, large_cluster_context)

    assert score_safety > score_large_cluster


def test_priority_custom_weights():
    custom_weights = ScoringWeights(
        severity=0.70,
        cluster_size=0.10,
        location_sensitivity=0.10,
        category_risk=0.10,
    )
    custom_scorer = MLScoringService(weights=custom_weights)
    complaint = {
        "title": "Fire explosion danger accident",
        "description": "Immediate emergency.",
    }
    context = {"member_count": 0, "department": "Public Safety"}
    score = custom_scorer.score_priority(complaint, context)
    assert score >= 0.75


# ===========================================================================
# 3. SLA Calculation Tests
# ===========================================================================

def test_sla_high_priority():
    now = datetime(2026, 8, 30, 10, 0, 0, tzinfo=UTC)
    deadline = get_sla_deadline(priority_score=0.9, department="Public Safety", now=now)
    # Critical tier for Public Safety = 12 hours
    assert deadline == now + timedelta(hours=12)


def test_sla_normal_priority():
    now = datetime(2026, 8, 30, 10, 0, 0, tzinfo=UTC)
    deadline = get_sla_deadline(priority_score=0.3, department="Sanitation Department", now=now)
    # Low tier default = 168 hours
    assert deadline == now + timedelta(hours=168)


def test_sla_department_differences():
    now = datetime(2026, 8, 30, 10, 0, 0, tzinfo=UTC)
    deadline_ps = get_sla_deadline(priority_score=0.7, department="Public Safety", now=now)
    deadline_water = get_sla_deadline(priority_score=0.7, department="Water Department", now=now)
    # High tier: Public Safety is 24h, Water is 48h
    assert deadline_ps < deadline_water


# ===========================================================================
# 4. Escalation Checker Tests
# ===========================================================================

def test_escalation_normal():
    now = datetime(2026, 8, 30, 12, 0, 0, tzinfo=UTC)
    clusters = [
        {"cluster_id": "c1", "sla_deadline": now + timedelta(hours=24)},
    ]
    results = check_escalations(clusters, now=now)
    assert len(results) == 1
    assert results[0].level == "normal"
    assert results[0].hours_remaining == 24.0


def test_escalation_warning():
    now = datetime(2026, 8, 30, 12, 0, 0, tzinfo=UTC)
    clusters = [
        {"cluster_id": "c2", "sla_deadline": now + timedelta(hours=3)},
    ]
    results = check_escalations(clusters, now=now)
    assert len(results) == 1
    assert results[0].level == "warning"
    assert results[0].hours_remaining == 3.0


def test_escalation_overdue():
    now = datetime(2026, 8, 30, 12, 0, 0, tzinfo=UTC)
    clusters = [
        {"cluster_id": "c3", "sla_deadline": now - timedelta(hours=2)},
    ]
    results = check_escalations(clusters, now=now)
    assert len(results) == 1
    assert results[0].level == "overdue"
    assert results[0].hours_remaining < 0


# ===========================================================================
# 5. Department Routing Tests
# ===========================================================================

def test_department_routing_all_categories():
    for category in CATEGORIES:
        dept = route_to_department(category)
        assert dept == CATEGORY_DEPARTMENT_MAP[category]


def test_department_routing_unknown_fallback():
    assert route_to_department("NonExistentCategory") == "general"
    assert route_to_department("") == "general"
