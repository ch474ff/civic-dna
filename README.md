# Civic DNA

Civic DNA is an AI-assisted civic grievance intelligence platform that transforms high volumes of citizen complaints into actionable civic **Tokens**, prioritizes them based on severity and sensitivity, routes them to the appropriate municipal departments, and provides transparent tracking for citizens and city administrators alike. In real-world urban environments, many citizens report the exact same underlying civic failure (such as a burst water main or an open pothole). Instead of treating every submission as an isolated ticket, Civic DNA identifies cross-lingual and spatial similarities to consolidate related complaints into a unified **Token** representing the core civic issue.

> 📹 **Prototype Demo Video**: [Watch the Civic DNA Demonstration on Google Drive](https://drive.google.com/drive/folders/14bsFlUsBhTOd09gzptGPuXofo_Fe1WTF?usp=sharing)

---

## Key Features

### Multilingual Citizen Complaints
Citizens can submit complaints in their preferred language with dedicated script and transliteration support:
- **English (`en`)**
- **Hindi (`hi`)** — हिन्दी
- **Hinglish (`hinglish`)** — Hindi written phonetically in Latin script
- **Kannada (`kn`)** — ಕನ್ನಡ
- **Tamil (`ta`)** — தமிழ்
- **Bengali (`bn`)** — বাংলা
- **Marathi (`mr`)** — मराठी

Language selection is integrated into complaint intake, and the backend classification pipeline operates across all supported languages.

### Intelligent Complaint Classification
Incoming grievances are automatically classified into standardized municipal categories and routed to responsible departments:
- **Water Supply** (*Water Department*)
- **Roads & Potholes** (*Public Works*)
- **Electricity** (*Electricity Board*)
- **Sanitation & Waste** (*Sanitation Department*)
- **Drainage** (*Drainage & Sewerage*)
- **Street Lighting** (*Street Lighting Division*)
- **Public Safety** (*Public Safety*)

### Token Grouping (Multi-Signal Deduplication)
Civic DNA groups duplicate or closely related complaints into a single **Token** using a deterministic multi-signal similarity pipeline:
- **Civic Concept Normalization**: Canonicalizes domain terminology across languages (e.g., `_water_`, `_pipe_`, `_leak_`, `_pothole_`, `_hazard_`).
- **Multilingual Token Alignment**: Maps native Indic scripts and transliterations into shared concept tokens.
- **Geographic Proximity**: Calculates accurate Haversine distances to match reports within the same vicinity.
- **Category & Department Compatibility**: Ensures disparate civic problems are not incorrectly merged.
- **Temporal Window**: Evaluates time proximity for incident emergence.
- **Negation & Polarity Handling**: Explicitly differentiates positive issue reports from negated status checks (e.g., *"no water shortage"* / *"ನೀರಿನ ಸಮಸ್ಯೆ ಇಲ್ಲ"* will never group with an active water failure).

#### Cross-Lingual Example
The following three complaints submitted in different languages and scripts are recognized as the same underlying civic problem when location and category signals match:
- **English**: *"Water pipeline is leaking near the market."*
- **Hinglish**: *"Market ke paas water pipeline bahut badly leak ho rahi hai."*
- **Kannada**: *"ಮಾರುಕಟ್ಟೆ ಹತ್ತಿರ ನೀರಿನ ಪೈಪ್ಲೈನ್ ಸೋರಿಕೆಯಾಗುತ್ತಿದೆ."*

### Priority Tiers
Every Token is evaluated and assigned an operational priority tier:
- **Critical**: Life-safety hazards (e.g., exposed sparking wires, collapsed roads, dangerous floods).
- **High**: Urgent infrastructure failures near sensitive locations (schools, hospitals, transit stations).
- **Medium**: Standard municipal disruptions affecting neighborhood access or sanitation.
- **Low**: Routine civic maintenance issues.

### Department Routing
Complaints and consolidated Tokens are automatically mapped to the relevant municipal department, eliminating manual triage delays.

### SLA Tracking & Escalations
- **Department-Aware SLAs**: Calculates realistic resolution deadlines based on department response baselines and priority tiers.
- **Escalation Monitor**: Continuously flags Tokens as `Normal`, `Warning` (approaching deadline), or `Overdue`.
- **Dynamic SLA Recalculation**: Adjusts deadlines if an officer updates priority or reassigns the department.
- **Active Escalation Filtering**: Automatically excludes `Resolved` and `Closed` Tokens from active escalation queues.

### Officer Dashboard
Authenticated municipal officers have access to an administrative command center to:
- Inspect consolidated Tokens and their member citizen grievances.
- Monitor active escalations and SLA countdowns.
- Update Token workflow status and priority tiers.
- Review cluster geographic centroids and recurring keyword signals.

### Citizen Tracking & Timeline
Citizens can track the progress of their grievances publicly without requiring officer credentials:
- View current status, assigned department, and priority tier.
- Track SLA target deadlines.
- Inspect the complete audit timeline of status transitions (`Submitted` &rarr; `Acknowledged` &rarr; `In Progress` &rarr; `Resolved` &rarr; `Closed`).

### Civic GIS Map
An interactive, privacy-first map allows citizens and officers to explore active civic issues across the city. Public map data is sanitized to protect citizen privacy:
- Displays aggregated Token centroids and issue categories.
- Never exposes citizen personal identities, phone numbers, or private complaint text to unauthenticated map visitors.

### Graph Intelligence
The platform integrates with `GraphService` to model interconnected urban relationships:
- **Relationships**: `Complaint → Token`, `Token → Department`, `Token → Category`, `Token → Location`, and cross-Token relationships.
- **Resilient Execution**: Graph service operations are non-blocking and non-fatal to complaint ingestion.

### Citizen Resolution Feedback
When an issue is marked as resolved, citizens can submit direct feedback and star ratings on the quality and timeliness of the municipal resolution.

---

## System Flow

```
                  ┌───────────────────────────────┐
                  │        Citizen Grievance      │
                  │ (EN, HI, Hinglish, KN, TA...) │
                  └──────────────┬────────────────┘
                                 │
                                 ▼
                  ┌───────────────────────────────┐
                  │    Intake & Classification    │
                  │ Category • Severity • Routing │
                  └──────────────┬────────────────┘
                                 │
                                 ▼
                  ┌───────────────────────────────┐
                  │    Multi-Signal Deduplication │
                  │  Concept • Geo • Negation Gating│
                  └──────────────┬────────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
     ┌───────────────────────┐       ┌───────────────────────┐
     │   New Civic Token     │       │ Existing Civic Token  │
     │ SLA • Priority Tier   │       │  Member Consolidated  │
     └───────────┬───────────┘       └───────────┬───────────┘
                 │                               │
                 └───────────────┬───────────────┘
                                 │
                                 ▼
                  ┌───────────────────────────────┐
                  │   Officer Dashboard & Action  │
                  │ Status Updates • Escalations  │
                  └──────────────┬────────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
     ┌───────────────────────┐       ┌───────────────────────┐
     │ Public Status Tracker │       │ Public GIS Civic Map  │
     │    Audit Timeline     │       │  Sanitized Centroids  │
     └───────────────────────┘       └───────────────────────┘
```

When a citizen submits a grievance, Civic DNA processes the text through multilingual normalization, classifies the civic domain, and evaluates severity signals. The multi-signal similarity engine compares the report against active issues in the vicinity. If a matching issue is detected, the grievance is attached to the existing **Token**; otherwise, a new Token is initialized with department-specific SLA deadlines. Municipal officers manage Tokens through their dashboard, while citizens track live status updates and explore sanitized city-wide patterns on the GIS map.

---

## Technology Stack

### Frontend
- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Mapping**: Leaflet & React-Leaflet
- **Testing**: Vitest, React Testing Library, jsdom

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **ORM & Validation**: SQLAlchemy 2.0, Pydantic v2
- **Database Driver**: psycopg3 (`postgresql+psycopg`)
- **Authentication**: Python-JOSE (JWT), Passlib (Bcrypt)
- **Server**: Uvicorn ASGI
- **Testing**: pytest, pytest-asyncio, HTTPX

### Database & Migrations
- **Primary Database**: PostgreSQL 16
- **Schema Migrations**: Alembic

### Infrastructure & Services
- **Containerization**: Docker, Docker Compose
- **Graph Layer**: `GraphService` (in-memory graph engine with Neo4j adapter interface)

---

## Project Structure

```
civic-dna/
├── backend/
│   ├── alembic/                      # Database migration versions (001, 002, 003)
│   ├── app/
│   │   ├── api/                      # Route handlers (auth, complaints, clusters, public, analytics)
│   │   ├── auth/                     # JWT tokens, password hashing, auth dependencies
│   │   ├── models/                   # SQLAlchemy database models (Complaint, Cluster, StatusHistory, etc.)
│   │   ├── schemas/                  # Pydantic request/response validation schemas
│   │   ├── services/                 # Business logic, deduplication, pipeline, graph
│   │   │   └── ml/                   # Keyword classifiers, SLA calculation, escalations, scoring
│   │   ├── config.py                 # Application settings & environment validation
│   │   ├── database.py               # Database engine & session management
│   │   └── main.py                   # FastAPI application initialization
│   ├── tests/                        # Comprehensive backend pytest suite (107 tests)
│   ├── Dockerfile                    # Backend container definition
│   └── requirements.txt              # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/               # Navbar, StatCard, PriorityBadge, Toast, Modals
│   │   ├── context/                  # AuthContext for officer session state
│   │   ├── dashboard/                # Officer cluster inspection & edit modals
│   │   ├── maps/                     # CivicMap Leaflet integration
│   │   ├── pages/                    # Submit, Track, MyGrievances, MapExplore, Dashboard, Analytics
│   │   ├── services/                 # API service clients (auth, complaints, clusters, analytics)
│   │   ├── test/                     # Vitest component & unit tests (21 tests)
│   │   ├── types/                    # TypeScript domain interfaces
│   │   └── utils/                    # Error handling, formatters, SLA calculators
│   ├── package.json                  # Frontend scripts & dependencies
│   └── vite.config.ts                # Vite configuration
├── shared/
│   ├── contracts/                    # API & service interface contracts
│   └── schemas/                      # Shared JSON schemas
├── docker-compose.yml                # PostgreSQL & Backend API container orchestration
└── README.md
```

---

## Local Setup

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm
- Docker Desktop (for PostgreSQL)
- PowerShell (Windows) or standard bash shell

### Step-by-Step Instructions

#### 1. Clone the Repository & Enter Directory
```powershell
git clone https://github.com/ch474ff/civic-dna.git
cd civic-dna
```

#### 2. Start PostgreSQL Database
```powershell
docker compose up -d db
docker compose ps
```

#### 3. Configure Backend Environment
Create a `.env` file in `backend/` or set environment variables:
```powershell
$env:DATABASE_URL="postgresql+psycopg://civic:civic@localhost:5432/civic_dna"
$env:ENVIRONMENT="development"
$env:JWT_SECRET="local-dev-secret-key-do-not-use-in-prod"
$env:OFFICER_BOOTSTRAP_USERNAME="officer"
$env:OFFICER_BOOTSTRAP_PASSWORD="changeme"
$env:CIVIC_CREATE_TABLES="false"
```

#### 4. Run Database Migrations
```powershell
cd backend
python -m alembic upgrade head
```

#### 5. Start Backend Server
```powershell
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

#### 6. Start Frontend Development Server
In a new terminal window:
```powershell
cd frontend
npm install
npm run dev
```

### Application URLs
- **Backend API**: `http://127.0.0.1:8000`
- **Interactive Swagger Docs**: `http://127.0.0.1:8000/docs`
- **API Health Check**: `http://127.0.0.1:8000/health`
- **Frontend Web App**: Use the local URL printed in the Vite console (typically `http://localhost:3000` or `http://localhost:5173`)

---

## Docker Setup

To run both the PostgreSQL database and the backend API containerized:

```powershell
docker compose up -d
docker compose ps
```

This launches:
- `db`: PostgreSQL 16 on port `5432` with health checks and persistent volume storage.
- `api`: FastAPI application on port `8000`.

*Note: The frontend development server runs via `npm run dev` in the `frontend/` directory to facilitate hot-reloading.*

---

## API Overview

### Citizen & Public Endpoints (No Officer Auth Required)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/complaints` | Submit a new grievance (supports EN, HI, Hinglish, KN, TA, BN, MR). |
| `GET` | `/api/complaints/{id}/status` | Public status check returning category, department, priority tier, and SLA. |
| `GET` | `/api/complaints/{id}/timeline` | Public audit log of status transitions and officer remarks. |
| `GET` | `/api/complaints/{id}` | Detailed complaint record for the submitting citizen. |
| `GET` | `/api/public/map` | Sanitized GIS feed of active Token centroids (PII excluded). |

### Officer Endpoints (JWT Required)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Authenticate officer credentials and receive JWT bearer token. |
| `GET` | `/api/auth/me` | Fetch authenticated officer profile and role. |
| `GET` | `/api/clusters` | List all civic Tokens with optional department/status filtering. |
| `GET` | `/api/clusters/{id}` | Inspect Token details and all associated member complaints. |
| `PATCH` | `/api/clusters/{id}` | Update Token status, priority tier, or assigned department. |
| `GET` | `/api/clusters/escalations` | List active warning and overdue Tokens requiring intervention. |
| `GET` | `/api/analytics/summary` | Retrieve aggregated analytics and department SLA statistics. |

---

## Testing & Quality Assurance

### Run Backend Tests
```powershell
cd backend
python -m pytest -v
```
- **Test Suite**: **107 passing tests** covering multilingual classification, cross-lingual token grouping, negation filtering, SLA calculations, escalation rules, status history logging, and API route security.

### Run Frontend Tests & Production Build
```powershell
cd frontend
npm test
npm run build
```
- **Test Suite**: **21 passing tests** covering complaint submission in all languages, public status tracking, officer authentication, error handling modals, and GIS map rendering.
- **Type Checking & Build**: `tsc && vite build` completes cleanly with zero errors.

### Code Style & Formatting Verification
```powershell
git diff --check
```

---

## Prototype Validation Flow

> 🎬 **Video Walkthrough**: Watch the complete prototype demonstration on [Google Drive](https://drive.google.com/drive/folders/14bsFlUsBhTOd09gzptGPuXofo_Fe1WTF?usp=sharing).

Experience the complete end-to-end demo:

1. **Language Selection**: Open the citizen portal and choose **Kannada (`kn`)**, **Hinglish (`hinglish`)**, or **English (`en`)**.
2. **Citizen Submission**: Submit a grievance (e.g., *"ಮಾರುಕಟ್ಟೆ ಹತ್ತಿರ ನೀರಿನ ಪೈಪ್ಲೈನ್ ಸೋರಿಕೆಯಾಗುತ್ತಿದೆ."*).
3. **Automated Triage**: The system classifies the issue as **Water Supply**, maps it to the **Water Department**, assigns priority, and calculates the SLA deadline.
4. **Cross-Lingual Consolidation**: Submit a second complaint for the same location in English (*"Water pipeline leaking near market"*). The similarity engine identifies the matching concept tokens and consolidates both complaints into a single **Token**.
5. **Officer Intervention**: Log into the Officer Dashboard (`officer` / `changeme`), inspect the consolidated Token, and advance status to `In Progress`.
6. **Live Citizen Tracking**: Track the complaint ID without logging in to see the updated status and timeline entry.
7. **Public GIS Map**: Explore the public map to view sanitized incident clusters across the city.

---

## Security & Privacy Highlights

- **Role-Based API Protection**: Administrative endpoints strictly enforce JWT authentication.
- **Production Environment Guardrails**: Rejects insecure default secrets when `ENVIRONMENT=production`.
- **Configurable CORS**: Validates request origins against explicit allowed lists.
- **Citizen Privacy Isolation**: The public GIS feed exposes only geographic cluster centroids and category summaries, withholding citizen identities, contact numbers, and narrative descriptions.

---

## Database Migrations

Database schema versioning is managed via Alembic:

```powershell
python -m alembic upgrade head
```

### Migration History
1. `001_initial.py`: Core schema for complaints, clusters, officers, departments, and feedback.
2. `002_add_created_at_to_complaints.py`: Timestamp tracking for complaint intake.
3. `003_add_status_history_and_updated_at.py`: Audit history table (`cluster_status_history`) and cluster timestamp tracking.

---

## Prototype Scope & Roadmap

### Current Implementation Scope
The current repository delivers a functional, offline-capable prototype using deterministic keyword-based multilingual classification, token-concept deduplication, and geospatial proximity rules.

### Future Roadmap
- **Deep Semantic Embeddings**: Integrate multilingual dense embeddings (e.g., IndicBERT) for broader vocabulary coverage.
- **Computer Vision Verification**: Automated damage assessment and verification from citizen-uploaded photos.
- **Advanced Graph Analytics**: Multi-hop root-cause discovery across municipal asset topologies.
- **Automated Citizen Notifications**: SMS / WhatsApp gateway dispatch for real-time progress alerts.

---

## Demo Credentials

> [!NOTE]
> Development officer bootstrap credentials are provided for testing and evaluation purposes only:
> - **Username**: `officer`
> - **Password**: `changeme`
>
> *In staging and production environments, configure distinct credentials via environment variables.*

---

## Presentation Summary

**Civic DNA** replaces fragmented, redundant civic ticketing with an intelligent consolidation engine. By grouping identical issues across languages into unified **Tokens**, prioritizing them based on real-world impact, and providing transparent tracking, Civic DNA empowers municipal agencies to respond faster and keeps citizens informed every step of the way.

---

Created by (team members):
1. Abhinav Jain (github.com/ch474ff)
2. Prince Prakash (github.com/priinceprakash)
3. Brijesh Chellapilla (github.com/Brijesh739)
