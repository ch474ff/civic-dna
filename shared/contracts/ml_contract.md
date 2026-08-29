# Civic DNA — ML Intelligence Contract

This document specifies the interface, behavior, configuration, and integration surface of the ML Intelligence layer (Person 2).

---

## 1. Public Functions and Interfaces

The ML layer provides drop-in implementations for the backend abstract base classes and auxiliary utilities:

### `MLClassificationService.classify_complaint(complaint) -> ClassificationResult`
* **File:** `backend/app/services/ml/classifier.py`
* **Implements:** `backend/app/services/classification.py:ClassificationService`
* **Input:** `Mapping[str, Any]` (complaint mapping with intake fields: `title`, `description`, `language`, `images`, `audio`, etc.)
* **Output:** `ClassificationResult`:
  * `department: str`
  * `category: str`
  * `confidence: float` (in `[0.0, 1.0]`)
  * `extracted_severity_keywords: list[str]`

> [!NOTE]
> **English Summary:** Note that `ClassificationResult` in the stable backend schema does not expose an English summary field. In accordance with strict contract preservation, no summary field is added to the backend HTTP response or `ClassificationResult`. English summary generation is documented as a future enhancement once schema modifications are agreed upon.

### `MLScoringService.score_priority(complaint, cluster_context) -> float`
* **File:** `backend/app/services/ml/scorer.py`
* **Implements:** `backend/app/services/scoring.py:ScoringService`
* **Input:**
  * `complaint: Mapping[str, Any]`
  * `cluster_context: Mapping[str, Any]` (contains `cluster_id`, `member_count`, `department`)
* **Output:** `float` in `[0.0, 1.0]` (deterministic, rounded to 4 decimals)

### `get_sla_deadline(priority_score, department="default", now=None) -> datetime`
* **File:** `backend/app/services/ml/sla.py`
* **Input:** `priority_score: float`, `department: str`, `now: datetime | None`
* **Output:** UTC-aware `datetime` representing SLA deadline according to department and priority tier.

### `check_escalations(clusters, now=None) -> list[EscalationResult]`
* **File:** `backend/app/services/ml/escalation.py`
* **Input:** Sequence of cluster mappings containing `cluster_id` and `sla_deadline`
* **Output:** List of `EscalationResult(cluster_id, level, sla_deadline, hours_remaining)` where `level ∈ {"normal", "warning", "overdue"}`.

### `route_to_department(category) -> str`
* **File:** `backend/app/services/ml/routing.py`
* **Input:** `category: str`
* **Output:** `department: str` (falls back to `"general"` for unknown categories)

---

## 2. Supported Categories and Departments

| Category | Mapped Department | Inherent Risk |
|---|---|---|
| `Roads & Potholes` | `Public Works` | 0.5 |
| `Water Supply` | `Water Department` | 0.4 |
| `Electricity` | `Electricity Board` | 0.7 |
| `Sanitation & Waste` | `Sanitation Department` | 0.3 |
| `Street Lighting` | `Street Lighting Division` | 0.4 |
| `Drainage` | `Drainage & Sewerage` | 0.4 |
| `Public Safety` | `Public Safety` | 0.8 |
| `Other` | `general` | 0.2 |

---

## 3. Supported Languages

Multilingual keyword databases support 5 languages:
1. **English (`en`)**
2. **Hindi (`hi`)** — हिन्दी
3. **Tamil (`ta`)** — தமிழ்
4. **Bengali (`bn`)** — বাংলা
5. **Marathi (`mr`)** — मराठी

---

## 4. Confidence & Low-Confidence Handling

* Category classification evaluates keyword frequency across titles and descriptions.
* `confidence = min(hits / 4.0, 0.95)`.
* Zero keyword matches result in category `"Other"`, department `"general"`, and `confidence = 0.0`.
* The backend contract specifies a manual review threshold of `0.5`. Complaints with `confidence < 0.5` remain in category `"Other"` or retain their low confidence score for officer review.

---

## 5. Image Support

* The classifier architecture allows image evaluation through the provider adapter without modifying HTTP schemas.
* When external vision models are absent or fail, the system falls back gracefully to text-only classification without crashing intake.

---

## 6. Priority Scoring Formula

The priority score is computed as:
$$\text{Priority} = w_{\text{sev}} \cdot F_{\text{sev}} + w_{\text{size}} \cdot F_{\text{size}} + w_{\text{loc}} \cdot F_{\text{loc}} + w_{\text{cat}} \cdot R_{\text{cat}}$$

Default configurable weights:
* $w_{\text{sev}} = 0.40$ (Severity factor based on life-safety keyword indicators)
* $w_{\text{size}} = 0.20$ (Cluster size factor $\min(\text{member\_count} / 20, 1.0)$)
* $w_{\text{loc}} = 0.20$ (Sensitive location factor, e.g., hospital, school, market)
* $w_{\text{cat}} = 0.20$ (Inherent category risk)

**Critical Invariant:** Life-safety complaints (severe hazard/fire/electrocution/accident) achieve high severity + category scores, guaranteed to outrank large low-severity clusters (e.g. minor litter).

---

## 7. SLA Rules and Configuration

SLA hours by priority tier:
* **Critical** ($\ge 0.8$): 12h (Public Safety, Electricity) to 24h (Standard)
* **High** ($\ge 0.6$): 24h to 48h / 72h
* **Medium** ($\ge 0.4$): 48h to 72h
* **Low** ($< 0.4$): 120h to 168h (7 days)

---

## 8. Escalation Logic

Clusters evaluated via `check_escalations`:
* **`normal`**: Remaining time $> 6.0$ hours before deadline.
* **`warning`**: Remaining time $\le 6.0$ hours and $> 0$.
* **`overdue`**: Current time has exceeded the SLA deadline ($t \le 0$).

---

## 9. Provider Architecture

```
Backend Complaint Pipeline
        ↓
MLClassificationService / MLScoringService
        ↓
MLProvider (Abstract Interface)
   ├── KeywordMLProvider (Default, offline, deterministic, no API key needed)
   └── LLMMLProvider (Optional production adapter, configured via env vars)
```

---

## 10. Environment Variables

* `ML_PROVIDER`: `"keyword"` (default) or `"llm"`.
* `ML_API_KEY`: API key when using an external LLM provider.
* `ML_MODEL_NAME`: Target model name when using an external LLM provider.
* `ML_CONFIDENCE_THRESHOLD`: Threshold for manual review flag (default: `0.5`).

---

## 11. Testing

To run the full suite:
```powershell
cd backend
python -m pytest -v
```
All 37 tests (13 backend + 24 ML unit tests) execute offline in under 2 seconds without requiring external network access or paid API credentials.
