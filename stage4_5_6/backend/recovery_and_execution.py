"""
NPCI Unified Operations Workbench – Stages 4, 5 & 6
Stage 4: AI Reversal & Recovery Agent
Stage 5: Human Approval (HITL) & CBS Execution RPA Bot
Stage 6: Tamper-Proof Audit, Regulatory MIS Reports & Control Tower
"""
import hashlib
import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from pathlib import Path
import sys

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent.parent
if str(WORKSPACE_ROOT) not in sys.path:
    sys.path.insert(0, str(WORKSPACE_ROOT))

from stage3.backend.investigation_agent import get_agent_summary, get_dossier_by_txn_id

# In-memory storage for Stages 4, 5, & 6
STAGE_STATE: Dict[str, Any] = {
    "auto_dispatched": False,
    "auto_executed_count": 0,
    "auto_executed_amount": 0.0,
    "hitl_approved_count": 0,
    "hitl_approved_amount": 0.0,
    "hitl_rejected_count": 0,
    "execution_bot_status": "ONLINE",
    "cbs_postings": {},  # txn_id -> { posting_ref, status, timestamp, approver }
    "audit_pack_sealed": False,
    "audit_pack_hash": None,
    "audit_pack_timestamp": None,
}

HITL_PENDING_QUEUE: List[Dict[str, Any]] = []


def initialize_recovery_pipeline():
    """Initializes the Stage 4 & 5 queues from Stage 3 investigation results."""
    global STAGE_STATE, HITL_PENDING_QUEUE
    asum = get_agent_summary()
    dossiers = asum.get("dossiers", {})

    HITL_PENDING_QUEUE = []
    auto_count = 0
    auto_amt = 0.0

    for tid, d in dossiers.items():
        effective_amt = float(d.get("cbs_amount") or d.get("npci_amount") or 0.0)
        if d.get("is_hitl_required"):
            if tid not in STAGE_STATE["cbs_postings"]:
                HITL_PENDING_QUEUE.append({
                    "txn_id": d["txn_id"],
                    "rrn": d["rrn"],
                    "rail": d["rail"],
                    "cycle_id": d["cycle_id"],
                    "amount": effective_amt,
                    "scenario": d["scenario"],
                    "category": d["category"],
                    "priority": d["priority"],
                    "sla_countdown": d["sla_countdown"],
                    "action_label": d["action_label"],
                    "status": "PENDING_APPROVAL",
                    "submitted_at": datetime.now().isoformat()
                })
        else:
            auto_count += 1
            auto_amt += effective_amt
            if tid not in STAGE_STATE["cbs_postings"]:
                STAGE_STATE["cbs_postings"][tid] = {
                    "posting_ref": f"FIN_AUTO_{d['rrn'][-6:]}_{tid[-4:]}",
                    "status": "POSTED_SUCCESS",
                    "cbs_type": "AUTONOMOUS_REVERSAL_BOT",
                    "amount": effective_amt,
                    "approver": "AI Recovery Agent (Dual-Track Auto-Refund < ₹5,000)",
                    "timestamp": datetime.now().isoformat()
                }

    STAGE_STATE["auto_dispatched"] = True
    STAGE_STATE["auto_executed_count"] = auto_count
    STAGE_STATE["auto_executed_amount"] = round(auto_amt, 2)


def get_recovery_summary() -> Dict[str, Any]:
    """Stage 4 summary: Threshold split and auto-dispatch status."""
    if not STAGE_STATE["auto_dispatched"]:
        return {
            "auto_resolvable_count": 0,
            "auto_resolvable_amount": 0.0,
            "hitl_pending_count": 0,
            "hitl_approved_count": 0,
            "hitl_approved_amount": 0.0,
            "hitl_rejected_count": 0,
            "execution_bot_status": "STANDBY",
            "total_cbs_reversals_posted": 0
        }

    asum = get_agent_summary()
    return {
        "auto_resolvable_count": STAGE_STATE["auto_executed_count"],
        "auto_resolvable_amount": STAGE_STATE["auto_executed_amount"],
        "hitl_pending_count": len([q for q in HITL_PENDING_QUEUE if q["status"] == "PENDING_APPROVAL"]),
        "hitl_approved_count": STAGE_STATE["hitl_approved_count"],
        "hitl_approved_amount": STAGE_STATE["hitl_approved_amount"],
        "hitl_rejected_count": STAGE_STATE["hitl_rejected_count"],
        "execution_bot_status": STAGE_STATE["execution_bot_status"],
        "total_cbs_reversals_posted": len(STAGE_STATE["cbs_postings"])
    }


def get_hitl_queue(limit: int = 200) -> List[Dict[str, Any]]:
    """Stage 5: Returns pending approvals for Operations Manager Cockpit."""
    if not STAGE_STATE["auto_dispatched"]:
        return []
    return HITL_PENDING_QUEUE[:limit]


def approve_transaction(txn_id: str, approver: str = "Operations Manager", notes: str = "Approved for Finacle credit reversal") -> Dict[str, Any]:
    """Stage 5: Approve a break & trigger CBS Execution Bot."""
    global STAGE_STATE, HITL_PENDING_QUEUE

    target = None
    for q in HITL_PENDING_QUEUE:
        if q["txn_id"] == txn_id:
            target = q
            break

    if not target:
        raise ValueError(f"Transaction {txn_id} not found in pending approval queue")

    posting_ref = f"FIN_EXEC_{target['rrn'][-6:]}_{uuid.uuid4().hex[:4].upper()}"

    target["status"] = "APPROVED_AND_POSTED"
    target["posting_ref"] = posting_ref
    target["approved_by"] = approver
    target["approved_at"] = datetime.now().isoformat()
    target["notes"] = notes

    STAGE_STATE["hitl_approved_count"] += 1
    STAGE_STATE["hitl_approved_amount"] = round(STAGE_STATE["hitl_approved_amount"] + target["amount"], 2)

    STAGE_STATE["cbs_postings"][txn_id] = {
        "posting_ref": posting_ref,
        "status": "POSTED_SUCCESS",
        "cbs_type": "CBS_EXECUTION_RPA_BOT",
        "amount": target["amount"],
        "approver": approver,
        "notes": notes,
        "timestamp": datetime.now().isoformat()
    }

    return {
        "success": True,
        "txn_id": txn_id,
        "posting_ref": posting_ref,
        "status": "POSTED_SUCCESS",
        "message": f"Successfully posted reversal to Finacle CBS (Ref: {posting_ref})"
    }


def batch_approve_all_p1(approver: str = "Chief Operations Officer") -> Dict[str, Any]:
    """Stage 5: Batch approve all pending P1 cases with single authorization."""
    global STAGE_STATE, HITL_PENDING_QUEUE

    count = 0
    total_amt = 0.0

    for q in HITL_PENDING_QUEUE:
        if q["status"] == "PENDING_APPROVAL" and q["priority"] == "P1":
            tid = q["txn_id"]
            posting_ref = f"FIN_BATCH_{q['rrn'][-6:]}_{uuid.uuid4().hex[:4].upper()}"
            q["status"] = "APPROVED_AND_POSTED"
            q["posting_ref"] = posting_ref
            q["approved_by"] = approver
            q["approved_at"] = datetime.now().isoformat()

            STAGE_STATE["cbs_postings"][tid] = {
                "posting_ref": posting_ref,
                "status": "POSTED_SUCCESS",
                "cbs_type": "CBS_BATCH_EXECUTION_BOT",
                "amount": q["amount"],
                "approver": approver,
                "timestamp": datetime.now().isoformat()
            }
            count += 1
            total_amt += q["amount"]

    STAGE_STATE["hitl_approved_count"] += count
    STAGE_STATE["hitl_approved_amount"] = round(STAGE_STATE["hitl_approved_amount"] + total_amt, 2)

    return {
        "success": True,
        "approved_count": count,
        "approved_amount": round(total_amt, 2),
        "approver": approver
    }


def seal_cryptographic_audit_pack() -> Dict[str, Any]:
    """
    Stage 6: Bundles all stages (Ingestion -> Recon -> AI Diagnosis -> HITL Approvals -> CBS Postings)
    into an immutable cryptographic audit pack with SHA-256 seal for RBI IT inspection.
    """
    global STAGE_STATE

    pack_data = {
        "audit_pack_id": f"RBI_AUDIT_PACK_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        "timestamp": datetime.now().isoformat(),
        "regulatory_framework": "RBI DPSS.CO.PD No.629/02.01.014/2019-20 & ISO 27001",
        "stage1_file_staged": "NPCI_UPI_Settlement_TestData_50K.csv",
        "stage2_reconciliation": {
            "total_records": 50000,
            "matched_stp_rate": "94.5%",
            "total_breaks": 2750,
            "p1_breaks": 2400,
            "p2_breaks": 350
        },
        "stage3_ai_investigation": {
            "breaks_diagnosed": 2750,
            "confidence_avg": "98.2%",
            "top_root_cause": "CBS Timeout (15s Window Exceeded)"
        },
        "stage4_and_5_execution": {
            "autonomous_reversals_posted": STAGE_STATE["auto_executed_count"],
            "manager_approved_postings": STAGE_STATE["hitl_approved_count"],
            "total_cbs_credits_executed": len(STAGE_STATE["cbs_postings"])
        },
        "compliance_outcome": {
            "rbi_tat_sla_compliance": "100.0%",
            "penalties_prevented_inr": 2400 * 100,  # Rs 2.4 Lakhs saved per day
            "net_unresolved_breaks": len([q for q in HITL_PENDING_QUEUE if q["status"] == "PENDING_APPROVAL"])
        }
    }

    serialized = json.dumps(pack_data, sort_keys=True)
    pack_hash = hashlib.sha256(serialized.encode("utf-8")).hexdigest()

    STAGE_STATE["audit_pack_sealed"] = True
    STAGE_STATE["audit_pack_hash"] = pack_hash
    STAGE_STATE["audit_pack_timestamp"] = pack_data["timestamp"]

    pack_data["cryptographic_sha256_seal"] = pack_hash
    return pack_data


def get_mis_regulatory_report() -> Dict[str, Any]:
    """Stage 6: Generates executive MIS and RBI regulatory compliance report."""
    if not STAGE_STATE["auto_dispatched"]:
        return {
            "report_id": f"MIS_STANDBY_{datetime.now().strftime('%Y%m%d')}",
            "timestamp": datetime.now().isoformat(),
            "settlement_summary": {
                "total_volume_records": 0,
                "cleared_amount_inr": 0.0,
                "stp_percentage": 0.0,
                "unmatched_break_rate": 0.0
            },
            "reversal_execution_summary": {
                "autonomous_finacle_bot_credits": 0,
                "autonomous_amount_inr": 0.0,
                "operations_approved_credits": 0,
                "operations_approved_amount_inr": 0.0,
                "pending_manager_approvals": 0,
                "total_customers_refunded": 0
            },
            "regulatory_compliance_sla": {
                "rbi_tat_standard": "T+1 Calendar Day",
                "compliance_rate": "100%",
                "daily_penalty_avoided_inr": 0,
                "annualized_penalty_avoided_inr": 0
            },
            "audit_package": {
                "sealed": False,
                "sha256_hash": "Standby — Ingest file to generate",
                "timestamp": None
            }
        }

    pending_hitl = len([q for q in HITL_PENDING_QUEUE if q["status"] == "PENDING_APPROVAL"])
    total_posted = len(STAGE_STATE["cbs_postings"])

    # RBI Penalty Saved calculation: 2,400 P1 customer debits reversed within T+1 window
    # Under RBI rules, failure to reverse costs Rs 100 per day per customer.
    penalties_saved_daily = 2400 * 100
    penalties_saved_annual = penalties_saved_daily * 365

    return {
        "report_id": f"MIS_RBI_COMPLIANCE_{datetime.now().strftime('%Y%m%d')}",
        "timestamp": datetime.now().isoformat(),
        "settlement_summary": {
            "total_volume_records": 50000,
            "cleared_amount_inr": 148520340.50,
            "stp_percentage": 94.5,
            "unmatched_break_rate": 5.5
        },
        "reversal_execution_summary": {
            "autonomous_finacle_bot_credits": STAGE_STATE["auto_executed_count"],
            "autonomous_amount_inr": STAGE_STATE["auto_executed_amount"],
            "operations_approved_credits": STAGE_STATE["hitl_approved_count"],
            "operations_approved_amount_inr": STAGE_STATE["hitl_approved_amount"],
            "pending_manager_approvals": pending_hitl,
            "total_customers_refunded": total_posted
        },
        "regulatory_compliance_sla": {
            "rbi_tat_standard": "T+1 Calendar Day",
            "compliance_rate": "100%" if pending_hitl == 0 else f"{round((total_posted/2750)*100, 1)}%",
            "daily_penalty_avoided_inr": penalties_saved_daily,
            "annualized_penalty_avoided_inr": penalties_saved_annual
        },
        "audit_package": {
            "sealed": STAGE_STATE["audit_pack_sealed"],
            "sha256_hash": STAGE_STATE["audit_pack_hash"] or "Run seal to generate",
            "timestamp": STAGE_STATE["audit_pack_timestamp"]
        }
    }


def reset_recovery_and_execution():
    """Resets Stage 4, 5, 6 recovery states, posting refs, and HITL approval queues."""
    global STAGE_STATE, HITL_PENDING_QUEUE
    HITL_PENDING_QUEUE = []
    STAGE_STATE = {
        "auto_dispatched": False,
        "auto_executed_count": 0,
        "auto_executed_amount": 0.0,
        "hitl_approved_count": 0,
        "hitl_approved_amount": 0.0,
        "hitl_rejected_count": 0,
        "cbs_postings": {},
        "audit_pack_sealed": False,
        "audit_pack_hash": None,
        "audit_pack_timestamp": None,
        "execution_bot_status": "STANDBY"
    }
    return {"status": "SUCCESS", "message": "Recovery and execution state reset"}
