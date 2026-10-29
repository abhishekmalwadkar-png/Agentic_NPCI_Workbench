import urllib.request
import json
import sys

# Set stdout to UTF-8
sys.stdout.reconfigure(encoding='utf-8')

req = urllib.request.Request("http://localhost:8000/api/recon/run", method="POST")
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode())
    print("=" * 60)
    print("STAGE 2: 4-WAY RECONCILIATION RUN RESULTS")
    print("=" * 60)
    print(f"Run ID:        {data['run_id']}")
    print(f"Staged File:   {data['file_name']}")
    print(f"Total Records: {data['total_records']:,}")
    print(f"Matched (STP): {data['matched_count']:,} ({data['stp_rate']}%)")
    print(f"Recon Breaks:  {data['break_count']:,} (P1: {data['p1_count']:,}, P2: {data['p2_count']:,})")
    print(f"P1 Financial:  INR {data['p1_financial_risk']:,.2f}")
    print(f"Net Variance:  INR {data['financials']['net_variance']:,.2f}")
    print("Break Types:")
    for k, v in data['break_breakdown'].items():
        print(f"  - {k}: {v:,}")
    print("=" * 60)
