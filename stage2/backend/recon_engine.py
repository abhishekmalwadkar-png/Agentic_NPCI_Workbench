"""
NPCI Unified Operations Workbench – Stage 2
4-Way Multi-Rail Reconciliation Engine
Performs 4-way matching across NPCI, Payment Switch, Core Banking (CBS), and General Ledger (GL).
"""
import csv
import os
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any, List

BASE_DIR = Path(__file__).resolve().parent.parent.parent
STAGING_DIR = BASE_DIR / "stage1" / "staging_vault"

# In-memory storage for latest recon execution
LAST_RECON_RUN: Dict[str, Any] = {
    "status": "IDLE",
    "run_id": None,
    "timestamp": None,
    "file_name": None,
    "total_records": 0,
    "matched_count": 0,
    "matched_amount": 0.0,
    "timing_count": 0,
    "timing_amount": 0.0,
    "break_count": 0,
    "break_amount": 0.0,
    "stp_rate": 0.0,
    "financials": {
        "total_npci_amount": 0.0,
        "total_cbs_amount": 0.0,
        "total_gl_amount": 0.0,
        "net_variance": 0.0,
    },
    "break_breakdown": {},
    "p1_count": 0,
    "p2_count": 0,
    "p1_financial_risk": 0.0,
    "breaks_sample": []
}

ALL_BREAKS_CACHE: List[Dict[str, Any]] = []
ALL_MATCHED_CACHE: List[Dict[str, Any]] = []


def find_latest_staged_file() -> Optional[Path]:
    """Finds the most recent validated file in Staging Vault."""
    if not STAGING_DIR.exists():
        return None
    files = list(STAGING_DIR.glob("*.csv")) + list(STAGING_DIR.glob("*.dat"))
    if not files:
        # Fallback to test data if vault is empty
        root_test_file = BASE_DIR / "NPCI_UPI_Settlement_TestData_50K.csv"
        if root_test_file.exists():
            return root_test_file
        return None
    # Sort by mtime descending
    files.sort(key=lambda f: f.stat().st_mtime, reverse=True)
    return files[0]


def run_4way_reconciliation(file_path: Optional[Path] = None) -> Dict[str, Any]:
    """
    Executes the 4-Way Reconciliation algorithm:
    Leg 1: NPCI Settlement
    Leg 2: Payment Switch Log
    Leg 3: Core Banking (CBS Finacle/Flexcube)
    Leg 4: General Ledger (GL Suspense Pool)
    """
    global LAST_RECON_RUN, ALL_BREAKS_CACHE, ALL_MATCHED_CACHE

    run_id = f"RECON_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

    # Priority 1: Check if Process Studio exported custom matched/unmatched records
    file_matched = load_matched_from_dir()
    file_breaks = load_unmatched_from_dir()
    if file_matched or file_breaks:
        ALL_MATCHED_CACHE = file_matched
        ALL_BREAKS_CACHE = file_breaks
        total_records = len(file_matched) + len(file_breaks)
        matched_records = len(file_matched)
        break_records = len(file_breaks)
        matched_amt = sum(m.get("npci_amount", 0) for m in file_matched)
        break_amt = sum(max(b.get("npci_amount", 0), b.get("cbs_amount", 0)) for b in file_breaks)
        total_npci = matched_amt + sum(b.get("npci_amount", 0) for b in file_breaks)
        total_cbs = matched_amt + sum(b.get("cbs_amount", 0) for b in file_breaks)
        total_gl = matched_amt + sum(b.get("gl_amount", 0) for b in file_breaks)
        p1_c = sum(1 for b in file_breaks if b.get("priority") == "P1")
        p2_c = sum(1 for b in file_breaks if b.get("priority") == "P2")
        p1_risk = sum(max(b.get("npci_amount", 0), b.get("cbs_amount", 0)) for b in file_breaks if b.get("priority") == "P1")
        b_breakdown = {}
        for b in file_breaks:
            sc = b.get("scenario") or "BREAK"
            b_breakdown[sc] = b_breakdown.get(sc, 0) + 1

        LAST_RECON_RUN = {
            "status": "COMPLETED",
            "run_id": run_id,
            "timestamp": datetime.now().isoformat(),
            "file_name": "Process_Studio_UPI_Recon.csv",
            "total_records": total_records,
            "matched_count": matched_records,
            "matched_amount": round(matched_amt, 2),
            "timing_count": 0,
            "timing_amount": 0.0,
            "break_count": break_records,
            "break_amount": round(break_amt, 2),
            "stp_rate": round(matched_records / total_records * 100, 2) if total_records > 0 else 0.0,
            "financials": {
                "total_npci_amount": round(total_npci, 2),
                "total_cbs_amount": round(total_cbs, 2),
                "total_gl_amount": round(total_gl, 2),
                "net_variance": round(total_cbs - total_npci, 2),
            },
            "break_breakdown": b_breakdown,
            "p1_count": p1_c,
            "p2_count": p2_c,
            "p1_financial_risk": round(p1_risk, 2),
            "breaks_sample": file_breaks
        }
        return LAST_RECON_RUN

    target_file = file_path or find_latest_staged_file()
    if not target_file or not target_file.exists():
        raise FileNotFoundError("No validated settlement file found in Staging Vault to reconcile!")

    run_id = f"RECON_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

    total_records = 0
    matched_records = 0
    timing_records = 0
    break_records = 0

    total_npci_amt = 0.0
    total_cbs_amt = 0.0
    total_gl_amt = 0.0

    matched_amt = 0.0
    timing_amt = 0.0
    break_amt = 0.0

    break_counts: Dict[str, int] = {}
    p1_count = 0
    p2_count = 0
    p1_financial_risk = 0.0

    breaks_list: List[Dict[str, Any]] = []
    matched_list: List[Dict[str, Any]] = []

    with open(target_file, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            total_records += 1

            npci_amt = float(row.get("NPCI_AMOUNT", 0) or 0)
            cbs_amt = float(row.get("CBS_AMOUNT", 0) or 0)
            gl_amt = float(row.get("GL_AMOUNT", 0) or 0)

            total_npci_amt += npci_amt
            total_cbs_amt += cbs_amt
            total_gl_amt += gl_amt

            npci_st = (row.get("NPCI_STATUS") or "").strip().upper()
            cbs_st = (row.get("CBS_STATUS") or "").strip().upper()
            switch_st = (row.get("SWITCH_STATUS") or "").strip().upper()
            recon_st = (row.get("RECON_STATUS") or "").strip().upper()
            scenario = (row.get("SCENARIO_TYPE") or "").strip()
            priority = (row.get("EXCEPTION_PRIORITY") or "").strip()

            # ── 4-Way Matching Rules ─────────────────────────
            # Rule 1: Matched / STP (Straight-Through Processing)
            # All 4 systems agree in status and financial amount
            is_matched = (
                (recon_st == "MATCHED" or scenario in ("SUCCESS", "")) and
                npci_st == "SUCCESS" and
                cbs_st in ("SUCCESS", "DEBITED") and
                switch_st in ("SUCCESS", "AUTHORIZED") and
                abs(npci_amt - cbs_amt) < 0.001 and
                abs(cbs_amt - gl_amt) < 0.001
            )

            if is_matched:
                matched_records += 1
                matched_amt += npci_amt
                if len(matched_list) < 200:
                    matched_list.append({
                        "txn_id": row.get("TXN_ID") or f"TXN_{row.get('RRN')}",
                        "rrn": row.get("RRN"),
                        "utr": row.get("UTR") or row.get("TXN_ID") or f"UTR_{row.get('RRN')}",
                        "rail": row.get("RAIL") or "UPI",
                        "cycle_id": row.get("CYCLE_ID") or "UPI-CY01",
                        "txn_datetime": row.get("TXN_DATETIME") or datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                        "npci_amount": npci_amt,
                        "cbs_amount": cbs_amt,
                        "gl_amount": gl_amt,
                        "variance": 0.0,
                        "npci_status": npci_st or "SUCCESS",
                        "cbs_status": cbs_st or "DEBITED",
                        "switch_status": switch_st or "AUTHORIZED",
                        "gl_status": "POSTED",
                        "response_code": "00",
                        "response_desc": "Transaction Successful (4-Way Matched)",
                        "scenario": "SUCCESS",
                        "priority": "STP",
                        "sla_breach_risk": "None",
                        "penalty_clock_started": "No",
                        "reversal_status": "N/A",
                        "notes": "4-Way Balanced: NPCI Central = Base24 Switch = Finacle CBS = GL Suspense Balanced"
                    })
            elif scenario == "TIMING_DIFFERENCE":
                timing_records += 1
                timing_amt += npci_amt
            else:
                # Rule 3: Genuine Recon Break / Exception
                break_records += 1
                break_amt += max(npci_amt, cbs_amt)
                break_counts[scenario] = break_counts.get(scenario, 0) + 1

                if priority == "P1":
                    p1_count += 1
                    p1_financial_risk += max(npci_amt, cbs_amt)
                elif priority == "P2":
                    p2_count += 1

                break_item = {
                    "txn_id": row.get("TXN_ID"),
                    "rrn": row.get("RRN"),
                    "utr": row.get("UTR"),
                    "rail": row.get("RAIL"),
                    "cycle_id": row.get("CYCLE_ID"),
                    "txn_datetime": row.get("TXN_DATETIME"),
                    "npci_amount": npci_amt,
                    "cbs_amount": cbs_amt,
                    "gl_amount": gl_amt,
                    "variance": round(cbs_amt - npci_amt, 2),
                    "npci_status": npci_st,
                    "cbs_status": cbs_st,
                    "switch_status": switch_st,
                    "response_code": row.get("RESPONSE_CODE"),
                    "response_desc": row.get("RESPONSE_DESCRIPTION"),
                    "scenario": scenario,
                    "priority": priority,
                    "sla_breach_risk": row.get("SLA_BREACH_RISK"),
                    "penalty_clock_started": row.get("PENALTY_CLOCK_STARTED"),
                    "reversal_status": row.get("REVERSAL_STATUS"),
                    "notes": row.get("NOTES")
                }
                breaks_list.append(break_item)

    stp_rate = round((matched_records / total_records * 100), 2) if total_records > 0 else 0.0
    net_variance = round(total_cbs_amt - total_npci_amt, 2)

    ALL_BREAKS_CACHE = breaks_list
    ALL_MATCHED_CACHE = matched_list

    LAST_RECON_RUN = {
        "status": "COMPLETED",
        "run_id": run_id,
        "timestamp": datetime.now().isoformat(),
        "file_name": target_file.name,
        "total_records": total_records,
        "matched_count": matched_records,
        "matched_amount": round(matched_amt, 2),
        "timing_count": timing_records,
        "timing_amount": round(timing_amt, 2),
        "break_count": break_records,
        "break_amount": round(break_amt, 2),
        "stp_rate": stp_rate,
        "financials": {
            "total_npci_amount": round(total_npci_amt, 2),
            "total_cbs_amount": round(total_cbs_amt, 2),
            "total_gl_amount": round(total_gl_amt, 2),
            "net_variance": net_variance,
        },
        "break_breakdown": break_counts,
        "p1_count": p1_count,
        "p2_count": p2_count,
        "p1_financial_risk": round(p1_financial_risk, 2),
        "breaks_sample": breaks_list[:100]  # First 100 for fast UI preview
    }

    return LAST_RECON_RUN


def get_recon_summary() -> Dict[str, Any]:
    """Returns current recon summary, dynamically updating from Matched & Unmatched directories."""
    global LAST_RECON_RUN, ALL_BREAKS_CACHE, ALL_MATCHED_CACHE

    file_matched = load_matched_from_dir()
    file_breaks = load_unmatched_from_dir()

    if file_matched or file_breaks:
        ALL_MATCHED_CACHE = file_matched
        ALL_BREAKS_CACHE = file_breaks
        total_records = len(file_matched) + len(file_breaks)
        matched_records = len(file_matched)
        break_records = len(file_breaks)
        matched_amt = sum(m.get("npci_amount", 0) for m in file_matched)
        break_amt = sum(max(b.get("npci_amount", 0), b.get("cbs_amount", 0)) for b in file_breaks)
        total_npci = matched_amt + sum(b.get("npci_amount", 0) for b in file_breaks)
        total_cbs = matched_amt + sum(b.get("cbs_amount", 0) for b in file_breaks)
        total_gl = matched_amt + sum(b.get("gl_amount", 0) for b in file_breaks)
        p1_c = sum(1 for b in file_breaks if b.get("priority") == "P1")
        p2_c = sum(1 for b in file_breaks if b.get("priority") == "P2")
        p1_risk = sum(max(b.get("npci_amount", 0), b.get("cbs_amount", 0)) for b in file_breaks if b.get("priority") == "P1")
        b_breakdown = {}
        for b in file_breaks:
            sc = b.get("scenario") or "BREAK"
            b_breakdown[sc] = b_breakdown.get(sc, 0) + 1

        matched_dir = BASE_DIR / "stage1" / "Matched_Records"
        unmatched_dir = BASE_DIR / "stage1" / "Unmatched_Records"
        matched_files = [f for f in matched_dir.iterdir() if f.is_file() and not f.name.startswith(".") and f.name != ".gitkeep"] if matched_dir.exists() else []
        unmatched_files = [f for f in unmatched_dir.iterdir() if f.is_file() and not f.name.startswith(".") and f.name != ".gitkeep"] if unmatched_dir.exists() else []
        matched_files_count = len(matched_files)
        unmatched_files_count = len(unmatched_files)

        LAST_RECON_RUN = {
            "status": "COMPLETED",
            "run_id": f"RECON_AUTO_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "timestamp": datetime.now().isoformat(),
            "file_name": f"{matched_files_count} Matched Batch File(s) / {unmatched_files_count} Unmatched Batch File(s)",
            "total_records": total_records,
            "matched_count": matched_records,
            "matched_amount": round(matched_amt, 2),
            "timing_count": 0,
            "timing_amount": 0.0,
            "break_count": break_records,
            "break_amount": round(break_amt, 2),
            "stp_rate": round(matched_records / total_records * 100, 2) if total_records > 0 else 0.0,
            "financials": {
                "total_npci_amount": round(total_npci, 2),
                "total_cbs_amount": round(total_cbs, 2),
                "total_gl_amount": round(total_gl, 2),
                "net_variance": round(total_cbs - total_npci, 2),
            },
            "break_breakdown": b_breakdown,
            "p1_count": p1_c,
            "p2_count": p2_c,
            "p1_financial_risk": round(p1_risk, 2),
            "breaks_sample": file_breaks
        }

    return LAST_RECON_RUN


def _parse_folder_records(dir_path: Path, is_matched: bool) -> List[Dict[str, Any]]:
    """Robustly reads all batch files (*.txt, *.csv, *.tsv, *.dat, *.xlsx, *.xls) from a directory."""
    records = []
    if not dir_path.exists():
        return records

    # Match all non-hidden, non-gitkeep files
    files = [
        f for f in dir_path.iterdir()
        if f.is_file() and not f.name.startswith(".") and f.name != ".gitkeep"
    ]
    # Sort files by modification time descending
    files.sort(key=lambda f: f.stat().st_mtime, reverse=True)

    seen_rrns = set()
    for f in files:
        try:
            raw_rows = []
            ext = f.suffix.lower()

            if ext in [".xlsx", ".xls"]:
                try:
                    with open(f, "rb") as bf:
                        magic = bf.read(4)
                    if magic == b"\xd0\xcf\x11\xe0":
                        import xlrd
                        book = xlrd.open_workbook(f)
                        sheet = book.sheet_by_index(0)
                        if sheet.nrows > 0:
                            header = [str(sheet.cell_value(0, c)).strip() for c in range(sheet.ncols)]
                            for r in range(1, sheet.nrows):
                                row_dict = {}
                                for c in range(sheet.ncols):
                                    val = sheet.cell_value(r, c)
                                    if isinstance(val, float) and val.is_integer():
                                        val = int(val)
                                    row_dict[header[c]] = str(val).strip()
                                raw_rows.append(row_dict)
                    else:
                        import pandas as pd
                        df = pd.read_excel(f)
                        for item in df.to_dict(orient="records"):
                            raw_rows.append({
                                str(k).strip(): str(v).strip()
                                for k, v in item.items()
                                if k is not None and str(v).strip().lower() not in ["nan", "nat", "none"]
                            })
                except Exception:
                    continue
            else:
                with open(f, "r", encoding="utf-8", errors="ignore") as fp:
                    lines = [line.strip() for line in fp if line.strip() and not line.startswith("===") and not line.startswith("---")]
                if not lines:
                    continue

                header = lines[0]
                delim = ";" if ";" in header else ("\t" if "\t" in header else ",")
                reader = csv.DictReader(lines, delimiter=delim)
                for r in reader:
                    raw_rows.append({str(k).strip(): str(v).strip() for k, v in r.items() if k is not None})

            for cleaned in raw_rows:
                rrn = cleaned.get("RRN") or cleaned.get("rrn") or cleaned.get("RRN_1") or cleaned.get("RRN_2") or ""
                # Skip invalid rows or repeated header lines
                if not rrn or rrn == "RRN" or not any(ch.isdigit() for ch in str(rrn)):
                    continue

                # Normalise RRN as clean digit string (handles float formatting like 901818109561.0 from excel)
                if isinstance(rrn, str) and "." in rrn:
                    try:
                        rrn = str(int(float(rrn)))
                    except Exception:
                        pass

                if rrn in seen_rrns:
                    continue
                seen_rrns.add(rrn)

                def _to_float(v, default=0.0):
                    if not v:
                        return default
                    try:
                        return float(str(v).replace(",", "").strip())
                    except Exception:
                        return default

                npci_amt = _to_float(cleaned.get("NPCI_AMOUNT") or cleaned.get("npci_amt") or cleaned.get("NPCI_AMT"))
                cbs_amt = _to_float(cleaned.get("CBS_AMOUNT") or cleaned.get("cbs_amt") or cleaned.get("CBS_AMT"))
                gl_amt = _to_float(cleaned.get("GL_AMOUNT") or cleaned.get("gl_amt") or cleaned.get("GL_AMT"))

                txn_id = cleaned.get("TXN_ID") or cleaned.get("txn_id") or f"TXN_{rrn}"
                utr = cleaned.get("UTR") or cleaned.get("utr") or txn_id
                rail = cleaned.get("RAIL") or cleaned.get("rail") or "UPI"
                cycle_id = cleaned.get("CYCLE_ID") or cleaned.get("cycle_id") or "UPI-CY01"
                txn_datetime = cleaned.get("TXN_DATETIME") or cleaned.get("txn_datetime") or datetime.now().strftime("%Y-%m-%d %H:%M:%S")

                npci_status = cleaned.get("NPCI_STATUS") or cleaned.get("npci_status") or ("SUCCESS" if is_matched else "FAILURE")
                cbs_status = cleaned.get("CBS_STATUS") or cleaned.get("cbs_status") or ("DEBITED" if is_matched else "PENDING")
                switch_status = cleaned.get("SWITCH_STATUS") or cleaned.get("switch_status") or ("AUTHORIZED" if is_matched else "DECLINED")
                gl_status = cleaned.get("GL_STATUS") or cleaned.get("gl_status") or ("POSTED" if is_matched else "UNBALANCED")
                resp_code = cleaned.get("SWITCH_RESP_CODE") or cleaned.get("switch_resp_code") or ("00" if is_matched else "91")

                scenario = cleaned.get("scenario") or ("SUCCESS" if is_matched else "CBS_DEBIT_NPCI_FAIL")
                priority = cleaned.get("priority") or ("STP" if is_matched else ("P1" if abs(cbs_amt - npci_amt) > 0 or scenario != "SUCCESS" else "P2"))
                variance = _to_float(cleaned.get("variance"), default=0.0 if is_matched else round(cbs_amt - npci_amt, 2))

                records.append({
                    "txn_id": txn_id,
                    "rrn": rrn,
                    "utr": utr,
                    "rail": rail,
                    "cycle_id": cycle_id,
                    "txn_datetime": txn_datetime,
                    "npci_amount": npci_amt,
                    "cbs_amount": cbs_amt,
                    "gl_amount": gl_amt,
                    "variance": variance,
                    "npci_status": npci_status,
                    "cbs_status": cbs_status,
                    "switch_status": switch_status,
                    "gl_status": gl_status,
                    "response_code": resp_code,
                    "response_desc": "Transaction Successful" if is_matched else ("Invalid Amount" if scenario == "AMOUNT_MISMATCH" else "Bank / switch timeout or deemed break"),
                    "status": "MATCHED" if is_matched else "BREAK",
                    "scenario": scenario,
                    "priority": priority,
                    "sla_breach_risk": "None" if is_matched else ("High" if priority == "P1" else "Medium"),
                    "penalty_clock_started": "No" if is_matched else (cleaned.get("sla_clock_started") or ("Yes" if priority == "P1" else "No")),
                    "reversal_status": "N/A" if is_matched else "PENDING_APPROVAL",
                    "source_file": f.name,
                    "notes": f"Batch File: {f.name} ({'Matched' if is_matched else f'Break: {scenario}'})"
                })
        except Exception:
            continue

    return records


def load_unmatched_from_dir() -> List[Dict[str, Any]]:
    """Loads unmatched break records from all files in stage1/Unmatched_Records."""
    unmatched_dir = BASE_DIR / "stage1" / "Unmatched_Records"
    return _parse_folder_records(unmatched_dir, is_matched=False)


def load_matched_from_dir() -> List[Dict[str, Any]]:
    """Loads matched records from all files in stage1/Matched_Records."""
    matched_dir = BASE_DIR / "stage1" / "Matched_Records"
    return _parse_folder_records(matched_dir, is_matched=True)


def get_breaks(priority: Optional[str] = None, scenario: Optional[str] = None, limit: int = 200) -> List[Dict[str, Any]]:
    """Returns filtered breaks list from all batch files."""
    global ALL_BREAKS_CACHE
    file_breaks = load_unmatched_from_dir()
    if file_breaks:
        ALL_BREAKS_CACHE = file_breaks
        res = file_breaks
    else:
        res = list(ALL_BREAKS_CACHE)

    if priority:
        res = [b for b in res if b.get("priority") == priority]
    if scenario:
        res = [b for b in res if b.get("scenario") == scenario]

    return res[:limit]


def get_matched(limit: int = 200) -> List[Dict[str, Any]]:
    """Returns matched records list from all batch files."""
    global ALL_MATCHED_CACHE
    file_records = load_matched_from_dir()
    if file_records:
        ALL_MATCHED_CACHE = file_records
        return file_records[:limit]
    return list(ALL_MATCHED_CACHE)[:limit]


def reset_recon_engine():
    """Resets recon cache and state to clean idle standby."""
    global LAST_RECON_RUN, ALL_BREAKS_CACHE, ALL_MATCHED_CACHE
    ALL_BREAKS_CACHE = []
    ALL_MATCHED_CACHE = []
    LAST_RECON_RUN = {
        "status": "IDLE",
        "run_id": None,
        "timestamp": None,
        "file_analyzed": None,
        "total_records": 0,
        "matched_count": 0,
        "break_count": 0,
        "stp_rate": 0.0,
        "four_way_totals": {
            "total_npci_amount": 0.0,
            "total_cbs_amount": 0.0,
            "total_gl_amount": 0.0,
            "net_variance": 0.0,
        },
        "break_breakdown": {},
        "p1_count": 0,
        "p2_count": 0,
        "p1_financial_risk": 0.0,
        "breaks_sample": []
    }
    return {"status": "SUCCESS", "message": "Recon engine state reset"}
