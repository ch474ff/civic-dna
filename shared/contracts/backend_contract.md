# Civic DNA backend contract

This document is the integration surface for other Civic DNA modules. Replace ML stubs without changing routes, request bodies, or response field names.

Canonical JSON Schema copies live in `shared/schemas/`.

## Error format

All non-success JSON errors use:

```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": {}
  }
}
```

| HTTP | code | When |
| --- | --- | --- |
| 401 | `unauthorized` | Missing/invalid JWT or bad login |
| 404 | `not_found` | Unknown complaint or cluster |
| 422 | `validation_error` | Request body failed Pydantic validation |

## Authentication

Citizen routes do **not** require a token:

- `POST /api/complaints`
- `GET /api/complaints/{id}`
- `POST /api/complaints/{id}/feedback`
- `GET /api/clusters`
- `GET /api/clusters/{id}`
- `GET /api/analytics/summary`
- `GET /health`

Officer routes require `Authorization: Bearer <access_token>`:

- `PATCH /api/clusters/{id}`

Issue a token with `POST /api/auth/login`.

### POST `/api/auth/login`

Request:

```json
{ "username": "officer", "password": "changeme" }
```

Response `200`:

```json
{ "access_token": "<jwt>", "token_type": "bearer" }
```

## Complaint object

Field names are stable. Do not rename.

```json
{
  "complaint_id": "str",
  "title": "str",
  "description": "str",
  "lat": 0.0,
  "lng": 0.0,
  "images": [],
  "audio": null,
  "language": "en",
  "department": "str",
  "category": "str",
  "confidence": 0.0,
  "extracted_severity_keywords": [],
  "cluster_id": null
}
```

`department`, `category`, `confidence`, and `extracted_severity_keywords` are filled by `classify_complaint`. `cluster_id` is filled by the pipeline.

### POST `/api/complaints`

Citizen intake. Runs the processing pipeline. `201` returns a Complaint object.

Request (required: `title`, `description`, `lat`, `lng`):

```json
{
  "title": "str",
  "description": "str",
  "lat": 0.0,
  "lng": 0.0,
  "images": [],
  "audio": null,
  "language": "en"
}
```

`lat` must be in `[-90, 90]`, `lng` in `[-180, 180]`.

### GET `/api/complaints/{id}`

`200` Complaint object or `404`.

### POST `/api/complaints/{id}/feedback`

Request:

```json
{ "rating": 4, "comment": "optional text" }
```

`rating` is optional integer 1–5. Response `201`:

```json
{
  "feedback_id": "str",
  "complaint_id": "str",
  "rating": 4,
  "comment": "optional text",
  "created_at": "2026-08-30T00:00:00+00:00"
}
```

## Cluster object

```json
{
  "cluster_id": "str",
  "member_complaint_ids": [],
  "department": "str",
  "priority_score": 0.0,
  "sla_deadline": "2026-08-31T00:00:00+00:00",
  "status": "submitted",
  "root_cause_asset": null
}
```

New clusters start with `status: "submitted"`. Suggested later values: `acknowledged`, `in_progress`, `resolved`, `closed`.

### GET `/api/clusters?sort=priority`

`200` array of Cluster objects. `sort=priority` (default) is priority descending. `sort=-priority` is ascending.

### GET `/api/clusters/{id}`

`200` Cluster object or `404`.

### PATCH `/api/clusters/{id}`

Officer JWT required. All fields optional:

```json
{
  "status": "in_progress",
  "root_cause_asset": "asset-id-or-label",
  "department": "Public Works",
  "priority_score": 0.9,
  "sla_deadline": "2026-09-01T12:00:00+00:00"
}
```

## Analytics

### GET `/api/analytics/summary`

```json
{
  "complaints_total": 0,
  "clusters_total": 0,
  "clusters_by_status": { "submitted": 0 },
  "complaints_by_department": { "general": 0 },
  "average_priority_score": 0.0
}
```

## Database entities

| Table | Key | Notes |
| --- | --- | --- |
| `complaints` | `complaint_id` | Matches Complaint object; `cluster_id` FK |
| `clusters` | `cluster_id` | Matches Cluster object; `member_complaint_ids` JSON list |
| `departments` | `department_id` | Upserted by department name during intake |
| `feedback` | `feedback_id` | Linked to `complaints.complaint_id` |
| `officers` | `officer_id` | Username + password hash for JWT |

Alembic revision: `backend/alembic/versions/001_initial.py`.

## Complaint pipeline

`POST /api/complaints` executes, in order:

1. Validate request
2. `classify_complaint(complaint)`
3. `find_duplicate_cluster(complaint, existing_complaints)`
4. `score_priority(complaint, cluster_context)`
5. Assign existing cluster or create one
6. `calculate_sla(priority_score)`
7. Persist complaint + cluster
8. Return Complaint JSON

If an ML step raises, the API still succeeds with fallbacks: unclassified/`general`/0.0 confidence, new cluster, priority `0.5`, SLA 72 hours.

## Service interfaces (plug-in points)

Do not change these function names. Swap the FastAPI dependency or subclass the ABC.

### `classify_complaint(complaint) -> ClassificationResult`

File: `backend/app/services/classification.py`

- **Input:** mapping with intake fields plus assigned `complaint_id`
- **Output:** `department: str`, `category: str`, `confidence: float`, `extracted_severity_keywords: list[str]`

Replace `StubClassificationService`. Wire via `get_classification_service` in `backend/app/services/dependencies.py`.

### `find_duplicate_cluster(complaint, existing_complaints) -> str | None`

File: `backend/app/services/deduplication.py`

- **Input:** complaint mapping; sequence of existing complaint mappings (full Complaint object shape)
- **Output:** existing `cluster_id` or `None` to create a new cluster

Replace `StubDeduplicationService`. Wire via `get_deduplication_service`.

### `score_priority(complaint, cluster_context) -> float`

File: `backend/app/services/scoring.py`

- **Input:** complaint mapping; `cluster_context` with `cluster_id`, `member_count`, `department`
- **Output:** float in `[0.0, 1.0]` (clamped by the pipeline)

Replace `StubScoringService`. Wire via `get_scoring_service`.

### SLA

File: `backend/app/services/sla.py` — `calculate_sla(priority_score, now=None)`.

- `>= 0.8` → 24 hours
- `>= 0.5` → 72 hours
- else → 168 hours

## How another agent plugs in

1. Implement a class with the same method signature as the ABC in the matching `services/*.py` file.
2. Change `get_*_service()` in `dependencies.py` to return your class, **or** override the dependency in tests/app startup.
3. Do not modify routers under `backend/app/api/` or Pydantic field names in `backend/app/schemas/`.
4. GIS, officer dashboard, and citizen UI should call the HTTP API above rather than importing SQLAlchemy models.

Classifier, deduplication, and scoring modules can be completed without changing the public HTTP contract.
