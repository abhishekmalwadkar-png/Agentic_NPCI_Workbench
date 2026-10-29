import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

req = urllib.request.Request("http://localhost:8000/api/agent/investigate/summary")
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode())
    print("=" * 65)
    print("STAGE 3: AI BREAK INVESTIGATION AGENT RESULTS")
    print("=" * 65)
    print(f"Total Breaks Evaluated: {data['total_breaks_analyzed']:,}")
    print(f"P1 Critical Breaks:     {data['p1_critical_count']:,}")
    print(f"P2 Moderate Breaks:     {data['p2_moderate_count']:,}")
    print(f"Auto-Resolvable (STP):  {data['auto_resolvable_count']:,} (Below ₹50,000 threshold)")
    print(f"HITL Approval Required: {data['hitl_required_count']:,} (High-value / Complex)")
    print(f"Total Funds At Risk:    INR {data['total_at_risk_amount']:,.2f}")
    print("\nSLA Countdown Urgency:")
    for k, v in data['sla_urgency_breakdown'].items():
        print(f"  • {k}: {v:,}")
    print("\nTop Root Causes:")
    for k, v in list(data['root_cause_distribution'].items())[:5]:
        print(f"  • {k}: {v:,}")
    print("=" * 65)
