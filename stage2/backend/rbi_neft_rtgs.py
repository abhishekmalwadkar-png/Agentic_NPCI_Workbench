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
# 3b. Automated Customer Refund & Reversal Dataset (Multi-Rail STP)
# -----------------------------------------------------------------------------
def _generate_auto_refund_records() -> List[Dict[str, Any]]:
    today_str = datetime.now().strftime("%Y%m%d")
    now = datetime.now()
    return [
        {
            "rrn": "901818109562",
            "utr": f"UTR90181810956202",
            "rail": "UPI",
            "remitter_acc": "100982349945",
            "remitter_name": "Rahul Verma",
            "remitter_bank": "ABC Bank (Our Bank)",
            "beneficiary_acc": "502000192837",
            "beneficiary_name": "Swiggy Merchant",
            "beneficiary_bank": "HDFC Bank (HDFC0000001)",
            "amount": 2500.00,
            "priority": "P1",
            "cbs_status": "DEBITED_THEN_REVERSED",
            "cbs_amount": 2500.00,
            "cbs_txn_id": "TXN000000002",
            "cbs_gl_leg": "GL-14022 -> Finacle Voucher FT261116009182",
            "cbs_timestamp": (now - timedelta(minutes=40)).strftime("%Y-%m-%d %H:%M:%S"),
            "sfms_status": "RC91_TIMEOUT",
            "sfms_msg_id": f"UPI.REQ.{today_str}.9562",
            "sfms_msg_type": "UPI Pay Request",
            "sfms_timestamp": (now - timedelta(minutes=40)).strftime("%Y-%m-%d %H:%M:%S"),
            "rbi_status": "NOT_SETTLED_AUTO_REFUNDED",
            "rbi_voucher_no": "REV-UPI-AUTO-09182",
            "rbi_batch_id": f"UPI-{today_str}-CY01",
            "rbi_settled_amount": 2500.00,
            "rbi_timestamp": (now - timedelta(minutes=38)).strftime("%Y-%m-%d %H:%M:%S"),
            "recon_status": "AUTO_REFUND_COMPLETED",
            "variance": 0.00,
            "root_cause": "NPCI RC91 switch timeout. Beneficiary CBS timed out after remitter debit. Autonomous Reversal Bot (Track A) auto-refunded to customer account.",
            "sla_elapsed_min": 2.0,
            "sla_status": "SLA_COMPLIANT_ZERO_PENALTY",
            "tat_deadline": (now + timedelta(hours=24)).strftime("%Y-%m-%d %H:%M:%S"),
            "proposed_action": "None required - ₹2,500.00 credited back to Remitter (A/C 100982349945). GL knocked off.",
            "refund_ref": "INST-UPI-REV-001 / FT261116009182",
            "refund_date": (now - timedelta(minutes=38)).strftime("%Y-%m-%d %H:%M:%S")
        },
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
            "amount": 14500000.00,
            "priority": "P1",
            "cbs_status": "DEBITED_THEN_REVERSED",
            "cbs_amount": 14500000.00,
            "cbs_txn_id": "TXN_CBS_RTGS_104",
            "cbs_gl_leg": "GL-14022 (RTGS Outward Clearing Reversal)",
            "cbs_timestamp": (now - timedelta(minutes=35)).strftime("%Y-%m-%d %H:%M:%S"),
            "sfms_status": "DISPATCH_TIMEOUT_NACK",
            "sfms_msg_id": f"pacs.008.{today_str}.000104",
            "sfms_msg_type": "pacs.008.001.08",
            "sfms_timestamp": (now - timedelta(minutes=34, seconds=45)).strftime("%Y-%m-%d %H:%M:%S"),
            "rbi_status": "NOT_SETTLED_NO_RECORD",
            "rbi_voucher_no": "N/A",
            "rbi_batch_id": "N/A",
            "rbi_settled_amount": 0.00,
            "rbi_timestamp": "N/A",
            "recon_status": "AUTO_REVERSED_CUSTOMER",
            "variance": 0.00,
            "root_cause": "SFMS network timeout encountered (No ACK from RBI Gateway within 30s). Deemed failure resolved via automated customer reversal voucher (DR GL-14022 / CR Account 100982750323).",
            "sla_elapsed_min": 18,
            "sla_status": "SLA_COMPLIANT_REVERSED",
            "tat_deadline": (now + timedelta(minutes=102)).strftime("%Y-%m-%d %H:%M:%S"),
            "proposed_action": "None required - ₹1.45 Cr reversal voucher posted to prevent RBI interest penalty.",
            "refund_ref": "FT261116007412",
            "refund_date": (now - timedelta(minutes=18)).strftime("%Y-%m-%d %H:%M:%S")
        },
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
            "cbs_status": "INWARD_RETURNED",
            "cbs_amount": 420000.00,
            "cbs_txn_id": "TXN_CBS_INW_FAIL_103",
            "cbs_gl_leg": "GL-9903 -> Inward Return Dispatched",
            "cbs_timestamp": (now - timedelta(minutes=50)).strftime("%Y-%m-%d %H:%M:%S"),
            "sfms_status": "pacs.004_DISPATCHED",
            "sfms_msg_id": f"pacs.004.OUT.{today_str}.000103",
            "sfms_msg_type": "pacs.004 Payment Return",
            "sfms_timestamp": (now - timedelta(minutes=30)).strftime("%Y-%m-%d %H:%M:%S"),
            "rbi_status": "SETTLED_RETURN",
            "rbi_voucher_no": f"RBI-NET-{today_str}-B29-RET041",
            "rbi_batch_id": f"NEFT-{today_str}-B29",
            "rbi_settled_amount": 420000.00,
            "rbi_timestamp": (now - timedelta(minutes=30)).strftime("%Y-%m-%d %H:%M:%S"),
            "recon_status": "AUTO_RETURNED_PACS004",
            "variance": 0.00,
            "root_cause": "Beneficiary Account 100982275012 closed (Reason: AC04). Inward Return pacs.004 automatically created and returned to ICICI Bank within 2 hours.",
            "sla_elapsed_min": 30,
            "sla_status": "SLA_COMPLIANT_2HR_TAT",
            "tat_deadline": (now + timedelta(minutes=90)).strftime("%Y-%m-%d %H:%M:%S"),
            "proposed_action": "None required - ₹4.20 Lakh returned via pacs.004 to ICICI Bank. Settlement closed.",
            "refund_ref": f"pacs.004.OUT.{today_str}.000103",
            "refund_date": (now - timedelta(minutes=30)).strftime("%Y-%m-%d %H:%M:%S")
        },
        {
            "rrn": "402819201941",
            "utr": f"AEPS{today_str}000412",
            "rail": "AePS",
            "remitter_acc": "Aadhaar *******4910",
            "remitter_name": "Rameshwar Yadav",
            "remitter_bank": "ABC Bank (Our Bank)",
            "beneficiary_acc": "BC-1042-MICR",
            "beneficiary_name": "BC Point MicroATM 1042",
            "beneficiary_bank": "ABC Bank (Our Bank)",
            "amount": 1200.00,
            "priority": "P2",
            "cbs_status": "DEBITED_THEN_REVERSED",
            "cbs_amount": 1200.00,
            "cbs_txn_id": "TXN_AEPS_CW_412",
            "cbs_gl_leg": "GL-14022 -> Finacle Voucher FT261116001290",
            "cbs_timestamp": (now - timedelta(minutes=25)).strftime("%Y-%m-%d %H:%M:%S"),
            "sfms_status": "BIO_AUTH_TIMEOUT",
            "sfms_msg_id": f"AEPS.REQ.{today_str}.000412",
            "sfms_msg_type": "AePS Cash Withdrawal",
            "sfms_timestamp": (now - timedelta(minutes=25)).strftime("%Y-%m-%d %H:%M:%S"),
            "rbi_status": "NOT_SETTLED_AUTO_REFUNDED",
            "rbi_voucher_no": "REV-AEPS-AUTO-01290",
            "rbi_batch_id": f"AEPS-{today_str}-CY01",
            "rbi_settled_amount": 1200.00,
            "rbi_timestamp": (now - timedelta(minutes=24)).strftime("%Y-%m-%d %H:%M:%S"),
            "recon_status": "AUTO_REFUND_COMPLETED",
            "variance": 0.00,
            "root_cause": "MicroATM cash withdrawal biometric timeout. Deemed failure auto-reversed under Low-Value Policy (< ₹5,000) within 60 seconds.",
            "sla_elapsed_min": 1,
            "sla_status": "SLA_COMPLIANT_INSTANT",
            "tat_deadline": (now + timedelta(hours=24)).strftime("%Y-%m-%d %H:%M:%S"),
            "proposed_action": "None required - ₹1,200.00 credited back to Customer Aadhaar Account.",
            "refund_ref": "FT261116001290",
            "refund_date": (now - timedelta(minutes=24)).strftime("%Y-%m-%d %H:%M:%S")
        },
        {
            "rrn": "718291048201",
            "utr": f"NETC{today_str}008192",
            "rail": "NETC",
            "remitter_acc": "Tag 34161FA820918231",
            "remitter_name": "Rajesh Kumar (MH12-DE-9921)",
            "remitter_bank": "ABC Bank FASTag Wallet",
            "beneficiary_acc": "PLAZA-KHED-SHIVAPUR",
            "beneficiary_name": "Khed-Shivapur Toll Plaza",
            "beneficiary_bank": "Axis Bank (Acquirer)",
            "amount": 450.00,
            "priority": "P2",
            "cbs_status": "DEBITED_THEN_REVERSED",
            "cbs_amount": 450.00,
            "cbs_txn_id": "TXN_NETC_TOLL_8192",
            "cbs_gl_leg": "GL-14022 -> Wallet Auto-Credit",
            "cbs_timestamp": (now - timedelta(minutes=15)).strftime("%Y-%m-%d %H:%M:%S"),
            "sfms_status": "DUPLICATE_DEBIT_ACK",
            "sfms_msg_id": f"NETC.TOLL.{today_str}.008192",
            "sfms_msg_type": "Toll Deduct Request",
            "sfms_timestamp": (now - timedelta(minutes=15)).strftime("%Y-%m-%d %H:%M:%S"),
            "rbi_status": "NOT_SETTLED_AUTO_REFUNDED",
            "rbi_voucher_no": "REV-NETC-AUTO-08192",
            "rbi_batch_id": f"NETC-{today_str}-CY02",
            "rbi_settled_amount": 450.00,
            "rbi_timestamp": (now - timedelta(minutes=13)).strftime("%Y-%m-%d %H:%M:%S"),
            "recon_status": "AUTO_REFUND_COMPLETED",
            "variance": 0.00,
            "root_cause": "Toll plaza reader dual pulse (duplicate debit within 12 seconds). NETC auto-reversal engine credited ₹450 back to FASTag wallet.",
            "sla_elapsed_min": 2,
            "sla_status": "SLA_COMPLIANT_INSTANT",
            "tat_deadline": (now + timedelta(hours=24)).strftime("%Y-%m-%d %H:%M:%S"),
            "proposed_action": "None required - ₹450.00 credited back to Customer FASTag balance.",
            "refund_ref": "FT261116008192",
            "refund_date": (now - timedelta(minutes=13)).strftime("%Y-%m-%d %H:%M:%S")
        }
    ]


# -----------------------------------------------------------------------------
# 4. Status Copilot Agent Engine (UC7)
#    Supports both standard Web Portal JSON and Microsoft Teams Adaptive Card JSON
# -----------------------------------------------------------------------------
def query_payments_copilot(query_text: str, channel: str = "teams") -> Dict[str, Any]:
    """
    Answers natural language questions about UTRs, matched records, breaks,
    auto-refunds, reversals, queues, liquidity, regulatory TAT, and banking reconciliation SOPs.
    Equipped with Banking NLP Intent Classifier for sub-millisecond semantic dispatch.
    Output conforms to Microsoft Teams Adaptive Cards or Web Portal cards.
    """
    q = query_text.strip().upper()
    now_str = datetime.now().strftime("%d-%b-%Y %H:%M:%S IST")
    all_records = _generate_3way_records()
    auto_refund_records = _generate_auto_refund_records()

    # Search for matching record by specific UTR, RRN, Account, or normalized variants
    q_norm = q.replace(" ", "").replace("-", "").replace(":", "")
    q_tokens = [t.strip().upper() for t in q.replace(":", " ").replace(",", " ").replace("?", " ").replace("`", "").replace("'", "").replace('"', '').split() if len(t.strip()) >= 2]

    # ─────────────────────────────────────────────────────────────────────────────
    # Banking NLP Intent Classifier & Semantic Scoring Engine
    # ─────────────────────────────────────────────────────────────────────────────
    intent_scores = {
        "AUTO_REFUND_LIST": 0,
        "MATCHED_LIST": 0,
        "BREAK_LIST": 0,
        "RECON_SUMMARY": 0,
        "MAKER_CHECKER": 0,
        "LIQUIDITY": 0,
        "QUEUE": 0,
        "FILE_REGISTRY": 0,
        "SOP_PACS008": 0,
        "SOP_PACS004": 0,
        "SOP_3WAY": 0
    }

    # 1. Auto-Refund / Reversal Intent Scoring
    for kw, weight in [
        ("AUTO REFUND", 45), ("AUTO-REFUND", 45), ("AUTOREFUND", 45),
        ("AUTO REFUNDED", 55), ("AUTO-REFUNDED", 55),
        ("REFUND", 25), ("REFUNDS", 25), ("REFUNDED", 30),
        ("AUTO REVERSAL", 45), ("AUTO-REVERSAL", 45), ("AUTOREVERSAL", 45),
        ("REVERSAL", 25), ("REVERSALS", 25), ("REVERSED", 30),
        ("PACS.004 RETURN", 35), ("RETURNED", 20), ("RETURNS", 15),
        ("CHARGEBACK", 25), ("COMPENSATION", 25), ("CREDITED BACK", 30), ("DEEMED FAIL", 25)
    ]:
        if kw in q:
            intent_scores["AUTO_REFUND_LIST"] += weight

    # 2. Matched Records Intent Scoring
    for kw, weight in [
        ("MATCHED", 30), ("MATCH", 20), ("MATCHES", 20), ("MATCHING", 25), ("MTCHED", 30),
        ("STP", 25), ("SETTLED", 25), ("SETTLEMENT", 20),
        ("BALANCED", 25), ("ZERO DELTA", 30), ("ZERO VARIANCE", 30),
        ("CLEARING AGREEMENT", 35)
    ]:
        if kw in q:
            intent_scores["MATCHED_LIST"] += weight

    # 3. Breaks / Exceptions Intent Scoring
    for kw, weight in [
        ("UNMATCHED", 35), ("UNMTCHED", 35), ("UNMATCH", 30), ("UN-MATCHED", 35), ("NOT MATCHED", 35),
        ("NOT MATCH", 30), ("UNRECONCILED", 35), ("UN-RECONCILED", 35),
        ("BREAK", 30), ("BREAKS", 30), ("OPEN BREAK", 35), ("OPEN BREAKS", 35),
        ("EXCEPTION", 30), ("EXCEPTIONS", 30), ("TIMEOUT", 20), ("TIMEOUTS", 20),
        ("FAIL", 20), ("FAILED", 20), ("FAILURE", 20), ("FAILURES", 20), ("P1", 20), ("P2", 15),
        ("MISMATCH", 25), ("MISMATCHES", 25), ("DROPPED", 20), ("DISCREPANCY", 25), ("DISCREPANCIES", 25)
    ]:
        if kw in q:
            intent_scores["BREAK_LIST"] += weight

    # 4. Recon Telemetry & Summary Intent Scoring
    for kw, weight in [
        ("RECON", 20), ("RECONCILIATION", 25), ("SUMMARY", 30), ("OVERVIEW", 30),
        ("STATUS", 15), ("RATE", 20), ("SCORECARD", 30), ("STATS", 25),
        ("METRIC", 25), ("METRICS", 25), ("TELEMETRY", 30), ("HOW IS RECON", 40)
    ]:
        if kw in q:
            intent_scores["RECON_SUMMARY"] += weight

    # 5. Maker-Checker / HITL Approvals Intent Scoring
    for kw, weight in [
        ("HITL", 35), ("MAKER", 30), ("CHECKER", 30), ("APPROVAL", 30),
        ("APPROVALS", 30), ("APPROVE", 25), ("REJECT", 20), ("COCKPIT", 30),
        ("PENDING APPROVAL", 40), ("PENDING ACTIONS", 40), ("SUPERVISOR", 25), ("L2", 25)
    ]:
        if kw in q:
            intent_scores["MAKER_CHECKER"] += weight

    # 6. Central Bank Liquidity Intent Scoring
    for kw, weight in [
        ("LIQUIDITY", 35), ("BALANCE", 30), ("BALANCES", 25), ("E-KUBER", 35),
        ("EKUBER", 35), ("FLOAT", 30), ("BUFFER", 30), ("ILF", 30), ("RESERVE", 25)
    ]:
        if kw in q:
            intent_scores["LIQUIDITY"] += weight

    # 7. In-Flight Queue Depths Intent Scoring
    for kw, weight in [
        ("QUEUE", 35), ("QUEUES", 35), ("IN-FLIGHT", 30), ("STUCK", 30),
        ("OUTWARD DEPTH", 35), ("CUTOFF", 25), ("CUT-OFF", 25), ("PENDING RTGS", 35)
    ]:
        if kw in q:
            intent_scores["QUEUE"] += weight

    # 8. File Registry & Excel Download Intent Scoring
    for kw, weight in [
        ("FILE", 25), ("FILES", 25), ("DOWNLOAD", 35), ("EXCEL", 35),
        ("XLSX", 35), ("CSV", 30), ("REGISTRY", 35), ("REPORT", 25), ("EXPORT", 25)
    ]:
        if kw in q:
            intent_scores["FILE_REGISTRY"] += weight

    # 9. Banking SOP & Knowledge FAQ Scoring
    if "PACS.008" in q or "CREDIT TRANSFER" in q:
        intent_scores["SOP_PACS008"] += 50
    if "PACS.004" in q or ("RETURN" in q and ("REASON" in q or "WHAT" in q or "SOP" in q)):
        intent_scores["SOP_PACS004"] += 50
    if "3-WAY" in q or "TRIANGULATION" in q or "3 WAY" in q:
        intent_scores["SOP_3WAY"] += 50

    # Query modifier boosts
    is_list_query = any(k in q for k in ["LIST", "SHOW", "GIVE", "ALL", "WHAT ARE", "DISPLAY", "FETCH", "RECORDS", "TRANSACTIONS"])
    if is_list_query:
        if intent_scores["AUTO_REFUND_LIST"] > 0:
            intent_scores["AUTO_REFUND_LIST"] += 15
        if intent_scores["MATCHED_LIST"] > 0:
            intent_scores["MATCHED_LIST"] += 10
        if intent_scores["BREAK_LIST"] > 0:
            intent_scores["BREAK_LIST"] += 10

    # Check for specific UTR match ONLY if query is not a general list request
    matched_rec = None
    all_combined = all_records + auto_refund_records
    if not (is_list_query and (intent_scores["AUTO_REFUND_LIST"] > 20 or intent_scores["MATCHED_LIST"] > 20 or intent_scores["BREAK_LIST"] > 20)):
        for r in all_combined:
            r_utr = r["utr"].upper()
            r_short = r_utr.replace("2026", "26")
            r_long = r_utr.replace("261113", "20261113")
            r_suffix = r_utr[-6:]
            r_rrn = r["rrn"]

            # Exact or substring match in raw or normalized query
            if (r_utr in q or r_short in q or r_long in q or
                r_utr in q_norm or r_short in q_norm or r_long in q_norm or
                r_rrn in q or r.get("remitter_acc") in q or r.get("beneficiary_acc") in q):
                matched_rec = r
                break

            # Suffix / sequence match (e.g. 000101, 000103, 000104)
            if r_suffix in q_norm and not is_list_query:
                matched_rec = r
                break

            # Token-based match
            ignore_words = {"STATUS", "CHECK", "INVESTIGATE", "TRANSACTION", "PAYMENT", "WHAT", "ABOUT", "SHOW", "THE", "FOR", "GIVE", "LIST", "RECORDS", "MATCHED", "UNMATCHED", "BREAKS", "REFUND", "AUTO", "REFUNDED"}
            if any((tok in r_utr or tok in r_short or r_utr in tok or r_short in tok or tok in r_rrn) for tok in q_tokens if tok not in ignore_words):
                matched_rec = r
                break

    # 1. SPECIFIC UTR INVESTIGATION DOSSIER
    if matched_rec:
        rec = matched_rec
        status_color = "good" if "MATCHED" in rec["recon_status"] or "AUTO_REFUND" in rec["recon_status"] or "REVERSED" in rec["recon_status"] else "warning" if "HOLD" in rec["recon_status"] else "attention"
        status_badge = "SETTLED (STP)" if rec["recon_status"] == "MATCHED_STP" else "AUTO-REFUNDED" if "AUTO" in rec["recon_status"] or "REVERSED" in rec["recon_status"] else "BREAK / EXCEPTION" if "BREAK" in rec["recon_status"] else "PENDING CHECKER"

        response_text = (
            f"**UTR:** `{rec['utr']}` ({rec['rail']}) | **Amount:** INR {rec['amount']:,.2f}\n\n"
            f"**3-Leg Settlement Status:**\n"
            f"- **Core Banking (CBS):** {rec['cbs_status']} ({rec['cbs_gl_leg']})\n"
            f"- **SFMS Switch:** {rec['sfms_status']} via `{rec.get('sfms_msg_type', 'N/A')}`\n"
            f"- **RBI e-Kuber:** {rec['rbi_status']} (Voucher: `{rec.get('rbi_voucher_no', 'N/A')}`)\n\n"
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
                        {"title": "Remitter", "value": f"{rec['remitter_name']} ({rec.get('remitter_acc', 'N/A')})"},
                        {"title": "Beneficiary", "value": f"{rec['beneficiary_name']} ({rec.get('beneficiary_bank', 'N/A')})"},
                        {"title": "CBS Leg", "value": rec["cbs_status"]},
                        {"title": "SFMS Leg", "value": rec["sfms_status"]},
                        {"title": "RBI e-Kuber", "value": f"{rec['rbi_status']} ({rec.get('rbi_voucher_no', 'N/A')})"},
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
                    "color": "Good" if "AUTO" in rec["recon_status"] or "MATCHED" in rec["recon_status"] else "Warning"
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

    # 2. AUTO-REFUND & REVERSAL LIST QUERY (NLP WINNER)
    if intent_scores["AUTO_REFUND_LIST"] >= 20 and intent_scores["AUTO_REFUND_LIST"] >= intent_scores["BREAK_LIST"]:
        tot_refund_val = sum(r["amount"] for r in auto_refund_records)
        lines = [
            f"**Automated Customer Refunds & System Reversals (Multi-Rail STP):**\n",
            f"Found **{len(auto_refund_records)} auto-refunded / reversed transactions** totaling **INR {tot_refund_val:,.2f}** (~₹ {tot_refund_val/10000000:.2f} Cr) resolved by Autonomous AI Recovery Agents across UPI, RTGS, NEFT, AePS, and NETC:\n"
        ]

        for i, r in enumerate(auto_refund_records, 1):
            badge = f"[{r['recon_status']}]"
            lines.append(
                f"{i}. **UTR:** `{r['utr']}` ({r['rail']}) | **Amount:** INR {r['amount']:,.2f} | **Status:** `{badge}`\n"
                f"   - **Remitter:** {r['remitter_name']} (`{r['remitter_acc']}`)\n"
                f"   - **Beneficiary:** {r['beneficiary_name']}\n"
                f"   - **Root Cause:** {r['root_cause']}\n"
                f"   - **Reversal Voucher:** `{r['cbs_gl_leg']}`\n"
                f"   - **Regulatory SLA:** {r['sla_status']} (Elapsed: {r['sla_elapsed_min']} mins | Zero Penalty)\n"
                f"   - **Remediation Result:** {r['proposed_action']}\n"
            )

        lines.append(
            "*(Under RBI DPSS Circular & Dual-Track AI Policy, all timeouts under ₹5,000 and deemed failures are auto-reversed via Finacle bot script within seconds. Click any UTR to inspect the full comparative 3-Leg audit trail).*"
        )

        return {
            "status": "SUCCESS",
            "matched": True,
            "record_type": "AUTO_REFUND_LIST",
            "channel": channel,
            "query": query_text,
            "timestamp": now_str,
            "summary": "\n".join(lines),
            "records_list": auto_refund_records,
            "count": len(auto_refund_records),
            "total_amount": tot_refund_val
        }

    # 3. MATCHED RECORDS LIST QUERY (NLP WINNER)
    if intent_scores["MATCHED_LIST"] >= 20 and intent_scores["MATCHED_LIST"] > intent_scores["BREAK_LIST"]:
        matched_list = [r for r in all_records if r.get("recon_status") == "MATCHED_STP"]
        tot_val = sum(r["amount"] for r in matched_list)

        lines = [
            f"**3-Leg Reconciled Matched Records (100% STP Settled • Zero Variance):**\n",
            f"Found **{len(matched_list)} matched transactions** totaling **INR {tot_val:,.2f}** with confirmed 3-leg agreement across Core Banking (Finacle CBS), SFMS Switch, and RBI e-Kuber:\n"
        ]

        for i, m in enumerate(matched_list, 1):
            lines.append(
                f"{i}. **UTR:** `{m['utr']}` ({m['rail']}) | **Amount:** INR {m['amount']:,.2f}\n"
                f"   - **Remitter:** {m['remitter_name']} ({m['remitter_acc']})\n"
                f"   - **Beneficiary:** {m['beneficiary_name']} ({m['beneficiary_bank']})\n"
                f"   - **3-Leg Status:** CBS: `{m['cbs_status']}` | SFMS: `{m['sfms_status']}` | RBI: `{m['rbi_status']}` (Voucher: `{m['rbi_voucher_no']}`)\n"
                f"   - **Settlement Result:** STP Settled with zero financial variance.\n"
            )

        lines.append(
            f"*(Multi-Rail Overview: In the workbench, 47,600 UPI transactions are matched at 95.2% STP, 1,000 IMPS matched, and 200 AePS matched. Download full verified `.xlsx` batch files from the File Registry tab).* "
        )

        return {
            "status": "SUCCESS",
            "matched": True,
            "record_type": "MATCHED_LIST",
            "channel": channel,
            "query": query_text,
            "timestamp": now_str,
            "summary": "\n".join(lines),
            "records_list": matched_list,
            "count": len(matched_list),
            "total_amount": tot_val
        }

    # 4. UNMATCHED RECORDS / BREAKS / EXCEPTIONS QUERY (NLP WINNER)
    if intent_scores["BREAK_LIST"] >= 20:
        break_list = [r for r in all_records if "BREAK" in r.get("recon_status", "") or "HOLD" in r.get("recon_status", "")]
        tot_break_val = sum(r["amount"] for r in break_list)

        lines = [
            f"**Open Reconciliation Breaks & Exception Records:**\n",
            f"Found **{len(break_list)} active exceptions** totaling **INR {tot_break_val:,.2f}** requiring AI remediation or Maker-Checker authorization:\n"
        ]

        for i, b in enumerate(break_list, 1):
            prio_tag = f"[{b['priority']}]" if b.get("priority") else "[P1]"
            lines.append(
                f"{i}. **UTR:** `{b['utr']}` ({b['rail']}) | **Amount:** INR {b['amount']:,.2f} | **Priority:** `{prio_tag}`\n"
                f"   - **Break Category:** `{b['recon_status']}`\n"
                f"   - **Diagnosis:** {b['root_cause']}\n"
                f"   - **Regulatory SLA:** {b['sla_status']} (Elapsed: {b['sla_elapsed_min']} mins | Deadline: {b['tat_deadline']})\n"
                f"   - **Proposed Action:** {b['proposed_action']}\n"
            )

        lines.append("*(Click on any UTR above or type `Investigate UTR <code >` to see the full 3-Leg comparative evidence dossier).*")

        return {
            "status": "SUCCESS",
            "matched": True,
            "record_type": "BREAK_LIST",
            "channel": channel,
            "query": query_text,
            "timestamp": now_str,
            "summary": "\n".join(lines),
            "records_list": break_list,
            "count": len(break_list),
            "total_amount": tot_break_val
        }

    # 5. OVERALL RECON SUMMARY / METRICS QUERY
    if intent_scores["RECON_SUMMARY"] >= 15:
        matched_cnt = sum(1 for r in all_records if r.get("recon_status") == "MATCHED_STP")
        break_cnt = sum(1 for r in all_records if "BREAK" in r.get("recon_status", "") or "HOLD" in r.get("recon_status", ""))
        tot_cnt = len(all_records)
        stp_pct = round((matched_cnt / max(1, tot_cnt)) * 100, 1)

        summary = (
            f"**Comprehensive Multi-Rail Reconciliation Telemetry ({now_str}):**\n\n"
            f"- **3-Way Triangulation Match Rate:** **{stp_pct}% STP** ({matched_cnt} of {tot_cnt} sampled batches balanced)\n"
            f"- **Settled Volume:** INR {sum(r['amount'] for r in all_records if r.get('recon_status') == 'MATCHED_STP'):,.2f} with zero variance\n"
            f"- **Active Exceptions:** **{break_cnt} open breaks** requiring dual-track remediation (1 SFMS timeout, 1 pacs.004 return, 1 L2 hold)\n"
            f"- **Leg-by-Leg Health:**\n"
            f"  - **Leg 1 (Finacle CBS):** 100% operational | GL-14022 suspense monitored\n"
            f"  - **Leg 2 (SFMS ISO 20022 Switch):** 98.7% dispatch ACK rate (`pacs.008`)\n"
            f"  - **Leg 3 (RBI e-Kuber Node):** 99.4% real-time gross settlement confirmation\n\n"
            f"- **Settlement Account Float:** INR {RBI_LIQUIDITY_STATE['current_balance_inr']:,.2f} (Prudential Buffer: INR {RBI_LIQUIDITY_STATE['prudential_buffer_threshold_inr']:,.2f})\n"
            f"- **Zero-Delta GL Status:** `KNOCKED_OFF_BALANCED` (Vouchers posted in GL-14020 vs GL-11010)"
        )

        return {
            "status": "SUCCESS",
            "matched": True,
            "record_type": "RECON_SUMMARY",
            "channel": channel,
            "query": query_text,
            "timestamp": now_str,
            "summary": summary,
            "record": {
                "total_records": tot_cnt,
                "matched_count": matched_cnt,
                "break_count": break_cnt,
                "stp_rate": stp_pct,
                "liquidity_balance": RBI_LIQUIDITY_STATE["current_balance_inr"]
            }
        }

    # 5. HITL / MAKER-CHECKER / PENDING ACTIONS QUERY
    is_hitl_query = (
        any(k in q for k in ["HITL", "MAKER", "CHECKER", "APPROVAL", "APPROVE", "REJECT", "ACTION", "COCKPIT", "L2"]) or
        ("PENDING" in q and ("ACTION" in q or "LIST" in q or "HITL" in q)) or
        ("LIST" in q and any(k in q for k in ["FULL LIST", "PENDING", "ACTIONS", "ITEMS"]) and not any(k in q for k in ["MATCHED", "UNMATCHED", "BREAK"])) or
        (q in ["FULL LIST", "GIVE ME FULL LIST", "SHOW FULL LIST", "SHOW LIST", "LIST ALL", "LIST OF PENDING", "PENDING ACTIONS"])
    )

    if is_hitl_query:
        pending = [a for a in MAKER_CHECKER_ACTIONS if a.get("status") in ("PENDING_APPROVAL", "PENDING_CHECKER", "HELD")]
        tot_action_val = sum(a.get("amount", 0) for a in pending)

        lines = [
            f"**L2 Maker-Checker Dual-Authorization Queue ({len(pending)} Pending HITL Actions):**\n",
            f"Total Value Pending Supervisor Clearance: **INR {tot_action_val:,.2f}** (~₹ {tot_action_val/10000000:.2f} Crores) across NEFT & RTGS:\n"
        ]

        for i, act in enumerate(pending, 1):
            dossier = act.get("evidence_dossier", {})
            sla_info = dossier.get("regulatory_sla", "2-hour regulatory cutoff")
            lines.append(
                f"{i}. **Action ID:** `{act['id']}` | **Rail:** {act['rail']} | **Amount:** INR {act['amount']:,.2f}\n"
                f"   - **Action Required:** `{act['action_type']}`\n"
                f"   - **Parties / Customer:** {act.get('customer', 'Treasury')}\n"
                f"   - **Trigger / Reason:** `{act.get('reason_code', 'Policy Hold')}`\n"
                f"   - **Proposed by:** {act.get('agent_name', 'Agent')} ({act.get('autonomy_level', 'L2')})\n"
                f"   - **Regulatory SLA:** {sla_info}\n"
            )

        lines.append("*(You can approve or reject these items directly from the **HITL Approvals & Cockpit** tab or using the action cards below).*")

        return {
            "status": "SUCCESS",
            "matched": True,
            "record_type": "MAKER_CHECKER",
            "channel": channel,
            "query": query_text,
            "timestamp": now_str,
            "summary": "\n".join(lines),
            "records_list": pending,
            "count": len(pending),
            "total_amount": tot_action_val
        }

    # 6. LIQUIDITY / E-KUBER QUERY
    if any(k in q for k in ["LIQUIDITY", "BALANCE", "E-KUBER", "EKUBER", "BUFFER", "FLOAT", "RESERVE"]):
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
            "record": liq
        }

    # 7. IN-FLIGHT OUTWARD QUEUE QUERY
    if any(k in q for k in ["QUEUE", "STUCK", "OUTWARD DEPTH", "IN-FLIGHT"]) and "ACTION" not in q and "HITL" not in q:
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

    # 8. FILE REGISTRY / EXCEL DOWNLOAD QUERY
    if any(k in q for k in ["FILE", "DOWNLOAD", "EXCEL", "XLSX", "CSV", "REGISTRY", "REPORT", "EXPORT"]):
        summary = (
            f"**Workflow Output Files & Reports Registry ({now_str}):**\n\n"
            f"All Process Studio and AutomationEdge workflow outputs are downloadable directly from the **File Registry** tab:\n\n"
            f"- `Matched_Records_UPI_20261113.xlsx` — Full 4-way balanced STP records with bank legs\n"
            f"- `Unmatched_Records_UPI_20261113.xlsx` — Exception breaks, root causes, and SLA breach countdowns\n"
            f"- `Balanced_Ledger_UPI_20261113.xlsx` — Zero-delta GL knock-off voucher journal\n"
            f"- `Finacle_CBS_Reversals_UPI_20261113.xlsx` — AI-approved auto-refunds and adjustment postings\n"
            f"- `RBI_NEFT_Settlement_Batch_20261113.xlsx` — 3-leg multilateral net settlement report\n"
            f"- `RBI_RTGS_Liquidity_Report_20261113.xlsx` — Gross settlement and float balance report\n\n"
            f"Navigate to `#/files` to filter by **DD-MM-YYYY** date and rail or click the download icon next to any file."
        )
        return {
            "status": "SUCCESS",
            "matched": True,
            "record_type": "FILE_REGISTRY",
            "channel": channel,
            "query": query_text,
            "timestamp": now_str,
            "summary": summary
        }

    # 9. BANKING SOP & ISO 20022 FAQ EXPLANATIONS
    if "PACS.008" in q or "PACS 008" in q or "CREDIT TRANSFER" in q:
        summary = (
            f"**ISO 20022 `pacs.008.001.08` (Financial Institutional Customer Credit Transfer):**\n\n"
            f"- **Purpose:** The core interbank XML message used in RTGS and NEFT outward clearing to instruct fund transfers between originating and receiving banks.\n"
            f"- **Workflow Action:** Generated by SFMS Switch after Finacle CBS customer debit (`GL-14022`). Dispatched to RBI e-Kuber node.\n"
            f"- **Validation Rule:** Must contain valid IFSC, Account Number, LEI (Legal Entity Identifier for ₹50 Cr+ corporate transactions), and UTR."
        )
        return {"status": "SUCCESS", "matched": True, "query": query_text, "timestamp": now_str, "summary": summary}

    if "PACS.004" in q or "PACS 004" in q or "RETURN" in q and ("REASON" in q or "WHAT" in q):
        summary = (
            f"**ISO 20022 `pacs.004.001.09` (Payment Return Message):**\n\n"
            f"- **Purpose:** Used when an inward NEFT/RTGS payment cannot be credited to the beneficiary (e.g. Account Closed, Invalid Account, Name Mismatch).\n"
            f"- **Regulatory TAT:** Under RBI DPSS Circular, beneficiary banks must return uncredited inward NEFT within **2 hours** of batch settlement or by end of day.\n"
            f"- **Workflow Action:** Our AI Agent diagnoses reason code (e.g. `AC04` Closed Account), auto-prepares `pacs.004`, and triggers `WF_NEFT_RTGS_CBS_Execution_Bot` to credit the remitter bank."
        )
        return {"status": "SUCCESS", "matched": True, "query": query_text, "timestamp": now_str, "summary": summary}

    if "3-WAY" in q or "TRIANGULATION" in q:
        summary = (
            f"**3-Way Triangulation Reconciliation Architecture:**\n\n"
            f"Cross-matches 3 independent sources to guarantee zero balance variance:\n"
            f"1. **Leg 1: Core Banking (CBS Finacle):** Verifies customer debit/credit entry and GL clearing leg.\n"
            f"2. **Leg 2: SFMS Payment Application (Switch):** Verifies ISO 20022 message dispatch (`pacs.008`) and network ACK.\n"
            f"3. **Leg 3: RBI e-Kuber Central Bank Statement:** Verifies central clearing voucher settlement and intraday float.\n\n"
            f"When all 3 agree with zero variance, transactions are closed as **`MATCHED_STP`**."
        )
        return {"status": "SUCCESS", "matched": True, "query": query_text, "timestamp": now_str, "summary": summary}

    # 10. DEFAULT INTELLIGENT GUIDANCE
    return {
        "status": "SUCCESS",
        "matched": False,
        "channel": channel,
        "query": query_text,
        "timestamp": now_str,
        "summary": (
            f"I am your **Payments & Reconciliation Copilot**. Ask me anything about reconciliation, transactions, or settlement:\n\n"
            f"- **Auto-Refunds & Reversals:** `give list of auto refunded` or `show customer reversals`\n"
            f"- **Matched Records:** `give list of matched records` or `show settled transactions`\n"
            f"- **Exceptions & Breaks:** `show open breaks` or `what are the P1 exceptions`\n"
            f"- **Recon Overview:** `what is the recon status` or `show recon summary`\n"
            f"- **Investigate UTR:** `Status of UTR RBIR20261116000101` or `Investigate UTR RBIR20261116000104`\n"
            f"- **Liquidity & Float:** `Check RBI e-Kuber balance & liquidity`\n"
            f"- **In-Flight Queues:** `Show pending RTGS queue`\n"
            f"- **Maker-Checker:** `Show pending approvals`\n"
            f"- **Download Reports:** `Download Excel files` or `File registry`"
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
