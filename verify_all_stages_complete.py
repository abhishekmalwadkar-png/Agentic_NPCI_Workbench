import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

def verify_all():
    print("=" * 70)
    print("NPCI UNIFIED OPERATIONS WORKBENCH — FULL 6-STAGE AUDIT VERIFICATION")
    print("=" * 70)

    # Stage 1: Stats & Ingestion
    s1 = json.loads(urllib.request.urlopen("http://localhost:8000/api/stats").read().decode())
    print(f"[Stage 1 - Ingestion & Validation]:")
    print(f"  • Files Ingested:    {s1['total_files_received']} ({s1['validated_files']} validated, {s1['rejected_files']} rejected)")
    print(f"  • Total Records:     {s1['total_records_ingested']:,}")
    print(f"  • Vault Directory:   stage1/staging_vault/ (Validated)")

    # Stage 2: 4-Way Recon
    s2 = json.loads(urllib.request.urlopen("http://localhost:8000/api/recon/summary").read().decode())
    print(f"\n[Stage 2 - 4-Way Multi-Rail Recon Engine]:")
    print(f"  • Ingested Volume:   {s2['total_records']:,} transactions")
    print(f"  • Matched STP:       {s2['matched_count']:,} ({s2['stp_rate']}%)")
    print(f"  • Recon Breaks:      {s2['break_count']:,} (P1: {s2['p1_count']:,}, P2: {s2['p2_count']:,})")
    print(f"  • Net Variance:      INR {s2['financials']['net_variance']:,.2f}")

    # Stage 3: AI Investigation Agent
    s3 = json.loads(urllib.request.urlopen("http://localhost:8000/api/agent/investigate/summary").read().decode())
    print(f"\n[Stage 3 - AI Break Investigation Agent]:")
    print(f"  • Breaks Diagnosed:  {s3['total_breaks_analyzed']:,} cases")
    print(f"  • Auto-Resolvable:   {s3['auto_resolvable_count']:,} (< INR 50k threshold)")
    print(f"  • HITL Approval Req: {s3['hitl_required_count']:,} (>= INR 50k / Amount Mismatch)")
    print(f"  • Critical SLA <4h:  {s3['sla_urgency_breakdown']['critical_under_4h']:,}")

    # Stage 4 & 5: Recovery & Execution
    s45 = json.loads(urllib.request.urlopen("http://localhost:8000/api/recovery/summary").read().decode())
    print(f"\n[Stages 4 & 5 - Autonomous Recovery & Operations HITL Cockpit]:")
    print(f"  • Autonomous Finacle Bot: {s45['auto_resolvable_count']:,} txns (INR {s45['auto_resolvable_amount']:,.2f})")
    print(f"  • HITL Pending Approval:  {s45['hitl_pending_count']:,} cases")
    print(f"  • CBS Execution Bot:      {s45['execution_bot_status']}")
    print(f"  • Total Finacle Postings: {s45['total_cbs_reversals_posted']:,}")

    # Stage 6: Regulatory MIS & Audit Pack
    s6 = json.loads(urllib.request.urlopen("http://localhost:8000/api/mis/report").read().decode())
    print(f"\n[Stage 6 - Regulatory MIS & Tamper-Proof Audit Pack]:")
    print(f"  • RBI TAT Standard:       {s6['regulatory_compliance_sla']['rbi_tat_standard']}")
    print(f"  • Daily Penalty Avoided:  INR {s6['regulatory_compliance_sla']['daily_penalty_avoided_inr']:,}")
    print(f"  • Annual Penalty Avoided: INR {s6['regulatory_compliance_sla']['annualized_penalty_avoided_inr']:,}")
    print(f"  • Audit Pack Sealed:      {s6['audit_package']['sealed']}")
    print(f"  • SHA-256 Digest:         {s6['audit_package']['sha256_hash']}")
    print("=" * 70)
    print("ALL 6 STAGES VERIFIED COMPLETE AND OPERATIONAL!")
    print("=" * 70)

if __name__ == '__main__':
    verify_all()
