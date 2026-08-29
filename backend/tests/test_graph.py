import pytest

from app.services.graph import (
    InMemoryGraphService,
    Neo4jGraphAdapter,
    Node,
    NodeLabel,
    Relationship,
    RelationshipType,
    create_graph_service,
)


def test_in_memory_graph_node_operations():
    graph = InMemoryGraphService()
    node1 = Node(id="comp-1", label=NodeLabel.COMPLAINT, properties={"title": "Pothole"})
    node2 = Node(id="clust-1", label=NodeLabel.CLUSTER, properties={"department": "Roads"})

    graph.add_node(node1)
    graph.add_node(node2)

    assert graph.get_node("comp-1") == node1
    assert graph.get_node("clust-1") == node2
    assert graph.get_node("non-existent") is None

    complaints = graph.get_nodes_by_label(NodeLabel.COMPLAINT)
    assert len(complaints) == 1
    assert complaints[0].id == "comp-1"


def test_in_memory_graph_relationship_operations():
    graph = InMemoryGraphService()
    graph.add_node(Node(id="comp-1", label=NodeLabel.COMPLAINT))
    graph.add_node(Node(id="clust-1", label=NodeLabel.CLUSTER))

    rel = Relationship(
        source_id="comp-1",
        target_id="clust-1",
        rel_type=RelationshipType.BELONGS_TO,
        properties={"confidence": 0.95},
        weight=1.0,
    )
    graph.add_relationship(rel)

    rels = graph.get_relationships(node_id="comp-1")
    assert len(rels) == 1
    assert rels[0].rel_type == RelationshipType.BELONGS_TO

    # Outgoing neighbors from comp-1
    out_neighbors = graph.get_neighbors("comp-1", direction="out")
    assert len(out_neighbors) == 1
    assert out_neighbors[0].id == "clust-1"

    # Incoming neighbors to clust-1
    in_neighbors = graph.get_neighbors("clust-1", direction="in")
    assert len(in_neighbors) == 1
    assert in_neighbors[0].id == "comp-1"


def test_graph_helper_link_complaint_to_cluster():
    graph = InMemoryGraphService()
    graph.link_complaint_to_cluster("comp-123", "clust-456", {"title": "Water leak"})

    assert graph.get_node("comp-123") is not None
    assert graph.get_node("clust-456") is not None

    rels = graph.get_relationships(rel_type=RelationshipType.BELONGS_TO)
    assert len(rels) == 1
    assert rels[0].source_id == "comp-123"
    assert rels[0].target_id == "clust-456"


def test_graph_helper_link_cluster_metadata():
    graph = InMemoryGraphService()
    graph.link_cluster_metadata(
        cluster_id="clust-1",
        department="Public Works",
        category="Sanitation",
        location=(12.9716, 77.5946),
    )

    assert graph.get_node("dept:public works") is not None
    assert graph.get_node("cat:sanitation") is not None
    assert graph.get_node("loc:12.9716,77.5946") is not None

    rels = graph.get_relationships(node_id="clust-1")
    rel_types = {r.rel_type for r in rels}
    assert RelationshipType.ASSIGNED_TO in rel_types
    assert RelationshipType.CATEGORIZED_AS in rel_types
    assert RelationshipType.LOCATED_AT in rel_types


def test_graph_related_clusters_and_subgraph():
    graph = InMemoryGraphService()
    graph.link_related_clusters("clust-1", "clust-2", weight=0.85, reason="Spatial and thematic overlap")
    graph.link_related_clusters("clust-1", "clust-3", weight=0.40, reason="Same street")

    related = graph.find_related_clusters("clust-1", min_weight=0.50)
    assert len(related) == 1
    assert related[0] == ("clust-2", 0.85)

    subgraph = graph.build_subgraph(["clust-1", "clust-2"])
    assert "nodes" in subgraph
    assert "edges" in subgraph
    assert len(subgraph["edges"]) >= 1


def test_graph_clear():
    graph = InMemoryGraphService()
    graph.add_node(Node(id="n1", label="Test"))
    graph.clear()
    assert graph.get_node("n1") is None
    assert len(graph.get_relationships()) == 0


def test_neo4j_adapter_fallback_when_unconfigured():
    adapter = Neo4jGraphAdapter(uri=None)
    assert not adapter.is_available()
    with pytest.raises(RuntimeError) as exc_info:
        adapter._get_driver()
    assert "Neo4j driver is not available" in str(exc_info.value)


def test_create_graph_service_factory_defaults_to_in_memory():
    service = create_graph_service()
    assert isinstance(service, InMemoryGraphService)
