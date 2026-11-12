import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

def test_api():
    print("=" * 65)
    print("TESTING STAGES 4, 5 & 6 API ENDPOINTS")
    print("=" * 65)

    # 1. Recovery Summary (Stage 4)
    req = urllib.request.Request("http://localhost:8000/api/recovery/summary")
    with urllib.request.urlopen(req) as resp:
        rec = json.loads(resp.read().decode())
        print("STAGE 4 RECOVERY SUMMARY:")
        print(f"  • Auto-Resolvable (STP Bot): {rec['auto_resolvable_count']:,} (₹{rec['auto_resolvable_amount']:,.2f})")
        print(f"  • HITL Approvals Pending:   {rec['hitl_pending_count']:,}")
        print(f"  • Execution Bot Status:     {rec['execution_bot_status']}")

    # 2. HITL Queue (Stage 5)
    req = urllib.request.Request("http://localhost:8000/api/hitl/queue?limit=5")
    with urllib.request.urlopen(req) as resp:
        hitl = json.loads(resp.read().decode())
        print(f"\nSTAGE 5 HITL QUEUE SAMPLE (Retrieved {len(hitl.get('queue', []))} cases):")
        for item in hitl.get('queue', [])[:3]:
            print(f"  • {item['txn_id']} | RRN: {item['rrn']} | ₹{item['amount']:,} | {item['scenario']} | SLA: {item['sla_countdown']}")

    # 3. Regulatory MIS Report (Stage 6)
    req = urllib.request.Request("http://localhost:8000/api/mis/report")
    with urllib.request.urlopen(req) as resp:
        mis = json.loads(resp.read().decode())
        print("\nSTAGE 6 REGULATORY MIS REPORT:")
        print(f"  • RBI TAT Standard:       {mis['regulatory_compliance_sla']['rbi_tat_standard']}")
        print(f"  • Daily Penalty Avoided:  ₹{mis['regulatory_compliance_sla']['daily_penalty_avoided_inr']:,}")
        print(f"  • Annual Penalty Avoided: ₹{mis['regulatory_compliance_sla']['annualized_penalty_avoided_inr']:,}")

    # 4. Cryptographic Audit Pack Seal (Stage 6)
    req = urllib.request.Request("http://localhost:8000/api/mis/seal-pack", method="POST", data=b"{}")
    req.add_header('Content-Type', 'application/json')
    with urllib.request.urlopen(req) as resp:
        seal = json.loads(resp.read().decode())
        print("\nSTAGE 6 CRYPTOGRAPHIC SEAL GENERATED:")
        print(f"  • Audit Pack ID:  {seal['audit_pack_id']}")
        print(f"  • SHA-256 Digest: {seal['cryptographic_sha256_seal']}")
        print(f"  • RBI Framework:  {seal['regulatory_framework']}")
    print("=" * 65)

if __name__ == '__main__':
    test_api()
