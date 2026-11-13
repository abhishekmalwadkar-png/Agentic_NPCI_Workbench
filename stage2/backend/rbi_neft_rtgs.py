"""
RBI NEFT & RTGS Wholesale & High-Value Clearing and Settlement Engine
Implements the 8 Use Cases from 'Agentic AI Solution Architecture: NEFT & RTGS Automation with AutomationEdge':
- UC1: Pre-Submission Validation (Payment Validation Agent)
- UC2: Outward Queue & Status Tracking (Liquidity and Queue Agent)
- UC3: Settlement Account Liquidity Watch (RBI e-Kuber Current Account Monitor)
- UC4: Inward Credit & Return Handling (Inward and Return Agent, 2-Hour TAT)
- UC5: 3-Way Intraday & EOD Reconciliation (CBS vs SFMS vs RBI e-Kuber)
- UC6: Break Investigation & Suspense Clearance (Exception Resolution Agent)
- UC7: Status Copilot Agent (Conversational UTR / Queue query with MS Teams & Portal schemas)
- UC8: TAT Compensation & Regulatory Reporting (Compliance and Reporting Agent)
"""
import uuid
import hashlib
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

# -----------------------------------------------------------------------------
# 1. RBI e-Kuber Settlement Liquidity & Queue State (UC2 & UC3)
# -----------------------------------------------------------------------------
RBI_LIQUIDITY_STATE = {
    "settlement_account_no": "RBI-MUM-CA-00109284",
    "rbi_branch": "Reserve Bank of India, Fort, Mumbai (e-Kuber Node 1)",
    "current_balance_inr": 4825000000.00,  # ₹ 482.50 Crores
    "opening_balance_inr": 5200000000.00,  # ₹ 520.00 Crores
    "intraday_liquidity_facility_limit_inr": 1500000000.00,  # ₹ 150.00 Crores
    "ilf_utilized_inr": 0.00,
    "prudential_buffer_threshold_inr": 1000000000.00,  # ₹ 100.00 Crores minimum buffer
    "liquidity_status": "OPTIMAL_LIQUIDITY",  # OPTIMAL_LIQUIDITY | SHORTFALL_WARNING | CRITICAL_DEFICIT
    "gridlock_risk_score": 0.02,  # 2% low risk
    "last_updated": datetime.now().isoformat(),

    # RTGS In-Flight Queue Monitor (UC2)
    "rtgs_queue": {
        "queue_depth": 8,
        "total_queued_value_inr": 348500000.00,  # ₹ 34.85 Crores
        "oldest_item_age_seconds": 185,  # 3m 5s
        "avg_processing_time_sec": 12.4,
        "status": "PROCESSING_NORMAL",
        "stuck_payments_count": 0
    },

    # NEFT Batch Status (UC2)
    "neft_batch": {
        "current_cycle_no": 30,
        "total_daily_cycles": 48,
        "cycle_name": "NEFT-B30 (14:30 - 15:00 IST)",
        "cut_off_time_ist": "15:00:00",
        "seconds_to_cutoff": 745,  # ~12 mins remaining
        "in_flight_outward_txns": 1420,
        "in_flight_outward_value_inr": 182900450.00,
        "multilateral_net_position_estimate": 45120000.00,  # Receivable
        "status": "ACCUMULATING_BATCH"
    }
}


# -----------------------------------------------------------------------------
# 2. 3-Way Reconciliation Data Generator (UC5 & UC6)
#    Leg 1: Finacle Core Banking System (CBS)
#    Leg 2: SFMS Payment Application (ISO 20022 Switch)
#    Leg 3: RBI e-Kuber Settlement Statement
# -----------------------------------------------------------------------------
def _generate_3way_records() -> List[Dict[str, Any]]:
    today_str = datetime.now().strftime("%Y%m%d")
    now = datetime.now()

    records = [
        # 1. Matched STP RTGS
        {
            "rrn": "902910000101",
            "utr": f"RBIR{today_str}000101",
            "rail": "RTGS",
            "remitter_acc": "100982750477",
            "remitter_name": "Tata Motors Ltd Treasury",
            "remitter_bank": "ABC Bank (Our Bank)",
            "beneficiary_acc": "200918451002",
            "beneficiary_name": "Bharat Heavy Electricals Ltd",
            "beneficiary_bank": "State Bank of India (SBIN0000123)",
            "amount": 25000000.00,  # ₹ 2.50 Cr
            "priority": "P1",
            # Leg 1: Core Banking (CBS)
            "cbs_status": "DEBITED",
            "cbs_amount": 25000000.00,
            "cbs_txn_id": "TXN_CBS_RTGS_101",
            "cbs_gl_leg": "GL-14022 (RTGS Outward Clearing)",
            "cbs_timestamp": (now - timedelta(minutes=45)).strftime("%Y-%m-%d %H:%M:%S"),
            # Leg 2: SFMS Payment Application
            "sfms_status": "ACK_DISPATCHED",
            "sfms_msg_id": f"pacs.008.{today_str}.000101",
            "sfms_msg_type": "pacs.008.001.08 (Credit Transfer)",
            "sfms_timestamp": (now - timedelta(minutes=44, seconds=50)).strftime("%Y-%m-%d %H:%M:%S"),
            # Leg 3: RBI e-Kuber Statement
            "rbi_status": "SETTLED",
            "rbi_voucher_no": f"RBI-GROSS-SETTLE-{today_str}-00101",
            "rbi_batch_id": "N/A (Real-time Gross)",
            "rbi_settled_amount": 25000000.00,
            "rbi_timestamp": (now - timedelta(minutes=44, seconds=35)).strftime("%Y-%m-%d %H:%M:%S"),
            # Recon synthesis
            "recon_status": "MATCHED_STP",
            "variance": 0.00,
            "root_cause": "3-Way Exact Match: CBS Debit, SFMS Dispatch, and RBI Gross Settlement agree 100%.",
            "sla_elapsed_min": 0.5,
            "sla_status": "COMPLIANT_INSTANT",
            "tat_deadline": (now + timedelta(hours=2)).strftime("%Y-%m-%d %H:%M:%S"),
            "proposed_action": "None required - Closed STP."
        },
        # 2. Matched STP NEFT Batch
        {
            "rrn": "902910000102",
            "utr": f"NEFT{today_str}000102",
            "rail": "NEFT",
            "remitter_acc": "100982369389",
            "remitter_name": "Infosys Ltd Salary Disb",
            "remitter_bank": "ABC Bank (Our Bank)",
            "beneficiary_acc": "501002938471",
            "beneficiary_name": "Rohan Deshmukh",
            "beneficiary_bank": "HDFC Bank (HDFC0001234)",
            "amount": 185000.00,
            "priority": "P2",
            # Leg 1: CBS
            "cbs_status": "DEBITED",
            "cbs_amount": 185000.00,
            "cbs_txn_id": "TXN_CBS_NEFT_102",
            "cbs_gl_leg": "GL-9901 (NEFT Clearing Suspense)",
            "cbs_timestamp": (now - timedelta(minutes=75)).strftime("%Y-%m-%d %H:%M:%S"),
            # Leg 2: SFMS
            "sfms_status": "ACK_BATCHED",
            "sfms_msg_id": f"pacs.008.{today_str}.000102",
            "sfms_msg_type": "pacs.008 (NEFT Batch 29)",
            "sfms_timestamp": (now - timedelta(minutes=65)).strftime("%Y-%m-%d %H:%M:%S"),
            # Leg 3: RBI e-Kuber
            "rbi_status": "SETTLED",
            "rbi_voucher_no": f"RBI-NET-{today_str}-B29-002",
            "rbi_batch_id": "NEFT-20261113-B29",
            "rbi_settled_amount": 185000.00,
            "rbi_timestamp": (now - timedelta(minutes=60)).strftime("%Y-%m-%d %H:%M:%S"),
            # Recon synthesis
            "recon_status": "MATCHED_STP",
            "variance": 0.00,
            "root_cause": "3-Way Net Settlement Match: Settled in NEFT Batch 29 with Zero-Delta.",
            "sla_elapsed_min": 15,
            "sla_status": "COMPLIANT_BATCH",
            "tat_deadline": (now + timedelta(minutes=45)).strftime("%Y-%m-%d %H:%M:%S"),
            "proposed_action": "None required - Closed STP."
        },
        # 3. BREAK (UC4): Inward NEFT Credit Reject (Account Closed - pacs.004 return needed)
        {
            "rrn": "902910000103",
            "utr": f"NEFT{today_str}000103",
            "rail": "NEFT",
            "remitter_acc": "400192837461",
            "remitter_name": "Reliance Retail Ltd",
            "remitter_bank": "ICICI Bank (ICIC0000002)",
            "beneficiary_acc": "100982275012",
            "beneficiary_name": "Kavita Sharma",
            "beneficiary_bank": "ABC Bank (Our Bank)",
            "amount": 420000.00,
            "priority": "P1",
            # Leg 1: CBS
            "cbs_status": "REJECTED_CREDIT_FAILED",
            "cbs_amount": 0.00,
            "cbs_txn_id": "TXN_CBS_INW_FAIL_103",
            "cbs_gl_leg": "GL-9903 (Inward Sundry Suspense)",
            "cbs_timestamp": (now - timedelta(minutes=50)).strftime("%Y-%m-%d %H:%M:%S"),
            # Leg 2: SFMS
            "sfms_status": "INWARD_RECEIVED",
            "sfms_msg_id": f"pacs.008.INW.{today_str}.000103",
            "sfms_msg_type": "pacs.008 Inward Payment",
            "sfms_timestamp": (now - timedelta(minutes=55)).strftime("%Y-%m-%d %H:%M:%S"),
            # Leg 3: RBI e-Kuber
            "rbi_status": "SETTLED",
            "rbi_voucher_no": f"RBI-NET-{today_str}-B29-041",
            "rbi_batch_id": "NEFT-20261113-B29",
            "rbi_settled_amount": 420000.00,
            "rbi_timestamp": (now - timedelta(minutes=60)).strftime("%Y-%m-%d %H:%M:%S"),
            # Recon synthesis
            "recon_status": "BREAK_BENEFICIARY_REJECT",
            "variance": 420000.00,
            "root_cause": "Inward credit rejected by Finacle CBS: Beneficiary Account 100982275012 is CLOSED (Reason Code: AC04). Funds parked in Inward Sundry 9903.",
            "sla_elapsed_min": 60,
            "sla_status": "TAT_CLOCK_ACTIVE",
            "tat_deadline": (now + timedelta(minutes=60)).strftime("%Y-%m-%d %H:%M:%S"),
            "proposed_action": "Execute pacs.004 Inward Return to ICICI Bank before 2-Hour RBI TAT deadline."
        },
        # 4. BREAK (UC6): RTGS CBS Timeout / Deemed Failure Break
        {
            "rrn": "902910000104",
            "utr": f"RBIR{today_str}000104",
            "rail": "RTGS",
            "remitter_acc": "100982750323",
            "remitter_name": "Larsen & Toubro Project Div",
            "remitter_bank": "ABC Bank (Our Bank)",
            "beneficiary_acc": "301928475019",
            "beneficiary_name": "Siemens Energy India",
            "beneficiary_bank": "Axis Bank (UTIB0000010)",
            "amount": 14500000.00,  # ₹ 1.45 Cr
            "priority": "P1",
            # Leg 1: CBS
            "cbs_status": "DEBITED",
            "cbs_amount": 14500000.00,
            "cbs_txn_id": "TXN_CBS_RTGS_104",
            "cbs_gl_leg": "GL-14022 (RTGS Outward Clearing)",
            "cbs_timestamp": (now - timedelta(minutes=35)).strftime("%Y-%m-%d %H:%M:%S"),
            # Leg 2: SFMS
            "sfms_status": "DISPATCH_TIMEOUT_NACK",
            "sfms_msg_id": f"pacs.008.{today_str}.000104",
            "sfms_msg_type": "pacs.008.001.08",
            "sfms_timestamp": (now - timedelta(minutes=34, seconds=45)).strftime("%Y-%m-%d %H:%M:%S"),
            # Leg 3: RBI e-Kuber
            "rbi_status": "NOT_SETTLED_NO_RECORD",
            "rbi_voucher_no": "N/A",
            "rbi_batch_id": "N/A",
            "rbi_settled_amount": 0.00,
            "rbi_timestamp": "N/A",
            # Recon synthesis
            "recon_status": "BREAK_SWITCH_TIMEOUT",
            "variance": 14500000.00,
            "root_cause": "CBS customer debited, but SFMS network timeout encountered (No ACK from RBI Gateway within 30s). Payment never settled at e-Kuber.",
            "sla_elapsed_min": 35,
            "sla_status": "RBI_DPSS_TAT_RISK",
            "tat_deadline": (now + timedelta(minutes=85)).strftime("%Y-%m-%d %H:%M:%S"),
            "proposed_action": "Post automated customer reversal voucher (DR GL-14022 / CR Account 100982750323) to prevent RBI interest penalty."
        },
        # 5. BREAK (UC1): Outward High-Value RTGS Pre-Submission Risk Hold
        {
            "rrn": "902910000105",
            "utr": f"RBIR{today_str}000105",
            "rail": "RTGS",
            "remitter_acc": "100982750711",
            "remitter_name": "Adani Green Energy Ltd",
            "remitter_bank": "ABC Bank (Our Bank)",
            "beneficiary_acc": "910293847561",
            "beneficiary_name": "Goldman Sachs Prime Custody",
            "beneficiary_bank": "Citibank India (CITI0000001)",
            "amount": 85000000.00,  # ₹ 8.50 Cr
            "priority": "P1",
            # Leg 1: CBS
            "cbs_status": "ON_HOLD_MAKER_CHECKER",
            "cbs_amount": 85000000.00,
            "cbs_txn_id": "TXN_CBS_RTGS_HOLD_105",
            "cbs_gl_leg": "GL-14022 (Pending Release)",
            "cbs_timestamp": (now - timedelta(minutes=10)).strftime("%Y-%m-%d %H:%M:%S"),
            # Leg 2: SFMS
            "sfms_status": "HELD_PRE_RELEASE",
            "sfms_msg_id": f"pacs.008.{today_str}.000105",
            "sfms_msg_type": "pacs.008 Draft",
            "sfms_timestamp": "Awaiting Checker Approval",
            # Leg 3: RBI
            "rbi_status": "NOT_SUBMITTED",
            "rbi_voucher_no": "N/A",
            "rbi_batch_id": "N/A",
            "rbi_settled_amount": 0.00,
            "rbi_timestamp": "N/A",
            # Recon synthesis
            "recon_status": "PRE_SUBMISSION_CHECK_PASS",
            "variance": 0.00,
            "root_cause": "Pre-submission checks passed (IFSC Validated, CBS Balance Verified ₹ 120 Cr, AML/Sanctions Clean). High-value threshold (>₹5 Cr) requires human checker sign-off.",
            "sla_elapsed_min": 10,
            "sla_status": "AWAITING_MAKER_CHECKER",
            "tat_deadline": (now + timedelta(minutes=20)).strftime("%Y-%m-%d %H:%M:%S"),
            "proposed_action": "Approve outward message dispatch to RBI e-Kuber queue."
        }
    ]
    return records


# -----------------------------------------------------------------------------
# 3. Maker-Checker Pending Actions Queue (UC1, UC4, UC6, UC8)
# -----------------------------------------------------------------------------
MAKER_CHECKER_ACTIONS: List[Dict[str, Any]] = [
    {
        "id": "ACT-NEFT-001",
        "use_case": "UC4: Inward Credit & Return Handling",
        "rail": "NEFT",
        "utr": f"NEFT261113000103",
        "amount": 420000.00,
        "customer": "Reliance Retail Ltd -> Kavita Sharma",
        "action_type": "INITIATE_PACS004_RETURN",
        "reason_code": "AC04 - Account Inactive / Closed",
        "agent_name": "Inward and Return Agent",
        "autonomy_level": "L2 (Prepare & Approve)",
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "tat_countdown_sec": 3600,
        "evidence_dossier": {
            "cbs_response": "Finacle Error 1004: Account 100982275012 status is CLOSED",
            "inward_msg": "pacs.008 from ICICI Bank received in Batch 29",
            "rbi_settlement": "Batch 29 settled at 14:00:00 IST",
            "regulatory_sla": "RBI DPSS: Return must be initiated within 2 hours of batch settlement"
        },
        "status": "PENDING_APPROVAL"
    },
    {
        "id": "ACT-RTGS-002",
        "use_case": "UC6: Break Investigation & Suspense Clearance",
        "rail": "RTGS",
        "utr": f"RBIR261113000104",
        "amount": 14500000.00,
        "customer": "Larsen & Toubro Project Div",
        "action_type": "POST_CBS_REVERSAL_VOUCHER",
        "reason_code": "RC-TIMEOUT - SFMS Gateway 30s Timeout",
        "agent_name": "Exception Resolution Agent",
        "autonomy_level": "L2 (Prepare & Approve)",
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "tat_countdown_sec": 5100,
        "evidence_dossier": {
            "cbs_response": "Account 100982750323 debited ₹1.45 Cr into GL-14022",
            "sfms_response": "HTTP 504 Gateway Timeout from RBI SFMS front-end",
            "rbi_settlement": "Zero record at e-Kuber statement",
            "regulatory_sla": "RBI Circular: Same-day customer refund required for un-transmitted gross settlements"
        },
        "status": "PENDING_APPROVAL"
    },
    {
        "id": "ACT-RTGS-003",
        "use_case": "UC1: Pre-Submission Validation",
        "rail": "RTGS",
        "utr": f"RBIR261113000105",
        "amount": 85000000.00,
        "customer": "Adani Green Energy Ltd -> Goldman Sachs Custody",
        "action_type": "RELEASE_HIGH_VALUE_OUTWARD",
        "reason_code": "DUAL_AUTHORIZATION_MANDATE (>₹5 Cr)",
        "agent_name": "Payment Validation Agent",
        "autonomy_level": "L2 (Prepare & Approve)",
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "tat_countdown_sec": 1200,
        "evidence_dossier": {
            "ifsc_validation": "CITI0000001 Valid & Active on RTGS master",
            "cbs_balance": "Available balance: INR 120,40,19,200.00 (Sufficient)",
            "screening": "Sanctions & AML Screening: CLEAR (Match score 0.0%)",
            "regulatory_sla": "RTGS Operating Guidelines: High-value dual sign-off required"
        },
        "status": "PENDING_APPROVAL"
    },
    {
        "id": "ACT-NEFT-004",
        "use_case": "UC8: TAT Compensation & Reporting",
        "rail": "NEFT",
        "utr": "NEFT261112008492",
        "amount": 300000.00,
        "customer": "Sunita Rao -> Axis Bank",
        "action_type": "DISBURSE_RBI_TAT_COMPENSATION",
        "reason_code": "DELAY_EXCEEDED_2HR_TAT (Delay: 4h 15m)",
        "agent_name": "Compliance & Reporting Agent",
        "autonomy_level": "L2 (Prepare & Approve)",
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "tat_countdown_sec": 0,
        "evidence_dossier": {
            "batch_settled": "Batch 12 settled yesterday at 11:30 IST",
            "credit_posted": "CBS credit posted at 15:45 IST (Delay: 4h 15m)",
            "rbi_formula": "Repo Rate (6.50%) + 2.00% = 8.50% p.a. for delay period",
            "compensation_inr": 296.85
        },
        "status": "PENDING_APPROVAL"
    }
]


# -----------------------------------------------------------------------------
# 4. Status Copilot Agent Engine (UC7)
#    Supports both standard Web Portal JSON and Microsoft Teams Adaptive Card JSON
# -----------------------------------------------------------------------------
def query_payments_copilot(query_text: str, channel: str = "teams") -> Dict[str, Any]:
    """
    Answers natural language questions about UTRs, queues, liquidity, and return reasons.
    Output conforms to Microsoft Teams Adaptive Cards or Web Portal cards.
    """
    q = query_text.strip().upper()
    now_str = datetime.now().strftime("%d-%b-%Y %H:%M:%S IST")
    all_records = _generate_3way_records()

    # Search for matching record by UTR, RRN, or Account
    q_tokens = [t.strip().upper() for t in q.replace(":", " ").replace(",", " ").replace("?", " ").replace("`", "").split() if len(t.strip()) >= 4]
    matched_rec = None
    for r in all_records:
        r_utr = r["utr"].upper()
        if r_utr in q or r["rrn"] in q or r["remitter_acc"] in q or r["beneficiary_acc"] in q:
            matched_rec = r
            break
        if any((tok in r_utr or r_utr in tok or tok in r["rrn"]) for tok in q_tokens if tok not in ["STATUS", "CHECK", "INVESTIGATE"]):
            matched_rec = r
            break

    # If UTR found in query
    if matched_rec:
        rec = matched_rec
        status_color = "good" if rec["recon_status"] == "MATCHED_STP" else "warning" if "HOLD" in rec["recon_status"] else "attention"
        status_badge = "SETTLED (STP)" if rec["recon_status"] == "MATCHED_STP" else "BREAK / EXCEPTION" if "BREAK" in rec["recon_status"] else "PENDING CHECKER"

        response_text = (
            f"**UTR:** `{rec['utr']}` ({rec['rail']}) | **Amount:** INR {rec['amount']:,.2f}\n\n"
            f"**3-Leg Settlement Status:**\n"
            f"- **Core Banking (CBS):** {rec['cbs_status']} ({rec['cbs_gl_leg']})\n"
            f"- **SFMS Switch:** {rec['sfms_status']} via `{rec['sfms_msg_type']}`\n"
            f"- **RBI e-Kuber:** {rec['rbi_status']} (Voucher: `{rec['rbi_voucher_no']}`)\n\n"
            f"**Root-Cause Diagnosis:** {rec['root_cause']}\n\n"
            f"**Regulatory TAT Status:** {rec['sla_status']} (Elapsed: {rec['sla_elapsed_min']} mins, Deadline: {rec['tat_deadline']})\n"
            f"**Proposed Next Action:** {rec['proposed_action']}"
        )

        adaptive_card = {
            "type": "AdaptiveCard",
            "version": "1.4",
            "body": [
                {
                    "type": "Container",
                    "style": "emphasis",
                    "items": [
                        {
                            "type": "ColumnSet",
                            "columns": [
                                {
                                    "type": "Column",
                                    "width": "stretch",
                                    "items": [
                                        {"type": "TextBlock", "text": f"Payments Copilot • {rec['rail']} Investigation", "weight": "Bolder", "size": "Medium", "color": "Accent"},
                                        {"type": "TextBlock", "text": f"UTR: {rec['utr']}", "spacing": "None", "size": "Small", "isSubtle": True}
                                    ]
                                },
                                {
                                    "type": "Column",
                                    "width": "auto",
                                    "items": [
                                        {"type": "TextBlock", "text": status_badge, "weight": "Bolder", "color": status_color}
                                    ]
                                }
                            ]
                        }
                    ]
                },
                {
                    "type": "FactSet",
                    "facts": [
                        {"title": "Amount", "value": f"INR {rec['amount']:,.2f}"},
                        {"title": "Remitter", "value": f"{rec['remitter_name']} ({rec['remitter_acc']})"},
                        {"title": "Beneficiary", "value": f"{rec['beneficiary_name']} ({rec['beneficiary_bank']})"},
                        {"title": "CBS Leg", "value": rec["cbs_status"]},
                        {"title": "SFMS Leg", "value": rec["sfms_status"]},
                        {"title": "RBI e-Kuber", "value": f"{rec['rbi_status']} ({rec['rbi_voucher_no']})"},
                        {"title": "RBI SLA", "value": f"{rec['sla_status']} (Elapsed: {rec['sla_elapsed_min']}m)"}
                    ]
                },
                {
                    "type": "TextBlock",
                    "text": f"**Agent Reasoning:** {rec['root_cause']}",
                    "wrap": True,
                    "spacing": "Medium"
                },
                {
                    "type": "TextBlock",
                    "text": f"**Recommended Action:** {rec['proposed_action']}",
                    "wrap": True,
                    "color": "Warning" if "BREAK" in rec["recon_status"] else "Default"
                }
            ],
            "actions": [
                {"type": "Action.Submit", "title": "Download Evidence Dossier", "data": {"action": "download_dossier", "utr": rec["utr"]}},
                {"type": "Action.Submit", "title": "Open in Exception Workbench", "data": {"action": "open_workbench", "utr": rec["utr"]}}
            ]
        }

        return {
            "status": "SUCCESS",
            "matched": True,
            "channel": channel,
            "query": query_text,
            "timestamp": now_str,
            "summary": response_text,
            "record": rec,
            "adaptive_card": adaptive_card
        }

    # Liquidity query check
    if any(k in q for k in ["LIQUIDITY", "BALANCE", "E-KUBER", "EKUBER", "BUFFER"]):
        liq = RBI_LIQUIDITY_STATE
        summary = (
            f"**RBI e-Kuber Settlement Liquidity Telemetry ({now_str}):**\n\n"
            f"- **Current Balance:** INR {liq['current_balance_inr']:,.2f} (₹ {liq['current_balance_inr']/10000000:.2f} Cr)\n"
            f"- **Intraday Liquidity Facility (ILF):** INR {liq['intraday_liquidity_facility_limit_inr']:,.2f} limit (Utilized: ₹0.00)\n"
            f"- **Prudential Buffer Minimum:** INR {liq['prudential_buffer_threshold_inr']:,.2f}\n"
            f"- **Status:** `{liq['liquidity_status']}` (Gridlock risk score: {liq['gridlock_risk_score']*100}%)\n\n"
            f"**Queue Depths:**\n"
            f"- **RTGS Outward Queue:** {liq['rtgs_queue']['queue_depth']} pending payments (₹ {liq['rtgs_queue']['total_queued_value_inr']/10000000:.2f} Cr, oldest: {liq['rtgs_queue']['oldest_item_age_seconds']}s)\n"
            f"- **NEFT Current Cycle:** {liq['neft_batch']['cycle_name']} with {liq['neft_batch']['in_flight_outward_txns']} txns (Cutoff in {liq['neft_batch']['seconds_to_cutoff']//60}m {liq['neft_batch']['seconds_to_cutoff']%60}s)"
        )
        return {
            "status": "SUCCESS",
            "matched": True,
            "channel": channel,
            "query": query_text,
            "timestamp": now_str,
            "summary": summary,
            "record": liq,
            "adaptive_card": {
                "type": "AdaptiveCard",
                "version": "1.4",
                "body": [
                    {"type": "TextBlock", "text": "RBI e-Kuber Settlement Liquidity & Queue Monitor", "weight": "Bolder", "size": "Medium", "color": "Accent"},
                    {
                        "type": "FactSet",
                        "facts": [
                            {"title": "RBI Settlement Account", "value": liq["settlement_account_no"]},
                            {"title": "Current Float Balance", "value": f"INR {liq['current_balance_inr']/10000000:.2f} Cr"},
                            {"title": "Liquidity Status", "value": liq["liquidity_status"]},
                            {"title": "RTGS Queue Depth", "value": f"{liq['rtgs_queue']['queue_depth']} txns (₹ {liq['rtgs_queue']['total_queued_value_inr']/10000000:.2f} Cr)"},
                            {"title": "NEFT Batch Countdown", "value": f"{liq['neft_batch']['seconds_to_cutoff']//60} mins to cut-off"}
                        ]
                    }
                ]
            }
        }

    # Queue query check
    if any(k in q for k in ["QUEUE", "STUCK", "PENDING", "HOLD"]):
        summary = (
            f"**In-Flight Queue Status ({now_str}):**\n\n"
            f"- **RTGS Gross Queue:** 8 active payments totaling INR 34.85 Cr. All payments within acceptable threshold (< 5 mins queue age).\n"
            f"- **NEFT Cycle 30:** 1,420 outward instructions queued. Cut-off in 12 minutes.\n"
            f"- **Pre-Submission Holds:** 1 high-value transaction (>₹5 Cr) awaiting Maker-Checker sign-off in Exception Workbench."
        )
        return {
            "status": "SUCCESS",
            "matched": True,
            "channel": channel,
            "query": query_text,
            "timestamp": now_str,
            "summary": summary,
            "record": RBI_LIQUIDITY_STATE["rtgs_queue"]
        }

    # Default help fallback
    return {
        "status": "SUCCESS",
        "matched": False,
        "channel": channel,
        "query": query_text,
        "timestamp": now_str,
        "summary": (
            f"I can investigate any NEFT or RTGS transaction, queue, or liquidity metric. Try typing:\n\n"
            f"- `Status of UTR RBIR261113000101` (Instant RTGS Settlement)\n"
            f"- `Check UTR NEFT261113000103` (Inward Closed Account Break)\n"
            f"- `Investigate UTR RBIR261113000104` (SFMS Timeout Deemed Failure)\n"
            f"- `Check RBI e-Kuber balance & liquidity` (Intraday settlement float)\n"
            f"- `Show pending RTGS queue` (Outward queue depth & aging)"
        )
    }


def execute_maker_checker_decision(action_id: str, decision: str, approver_name: str = "abhishek.malwadkar", remarks: str = "") -> Dict[str, Any]:
    """
    Executes a Maker-Checker approval or rejection for L2 agent proposals.
    """
    for act in MAKER_CHECKER_ACTIONS:
        if act["id"] == action_id:
            act["status"] = "APPROVED" if decision.upper() == "APPROVE" else "REJECTED"
            act["decided_by"] = approver_name
            act["decided_at"] = datetime.now().isoformat()
            act["decision_remarks"] = remarks or ("Approved for execution via AutomationEdge" if decision.upper() == "APPROVE" else "Rejected by reviewer")
            act["audit_seal"] = f"SHA256_{uuid.uuid4().hex[:16].upper()}"

            return {
                "status": "SUCCESS",
                "action_id": action_id,
                "decision": act["status"],
                "approver": approver_name,
                "audit_seal": act["audit_seal"],
                "message": f"Action {action_id} successfully {act['status']} by {approver_name}. Executing downstream AutomationEdge workflow."
            }

    return {"status": "ERROR", "message": f"Action ID '{action_id}' not found"}
