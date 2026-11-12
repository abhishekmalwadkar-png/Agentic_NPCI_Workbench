"""
NPCI Unified Operations Workbench - multi-rail Stage 2 / Stage 3 data for AePS, NETC and IMPS.

Reads the latest Matched / Unmatched batch produced by each rail's Process Studio 4-way recon
workflow, normalises the rows into the same record shape the UPI recon tables use, and runs a
rail-aware AI root-cause diagnosis (dual-track policy + RBI T+1 SLA) to build evidence dossiers.
UPI keeps using stage2.recon_engine / stage3.investigation_agent unchanged.
"""
import csv
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

BASE_DIR = Path(__file__).resolve().parent.parent.parent
STAGE1 = BASE_DIR / "stage1"

# rail -> (output folder, matched file prefix, unmatched file prefix, label)
RAIL_SOURCES: Dict[str, Tuple[Path, str, str, str]] = {
    "AEPS": (STAGE1 / "AEPS_reconn" / "Output", "Matched_AePS_Records_", "Unmatched_AePS_Records_", "AePS 4-Way (NPCI / UIDAI / Micro-ATM / GL-9904)"),
    "NETC": (STAGE1 / "NETC_reconn" / "Output", "Matched_NETC_Records_", "Unmatched_NETC_Records_", "NETC FASTag 4-Way (Plaza / Mapper / Wallet / GL-9908)"),
    "IMPS": (STAGE1 / "IMPS_Recon" / "Output", "Matched_Records_IMPS", "Unmatched_Records_IMPS", "IMPS 4-Way (NPCI / Base24 / Finacle / RTGS GL)"),
}
SUPPORTED_RAILS = set(RAIL_SOURCES)

_FILE_CACHE: Dict[str, Tuple[str, float, List[Dict[str, Any]]]] = {}
_AGENT_CACHE: Dict[str, Dict[str, Any]] = {}


# ----------------------------------------------------------------------------- file loading
def _latest(folder: Path, prefix: str) -> Optional[Path]:
    if not folder.exists():
        return None
    files = [f for f in folder.iterdir() if f.is_file() and f.name.startswith(prefix)
             and f.suffix.lower() in (".xlsx", ".xls", ".csv") and not f.name.startswith("~$")]
    return max(files, key=lambda f: f.stat().st_mtime) if files else None


def _read_rows(path: Path) -> List[Dict[str, str]]:
    key = str(path.resolve())
    mtime = path.stat().st_mtime
    hit = _FILE_CACHE.get(key)
    if hit and hit[1] == mtime:
        return hit[2]
    rows: List[Dict[str, str]] = []
    if path.suffix.lower() == ".csv":
        with open(path, "r", encoding="utf-8-sig", errors="ignore", newline="") as fp:
            for r in csv.DictReader(fp):
                rows.append({str(k).strip(): ("" if v is None else str(v).strip()) for k, v in r.items() if k})
    else:
        import openpyxl
        wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
        ws = wb.worksheets[0]
        it = ws.iter_rows(values_only=True)
        header = [str(h).strip() if h is not None else "" for h in next(it, [])]
        for vals in it:
            if vals is None or all(v is None for v in vals):
                continue
            r = {}
            for h, v in zip(header, vals):
                if not h:
                    continue
                if isinstance(v, float) and v.is_integer() and h.upper() in ("RRN", "TXN_ID", "AUTH_RESP_CODE", "TERMINAL_STATUS", "ACC_NO", "SWITCH_RESP_CODE"):
                    v = int(v)
                r[h] = "" if v is None else str(v).strip()
            rows.append(r)
        wb.close()
    _FILE_CACHE[key] = (path.name, mtime, rows)
    return rows


def _f(v: Any) -> float:
    try:
        return float(str(v).replace(",", "").strip()) if str(v).strip() not in ("", "None", "nan") else 0.0
    except ValueError:
        return 0.0


def _priority(severity: str, matched: bool) -> str:
    if matched:
        return "STP"
    return "P1" if str(severity).upper() in ("CRITICAL", "HIGH") else "P2"


# ----------------------------------------------------------------------------- normalisation (same keys as UPI records)
def _normalise(rail: str, r: Dict[str, str], matched: bool, source: str) -> Dict[str, Any]:
    cat = r.get("BREAK_CATEGORY") or ("MATCHED_STP" if matched else "BREAK")
    if rail == "AEPS":
        amt, gl = _f(r.get("AMOUNT")), _f(r.get("GL_AMOUNT"))
        rec = dict(txn_id=r.get("TXN_ID"), rrn=r.get("RRN"), utr=r.get("AADHAAR_REF") or r.get("TXN_ID"),
                   cycle_id=f"AEPS-{(r.get('TXN_DATE') or '').replace('-', '')}-CY01", txn_datetime=r.get("TXN_DATE"),
                   npci_amount=amt, cbs_amount=amt, gl_amount=gl, variance=_f(r.get("AMOUNT_VARIANCE")),
                   npci_status=r.get("STATUS"), switch_status=r.get("AUTH_STATUS"), cbs_status=r.get("DISPENSE_STATUS"),
                   gl_status=r.get("GL_STATUS"), response_code=r.get("TERMINAL_STATUS") or r.get("AUTH_RESP_CODE"),
                   leg_labels={"npci": "NPCI Settlement", "switch": "UIDAI Auth", "cbs": "Micro-ATM Dispense", "gl": "GL-9904 BC Float"},
                   rail_details={k: r.get(k) for k in ("AADHAAR_REF", "TERMINAL_ID", "BC_ID", "TERM_BC_ID", "AUTH_RESP_CODE", "TERMINAL_STATUS", "AGE_DAYS")})
    elif rail == "NETC":
        toll, amt, gl = _f(r.get("TOLL_AMOUNT")), _f(r.get("TXN_AMOUNT")) or _f(r.get("TOLL_AMOUNT")), _f(r.get("GL_AMOUNT"))
        rec = dict(txn_id=r.get("TXN_ID"), rrn=r.get("RRN"), utr=r.get("EPC"),
                   cycle_id=f"NETC-{(r.get('READER_TIMESTAMP') or '')[:10].replace('-', '')}-CY01", txn_datetime=(r.get("READER_TIMESTAMP") or "").replace("T", " "),
                   npci_amount=toll or amt, cbs_amount=amt, gl_amount=gl, variance=_f(r.get("AMOUNT_VARIANCE")),
                   npci_status=r.get("MAPPER_STATUS"), switch_status="READ" if r.get("PLAZA_ID") else "NO_READ", cbs_status=r.get("WALLET_DEBIT_STATUS"),
                   gl_status=r.get("SETTLEMENT_STATUS"), response_code=r.get("DOUBLE_READ_TYPE") or ("00" if matched else "-"),
                   leg_labels={"npci": "NPCI Mapper", "switch": "Plaza RFID Read", "cbs": "FASTag Wallet", "gl": "GL-9908 Toll Pool"},
                   rail_details={k: r.get(k) for k in ("EPC", "TAG_ID", "PLAZA_ID", "LANE_ID", "PREV_LANE_ID", "READ_GAP_SEC", "DOUBLE_READ_FLAG", "ACQUIRER_ID", "ACC_NO", "WALLET_BALANCE")})
    else:  # IMPS
        rec = dict(txn_id=r.get("TXN_ID"), rrn=r.get("RRN"), utr=r.get("UTR"), cycle_id=r.get("CYCLE_ID"), txn_datetime=r.get("TXN_DATETIME"),
                   npci_amount=_f(r.get("NPCI_AMOUNT")), cbs_amount=_f(r.get("CBS_AMOUNT")), gl_amount=_f(r.get("GL_AMOUNT")), variance=_f(r.get("VARIANCE")),
                   npci_status=r.get("NPCI_STATUS"), switch_status=r.get("SWITCH_STATUS"), cbs_status=r.get("CBS_STATUS"),
                   gl_status=r.get("GL_STATUS"), response_code=r.get("SWITCH_RESP_CODE"),
                   leg_labels={"npci": "NPCI Clearing", "switch": "Base24 Switch", "cbs": "Finacle CBS", "gl": "RTGS GL Pool"},
                   rail_details={k: r.get(k) for k in ("REMITTER_BANK", "BENEFICIARY_BANK", "REMITTER_ACC", "BENEFICIARY_ACC", "NETWORK_LATENCY_MS", "RBI_VOUCHER_NO")})
    prio = _priority(r.get("EXCEPTION_SEVERITY") or ("HIGH" if cat in ("RC91_TIMEOUT", "AMOUNT_MISMATCH", "DEEMED_FAILURE") else "MEDIUM"), matched)
    rec.update(
        rail=rail, scenario="SUCCESS" if matched else cat, priority=prio,
        status="MATCHED" if matched else "BREAK",
        response_desc="Transaction Successful" if matched else (r.get("BREAK_REASON") or cat),
        break_reason=r.get("BREAK_REASON"),
        sla_breach_risk="None" if matched else ("High" if prio == "P1" else "Medium"),
        penalty_clock_started="No" if matched else ("Yes" if prio == "P1" else "No"),
        reversal_status="N/A" if matched else "PENDING_APPROVAL",
        source_file=source, notes=f"{rail} batch file: {source}",
    )
    return rec


def _load(rail: str) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[str]]:
    folder, mp, up, _ = RAIL_SOURCES[rail]
    out_m, out_b, names = [], [], []
    for prefix, matched, sink in ((mp, True, out_m), (up, False, out_b)):
        f = _latest(folder, prefix)
        if not f:
            continue
        names.append(f.name)
        for r in _read_rows(f):
            if r.get("RRN"):
                sink.append(_normalise(rail, r, matched, f.name))
    return out_m, out_b, names


# ----------------------------------------------------------------------------- Stage 2
def rail_summary(rail: str) -> Dict[str, Any]:
    rail = rail.upper()
    matched, breaks, names = _load(rail)
    if not matched and not breaks:
        return {"status": "IDLE", "rail": rail, "total_records": 0, "matched_count": 0, "break_count": 0,
                "message": f"No {rail} recon output found in {RAIL_SOURCES[rail][0]}"}
    m_amt = sum(m["npci_amount"] for m in matched)
    b_amt = sum(max(b["npci_amount"], b["cbs_amount"]) for b in breaks)
    total = len(matched) + len(breaks)
    breakdown: Dict[str, int] = {}
    for b in breaks:
        breakdown[b["scenario"]] = breakdown.get(b["scenario"], 0) + 1
    p1 = [b for b in breaks if b["priority"] == "P1"]
    npci_t = m_amt + sum(b["npci_amount"] for b in breaks)
    cbs_t = m_amt + sum(b["cbs_amount"] for b in breaks)
    gl_t = m_amt + sum(b["gl_amount"] for b in breaks)
    return {
        "status": "COMPLETED", "rail": rail, "recon_label": RAIL_SOURCES[rail][3],
        "run_id": f"RECON_{rail}_{datetime.now():%Y%m%d_%H%M%S}", "timestamp": datetime.now().isoformat(),
        "file_name": " / ".join(names), "total_records": total,
        "matched_count": len(matched), "matched_amount": round(m_amt, 2),
        "timing_count": 0, "timing_amount": 0.0,
        "break_count": len(breaks), "break_amount": round(b_amt, 2),
        "stp_rate": round(len(matched) / total * 100, 2) if total else 0.0,
        "financials": {"total_npci_amount": round(npci_t, 2), "total_cbs_amount": round(cbs_t, 2),
                       "total_gl_amount": round(gl_t, 2), "net_variance": round(cbs_t - npci_t, 2)},
        "break_breakdown": breakdown, "p1_count": len(p1), "p2_count": len(breaks) - len(p1),
        "p1_financial_risk": round(sum(max(b["npci_amount"], b["cbs_amount"]) for b in p1), 2),
        "breaks_sample": breaks[:50],
    }


def rail_breaks(rail: str, priority: Optional[str] = None, scenario: Optional[str] = None, limit: int = 200) -> List[Dict[str, Any]]:
    _, breaks, _ = _load(rail.upper())
    if priority:
        breaks = [b for b in breaks if b["priority"] == priority]
    if scenario:
        breaks = [b for b in breaks if b["scenario"] == scenario]
    return breaks[:limit]


def rail_matched(rail: str, limit: int = 200) -> List[Dict[str, Any]]:
    matched, _, _ = _load(rail.upper())
    return matched[:limit]


# ----------------------------------------------------------------------------- Stage 3: rail-aware AI root-cause
# category -> (root-cause title, confidence %, finding template, auto action label, HITL action label)
_RCA: Dict[str, Tuple[str, float, str, str, str]] = {
    "TERMINAL_TIMEOUT_91": ("Micro-ATM Issuer Timeout (RC 91)", 96.4, "Customer debited INR {amt:,.2f}; issuer/switch response timed out at terminal {term} so cash was not dispensed.", "Auto-Reversal via CBS Reversal Queue (< INR 5,000, within T+1)", "Escalate - terminal timeout outside auto-reversal policy"),
    "TERMINAL_TIMEOUT_96": ("Micro-ATM System Malfunction (RC 96)", 95.1, "Terminal {term} reported RC96 after debit of INR {amt:,.2f}; cassette not dispensed.", "Auto-Reversal via CBS Reversal Queue (< INR 5,000, within T+1)", "Escalate - RC96 outside auto-reversal policy / TAT"),
    "DISPENSE_FAILURE": ("Cash Dispense Hardware Fault", 93.0, "Journal shows dispense status {disp} for a SUCCESS settlement of INR {amt:,.2f}.", "Auto-Reversal via CBS Reversal Queue", "Manager sign-off - high-value dispense failure"),
    "BIOMETRIC_SPOOF_ALERT": ("UIDAI Biometric Tamper / Spoof Alert", 97.8, "UIDAI returned auth code {auth} (liveness / tamper) for Aadhaar {aad}. Possible spoofed fingerprint at BC {bc}.", "-", "Fraud review - freeze BC agent and hold reversal"),
    "BIOMETRIC_MISMATCH": ("Biometric Auth Failure vs Settlement", 88.5, "UIDAI auth failed (code {auth}) while NPCI settlement shows SUCCESS for INR {amt:,.2f}.", "Auto-Reversal (failed auth, customer debited)", "Ops review - auth failure with settlement success"),
    "GL_FLOAT_VARIANCE": ("BC Float GL-9904 Posting Variance", 90.2, "NPCI INR {amt:,.2f} vs GL-9904 INR {gl:,.2f} (variance {var:,.2f}) - probable manual float entry error.", "-", "Operations Manager investigation & BC float rebalancing"),
    "MULTI_ANTENNA_DOUBLE_DEBIT": ("Multi-Antenna Double Toll Read", 96.9, "EPC {epc} re-read at {plaza} lane {lane} {gap}s after lane {prev}; wallet debited twice INR {amt:,.2f}.", "Instant FASTag wallet refund within 5 minutes (< INR 1,000)", "Ops review - double toll at/above auto-refund limit"),
    "WALLET_DEBIT_NO_PLAZA_CLEARANCE": ("Wallet Debit Without Plaza Read", 84.0, "Wallet debited INR {amt:,.2f} for EPC {epc} with no plaza RFID read - possible cloned tag or mapper replay.", "-", "Issuer investigation - cloned tag / mapper replay"),
    "BLACKLISTED_TAG_PASSAGE": ("Blacklisted Tag Allowed Passage", 91.3, "Blacklisted EPC {epc} cleared plaza {plaza} and was debited INR {amt:,.2f} - stale tag-status cache.", "-", "Issuer review - blacklist enforcement breach"),
    "LOW_BALANCE_OVERDRAFT": ("Low-Balance Tag Overdraft", 89.0, "Wallet for EPC {epc} overdrawn to INR {bal} after toll of INR {amt:,.2f} under offline threshold.", "-", "Issuer review - overdraft recovery"),
    "CONCESSIONAIRE_FEE_DISPUTE": ("Concessionaire Fee / Vehicle-Class Dispute", 87.6, "Plaza toll INR {amt:,.2f} vs GL-9908 INR {gl:,.2f} (variance {var:,.2f}) - AVC class mismatch.", "-", "Concessionaire dispute desk - fee reconciliation"),
    "RC91_TIMEOUT": ("IMPS Switch Timeout (RC 91)", 97.0, "Base24 timed out (RC 91) after Finacle debited INR {cbs:,.2f}; beneficiary credit not confirmed.", "RC91 Auto-Return to Remitter via Finacle (< INR 50,000)", "Manager sign-off - high-value RC91 return"),
    "AMOUNT_MISMATCH": ("Amount Discrepancy", 99.0, "NPCI INR {amt:,.2f} vs CBS INR {cbs:,.2f} (variance {var:,.2f}).", "-", "Operations Manager investigation & suspense GL rebalancing"),
    "DEEMED_FAILURE": ("Deemed Failure (Debit Without Switch Success)", 95.5, "CBS debited INR {cbs:,.2f} but switch response code {rc} - transaction deemed failed under RBI TAT.", "Reversal to remitter under RBI TAT", "Manager sign-off - deemed failure"),
}


def _track(rail: str, b: Dict[str, Any]) -> str:
    cat, amt = b["scenario"], max(b["npci_amount"], b["cbs_amount"])
    var = abs(b.get("variance") or 0)
    d = b.get("rail_details") or {}
    if rail == "AEPS":
        age = _f(d.get("AGE_DAYS"))
        if cat == "BIOMETRIC_SPOOF_ALERT" or max(amt, var) > 10000:
            return "HITL"
        if cat in ("TERMINAL_TIMEOUT_91", "TERMINAL_TIMEOUT_96", "DISPENSE_FAILURE") and amt < 5000 and age <= 1:
            return "AUTO"
        return "OPS_REVIEW"
    if rail == "NETC":
        if cat == "MULTI_ANTENNA_DOUBLE_DEBIT" and amt < 1000:
            return "AUTO"
        if cat in ("BLACKLISTED_TAG_PASSAGE", "LOW_BALANCE_OVERDRAFT") or (cat == "CONCESSIONAIRE_FEE_DISPUTE" and max(amt, var) > 5000):
            return "HITL"
        return "OPS_REVIEW"
    # IMPS
    if cat == "RC91_TIMEOUT" and amt < 50000:
        return "AUTO"
    if amt >= 50000 or cat == "AMOUNT_MISMATCH":
        return "HITL"
    return "OPS_REVIEW"


def _sla(b: Dict[str, Any], rail: str, track: str) -> Tuple[float, float]:
    """Returns (hours_elapsed, hours_left) against RBI T+1 (NETC auto-refund: 5-minute SLA)."""
    raw = str(b.get("txn_datetime") or "").replace("T", " ")
    ts = None
    for text, fmt in ((raw[:19], "%Y-%m-%d %H:%M:%S"), (raw[:10], "%Y-%m-%d")):
        try:
            ts = datetime.strptime(text, fmt)
            break
        except ValueError:
            continue
    now = datetime.now()
    if ts is None:
        return 12.0, 12.0
    elapsed = max(0.0, (now - ts).total_seconds() / 3600)
    if rail == "NETC" and track == "AUTO":
        return elapsed, max(0.0, 5 / 60 - elapsed)
    deadline = datetime(ts.year, ts.month, ts.day) + timedelta(days=2)   # end of T+1
    return elapsed, max(0.0, (deadline - now).total_seconds() / 3600)


def diagnose_rail_break(rail: str, b: Dict[str, Any]) -> Dict[str, Any]:
    cat = b["scenario"]
    d = b.get("rail_details") or {}
    title, conf, tmpl, auto_lbl, hitl_lbl = _RCA.get(cat, (f"Technical Break ({cat})", 80.0, "{reason}", "Manual operations review", "Manual operations review"))
    try:
        finding = tmpl.format(amt=b["npci_amount"], cbs=b["cbs_amount"], gl=b["gl_amount"], var=b.get("variance") or 0,
                              term=d.get("TERMINAL_ID") or "-", disp=b.get("cbs_status") or "-", auth=d.get("AUTH_RESP_CODE") or "-",
                              aad=d.get("AADHAAR_REF") or "-", bc=d.get("BC_ID") or "-", epc=d.get("EPC") or "-", plaza=d.get("PLAZA_ID") or "-",
                              lane=b.get("rail_details", {}).get("LANE_ID") or "-", gap=d.get("READ_GAP_SEC") or "-", prev=d.get("PREV_LANE_ID") or "-",
                              bal=d.get("WALLET_BALANCE") or "-", rc=b.get("response_code") or "-", reason=b.get("break_reason") or cat)
    except (KeyError, ValueError):
        finding = b.get("break_reason") or cat
    track = _track(rail, b)
    is_hitl = track != "AUTO"
    elapsed, left = _sla(b, rail, track)
    hrs, mins = int(left), int((left - int(left)) * 60)
    urgency = "CRITICAL" if left <= 4 else ("WARNING" if left <= 12 else "NORMAL")
    action_label = auto_lbl if track == "AUTO" else (hitl_lbl if track == "HITL" else "Operations review queue (outside auto / HITL policy)")
    legs = b.get("leg_labels") or {}
    return {
        "dossier_id": f"DOS_{b['txn_id']}_{str(b['rrn'])[-6:]}",
        "txn_id": b["txn_id"], "rrn": b["rrn"], "utr": b.get("utr"), "rail": rail, "cycle_id": b.get("cycle_id"),
        "txn_datetime": b.get("txn_datetime"), "cbs_amount": b["cbs_amount"], "npci_amount": b["npci_amount"],
        "variance": b.get("variance") or 0.0, "priority": b["priority"], "scenario": cat, "category": title,
        "confidence_score": conf, "technical_finding": finding,
        "recommended_action": {"AUTO": "AUTO_REVERSAL", "HITL": "HITL_APPROVAL", "OPS_REVIEW": "OPS_REVIEW"}[track],
        "action_label": action_label, "is_hitl_required": is_hitl, "dual_track": track,
        "hours_elapsed": round(elapsed, 1), "sla_hours_left": round(left, 2),
        "sla_countdown": "BREACHED" if left <= 0 else f"{hrs}h {mins:02d}m", "sla_urgency": urgency,
        "rbi_penalty_exposure": "INR 100 / day after T+1 breach" if b["priority"] == "P1" else "N/A",
        "four_way_legs": {
            "npci": {"label": legs.get("npci"), "status": b.get("npci_status"), "amount": b["npci_amount"]},
            "switch": {"label": legs.get("switch"), "status": b.get("switch_status"), "amount": b["npci_amount"]},
            "cbs": {"label": legs.get("cbs"), "status": b.get("cbs_status"), "amount": b["cbs_amount"]},
            "gl": {"label": legs.get("gl"), "status": b.get("gl_status"), "amount": b["gl_amount"]},
        },
        "rail_evidence": d,
        "source_file": b.get("source_file"),
    }


def run_rail_investigation(rail: str) -> Dict[str, Any]:
    rail = rail.upper()
    breaks = rail_breaks(rail, limit=100000)
    dossiers: Dict[str, Any] = {}
    sla = {"critical_under_4h": 0, "warning_4_to_12h": 0, "normal_above_12h": 0}
    rc_counts: Dict[str, int] = {}
    act_counts: Dict[str, int] = {}
    p1 = auto = 0
    risk = 0.0
    for b in breaks:
        dz = diagnose_rail_break(rail, b)
        dossiers[dz["txn_id"]] = dz
        if dz["priority"] == "P1":
            p1 += 1
            risk += max(dz["cbs_amount"], dz["npci_amount"])
        auto += 0 if dz["is_hitl_required"] else 1
        sla[{"CRITICAL": "critical_under_4h", "WARNING": "warning_4_to_12h"}.get(dz["sla_urgency"], "normal_above_12h")] += 1
        rc_counts[dz["category"]] = rc_counts.get(dz["category"], 0) + 1
        act_counts[dz["action_label"]] = act_counts.get(dz["action_label"], 0) + 1
    res = {
        "status": "COMPLETED" if breaks else "IDLE", "rail": rail, "timestamp": datetime.now().isoformat(),
        "total_breaks_analyzed": len(breaks), "p1_critical_count": p1, "p2_moderate_count": len(breaks) - p1,
        "auto_resolvable_count": auto, "hitl_required_count": len(breaks) - auto,
        "total_at_risk_amount": round(risk, 2), "sla_urgency_breakdown": sla,
        "root_cause_distribution": rc_counts, "recommended_actions_distribution": act_counts,
        "dossiers": dossiers, "dossier_list_sample": list(dossiers.values())[:150],
    }
    _AGENT_CACHE[rail] = res
    return res


def rail_agent_summary(rail: str) -> Dict[str, Any]:
    rail = rail.upper()
    cached = _AGENT_CACHE.get(rail)
    # re-run when the recon output changed (new workflow batch) or nothing cached yet
    if not cached or {b["txn_id"] for b in rail_breaks(rail, limit=100000)} != set(cached["dossiers"]):
        return run_rail_investigation(rail)
    return cached


def rail_dossier(txn_id: str) -> Optional[Dict[str, Any]]:
    for rail in SUPPORTED_RAILS:
        cache = _AGENT_CACHE.get(rail) or {}
        if txn_id in cache.get("dossiers", {}):
            return cache["dossiers"][txn_id]
    return None


def rail_volumes() -> Dict[str, Dict[str, Any]]:
    out = {}
    for rail in SUPPORTED_RAILS:
        s = rail_summary(rail)
        if s["status"] == "COMPLETED":
            out[rail] = {"total": s["total_records"], "stp_rate": s["stp_rate"]}
    return out


def reset_rail_caches():
    _FILE_CACHE.clear()
    _AGENT_CACHE.clear()
