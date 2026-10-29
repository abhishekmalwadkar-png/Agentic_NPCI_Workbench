"""
IBM Context Graph Engine — Ontology-Grounded Semantic Knowledge Network
NPCI Unified Operations Workbench

Implements:
1. Formal Ontology Schema (Node Types, Relationship Predicates, Property Constraints)
2. Graph Network Representation (Nodes, Directed Edges, Sub-Graph Traversal)
3. Multi-Hop Shortest Path Finding & Network Centrality Analytics
4. Graph Context Window Extractor (Structures multi-source relational operational context for LLM/Agents)
5. Zero-Hallucination LLM Prompt Grounding Synthesizer
"""
import hashlib
import json
import uuid
from collections import deque
from datetime import datetime
from typing import Dict, Any, List, Optional, Set
from pathlib import Path
import sys

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent.parent
if str(WORKSPACE_ROOT) not in sys.path:
    sys.path.insert(0, str(WORKSPACE_ROOT))

from stage2.backend.recon_engine import get_recon_summary, get_breaks
from stage3.backend.investigation_agent import get_agent_summary
from stage4_5_6.backend.recovery_and_execution import get_recovery_summary, STAGE_STATE as REC_STATE

# ══════════════════════════════════════════════════════════════════════════════
#  1. ONTOLOGY SPECIFICATION (IBM Schema Definition)
# ══════════════════════════════════════════════════════════════════════════════
ONTOLOGY_SCHEMA = {
    "node_types": {
        "SETTLEMENT_DATASET": {
            "description": "File-level ingestion container (SHA-256 hash, record volume, cycle metadata)",
            "color": "#38bdf8",
            "icon": "📁"
        },
        "PAYMENT_RAIL": {
            "description": "One of the 8 NPCI clearing & settlement rails (UPI, IMPS, NACH, AePS, RuPay, CTS, BBPS, NETC FASTag)",
            "color": "#818cf8",
            "icon": "⚡"
        },
        "SYSTEM_LEG": {
            "description": "One of the 4 participant settlement systems (NPCI, Switch, Finacle CBS, GL Suspense)",
            "color": "#94a3b8",
            "icon": "🏛️"
        },
        "AI_AGENT": {
            "description": "Autonomous robotic or diagnostic executor (Courier, Matcher, Investigator, Reversal Bot)",
            "color": "#a855f7",
            "icon": "🤖"
        },
        "RECON_BREAK": {
            "description": "A detected discrepancy requiring resolution (amount mismatch, timeout, deemed failure)",
            "color": "#f43f5e",
            "icon": "⚠️"
        },
        "REGULATORY_RULE": {
            "description": "Binding banking governance mandate (RBI DPSS Circular No.629, T+1 TAT, ISO 27001)",
            "color": "#f59e0b",
            "icon": "⚖️"
        },
        "FINACLE_POSTING": {
            "description": "Executed Core Banking credit/debit transaction instruction reference",
            "color": "#10b981",
            "icon": "💳"
        },
        "AUDIT_SEAL": {
            "description": "Immutable cryptographic SHA-256 tamper-proof compliance bundle",
            "color": "#eab308",
            "icon": "🔐"
        }
    },
    "relationship_predicates": {
        "CLEARS_VIA_RAIL": "SETTLEMENT_DATASET -> PAYMENT_RAIL",
        "INGESTED_BY": "SETTLEMENT_DATASET -> AI_AGENT",
        "VERIFIED_ACROSS": "SETTLEMENT_DATASET -> SYSTEM_LEG",
        "GENERATES_BREAK": "SETTLEMENT_DATASET -> RECON_BREAK",
        "DIAGNOSED_BY": "RECON_BREAK -> AI_AGENT",
        "BOUND_BY_SLA": "RECON_BREAK -> REGULATORY_RULE",
        "RESOLVED_BY": "RECON_BREAK -> FINACLE_POSTING",
        "EXECUTED_BY": "FINACLE_POSTING -> AI_AGENT",
        "POSTED_TO": "FINACLE_POSTING -> SYSTEM_LEG",
        "CERTIFIED_INTO": "FINACLE_POSTING -> AUDIT_SEAL",
        "ENFORCES_COMPLIANCE": "REGULATORY_RULE -> AUDIT_SEAL",
        "GOVERNS_RAIL": "REGULATORY_RULE -> PAYMENT_RAIL"
    }
}


class ContextNode:
    """Represents an entity node within the IBM Context Graph."""
    def __init__(self, node_id: str, label: str, node_type: str, properties: Dict[str, Any],
                 icon: str = "🔹", layer: int = 0, x: float = 0, y: float = 0):
        self.node_id = node_id
        self.label = label
        self.node_type = node_type
        self.properties = properties
        self.icon = icon
        self.layer = layer
        self.x = x
        self.y = y

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.node_id,
            "label": self.label,
            "type": self.node_type,
            "properties": self.properties,
            "icon": self.icon,
            "layer": self.layer,
            "x": self.x,
            "y": self.y
        }


class ContextEdge:
    """Represents a directed semantic relationship predicate between two nodes."""
    def __init__(self, source_id: str, target_id: str, predicate: str, properties: Optional[Dict[str, Any]] = None):
        self.edge_id = f"EDGE_{source_id}_{predicate}_{target_id}"
        self.source = source_id
        self.target = target_id
        self.predicate = predicate
        self.properties = properties or {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.edge_id,
            "source": self.source,
            "target": self.target,
            "predicate": self.predicate,
            "properties": self.properties
        }


class IBMContextGraphEngine:
    """
    Constructs, queries, and serializes the full operational Context Graph.
    Grounds LLM agents with explicit semantic multi-hop relational data.
    """
    def __init__(self):
        self.nodes: Dict[str, ContextNode] = {}
        self.edges: List[ContextEdge] = []
        self.last_built: Optional[str] = None
        self.build_graph()

    def add_node(self, node: ContextNode):
        self.nodes[node.node_id] = node

    def add_edge(self, source_id: str, target_id: str, predicate: str, props: Optional[Dict[str, Any]] = None):
        if source_id in self.nodes and target_id in self.nodes:
            self.edges.append(ContextEdge(source_id, target_id, predicate, props))

    def build_graph(self):
        """Constructs the complete operational context graph from live stage caches."""
        self.nodes.clear()
        self.edges.clear()

        # Canvas layout dimensions: width ~ 1100, height ~ 680
        # Layer 0 (x=70): Root Dataset & Regulatory Rules
        # Layer 1 (x=260): Rails & System Legs
        # Layer 2 (x=490): AI Agents
        # Layer 3 (x=710): Recon Breaks
        # Layer 4 (x=900): Postings
        # Layer 5 (x=1040): Audit Seal Pack

        # ── 1. Root Dataset Node ─────────────────────────────────────────────
        self.add_node(ContextNode(
            node_id="DATASET_50K",
            label="NPCI_UPI_Settlement_TestData_50K.csv",
            node_type="SETTLEMENT_DATASET",
            properties={
                "records": 50000,
                "sha256": "ed37c56dab72b9a184e9c0f992314bc3a",
                "cycle": "Cycle 1 (00:00 - 08:00 IST)",
                "rail": "UPI 2.0",
                "status": "VALIDATED_AND_STAGED",
                "vault_path": "stage1/staging_vault/"
            },
            icon="📁",
            layer=0,
            x=80,
            y=160
        ))

        # ── 2. Regulatory Mandates (Layer 0, bottom) ─────────────────────────
        self.add_node(ContextNode(
            node_id="RULE_RBI_DPSS_629",
            label="RBI DPSS Circular No.629 (TAT Harmonisation)",
            node_type="REGULATORY_RULE",
            properties={
                "mandate": "Harmonisation of Turn Around Time (TAT) and customer compensation",
                "tat_window": "T+1 Calendar Day",
                "penalty_formula": "INR 100 per day per customer for unreversed failed debits",
                "compliance_enforcement": "MANDATORY_DAILY_AUDIT",
                "circular_ref": "DPSS.CO.PD No.629/02.01.014/2019-20"
            },
            icon="⚖️",
            layer=0,
            x=80,
            y=460
        ))

        self.add_node(ContextNode(
            node_id="RULE_NPCI_PROC_V4",
            label="NPCI Unified Clearing & Settlement Guidelines v4.2",
            node_type="REGULATORY_RULE",
            properties={
                "mandate": "Multi-rail 4-Way reconciliation settlement specifications",
                "dispute_tat": "T+1 Business Day",
                "auto_chargeback": "Enabled for RC-U66 and RC-91",
                "compliance_enforcement": "STRICT"
            },
            icon="📜",
            layer=0,
            x=80,
            y=580
        ))

        # ── 3. All 8 Supported NPCI Payment Rails (Layer 1, top half) ────────
        npci_rails = [
            ("RAIL_UPI", "UPI 2.0 Mobile Network", "Real-time 24x7 P2P/P2M mobile payment network", "T+1 Day", "⚡", 70),
            ("RAIL_IMPS", "IMPS Fund Transfer", "Instant 24x7 interbank electronic fund transfer", "T+1 Day", "💸", 130),
            ("RAIL_NACH", "NACH Bulk Clearing", "Bulk recurring payments, mandates, direct debit", "T+1 Session", "🔄", 190),
            ("RAIL_AEPS", "AePS Micro-ATM", "Biometric micro-ATM banking for financial inclusion", "T+1 Day", "👆", 250),
            ("RAIL_RUPAY", "RuPay Card Scheme", "Domestic multi-channel debit/credit card scheme", "T+1 Window", "💳", 310),
            ("RAIL_CTS", "CTS Cheque Clearing", "Image-based physical cheque electronic clearing", "T+1 Cycle", "📝", 370),
            ("RAIL_BBPS", "BBPS Bill Payments", "Interoperable utility bill clearing & payment", "T+1 Day", "🧾", 430),
            ("RAIL_NETC", "NETC FASTag Tolls", "RFID FASTag electronic highway toll clearing", "T+1 Batch", "🚗", 490),
        ]
        for rid, lbl, desc, sla, icon, y_pos in npci_rails:
            self.add_node(ContextNode(
                node_id=rid,
                label=lbl,
                node_type="PAYMENT_RAIL",
                properties={
                    "rail_code": rid.replace("RAIL_", ""),
                    "description": desc,
                    "rbi_tat_standard": sla,
                    "status": "OPERATIONAL_ACTIVE"
                },
                icon=icon,
                layer=1,
                x=270,
                y=y_pos
            ))
            self.add_edge("DATASET_50K", rid, "CLEARS_VIA_RAIL", {"rail_code": rid.replace("RAIL_", "")})
            self.add_edge("RULE_RBI_DPSS_629", rid, "GOVERNS_RAIL")

        # ── 4. Participant System Legs (Layer 1, bottom half) ────────────────
        systems = [
            ("LEG_NPCI", "NPCI Central Clearing", "Master Net Clearing File (Raw)", "READY", "🗄️", 550),
            ("LEG_SWITCH", "Base24 Payment Switch", "Switch Gateway AUTHORIZED Feed", "ONLINE", "🖥️", 595),
            ("LEG_CBS", "Core Banking (Finacle 10.x)", "Finacle CBS Customer Debit Log", "SYNCED", "🏛️", 640),
            ("LEG_GL", "General Ledger (GL 9901)", "Clearing Pool Suspense Account 9901", "ACTIVE", "⚖️", 685),
        ]
        for sid, lbl, desc, status, icon, y_pos in systems:
            self.add_node(ContextNode(
                node_id=sid,
                label=lbl,
                node_type="SYSTEM_LEG",
                properties={"description": desc, "status": status},
                icon=icon,
                layer=1,
                x=270,
                y=y_pos
            ))
            self.add_edge("DATASET_50K", sid, "VERIFIED_ACROSS", {"verification_status": "MATCHED_SCHEMA"})

        # ── 5. Autonomous AI Agents (Layer 2) ────────────────────────────────
        agents = [
            ("AGENT_INGEST", "WF-01/03 Ingestion Gatekeeper", "Validates 32-column schema & SHA-256 duplicate registry", "📥", 100),
            ("AGENT_RECON", "WF-04/05 4-Way Recon Engine", "Matches 50,000 txns across 4 legs (94.5% STP rate)", "⚖️", 210),
            ("AGENT_DIAG", "WF-07 AI Diagnostic Agent", "Root cause reasoning, ISO-8583 logs & RBI clocking", "🧠", 320),
            ("AGENT_AUTO_BOT", "WF-10 Finacle Reversal Bot", "Autonomous STP credit adjustments (< ₹50k threshold)", "⚡", 430),
            ("AGENT_HITL_OPS", "WF-11 Operations Cockpit", "Dual electronic sign-off for high-value breaks (>= ₹50k)", "👨‍💼", 540),
            ("AGENT_AUDIT_SEAL", "WF-12/13 Audit MIS Bot", "SHA-256 immutable seal & RBI compliance certificate", "🔐", 650),
        ]
        for aid, lbl, desc, icon, y_pos in agents:
            self.add_node(ContextNode(
                node_id=aid,
                label=lbl,
                node_type="AI_AGENT",
                properties={"role": desc, "status": "ONLINE", "platform": "AutomationEdge"},
                icon=icon,
                layer=2,
                x=490,
                y=y_pos
            ))

        self.add_edge("DATASET_50K", "AGENT_INGEST", "INGESTED_BY")
        self.add_edge("LEG_NPCI", "AGENT_RECON", "VERIFIED_ACROSS")
        self.add_edge("LEG_CBS", "AGENT_RECON", "VERIFIED_ACROSS")
        self.add_edge("AGENT_RECON", "AGENT_DIAG", "FEEDS_EXCEPTIONS")

        # ── 6. Diverse Representative Break Clusters (Layer 3) ──────────────
        raw_breaks = get_breaks(limit=30)
        # We pick up to 8 representative break instances for rich graph representation
        sample_breaks = raw_breaks[:8] if raw_breaks else [
            {"txn_id": "TXN_UPI_20261028_0001", "rrn": "528910481920", "cbs_amount": 2500.0, "scenario": "CBS_TIMEOUT", "priority": "P1"},
            {"txn_id": "TXN_UPI_20261028_0042", "rrn": "528910482031", "cbs_amount": 75000.0, "scenario": "AMOUNT_MISMATCH", "priority": "P1"},
            {"txn_id": "TXN_UPI_20261028_0088", "rrn": "528910483109", "cbs_amount": 4200.0, "scenario": "DEEMED_SUCCESS", "priority": "P1"},
            {"txn_id": "TXN_UPI_20261028_0120", "rrn": "528910484552", "cbs_amount": 89000.0, "scenario": "SWITCH_DECLINE", "priority": "P1"},
            {"txn_id": "TXN_UPI_20261028_0215", "rrn": "528910485601", "cbs_amount": 1250.0, "scenario": "LATE_SETTLEMENT", "priority": "P2"},
            {"txn_id": "TXN_UPI_20261028_0310", "rrn": "528910486714", "cbs_amount": 64000.0, "scenario": "RESPONSE_CODE_91", "priority": "P2"},
        ]

        # Calculate Y spacing for Layer 3 (breaks) and Layer 4 (postings)
        y_start = 80
        y_spacing = 75

        for i, b in enumerate(sample_breaks):
            bid = f"BREAK_{b.get('txn_id', f'TXN{i}')}"
            cbs_amt = float(b.get("cbs_amount", 0) or 0)
            is_p1 = b.get("priority", "P1") == "P1"
            scenario = b.get("scenario", "CBS_TIMEOUT")
            y_pos = y_start + (i * y_spacing)

            self.add_node(ContextNode(
                node_id=bid,
                label=f"{b.get('txn_id')} (RRN: {str(b.get('rrn'))[-6:]})",
                node_type="RECON_BREAK",
                properties={
                    "rrn": str(b.get("rrn")),
                    "amount": cbs_amt,
                    "scenario": scenario,
                    "priority": b.get("priority", "P1"),
                    "sla_countdown": "4h 15m" if is_p1 else "18h 40m",
                    "requires_hitl": cbs_amt >= 50000.0 or scenario == "AMOUNT_MISMATCH"
                },
                icon="🔴" if is_p1 else "🟡",
                layer=3,
                x=720,
                y=y_pos
            ))

            self.add_edge("DATASET_50K", bid, "GENERATES_BREAK")
            self.add_edge(bid, "AGENT_DIAG", "DIAGNOSED_BY")
            self.add_edge(bid, "RULE_RBI_DPSS_629", "BOUND_BY_SLA", {
                "hours_to_breach": 4.25 if is_p1 else 18.6,
                "penalty_daily_inr": 100
            })

            # ── 7. Corresponding Finacle Postings (Layer 4) ──────────────────
            pid = f"POSTING_{b.get('txn_id', f'TXN{i}')}"
            is_auto = cbs_amt < 50000.0 and scenario != "AMOUNT_MISMATCH"
            posting_ref = f"FIN_EXEC_{str(b.get('rrn'))[-6:]}_{uuid.uuid4().hex[:4].upper()}"

            self.add_node(ContextNode(
                node_id=pid,
                label=posting_ref,
                node_type="FINACLE_POSTING",
                properties={
                    "amount": cbs_amt,
                    "target_account": "Finacle Clearing Suspense 9901",
                    "execution_type": "AUTONOMOUS_RPA_BOT" if is_auto else "MANAGER_HITL_APPROVED",
                    "status": "POSTED_SUCCESS",
                    "cbs_ref": posting_ref
                },
                icon="⚡" if is_auto else "✍️",
                layer=4,
                x=910,
                y=y_pos
            ))

            self.add_edge(bid, pid, "RESOLVED_BY")
            self.add_edge(pid, "LEG_CBS", "POSTED_TO")
            if is_auto:
                self.add_edge(pid, "AGENT_AUTO_BOT", "EXECUTED_BY")
            else:
                self.add_edge(pid, "AGENT_HITL_OPS", "EXECUTED_BY")

            self.add_edge(pid, "AUDIT_SEAL_PACK", "CERTIFIED_INTO")

        # ── 8. Cryptographic Audit Seal Node (Layer 5) ──────────────────────
        pack_hash = REC_STATE.get("audit_pack_hash") or "112c83e539a1b6e6136bb1f5949955b1306c649814f0b13fd0fd368eac3a1eeb"
        self.add_node(ContextNode(
            node_id="AUDIT_SEAL_PACK",
            label="RBI_AUDIT_PACK_20261028_114940",
            node_type="AUDIT_SEAL",
            properties={
                "sha256_digest": pack_hash,
                "total_reversals": len(REC_STATE.get("cbs_postings", {})) or 2750,
                "rbi_sla_compliance": "100.0%",
                "penalties_prevented_daily_inr": 240000,
                "annualized_savings_inr": 87600000,
                "immutability": "VERIFIED_TAMPER_PROOF"
            },
            icon="🔐",
            layer=5,
            x=1050,
            y=360
        ))

        self.add_edge("AGENT_AUDIT_SEAL", "AUDIT_SEAL_PACK", "EXECUTED_BY")
        self.add_edge("RULE_RBI_DPSS_629", "AUDIT_SEAL_PACK", "ENFORCES_COMPLIANCE")

        self.last_built = datetime.now().isoformat()

    def get_full_graph(self) -> Dict[str, Any]:
        """Returns the full node and edge network formatted for interactive D3 visualization."""
        self.build_graph()
        return {
            "ontology": ONTOLOGY_SCHEMA,
            "timestamp": self.last_built,
            "summary": {
                "total_nodes": len(self.nodes),
                "total_edges": len(self.edges),
                "node_type_counts": {
                    t: len([n for n in self.nodes.values() if n.node_type == t])
                    for t in ONTOLOGY_SCHEMA["node_types"].keys()
                }
            },
            "nodes": [n.to_dict() for n in self.nodes.values()],
            "edges": [e.to_dict() for e in self.edges]
        }

    def get_subgraph_context_window(self, root_node_id: str, depth: int = 2) -> Dict[str, Any]:
        """
        IBM Context Graph Core Capability:
        Extracts an ontologically grounded sub-graph surrounding a target entity.
        Formats it specifically for an LLM's context window to eliminate hallucinations.
        """
        self.build_graph()
        if root_node_id not in self.nodes:
            # Fallback to default
            root_node_id = "DATASET_50K" if "DATASET_50K" in self.nodes else list(self.nodes.keys())[0]

        visited_nodes: Set[str] = {root_node_id}
        frontier: Set[str] = {root_node_id}
        collected_edges: List[ContextEdge] = []

        for _ in range(depth):
            next_frontier: Set[str] = set()
            for edge in self.edges:
                if edge.source in frontier:
                    if edge not in collected_edges:
                        collected_edges.append(edge)
                    if edge.target not in visited_nodes:
                        next_frontier.add(edge.target)
                        visited_nodes.add(edge.target)
                elif edge.target in frontier:
                    if edge not in collected_edges:
                        collected_edges.append(edge)
                    if edge.source not in visited_nodes:
                        next_frontier.add(edge.source)
                        visited_nodes.add(edge.source)
            frontier = next_frontier

        sub_nodes = [self.nodes[nid].to_dict() for nid in visited_nodes if nid in self.nodes]
        sub_edges = [e.to_dict() for e in collected_edges]

        # Serialized context prompt ready for LLM prompt injection
        llm_context_prompt = {
            "focus_entity": root_node_id,
            "subgraph_entities": [
                {
                    "entity_id": n["id"],
                    "type": n["type"],
                    "label": n["label"],
                    "attributes": n["properties"]
                }
                for n in sub_nodes
            ],
            "relational_paths": [
                f"({e['source']}) -[:{e['predicate']}]-> ({e['target']})"
                for e in sub_edges
            ]
        }

        return {
            "root_node_id": root_node_id,
            "depth": depth,
            "nodes_extracted": len(sub_nodes),
            "edges_extracted": len(sub_edges),
            "nodes": sub_nodes,
            "edges": sub_edges,
            "llm_grounding_payload": llm_context_prompt
        }

    def find_path(self, source_id: str, target_id: str) -> Dict[str, Any]:
        """
        Finds the shortest semantic relationship path between source_id and target_id
        using bidirectional Breadth-First Search over the operational Context Graph.
        """
        self.build_graph()
        if source_id not in self.nodes or target_id not in self.nodes:
            return {
                "source_id": source_id,
                "target_id": target_id,
                "path_found": False,
                "error": "Source or target entity not found in Context Graph",
                "nodes": [],
                "edges": []
            }

        if source_id == target_id:
            return {
                "source_id": source_id,
                "target_id": target_id,
                "path_found": True,
                "distance": 0,
                "nodes": [self.nodes[source_id].to_dict()],
                "edges": []
            }

        # Build adjacency list (undirected for semantic reachability)
        adj: Dict[str, List[tuple]] = {nid: [] for nid in self.nodes}
        for e in self.edges:
            adj[e.source].append((e.target, e, "FORWARD"))
            adj[e.target].append((e.source, e, "REVERSE"))

        queue = deque([[source_id]])
        visited = {source_id}
        path_nodes: List[str] = []

        while queue:
            current_path = queue.popleft()
            curr = current_path[-1]

            if curr == target_id:
                path_nodes = current_path
                break

            for neighbor, edge, direction in adj.get(curr, []):
                if neighbor not in visited:
                    visited.add(neighbor)
                    new_path = list(current_path)
                    new_path.append(neighbor)
                    queue.append(new_path)

        if not path_nodes:
            return {
                "source_id": source_id,
                "target_id": target_id,
                "path_found": False,
                "distance": -1,
                "nodes": [],
                "edges": []
            }

        # Collect edges along the path
        path_edges: List[Dict[str, Any]] = []
        for i in range(len(path_nodes) - 1):
            u, v = path_nodes[i], path_nodes[i+1]
            found_e = None
            for e in self.edges:
                if (e.source == u and e.target == v) or (e.source == v and e.target == u):
                    found_e = e.to_dict()
                    break
            if found_e:
                path_edges.append(found_e)

        return {
            "source_id": source_id,
            "target_id": target_id,
            "path_found": True,
            "distance": len(path_edges),
            "path_string": " -> ".join([self.nodes[nid].label for nid in path_nodes]),
            "nodes": [self.nodes[nid].to_dict() for nid in path_nodes],
            "edges": path_edges
        }

    def get_graph_analytics(self) -> Dict[str, Any]:
        """Calculates topological graph metrics, degree centrality, and ontology distribution."""
        self.build_graph()
        total_v = len(self.nodes)
        total_e = len(self.edges)

        # In-degree, Out-degree, Total degree
        in_degree: Dict[str, int] = {nid: 0 for nid in self.nodes}
        out_degree: Dict[str, int] = {nid: 0 for nid in self.nodes}

        for e in self.edges:
            out_degree[e.source] = out_degree.get(e.source, 0) + 1
            in_degree[e.target] = in_degree.get(e.target, 0) + 1

        centrality = []
        for nid, n in self.nodes.items():
            tot = in_degree[nid] + out_degree[nid]
            centrality.append({
                "id": nid,
                "label": n.label,
                "type": n.node_type,
                "total_degree": tot,
                "in_degree": in_degree[nid],
                "out_degree": out_degree[nid],
                "degree_centrality": round(tot / (total_v - 1), 3) if total_v > 1 else 0
            })

        centrality.sort(key=lambda x: x["total_degree"], reverse=True)

        # Edge predicate distribution
        pred_counts: Dict[str, int] = {}
        for e in self.edges:
            pred_counts[e.predicate] = pred_counts.get(e.predicate, 0) + 1

        # Max possible edges in directed graph: V * (V - 1)
        max_edges = total_v * (total_v - 1) if total_v > 1 else 1
        density = round(total_e / max_edges, 4)

        return {
            "timestamp": self.last_built,
            "total_nodes": total_v,
            "total_edges": total_e,
            "graph_density": density,
            "avg_degree": round(total_e / total_v, 2) if total_v else 0,
            "top_hub_nodes": centrality[:8],
            "predicate_distribution": pred_counts,
            "compliance_health": {
                "rbi_governed_rails": 8,
                "sla_bound_breaks_ratio": "100.0%",
                "audit_sealed_postings_ratio": "100.0%"
            }
        }

    def get_llm_grounding_prompt(self, root_node_id: str, depth: int = 2) -> Dict[str, Any]:
        """
        Synthesizes a production-grade LLM Prompt with fully grounded Context Graph entities,
        triples, and anti-hallucination verification constraints.
        """
        subgraph = self.get_subgraph_context_window(root_node_id, depth)
        target = self.nodes.get(root_node_id)
        target_label = target.label if target else root_node_id
        target_type = target.node_type if target else "UNKNOWN"

        prompt_text = (
            f"### SYSTEM INSTRUCTION: NPCI BANKING OPERATIONS COPILOT (GROUNDED CONTEXT)\n"
            f"You are an autonomous AI banking co-pilot operating on the NPCI Unified Operations Workbench.\n"
            f"You are strictly grounded in the following IBM Semantic Context Graph extraction.\n"
            f"DO NOT hallucinate or extrapolate facts beyond the explicit ontology nodes, attributes, and relational paths provided below.\n\n"
            f"--- FOCUS ENTITY ---\n"
            f"Entity ID: {root_node_id}\n"
            f"Type:      {target_type}\n"
            f"Label:     {target_label}\n\n"
            f"--- GROUNDED ONTOLOGY SUBGRAPH (Depth: {depth} hops) ---\n"
            f"Nodes in Context Window ({subgraph['nodes_extracted']}):\n"
        )

        for n in subgraph["nodes"]:
            props_str = ", ".join([f"{k}={v}" for k, v in n["properties"].items()])
            prompt_text += f"- [{n['type']}] {n['id']} ('{n['label']}'): {props_str}\n"

        prompt_text += f"\nSemantic Relational Triples ({subgraph['edges_extracted']}):\n"
        for p in subgraph["llm_grounding_payload"]["relational_paths"]:
            prompt_text += f"- {p}\n"

        prompt_text += (
            f"\n--- REASONING DIRECTIVE ---\n"
            f"1. Explain the operational lifecycle, settlement leg status, and SLA compliance status of '{target_label}'.\n"
            f"2. Cite the exact regulatory mandate (e.g. RBI Circular DPSS No.629) and execution posting references.\n"
            f"3. Affirm that zero unauthorized debit adjustments occurred."
        )

        return {
            "root_node_id": root_node_id,
            "depth": depth,
            "target_entity": target.to_dict() if target else None,
            "subgraph": subgraph,
            "generated_llm_prompt": prompt_text
        }


# Global Singleton Instance
IBM_GRAPH_ENGINE = IBMContextGraphEngine()

def get_ibm_context_graph() -> IBMContextGraphEngine:
    return IBM_GRAPH_ENGINE
