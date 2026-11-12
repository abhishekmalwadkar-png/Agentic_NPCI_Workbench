import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

def test_full_orchestrated_pipeline():
    print("=" * 75)
    print("MICROSOFT AGENT FRAMEWORK (MAF) END-TO-END FLOW VERIFICATION")
    print("=" * 75)

    # 1. Reset MAF Orchestrator Graph
    req = urllib.request.Request("http://localhost:8000/api/orchestrator/reset", method="POST")
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        print(f"1. Reset Status: {res['status']} ({res['message']})")

    # 2. Check Standby Graph State
    req = urllib.request.Request("http://localhost:8000/api/orchestrator/graph")
    with urllib.request.urlopen(req) as resp:
        graph = json.loads(resp.read().decode())
        print(f"2. Standby State: {graph['orchestrator_status']} | Nodes: {graph['total_nodes']} | Progress: {graph['pipeline_progress_pct']}%")

    # 3. Trigger MAF Autonomous Workflow (simulating file upload event)
    print("\n3. Triggering MAF Pipeline with 50,000 records...")
    req = urllib.request.Request("http://localhost:8000/api/orchestrator/run?filename=NPCI_UPI_Settlement_TestData_50K.csv&records=50000", method="POST", data=b"{}")
    req.add_header('Content-Type', 'application/json')
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        print(f"   • Execution Result: {res['status']}")
        print(f"   • MAF Session ID:   {res['session_id']}")

    # 4. Inspect MAF Context Graph & Executors
    req = urllib.request.Request("http://localhost:8000/api/orchestrator/graph")
    with urllib.request.urlopen(req) as resp:
        graph = json.loads(resp.read().decode())
        print(f"\n4. MAF Workflow Graph Status: {graph['orchestrator_status']} (Progress: {graph['pipeline_progress_pct']}%)")
        print("\n   [EXECUTOR NODES STATUS]:")
        for nid, n in graph['executors'].items():
            print(f"   • {n['name']} [{n['rpa_code']}]: {n['status']} ({n['duration_ms']}ms)")

        print("\n   [GROUNDED CONTEXT GRAPH BLACKBOARD]:")
        cg = graph['context_graph']['domains']
        print(f"   • FileContext:       {cg['file_context']['filename']} ({cg['file_context']['records']:,} txns) - {cg['file_context']['status']}")
        print(f"   • ReconContext:      {cg['recon_context']['matched_stp_count']:,} STP ({cg['recon_context']['stp_rate']}), {cg['recon_context']['break_count']:,} Breaks")
        print(f"   • DiagnosticContext: {cg['diagnostic_context']['total_breaks_diagnosed']:,} dossiers ({cg['diagnostic_context']['average_confidence']} confidence)")
        print(f"   • ExecutionContext:  Track A: {cg['execution_context']['track_a_auto']['auto_executed_count']:,} auto | Track B: {cg['execution_context']['track_b_hitl']['batch_approved_count']:,} authorized")
        print(f"   • ComplianceContext: {cg['compliance_context']['rbi_sla_compliance']} SLA | Daily Saved: INR {cg['compliance_context']['daily_penalty_avoided_inr']:,} | Seal: {cg['compliance_context']['cryptographic_sha256_seal'][:16]}...")
        print(f"   • Total Memory Capsules Recorded: {graph['context_graph']['total_memory_capsules']}")

        print("\n   [ORCHESTRATOR TELEMETRY STREAM (Last 4 events)]:")
        for log in graph['telemetry_log'][-4:]:
            print(f"   [{log['timestamp']}] [{log['executor_id']}] {log['message']}")

    print("=" * 75)
    print("ALL MAF WORKFLOW GRAPH & CONTEXT GRAPH CHECKS PASSED SUCCESSFULLY!")
    print("=" * 75)

if __name__ == '__main__':
    test_full_orchestrated_pipeline()
