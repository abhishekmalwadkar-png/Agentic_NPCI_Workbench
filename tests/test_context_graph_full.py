"""
Test Suite: IBM Context Graph Engine & LLM Grounding API Verification
NPCI Unified Operations Workbench
"""
import urllib.request
import urllib.parse
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')
BASE_URL = "http://localhost:8000"

def test_context_graph():
    print("=" * 80)
    print("IBM CONTEXT GRAPH: SEMANTIC KNOWLEDGE NETWORK & LLM GROUNDING VERIFICATION")
    print("=" * 80)

    # 1. Full Context Graph Retrieval
    print("\n1. Testing GET /api/context-graph/full ...")
    req = urllib.request.Request(f"{BASE_URL}/api/context-graph/full")
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        nodes = data.get("nodes", [])
        edges = data.get("edges", [])
        ont = data.get("ontology", {})
        summary = data.get("summary", {})

        print(f"   ✓ Timestamp:         {data.get('timestamp')}")
        print(f"   ✓ Total Nodes:       {summary.get('total_nodes')} (Expected >= 34)")
        print(f"   ✓ Total Edges:       {summary.get('total_edges')} (Expected >= 60)")
        print(f"   ✓ Node Type Breakdown:")
        for t, cnt in summary.get("node_type_counts", {}).items():
            print(f"     • {t:20}: {cnt} nodes")

        assert len(nodes) >= 34, "Insufficient nodes in Context Graph"
        assert len(edges) >= 60, "Insufficient edges in Context Graph"
        assert len(ont.get("node_types", {})) == 8, "Expected 8 ontology node types"
        assert len(ont.get("relationship_predicates", {})) >= 11, "Expected >= 11 relationship predicates"

    # 2. Subgraph Extraction for LLM Context Window
    print("\n2. Testing GET /api/context-graph/subgraph ...")
    test_node = "DATASET_50K"
    req = urllib.request.Request(f"{BASE_URL}/api/context-graph/subgraph?node_id={test_node}&depth=2")
    with urllib.request.urlopen(req) as resp:
        sub = json.loads(resp.read().decode())
        print(f"   ✓ Focus Entity:      {sub['root_node_id']} (Depth: {sub['depth']} hops)")
        print(f"   ✓ Subgraph Extracted: {sub['nodes_extracted']} nodes, {sub['edges_extracted']} edges")
        llm_payload = sub["llm_grounding_payload"]
        print(f"   ✓ Relational Triples sample (first 3):")
        for p in llm_payload.get("relational_paths", [])[:3]:
            print(f"     • {p}")

        assert sub['nodes_extracted'] > 0, "Subgraph nodes should not be empty"
        assert sub['edges_extracted'] > 0, "Subgraph edges should not be empty"

    # 3. Multi-Hop Shortest Path Finder
    print("\n3. Testing GET /api/context-graph/path ...")
    src = "RULE_RBI_DPSS_629"
    dst = "LEG_CBS"
    url = f"{BASE_URL}/api/context-graph/path?source_id={urllib.parse.quote(src)}&target_id={urllib.parse.quote(dst)}"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as resp:
        path_res = json.loads(resp.read().decode())
        print(f"   ✓ Source:   {path_res['source_id']}")
        print(f"   ✓ Target:   {path_res['target_id']}")
        print(f"   ✓ Found:    {path_res['path_found']} (Distance: {path_res['distance']} hops)")
        print(f"   ✓ Path:     {path_res.get('path_string')}")

        assert path_res['path_found'] is True, "Expected semantic path between RBI rule and Finacle CBS"
        assert path_res['distance'] > 0, "Distance should be positive"

    # 4. Topological Network Analytics
    print("\n4. Testing GET /api/context-graph/analytics ...")
    req = urllib.request.Request(f"{BASE_URL}/api/context-graph/analytics")
    with urllib.request.urlopen(req) as resp:
        analytics = json.loads(resp.read().decode())
        print(f"   ✓ Graph Density:     {analytics.get('graph_density')}")
        print(f"   ✓ Average Degree:    {analytics.get('avg_degree')}")
        print(f"   ✓ Top 3 Hub Nodes by Degree Centrality:")
        for h in analytics.get("top_hub_nodes", [])[:3]:
            print(f"     • {h['label']} [{h['type']}]: {h['total_degree']} connections (centrality: {h['degree_centrality']})")
        print(f"   ✓ Compliance Health: {analytics.get('compliance_health')}")

        assert analytics.get('total_nodes') >= 34, "Analytics node count mismatch"
        assert len(analytics.get('top_hub_nodes', [])) > 0, "Hub nodes missing"

    # 5. Production-Grade LLM Prompt Grounding Synthesizer
    print("\n5. Testing GET /api/context-graph/llm-grounding ...")
    req = urllib.request.Request(f"{BASE_URL}/api/context-graph/llm-grounding?node_id=RULE_RBI_DPSS_629&depth=1")
    with urllib.request.urlopen(req) as resp:
        prompt_res = json.loads(resp.read().decode())
        print(f"   ✓ Target Entity:     {prompt_res['target_entity']['label']}")
        print(f"   ✓ Prompt Snippet:")
        lines = prompt_res['generated_llm_prompt'].split('\n')
        for l in lines[:8]:
            print(f"     {l}")
        print("     ...")

        assert "SYSTEM INSTRUCTION: NPCI BANKING OPERATIONS COPILOT" in prompt_res['generated_llm_prompt'], "Prompt missing system directive"
        assert "DO NOT hallucinate" in prompt_res['generated_llm_prompt'], "Anti-hallucination guard missing"

    print("\n" + "=" * 80)
    print("ALL 5 IBM CONTEXT GRAPH VERIFICATION CHECKS PASSED WITH 100% SUCCESS!")
    print("=" * 80)

if __name__ == '__main__':
    test_context_graph()
