import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

def test_orch():
    print("=" * 70)
    print("TESTING MICROSOFT AGENT FRAMEWORK (MAF) ORCHESTRATOR API")
    print("=" * 70)

    # 1. Run full MAF Orchestrated Pipeline
    req = urllib.request.Request("http://localhost:8000/api/orchestrator/run", method="POST", data=b"{}")
    req.add_header('Content-Type', 'application/json')
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        print(f"MAF Run Status: {res['status']}")
        print(f"MAF Session ID: {res['session_id']}")

    # 2. Query Workflow Graph & Context Graph State
    req = urllib.request.Request("http://localhost:8000/api/orchestrator/graph")
    with urllib.request.urlopen(req) as resp:
        graph = json.loads(resp.read().decode())
        print(f"\nMAF Workflow Graph Summary:")
        print(f"  • Orchestrator Status:   {graph['orchestrator_status']}")
        print(f"  • Total Executor Nodes:  {graph['total_nodes']}")
        print(f"  • Completed Nodes:       {graph['completed_nodes']} ({graph['pipeline_progress_pct']}%)")
        print(f"\nExecutor Node Details:")
        for nid, node in graph['executors'].items():
            print(f"  [{node['status']:9}] {node['name']} ({node['rpa_code']}) - {node['duration_ms']}ms")

        print(f"\nContext Graph Blackboard Domains:")
        cg = graph['context_graph']['domains']
        print(f"  • FileContext:       {cg['file_context'].get('filename')} ({cg['file_context'].get('records'):,} records)")
        print(f"  • ReconContext:      {cg['recon_context'].get('matched_stp_count'):,} STP ({cg['recon_context'].get('stp_rate')}), {cg['recon_context'].get('break_count'):,} Breaks")
        print(f"  • DiagnosticContext: {cg['diagnostic_context'].get('total_breaks_diagnosed'):,} dossiers ({cg['diagnostic_context'].get('average_confidence')} confidence)")
        print(f"  • ComplianceContext: {cg['compliance_context'].get('rbi_sla_compliance')} SLA | Seal: {cg['compliance_context'].get('cryptographic_sha256_seal', '')[:16]}...")
        print(f"  • Total Memory Capsules: {graph['context_graph']['total_memory_capsules']}")
    print("=" * 70)

if __name__ == '__main__':
    test_orch()
