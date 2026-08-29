# Civic DNA — Frontend & GIS Application

Civic DNA is an intelligent municipal grievance-management platform. This frontend application provides the citizen intake portal, real-time SLA tracking, Leaflet GIS mapping, officer cluster triage command, and governance analytics dashboard.

---

## 🏛 Architecture & Tech Stack

- **Framework**: React 18 with TypeScript
- **Bundler & Tooling**: Vite 6
- **Styling**: Tailwind CSS
- **Mapping & GIS**: Leaflet & React-Leaflet with OpenStreetMap tiles
- **Icons**: Lucide React
- **Testing**: Vitest + React Testing Library + JSDOM
- **Backend Contract**: 100% conforming to frozen FastAPI schemas (`backend_contract.md`, `ml_contract.md`, `dedup_graph_contract.md`)

---

## 📁 Directory Structure

```
frontend/
├── src/
│   ├── components/       # Shared UI widgets (Navbar, StatCard, PriorityBadge, FeedbackModal, Toast, LoadingSpinner)
│   ├── pages/            # View pages (CitizenSubmitPage, CitizenTrackPage, MapExplorePage, OfficerLoginPage, OfficerDashboardPage, AnalyticsPage)
│   ├── services/         # Central API client and domain services (api.ts, authService.ts, complaintService.ts, clusterService.ts, analyticsService.ts)
│   ├── context/          # State providers (AuthContext.tsx)
│   ├── maps/             # GIS components (CivicMap.tsx)
│   ├── dashboard/        # Officer tools (ClusterEditModal.tsx, ClusterTable.tsx)
│   ├── types/            # TypeScript models strictly matching backend schemas
│   ├── utils/            # Utilities (formatters.ts, sla.ts, error.ts)
│   ├── test/             # Vitest unit and integration test suites
│   ├── App.tsx           # Main application shell with tab navigation
│   ├── main.tsx          # React root bootstrap
│   └── index.css         # Tailwind base and Leaflet style overrides
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
├── .env.example
├── .env
└── package.json
```

---

## ⚙️ Environment Configuration

Create a `.env` file from `.env.example`:

```env
VITE_API_BASE_URL=http://localhost:8000
```

| Variable | Description | Default |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Root URL of the FastAPI backend service | `http://localhost:8000` |

---

## 🚀 Getting Started

### 1. Install Dependencies

```powershell
npm install
```

### 2. Run Development Server

```powershell
npm run dev
```

The application will start at `http://localhost:3000` (or `http://localhost:5173`).

### 3. Build for Production

```powershell
npm run build
```

Generates optimized bundle in `dist/`.

### 4. Run Automated Tests

```powershell
npm test
```

Runs all Vitest unit, component, and integration tests with JSDOM.

---

## 🔄 User Workflows & Features

### 1. Citizen Intake (`/`)
- Multilingual complaint submission (English, Hindi, Tamil, Bengali, Marathi).
- Title, detailed description, image URL evidence.
- Interactive GIS map pin-drop coordinate selector and device GPS auto-detection.
- **Instant AI Classification Receipt**: displays auto-assigned Category, routed Department, ML confidence score, safety keywords, and assigned Cluster ID.

### 2. Citizen Tracking & Feedback
- Search by unique Complaint Tracking ID.
- Live SLA countdown with warning/overdue visual indicators.
- Interactive incident location pin map.
- Embedded citizen feedback modal (1-5 star service rating + comments) calling `POST /api/complaints/{id}/feedback`.

### 3. Interactive GIS Map
- City-wide OpenStreetMap canvas displaying individual complaint markers and cluster perimeter circles.
- Color-coded priority tiers (Red: High/Critical $\ge 0.70$, Amber: Medium $\ge 0.40$, Green: Low).
- Clickable entities opening an Inspector Drawer with complete telemetry and linked grievance members.
- Layer toggles for complaint points, cluster circles, and department filters.

### 4. Officer Incident Command & Triage
- Protected by JWT authentication (`POST /api/auth/login` with default sandbox credentials `officer` / `changeme`).
- Real-time incident cluster table with sorting by priority score descending/ascending.
- Filter by lifecycle status (`submitted`, `acknowledged`, `in_progress`, `resolved`, `closed`), department, and search term.
- Triage modal updating cluster status, assigned department, priority overrides, root cause assets, and SLA deadlines via `PATCH /api/clusters/{id}`.
- Member grievance inspector viewing individual deduplicated incidents.

### 5. Civic Intelligence Analytics
- Consumes aggregated metrics from `GET /api/analytics/summary`.
- High-level KPIs: Total Complaints, Active Clusters, Average Priority Risk, Resolution Rate.
- Department workload distribution bar charts and Cluster lifecycle status breakdown.

---

## 🔒 Security

- Sensitive credentials and keys are never hardcoded or committed.
- Officer JWT tokens are stored securely in browser storage and transmitted via `Authorization: Bearer <token>` HTTP headers.
- All non-2xx responses are normalized with user-friendly error boundaries.