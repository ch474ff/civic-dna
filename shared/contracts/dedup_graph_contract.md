# Civic DNA Deduplication & Graph Contract

This document defines the interface, algorithmic design, configuration parameters, graph abstractions, and scalability roadmap for complaint deduplication and relational graph clustering in Civic DNA.

---

## 1. Deduplication Interface

File: `backend/app/services/deduplication.py`

### Class Signature
```python
class DeduplicationService(ABC):
    @abstractmethod
    def find_duplicate_cluster(
        self,
        complaint: Mapping[str, Any],
        existing_complaints: Sequence[Mapping[str, Any]],
    ) -> str | None:
        """Evaluate candidate complaints and return an existing cluster_id or None."""
        raise NotImplementedError
```

### Input & Output Specification
- **`complaint`**: Mapping containing intake fields:
  - `complaint_id`: str (assigned ID)
  - `title`: str (1–500 chars)
  - `description`: str (1–10000 chars)
  - `lat`: float in `[-90, 90]` (optional/nullable)
  - `lng`: float in `[-180, 180]` (optional/nullable)
  - `department`: str (e.g., "Roads & Traffic", "Water Supply", "general")
  - `category`: str (e.g., "Pothole", "Pipeline Leak", "unclassified")
  - `created_at` / `timestamp`: ISO-8601 string or datetime (optional)
  - `extracted_severity_keywords`: list[str] (optional)
- **`existing_complaints`**: Sequence of existing complaint dictionaries loaded from the database (all historical snapshots with assigned `cluster_id`).
- **Return Value**:
  - `str`: Matching `cluster_id` when similarity score $\ge$ `DEDUP_THRESHOLD`.
  - `None`: When no candidate satisfies the threshold criteria (signals the pipeline to create a new cluster).

---

## 2. Multi-Signal Similarity Scoring

The deduplication engine evaluates five distinct signals between the incoming complaint $C_{\text{new}}$ and each candidate $C_{\text{cand}}$:

$$\text{Composite Score} = \frac{w_{\text{text}} S_{\text{text}} + w_{\text{geo}} S_{\text{geo}} + w_{\text{dept}} S_{\text{dept}} + w_{\text{cat}} S_{\text{cat}} + w_{\text{time}} S_{\text{time}}}{\sum w_i}$$

```
+-------------------------------------------------------------------------+
|                        Multi-Signal Deduplication                       |
|                                                                         |
|  [Text Similarity]       (w=0.35)  Dice + N-grams + Stemming + Keywords |
|  [Geographic Proximity]  (w=0.30)  Haversine Distance (Radius Gated)   |
|  [Department Match]      (w=0.15)  Exact Match / Neutral Fallback       |
|  [Category Match]        (w=0.10)  Exact Match / Neutral Fallback       |
|  [Temporal Proximity]    (w=0.10)  Linear Decay within Time Window      |
|                                                                         |
|                       ===> Weighted Total in [0.0, 1.0]                 |
|                       ===> If >= Threshold (0.65) -> cluster_id         |
|                       ===> Else -> None (Create New Cluster)            |
+-------------------------------------------------------------------------+
```

### 1. Semantic & Text Similarity ($S_{\text{text}}$)
- **Engine**: `TextSimilarityEngine` (isolated behind the deduplication service).
- **Processing**:
  - Lowercase normalization & punctuation stripping.
  - Stopword filtering (standard English stopword set).
  - Lightweight heuristic suffix stemming (`-ing`, `-ed`, `-tion`, `-ment`, `-s`, etc.).
  - Token Dice coefficient: $2 |T_1 \cap T_2| / (|T_1| + |T_2|)$.
  - Character 3-gram Dice coefficient: captures typos and morphological variations.
  - Sequence matching ratio.
  - Cross-field comparison (Title vs Description) and extracted severity keywords overlap.

### 2. Geographic Proximity ($S_{\text{geo}}$)
- **Formula**: Great-circle distance using Haversine formula:
  $$a = \sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)$$
  $$d = 2 R \cdot \text{atan2}\left(\sqrt{a}, \sqrt{1-a}\right) \quad (R = 6,371,000\text{ m})$$
- **Radius Gating**:
  - If $d \le \text{radius\_meters}$: $S_{\text{geo}} = 1.0 - \frac{d}{\text{radius\_meters}}$.
  - If $d > \text{radius\_meters}$: Complaints represent physically separated locations and are gated (score $= 0.0$).
  - If coordinates are missing on either complaint: $S_{\text{geo}} = 0.0$ and weight is dynamically redistributed across non-spatial signals without penalizing the complaint.

### 3. Department Match ($S_{\text{dept}}$)
- Identical non-general department: $1.0$
- Either department is `"general"` or unspecified: $0.5$ (neutral compatibility)
- Conflicting specific departments: $0.0$

### 4. Category Match ($S_{\text{cat}}$)
- Identical non-unclassified category: $1.0$
- Either category is `"unclassified"` or unspecified: $0.5$ (neutral compatibility)
- Conflicting specific categories: $0.0$

### 5. Temporal Proximity ($S_{\text{time}}$)
- Evaluates $\Delta t = |t_{\text{new}} - t_{\text{cand}}|$ in seconds against `DEDUP_TEMPORAL_WINDOW_HOURS`:
  - If $\Delta t \le \text{window\_seconds}$: $S_{\text{time}} = 1.0 - \frac{\Delta t}{\text{window\_seconds}}$.
  - If $\Delta t > \text{window\_seconds}$: $S_{\text{time}} = 0.0$.
  - If timestamp is absent: defaults to neutral $0.8$.

---

## 3. Configuration Parameters

Configured in `backend/app/config.py` and `.env.example`:

| Environment Variable | Default | Description |
| :--- | :--- | :--- |
| `DEDUP_THRESHOLD` | `0.65` | Minimum composite score to merge into an existing cluster |
| `DEDUP_GEO_RADIUS_METERS` | `300.0` | Maximum spatial radius for duplicate clustering (meters) |
| `DEDUP_TEMPORAL_WINDOW_HOURS` | `72.0` | Maximum time delta window for temporal proximity (hours) |
| `DEDUP_WEIGHT_TEXT` | `0.35` | Text & semantic similarity weight |
| `DEDUP_WEIGHT_GEO` | `0.30` | Geographic proximity weight |
| `DEDUP_WEIGHT_DEPT` | `0.15` | Department match weight |
| `DEDUP_WEIGHT_CATEGORY` | `0.10` | Category match weight |
| `DEDUP_WEIGHT_TEMPORAL` | `0.10` | Temporal proximity weight |
| `NEO4J_URI` | `None` | Optional Neo4j Bolt connection URI (`bolt://localhost:7687`) |
| `NEO4J_USER` | `neo4j` | Optional Neo4j username |
| `NEO4J_PASSWORD` | `""` | Optional Neo4j password |

---

## 4. Graph Abstraction & Relationships

File: `backend/app/services/graph.py`

The graph model represents civic complaints, clusters, administrative departments, categories, locations, and inter-cluster relationships.

```mermaid
graph TD
    Complaint["Complaint Node"] -->|BELONGS_TO| Cluster["Cluster Node"]
    Cluster -->|ASSIGNED_TO| Department["Department Node"]
    Cluster -->|CATEGORIZED_AS| Category["Category Node"]
    Cluster -->|LOCATED_AT| Location["Location Node (lat, lng)"]
    Cluster -.->|RELATES_TO (weight)| RelatedCluster["Related Cluster Node"]
```

### Node Labels
- `Complaint`: `id`, `properties: {title, description, lat, lng, ...}`
- `Cluster`: `id`, `properties: {cluster_id, status, priority_score, ...}`
- `Department`: `id = "dept:<name>"`, `properties: {name}`
- `Category`: `id = "cat:<name>"`, `properties: {name}`
- `Location`: `id = "loc:<lat>,<lng>"`, `properties: {lat, lng}`

### Relationship Types
- `BELONGS_TO`: Directed edge from `Complaint` to `Cluster`.
- `LOCATED_AT`: Directed edge from `Cluster` to `Location`.
- `CATEGORIZED_AS`: Directed edge from `Cluster` to `Category`.
- `ASSIGNED_TO`: Directed edge from `Cluster` to `Department`.
- `RELATES_TO`: Weighted edge between two `Cluster` nodes representing spatial, systemic, or cascading root causes.

### Graph Service Interface
```python
class GraphService(ABC):
    def add_node(self, node: Node) -> None: ...
    def add_relationship(self, rel: Relationship) -> None: ...
    def get_node(self, node_id: str) -> Node | None: ...
    def get_nodes_by_label(self, label: str) -> list[Node]: ...
    def get_neighbors(self, node_id: str, rel_type: str | None = None, direction: str = "out") -> list[Node]: ...
    def get_relationships(self, node_id: str | None = None, rel_type: str | None = None) -> list[Relationship]: ...
    def find_related_clusters(self, cluster_id: str, min_weight: float = 0.0) -> list[tuple[str, float]]: ...
    def build_subgraph(self, cluster_ids: Sequence[str]) -> dict[str, Any]: ...
    def link_complaint_to_cluster(self, complaint_id: str, cluster_id: str, complaint_data: Mapping[str, Any] | None = None) -> None: ...
    def link_cluster_metadata(self, cluster_id: str, department: str | None = None, category: str | None = None, location: tuple[float, float] | None = None) -> None: ...
    def link_related_clusters(self, cluster_id_1: str, cluster_id_2: str, weight: float, reason: str | None = None) -> None: ...
    def clear(self) -> None: ...
```

---

## 5. Implementations & Neo4j Strategy

1. **`InMemoryGraphService`** (Default):
   - In-memory adjacency and node index structures.
   - Zero external infrastructure or database dependencies.
   - Ideal for testing, prototyping, and lightweight execution.

2. **`Neo4jGraphAdapter`** (Optional Extension):
   - Provides Cypher query execution when `NEO4J_URI` is configured and `neo4j` Python driver is present.
   - **Non-blocking / Optional**: If Neo4j is unconfigured or unavailable, the factory `create_graph_service()` automatically defaults to `InMemoryGraphService`.
   - The complaint pipeline and HTTP API remain 100% operational without a running Neo4j instance.

---

## 6. Cluster Intelligence Utilities

File: `backend/app/services/cluster_intelligence.py`

Internal analytics functions for cluster summarization and reporting:
- `compute_cluster_complaint_count(complaints)`: Total member count.
- `compute_geographic_centroid(complaints)`: Arithmetic mean coordinates `(lat, lng)` of valid member complaints.
- `compute_dominant_category(complaints)`: Primary category (prefers specific category over unclassified).
- `compute_dominant_department(complaints)`: Primary responsible department.
- `compute_complaint_time_span(complaints)`: Earliest time, latest time, and total duration in hours/seconds.
- `compute_recurring_keywords(complaints, top_k=5)`: Top recurring severity terms and keywords.
- `summarize_cluster_intelligence(cluster_id, complaints)`: Structured intelligence dictionary combining all metrics.

---

## 7. Fallback & Edge Case Behavior

- **Missing Coordinates**: When `lat` or `lng` is `None` or invalid, the geographic weight is redistributed to text, categorical, and temporal signals. No exceptions are raised.
- **Distant Coordinates**: When coordinates are present on both complaints and exceed `DEDUP_GEO_RADIUS_METERS`, they are physically separated and will not be grouped into the same duplicate cluster.
- **Missing Timestamps**: When temporal metadata is absent, neutral temporal compatibility ($0.8$) is applied.
- **Empty Database**: When no existing complaints are present, `find_duplicate_cluster` immediately returns `None`, prompting the pipeline to initialize the first cluster.
- **Every Duplicate Persisted**: The pipeline assigns the duplicate complaint to the existing `cluster_id` and adds the complaint ID to `member_complaint_ids`. Duplicate complaints are never discarded or deleted.

---

## 8. Scalability & Future Evolution

1. **Vector Embeddings**:
   - `TextSimilarityEngine` can be swapped with dense embedding vector similarity (e.g. Gemini text-embedding, sentence-transformers) via FAISS, pgvector, or Milvus without altering the `DeduplicationService` interface.
2. **PostGIS Spatial Indexing**:
   - As dataset scales into millions of complaints, pre-filtering candidate complaints with spatial bounding boxes (`ST_DWithin` via PostGIS) before scoring improves throughput from $O(N)$ to $O(K)$.
3. **Neo4j Root-Cause Analytics**:
   - The graph abstraction allows connecting infrastructure telemetry (water pipes, transformers, road segments) to civic clusters to identify root causes and cascading failures across city departments.
