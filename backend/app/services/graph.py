from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Mapping, Sequence

from app.config import get_settings

logger = logging.getLogger(__name__)


# Standard Graph Relationship Types
class RelationshipType:
    BELONGS_TO = "BELONGS_TO"          # Complaint -> Cluster
    LOCATED_AT = "LOCATED_AT"          # Cluster -> Location
    CATEGORIZED_AS = "CATEGORIZED_AS"  # Cluster -> Category
    ASSIGNED_TO = "ASSIGNED_TO"        # Cluster -> Department
    RELATES_TO = "RELATES_TO"          # Cluster -> Related Cluster


# Standard Graph Node Labels
class NodeLabel:
    COMPLAINT = "Complaint"
    CLUSTER = "Cluster"
    LOCATION = "Location"
    CATEGORY = "Category"
    DEPARTMENT = "Department"


@dataclass
class Node:
    id: str
    label: str
    properties: dict[str, Any] = field(default_factory=dict)


@dataclass
class Relationship:
    source_id: str
    target_id: str
    rel_type: str
    properties: dict[str, Any] = field(default_factory=dict)
    weight: float = 1.0


class GraphService(ABC):
    """Abstract Graph Service Interface for Civic DNA intelligence and root cause analysis."""

    @abstractmethod
    def add_node(self, node: Node) -> None:
        """Insert or update a graph node."""
        raise NotImplementedError

    @abstractmethod
    def add_relationship(self, rel: Relationship) -> None:
        """Insert or update a graph relationship between two nodes."""
        raise NotImplementedError

    @abstractmethod
    def get_node(self, node_id: str) -> Node | None:
        """Retrieve a node by its unique ID."""
        raise NotImplementedError

    @abstractmethod
    def get_nodes_by_label(self, label: str) -> list[Node]:
        """Retrieve all nodes matching a specific label."""
        raise NotImplementedError

    @abstractmethod
    def get_neighbors(
        self,
        node_id: str,
        rel_type: str | None = None,
        direction: str = "out",
    ) -> list[Node]:
        """Get neighboring nodes connected to node_id.

        direction: 'out' (outgoing), 'in' (incoming), or 'both'
        """
        raise NotImplementedError

    @abstractmethod
    def get_relationships(
        self,
        node_id: str | None = None,
        rel_type: str | None = None,
    ) -> list[Relationship]:
        """Retrieve relationships matching node_id and/or rel_type."""
        raise NotImplementedError

    @abstractmethod
    def find_related_clusters(
        self,
        cluster_id: str,
        min_weight: float = 0.0,
    ) -> list[tuple[str, float]]:
        """Find clusters connected by RELATES_TO relationship with weight >= min_weight."""
        raise NotImplementedError

    @abstractmethod
    def build_subgraph(self, cluster_ids: Sequence[str]) -> dict[str, Any]:
        """Extract a structured subgraph (nodes and edges) around specified cluster IDs."""
        raise NotImplementedError

    @abstractmethod
    def clear(self) -> None:
        """Clear all nodes and relationships (primarily for testing)."""
        raise NotImplementedError

    # High-level helper methods
    def link_complaint_to_cluster(
        self,
        complaint_id: str,
        cluster_id: str,
        complaint_data: Mapping[str, Any] | None = None,
    ) -> None:
        """Helper to create nodes and the BELONGS_TO relationship."""
        complaint_props = dict(complaint_data or {})
        complaint_props["complaint_id"] = complaint_id
        self.add_node(Node(id=complaint_id, label=NodeLabel.COMPLAINT, properties=complaint_props))

        # Ensure cluster node exists
        if not self.get_node(cluster_id):
            self.add_node(Node(id=cluster_id, label=NodeLabel.CLUSTER, properties={"cluster_id": cluster_id}))

        self.add_relationship(
            Relationship(
                source_id=complaint_id,
                target_id=cluster_id,
                rel_type=RelationshipType.BELONGS_TO,
            )
        )

    def link_cluster_metadata(
        self,
        cluster_id: str,
        department: str | None = None,
        category: str | None = None,
        location: tuple[float, float] | None = None,
    ) -> None:
        """Helper to connect cluster node to its department, category, and location nodes."""
        if not self.get_node(cluster_id):
            self.add_node(Node(id=cluster_id, label=NodeLabel.CLUSTER, properties={"cluster_id": cluster_id}))

        if department:
            dept_node_id = f"dept:{department.strip().lower()}"
            self.add_node(Node(id=dept_node_id, label=NodeLabel.DEPARTMENT, properties={"name": department}))
            self.add_relationship(
                Relationship(
                    source_id=cluster_id,
                    target_id=dept_node_id,
                    rel_type=RelationshipType.ASSIGNED_TO,
                )
            )

        if category:
            cat_node_id = f"cat:{category.strip().lower()}"
            self.add_node(Node(id=cat_node_id, label=NodeLabel.CATEGORY, properties={"name": category}))
            self.add_relationship(
                Relationship(
                    source_id=cluster_id,
                    target_id=cat_node_id,
                    rel_type=RelationshipType.CATEGORIZED_AS,
                )
            )

        if location and len(location) == 2:
            lat, lng = location
            loc_node_id = f"loc:{lat:.4f},{lng:.4f}"
            self.add_node(
                Node(id=loc_node_id, label=NodeLabel.LOCATION, properties={"lat": lat, "lng": lng})
            )
            self.add_relationship(
                Relationship(
                    source_id=cluster_id,
                    target_id=loc_node_id,
                    rel_type=RelationshipType.LOCATED_AT,
                )
            )

    def link_related_clusters(
        self,
        cluster_id_1: str,
        cluster_id_2: str,
        weight: float,
        reason: str | None = None,
    ) -> None:
        """Helper to create a RELATES_TO edge between two clusters."""
        if cluster_id_1 == cluster_id_2:
            return
        if not self.get_node(cluster_id_1):
            self.add_node(Node(id=cluster_id_1, label=NodeLabel.CLUSTER, properties={"cluster_id": cluster_id_1}))
        if not self.get_node(cluster_id_2):
            self.add_node(Node(id=cluster_id_2, label=NodeLabel.CLUSTER, properties={"cluster_id": cluster_id_2}))

        props = {"reason": reason} if reason else {}
        self.add_relationship(
            Relationship(
                source_id=cluster_id_1,
                target_id=cluster_id_2,
                rel_type=RelationshipType.RELATES_TO,
                properties=props,
                weight=weight,
            )
        )


class InMemoryGraphService(GraphService):
    """In-memory reference graph implementation. Zero external dependencies."""

    def __init__(self) -> None:
        self._nodes: dict[str, Node] = {}
        self._relationships: list[Relationship] = []

    def add_node(self, node: Node) -> None:
        self._nodes[node.id] = node

    def add_relationship(self, rel: Relationship) -> None:
        # Replace if exact same source, target, and rel_type exists
        for i, existing in enumerate(self._relationships):
            if (
                existing.source_id == rel.source_id
                and existing.target_id == rel.target_id
                and existing.rel_type == rel.rel_type
            ):
                self._relationships[i] = rel
                return
        self._relationships.append(rel)

    def get_node(self, node_id: str) -> Node | None:
        return self._nodes.get(node_id)

    def get_nodes_by_label(self, label: str) -> list[Node]:
        return [node for node in self._nodes.values() if node.label.lower() == label.lower()]

    def get_neighbors(
        self,
        node_id: str,
        rel_type: str | None = None,
        direction: str = "out",
    ) -> list[Node]:
        neighbor_ids: set[str] = set()
        for rel in self._relationships:
            if rel_type and rel.rel_type != rel_type:
                continue
            if direction in ("out", "both") and rel.source_id == node_id:
                neighbor_ids.add(rel.target_id)
            if direction in ("in", "both") and rel.target_id == node_id:
                neighbor_ids.add(rel.source_id)

        return [self._nodes[nid] for nid in neighbor_ids if nid in self._nodes]

    def get_relationships(
        self,
        node_id: str | None = None,
        rel_type: str | None = None,
    ) -> list[Relationship]:
        results: list[Relationship] = []
        for rel in self._relationships:
            if rel_type and rel.rel_type != rel_type:
                continue
            if node_id and rel.source_id != node_id and rel.target_id != node_id:
                continue
            results.append(rel)
        return results

    def find_related_clusters(
        self,
        cluster_id: str,
        min_weight: float = 0.0,
    ) -> list[tuple[str, float]]:
        related: list[tuple[str, float]] = []
        for rel in self._relationships:
            if rel.rel_type != RelationshipType.RELATES_TO:
                continue
            if rel.weight < min_weight:
                continue
            if rel.source_id == cluster_id:
                related.append((rel.target_id, rel.weight))
            elif rel.target_id == cluster_id:
                related.append((rel.source_id, rel.weight))
        # Sort descending by weight
        related.sort(key=lambda x: x[1], reverse=True)
        return related

    def build_subgraph(self, cluster_ids: Sequence[str]) -> dict[str, Any]:
        target_cluster_ids = set(cluster_ids)
        matched_node_ids: set[str] = set()
        matched_relationships: list[Relationship] = []

        # Include cluster nodes and directly connected metadata / complaint nodes
        for rel in self._relationships:
            if rel.source_id in target_cluster_ids or rel.target_id in target_cluster_ids:
                matched_relationships.append(rel)
                matched_node_ids.add(rel.source_id)
                matched_node_ids.add(rel.target_id)

        # Include cluster nodes that might not have relationships
        for cid in target_cluster_ids:
            if cid in self._nodes:
                matched_node_ids.add(cid)

        nodes_data = [
            {"id": self._nodes[nid].id, "label": self._nodes[nid].label, "properties": self._nodes[nid].properties}
            for nid in matched_node_ids
            if nid in self._nodes
        ]
        edges_data = [
            {
                "source": r.source_id,
                "target": r.target_id,
                "type": r.rel_type,
                "weight": r.weight,
                "properties": r.properties,
            }
            for r in matched_relationships
        ]
        return {"nodes": nodes_data, "edges": edges_data}

    def clear(self) -> None:
        self._nodes.clear()
        self._relationships.clear()


class Neo4jGraphAdapter(GraphService):
    """Optional Neo4j Graph Database Adapter.

    Gracefully falls back when Neo4j driver or connection is not configured.
    Does NOT require a running Neo4j server for standard backend operations.
    """

    def __init__(
        self,
        uri: str | None = None,
        user: str | None = None,
        password: str | None = None,
    ) -> None:
        settings = get_settings()
        self.uri = uri or settings.neo4j_uri
        self.user = user or settings.neo4j_user or "neo4j"
        self.password = password or settings.neo4j_password or ""
        self._driver: Any = None

    def is_available(self) -> bool:
        if not self.uri:
            return False
        try:
            import neo4j  # noqa: F401
            return True
        except ImportError:
            return False

    def _get_driver(self) -> Any:
        if not self.is_available():
            raise RuntimeError(
                "Neo4j driver is not available. Install 'neo4j' package and set NEO4J_URI in configuration."
            )
        if self._driver is None:
            from neo4j import GraphDatabase
            auth = (self.user, self.password) if self.user and self.password else None
            self._driver = GraphDatabase.driver(self.uri, auth=auth)
        return self._driver

    def add_node(self, node: Node) -> None:
        driver = self._get_driver()
        cypher = f"MERGE (n:{node.label} {{id: $id}}) SET n += $properties"
        with driver.session() as session:
            session.run(cypher, id=node.id, properties=node.properties)

    def add_relationship(self, rel: Relationship) -> None:
        driver = self._get_driver()
        cypher = (
            f"MATCH (a {{id: $source_id}}), (b {{id: $target_id}}) "
            f"MERGE (a)-[r:{rel.rel_type}]->(b) "
            f"SET r.weight = $weight, r += $properties"
        )
        with driver.session() as session:
            session.run(
                cypher,
                source_id=rel.source_id,
                target_id=rel.target_id,
                weight=rel.weight,
                properties=rel.properties,
            )

    def get_node(self, node_id: str) -> Node | None:
        driver = self._get_driver()
        cypher = "MATCH (n {id: $id}) RETURN n.id AS id, labels(n)[0] AS label, properties(n) AS properties"
        with driver.session() as session:
            result = session.run(cypher, id=node_id).single()
            if not result:
                return None
            props = dict(result["properties"] or {})
            props.pop("id", None)
            return Node(id=result["id"], label=result["label"] or "Node", properties=props)

    def get_nodes_by_label(self, label: str) -> list[Node]:
        driver = self._get_driver()
        cypher = f"MATCH (n:{label}) RETURN n.id AS id, properties(n) AS properties"
        nodes: list[Node] = []
        with driver.session() as session:
            for record in session.run(cypher):
                props = dict(record["properties"] or {})
                props.pop("id", None)
                nodes.append(Node(id=record["id"], label=label, properties=props))
        return nodes

    def get_neighbors(
        self,
        node_id: str,
        rel_type: str | None = None,
        direction: str = "out",
    ) -> list[Node]:
        driver = self._get_driver()
        rel_clause = f":{rel_type}" if rel_type else ""
        if direction == "out":
            pattern = f"(n {{id: $id}})-[{rel_clause}]->(m)"
        elif direction == "in":
            pattern = f"(n {{id: $id}})<-[{rel_clause}]-(m)"
        else:
            pattern = f"(n {{id: $id}})-[{rel_clause}]-(m)"

        cypher = f"MATCH {pattern} RETURN m.id AS id, labels(m)[0] AS label, properties(m) AS properties"
        nodes: list[Node] = []
        with driver.session() as session:
            for record in session.run(cypher, id=node_id):
                props = dict(record["properties"] or {})
                props.pop("id", None)
                nodes.append(Node(id=record["id"], label=record["label"] or "Node", properties=props))
        return nodes

    def get_relationships(
        self,
        node_id: str | None = None,
        rel_type: str | None = None,
    ) -> list[Relationship]:
        driver = self._get_driver()
        rel_clause = f":{rel_type}" if rel_type else ""
        where_clause = "WHERE a.id = $id OR b.id = $id" if node_id else ""
        cypher = (
            f"MATCH (a)-[r{rel_clause}]->(b) {where_clause} "
            f"RETURN a.id AS source_id, b.id AS target_id, type(r) AS rel_type, r.weight AS weight, properties(r) AS properties"
        )
        rels: list[Relationship] = []
        with driver.session() as session:
            for rec in session.run(cypher, id=node_id):
                props = dict(rec["properties"] or {})
                weight = float(rec["weight"] or 1.0)
                props.pop("weight", None)
                rels.append(
                    Relationship(
                        source_id=rec["source_id"],
                        target_id=rec["target_id"],
                        rel_type=rec["rel_type"],
                        properties=props,
                        weight=weight,
                    )
                )
        return rels

    def find_related_clusters(
        self,
        cluster_id: str,
        min_weight: float = 0.0,
    ) -> list[tuple[str, float]]:
        driver = self._get_driver()
        cypher = (
            "MATCH (c:Cluster {id: $id})-[r:RELATES_TO]-(other:Cluster) "
            "WHERE r.weight >= $min_weight "
            "RETURN other.id AS id, r.weight AS weight "
            "ORDER BY weight DESC"
        )
        results: list[tuple[str, float]] = []
        with driver.session() as session:
            for rec in session.run(cypher, id=cluster_id, min_weight=min_weight):
                results.append((rec["id"], float(rec["weight"])))
        return results

    def build_subgraph(self, cluster_ids: Sequence[str]) -> dict[str, Any]:
        driver = self._get_driver()
        cypher = (
            "MATCH (c:Cluster) WHERE c.id IN $cluster_ids "
            "OPTIONAL MATCH (c)-[r]-(m) "
            "RETURN c.id AS cid, labels(c)[0] AS clabel, properties(c) AS cprops, "
            "r, m.id AS mid, labels(m)[0] AS mlabel, properties(m) AS mprops"
        )
        nodes_map: dict[str, dict[str, Any]] = {}
        edges: list[dict[str, Any]] = []
        with driver.session() as session:
            for rec in session.run(cypher, cluster_ids=list(cluster_ids)):
                cid = rec["cid"]
                if cid and cid not in nodes_map:
                    nodes_map[cid] = {"id": cid, "label": rec["clabel"], "properties": rec["cprops"]}
                mid = rec["mid"]
                if mid and mid not in nodes_map:
                    nodes_map[mid] = {"id": mid, "label": rec["mlabel"], "properties": rec["mprops"]}
                r = rec["r"]
                if r:
                    edges.append(
                        {
                            "source": r.start_node["id"] if "id" in r.start_node else cid,
                            "target": r.end_node["id"] if "id" in r.end_node else mid,
                            "type": r.type,
                            "weight": float(r.get("weight", 1.0)),
                            "properties": dict(r),
                        }
                    )
        return {"nodes": list(nodes_map.values()), "edges": edges}

    def clear(self) -> None:
        driver = self._get_driver()
        with driver.session() as session:
            session.run("MATCH (n) DETACH DELETE n")


def create_graph_service() -> GraphService:
    """Factory creating the appropriate GraphService based on configuration."""
    settings = get_settings()
    if settings.neo4j_uri:
        adapter = Neo4jGraphAdapter(
            uri=settings.neo4j_uri,
            user=settings.neo4j_user,
            password=settings.neo4j_password,
        )
        if adapter.is_available():
            logger.info("Using Neo4jGraphAdapter for graph service")
            return adapter
        logger.warning("Neo4j configured but driver not available; falling back to InMemoryGraphService")
    return InMemoryGraphService()
