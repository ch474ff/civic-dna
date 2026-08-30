# Civic DNA

Civic DNA is a civic grievance-management platform. This repository is the shared foundation for a multi-developer team.

## Architecture

- A web client lives in `frontend/`.
- The central FastAPI integration layer lives in `backend/`.
- AI-specific prompts, evaluation assets, and integrations live in `ai/`.
- Reusable independently deployable capabilities live in `services/`.
- Source datasets and controlled local data assets live in `data/`.
- Cross-cutting code and assets live in `shared/`.
- Interface contracts and validation schemas live in `contracts/`, `schemas/`, and `shared/`.
- Automated checks live in `tests/` (cross-cutting) and `backend/tests/` (API).

The HTTP contract, service plug-in points, and entity shapes are documented in [`shared/contracts/backend_contract.md`](shared/contracts/backend_contract.md).

## Directory guide

| Directory | Intended use |
| --- | --- |
| `backend/` | FastAPI API, SQLAlchemy models, Alembic, ML service stubs, API tests. |
| `frontend/` | React/UI code, client assets, and browser tests. |
| `ai/` | AI workflows, prompts, model adapters, and evaluations. |
| `services/` | Domain services that can be developed or deployed independently. |
| `data/` | Documented source data, fixtures, and non-sensitive local datasets. |
| `shared/` | Shared utilities plus `schemas/` and `contracts/` for inter-agent integration. |
| `contracts/` | API/event contracts shared between components. |
| `schemas/` | Validation and data-model schemas. |
| `tests/` | Cross-component, integration, and end-to-end test suites. |

## Backend (local)

Copy environment variables, then either use Docker Compose (PostgreSQL + API) or run the API against a local Postgres instance.

```powershell
Copy-Item .env.example .env
# Edit .env and set JWT_SECRET to a local-only value.
```

### Docker Compose

```powershell
docker compose up --build
```

API: `http://localhost:8000`  
Docs: `http://localhost:8000/docs`  
Health: `http://localhost:8000/health`

### API only (PostgreSQL already running)

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Tests

```powershell
cd backend
pip install -r requirements.txt
pytest
```

Tests use in-memory SQLite and do not require PostgreSQL. ML services are stubbed and can be mocked through FastAPI dependency overrides.

Default bootstrap officer (override in `.env`): `officer` / `changeme`. Change this before any shared or deployed environment.

## Git workflow

1. Start from an up-to-date `main` branch (backend work in this repo is on `backend`).
2. Create a focused branch, for example `feat/civic-search` or `fix/schema-validation`.
3. Make small, cohesive commits with clear messages.
4. Run the relevant checks before opening a pull request.
5. Open a pull request for review; merge only after approval and required checks pass.

Avoid committing secrets, generated files, local environment files, or unreviewed datasets.
