"""
NPCI Unified Operations Workbench – Stage 3
AI Break Investigation Agent
Autonomous Root Cause Analysis, RBI SLA Countdown Engine, & Evidence Dossier Generation
"""
import math
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from pathlib import Path
import sys

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent.parent
if str(WORKSPACE_ROOT) not in sys.path:
    sys.path.insert(0, str(WORKSPACE_ROOT))

from stage2.backend.recon_engine import get_breaks, get_recon_summary

# In-memory storage for AI Agent investigation results
AGENT_CACHE: Dict[str, Any] = {
    "status": "IDLE",
    "timestamp": None,
    "total_breaks_analyzed": 0,
    "p1_critical_count": 0,
    "p2_moderate_count": 0,
    "auto_resolvable_count": 0,
    "hitl_required_count": 0,
    "total_at_risk_amount": 0.0,
    "sla_urgency_breakdown": {
        "critical_under_4h": 0,
        "warning_4_to_12h": 0,
        "normal_above_12h": 0,
    },
    "root_cause_distribution": {},
    "recommended_actions_distribution": {},
    "dossiers": {}  # keyed by txn_id
}


def diagnose_break(b: Dict[str, Any]) -> Dict[str, Any]:
    """
    Simulates AI Diagnostic Agent analyzing raw logs and response codes to produce
    a root-cause analysis, RBI SLA timeline, and Evidence Dossier.
    """
    scenario = b.get("scenario", "UNKNOWN")
    cbs_amt = float(b.get("cbs_amount", 0) or 0)
    npci_amt = float(b.get("npci_amount", 0) or 0)
    priority = b.get("priority", "P2")
    resp_code = b.get("response_code", "91")

    # Dual-Track Policy:
    # 1. Under Rs 5,000 (Low-Value deemed failures / timeouts): Auto-approved STP refund via Finacle RPA bot
    # 2. Over Rs 10,000 (High-Value) OR Amount Mismatches / Duplicates: Escalate to Operations Manager Cockpit for 1-click maker-checker execution
    effective_amt = max(cbs_amt, npci_amt)
    if scenario in ("AMOUNT_MISMATCH", "DUPLICATE", "GL_UNBALANCED"):
        is_hitl = True
    elif effective_amt >= 10000.0:
        is_hitl = True
    elif effective_amt <= 5000.0:
        is_hitl = False
    else:
        is_hitl = (priority == "P1")

    # Root Cause Diagnostic Logic
    if scenario == "TIMEOUT":
        category = "CBS Timeout (15s Window Exceeded)"
        confidence = 98.5
        technical_finding = (
            f"Beneficiary CBS failed to respond within 15-second timeout window. "
            f"Remitter CBS debited {cbs_amt:,.2f} under account authorization. "
            f"NPCI marked transaction TIMEOUT (Code: {resp_code}). Money trapped in interbank settlement pool."
        )
        action = "AUTO_REFUND_CBS" if not is_hitl else "HITL_APPROVAL_REFUND"
        action_label = "Auto-Credit Customer Account via Finacle Bot" if not is_hitl else "Escalate to Ops Manager for High-Value Refund Approval"
        hours_elapsed = 18.5  # approaching T+1
        sla_hours_left = max(0.5, 24.0 - hours_elapsed)

    elif scenario == "DEEMED_FAIL":
        category = "Deemed Failure (NPCI Aborted Post-Debit)"
        confidence = 97.2
        technical_finding = (
            f"NPCI clearing engine aborted transaction settlement post-switch authorization. "
            f"Core Banking (CBS) completed customer debit of {cbs_amt:,.2f}. "
            f"Transaction marked 'Deemed Failed' by central switch. Reversal mandatory under RBI TAT."
        )
        action = "AUTO_REFUND_CBS" if not is_hitl else "HITL_APPROVAL_REFUND"
        action_label = "Trigger Reversal Bot to Credit Remitter" if not is_hitl else "Manager Sign-Off for High-Value Deemed Failure"
        hours_elapsed = 20.2
        sla_hours_left = max(0.5, 24.0 - hours_elapsed)

    elif scenario == "AMOUNT_MISMATCH":
        delta = round(cbs_amt - npci_amt, 2)
        category = f"Amount Discrepancy (Variance: ₹{delta:,.2f})"
        confidence = 99.1
        technical_finding = (
            f"Ledger mismatch: CBS debited ₹{cbs_amt:,.2f}, while NPCI cleared only ₹{npci_amt:,.2f}. "
            f"Delta of ₹{delta:,.2f} represents balance sheet variance. Likely causes: gateway truncation or merchant rounding error."
        )
        action = "HITL_APPROVAL_LEDGER_ADJUSTMENT"
        action_label = "Operations Manager Investigation & Suspense GL Rebalancing"
        hours_elapsed = 8.0
        sla_hours_left = 16.0

    elif scenario == "REVERSAL_MISSING":
        category = "Reversal Missing (T+1 SLA Stalled)"
        confidence = 96.8
        technical_finding = (
            f"Failed transaction previously flagged for auto-reversal, but refund was NOT executed "
            f"within T+1 window (Status: {b.get('reversal_status', 'NOT_TRIGGERED')}). Customer compensation clock active."
        )
        action = "FORCE_EXECUTE_REVERSAL"
        action_label = "Immediate Priority Reversal to Avert RBI ₹100/Day Fine"
        hours_elapsed = 23.0
        sla_hours_left = 1.0  # Critical!

    elif scenario == "DUPLICATE":
        category = "Duplicate Charge / RRN Collision"
        confidence = 99.4
        technical_finding = (
            f"Duplicate transaction detected with identical RRN {b.get('rrn')}. "
            f"Customer account debited twice for a single payment intent. Excess debit of ₹{cbs_amt:,.2f} must be reversed."
        )
        action = "HITL_APPROVAL_DUPLICATE_REVERSAL"
        action_label = "Verify Single Intent & Execute Secondary Debit Reversal"
        hours_elapsed = 11.5
        sla_hours_left = 12.5

    elif scenario == "BENEFICIARY_NOT_FOUND":
        category = "Beneficiary Account Invalid / Inactive"
        confidence = 95.0
        technical_finding = (
            f"Beneficiary bank rejected credit: account closed, inactive, or frozen. "
            f"NPCI debited remitter bank. Funds resting in suspense holding pool."
        )
        action = "AUTO_RETURN_REMITTER"
        action_label = "Auto-Return Funds to Remitter Account"
        hours_elapsed = 14.0
        sla_hours_left = 10.0

    else:
        category = f"Technical Break ({scenario})"
        confidence = 92.0
        technical_finding = f"Unclassified discrepancy in transaction {b.get('txn_id')}."
        action = "OPS_REVIEW"
        action_label = "Manual Operations Review"
        hours_elapsed = 12.0
        sla_hours_left = 12.0

    # Format SLA Countdown string
    hrs = int(sla_hours_left)
    mins = int((sla_hours_left - hrs) * 60)
    sla_time_str = f"{hrs}h {mins:02d}m"
    urgency = "CRITICAL" if sla_hours_left <= 4.0 else "WARNING" if sla_hours_left <= 12.0 else "NORMAL"

    dossier = {
        "dossier_id": f"DOS_{b.get('txn_id')}_{b.get('rrn')[-6:]}",
        "txn_id": b.get("txn_id"),
        "rrn": b.get("rrn"),
        "utr": b.get("utr"),
        "rail": b.get("rail"),
        "cycle_id": b.get("cycle_id"),
        "txn_datetime": b.get("txn_datetime"),
        "cbs_amount": cbs_amt,
        "npci_amount": npci_amt,
        "variance": b.get("variance", 0.0),
        "priority": priority,
        "scenario": scenario,
        "category": category,
        "confidence_score": confidence,
        "technical_finding": technical_finding,
        "recommended_action": action,
        "action_label": action_label,
        "is_hitl_required": is_hitl,
        "hours_elapsed": hours_elapsed,
        "sla_hours_left": sla_hours_left,
        "sla_countdown": sla_time_str,
        "sla_urgency": urgency,
        "rbi_penalty_exposure": "₹100 / Day after T+1 breach" if priority == "P1" else "N/A",
        "four_way_legs": {
            "npci": {"status": b.get("npci_status"), "amount": npci_amt},
            "switch": {"status": b.get("switch_status"), "amount": npci_amt},
            "cbs": {"status": b.get("cbs_status"), "amount": cbs_amt},
            "gl": {"status": "POSTED" if b.get("gl_amount", 0) > 0 else "UNBALANCED", "amount": b.get("gl_amount", 0)}
        }
    }

    return dossier


def run_ai_investigation() -> Dict[str, Any]:
    """
    Runs autonomous AI investigation over all Stage 2 breaks.
    Generates Evidence Dossiers and risk metrics.
    """
    global AGENT_CACHE

    breaks = get_breaks(limit=5000)
    if not breaks:
        # Trigger Stage 2 if no breaks loaded
        get_recon_summary()
        breaks = get_breaks(limit=5000)

    total_breaks = len(breaks)
    p1_count = 0
    p2_count = 0
    auto_res = 0
    hitl_req = 0
    total_risk = 0.0

    sla_urgency = {
        "critical_under_4h": 0,
        "warning_4_to_12h": 0,
        "normal_above_12h": 0,
    }
    root_cause_counts: Dict[str, int] = {}
    action_counts: Dict[str, int] = {}
    dossiers: Dict[str, Any] = {}

    for b in breaks:
        dossier = diagnose_break(b)
        tid = b.get("txn_id")
        dossiers[tid] = dossier

        if dossier["priority"] == "P1":
            p1_count += 1
            total_risk += max(dossier["cbs_amount"], dossier["npci_amount"])
        else:
            p2_count += 1

        if dossier["is_hitl_required"]:
            hitl_req += 1
        else:
            auto_res += 1

        urg = dossier["sla_urgency"]
        if urg == "CRITICAL":
            sla_urgency["critical_under_4h"] += 1
        elif urg == "WARNING":
            sla_urgency["warning_4_to_12h"] += 1
        else:
            sla_urgency["normal_above_12h"] += 1

        rc = dossier["category"]
        root_cause_counts[rc] = root_cause_counts.get(rc, 0) + 1

        act = dossier["action_label"]
        action_counts[act] = action_counts.get(act, 0) + 1

    AGENT_CACHE = {
        "status": "COMPLETED",
        "timestamp": datetime.now().isoformat(),
        "total_breaks_analyzed": total_breaks,
        "p1_critical_count": p1_count,
        "p2_moderate_count": p2_count,
        "auto_resolvable_count": auto_res,
        "hitl_required_count": hitl_req,
        "total_at_risk_amount": round(total_risk, 2),
        "sla_urgency_breakdown": sla_urgency,
        "root_cause_distribution": root_cause_counts,
        "recommended_actions_distribution": action_counts,
        "dossiers": dossiers,
        "dossier_list_sample": list(dossiers.values())[:150]  # Preview list for UI table
    }

    return AGENT_CACHE


def get_agent_summary() -> Dict[str, Any]:
    """Returns AI Investigation Agent summary metrics."""
    global AGENT_CACHE
    return AGENT_CACHE


def get_dossier_by_txn_id(txn_id: str) -> Optional[Dict[str, Any]]:
    """Returns the Evidence Dossier for a specific transaction."""
    global AGENT_CACHE
    return AGENT_CACHE["dossiers"].get(txn_id)


def reset_investigation_agent():
    """Resets AI investigation cache and dossier lists to idle state."""
    global AGENT_CACHE
    AGENT_CACHE = {
        "status": "IDLE",
        "timestamp": None,
        "total_breaks_analyzed": 0,
        "auto_resolvable_count": 0,
        "hitl_required_count": 0,
        "p1_count": 0,
        "p2_count": 0,
        "total_financial_exposure_inr": 0.0,
        "root_cause_breakdown": {},
        "action_breakdown": {},
        "sla_urgency_breakdown": {
            "critical_under_4h": 0,
            "moderate_4_12h": 0,
            "standard_over_12h": 0
        },
        "dossiers": {},
        "dossier_list_sample": []
    }
    return {"status": "SUCCESS", "message": "Investigation agent state reset"}
