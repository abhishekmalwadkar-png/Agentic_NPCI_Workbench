"""
NPCI Unified Operations Workbench – File Registry Manager
Scans, stores, and serves all workflow execution output files (AutomationEdge Server & Process Studio),
with timestamps, DD-MM-YYYY date formatting, multi-rail categorisation, and direct Excel/CSV download.
"""
from __future__ import annotations

import csv
import hashlib
import json
import os
import re
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import openpyxl
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent.parent
STAGE1_DIR = WORKSPACE_ROOT / "stage1"

MATCHED_DIR = STAGE1_DIR / "Matched_Records"
UNMATCHED_DIR = STAGE1_DIR / "Unmatched_Records"
IMPS_OUTPUT_DIR = STAGE1_DIR / "IMPS_Recon" / "Output"
AEPS_OUTPUT_DIR = STAGE1_DIR / "AEPS_reconn" / "Output"
NETC_OUTPUT_DIR = STAGE1_DIR / "NETC_reconn" / "Output"
STAGING_DIR = STAGE1_DIR / "staging_vault"
WATCH_DIR = STAGE1_DIR / "watch_folder"
REJECTED_DIR = STAGE1_DIR / "rejected"

# Dynamic in-memory registry cache (populated from disk + runtime runs)
DYNAMIC_REGISTRY: List[Dict[str, Any]] = []


def _ensure_dirs() -> None:
    for d in [MATCHED_DIR, UNMATCHED_DIR, IMPS_OUTPUT_DIR, AEPS_OUTPUT_DIR, NETC_OUTPUT_DIR, STAGING_DIR]:
        d.mkdir(parents=True, exist_ok=True)


def _fmt_dmy(dt: datetime) -> str:
    return dt.strftime("%d-%m-%Y")


def _fmt_time(dt: datetime) -> str:
    return dt.strftime("%H:%M:%S")


def _detect_rail(filename: str, default: str = "UPI") -> str:
    fn = filename.upper()
    if "IMPS" in fn:
        return "IMPS"
    elif "AEPS" in fn:
        return "AEPS"
    elif "NETC" in fn or "FASTAG" in fn:
        return "NETC"
    elif "RTGS" in fn:
        return "RTGS"
    elif "NEFT" in fn:
        return "NEFT"
    elif "UPI" in fn:
        return "UPI"
    return default


def _detect_file_type(filename: str) -> str:
    fn = filename.upper()
    if "UNMATCHED" in fn or "VARIANCE" in fn or "EXCEPTION" in fn or "BREAK" in fn:
        return "Unmatched Exceptions"
    elif "MATCHED" in fn:
        return "Matched STP"
    elif "LEDGER" in fn or "KNOCKOFF" in fn or "KNOCK_OFF" in fn:
        return "Balanced Ledger"
    elif "FINACLE" in fn or "CBS" in fn or "REVERSAL" in fn or "ADJUSTMENT" in fn:
        return "CBS Adjustments"
    elif "MASTER" in fn or "FEED" in fn or "DUMP" in fn or "LOGS" in fn:
        return "Source Feed"
    elif "AUDIT" in fn or "DOSSIER" in fn:
        return "Audit Evidence"
    elif "LIQUIDITY" in fn or "E-KUBER" in fn:
        return "Liquidity Return"
    return "Settlement Batch"


def _detect_workflow_name(filename: str, rail: str) -> str:
    fn = filename.upper()
    if "LEDGER" in fn or "KNOCKOFF" in fn:
        return f"NPCI Demo {rail} GL-KnockOff"
    if "FINACLE" in fn or "REVERSAL" in fn:
        return f"NPCI Demo {rail}-CBS"
    if rail == "UPI":
        return "NPCI Demo UPI Reconn"
    elif rail == "IMPS":
        return "NPCI Demo IMPS 4 Way Recon"
    elif rail == "AEPS":
        return "NPCI Demo AePS 4 Way Recon"
    elif rail == "NETC":
        return "NPCI Demo NETC 4 Way Recon"
    elif rail == "NEFT":
        return "RBI NEFT 3-Way Settler"
    elif rail == "RTGS":
        return "RBI RTGS Liquidity Watcher"
    return f"NPCI {rail} AutomationEdge Workflow"


def _extract_date_from_filename(filename: str, mtime_dt: datetime) -> Tuple[datetime, str]:
    # Look for patterns like YYYYMMDD_HHMMSS or YYYY-MM-DD
    match = re.search(r"(\d{4})[-_]?(\d{2})[-_]?(\d{2})(?:[-_](\d{2})(\d{2})(\d{2}))?", filename)
    if match:
        try:
            y, m, d = int(match.group(1)), int(match.group(2)), int(match.group(3))
            if 2020 <= y <= 2035 and 1 <= m <= 12 and 1 <= d <= 31:
                if match.group(4) and match.group(5) and match.group(6):
                    h, mn, s = int(match.group(4)), int(match.group(5)), int(match.group(6))
                    dt = datetime(y, m, d, min(h, 23), min(mn, 59), min(s, 59))
                else:
                    dt = datetime(y, m, d, mtime_dt.hour, mtime_dt.minute, mtime_dt.second)
                return dt, _fmt_dmy(dt)
        except Exception:
            pass
    return mtime_dt, _fmt_dmy(mtime_dt)


def _inspect_file_metrics(file_path: Path) -> Tuple[int, int, int, int]:
    """
    Returns (records, exception_count, p1_count, stp_count)
    Fast estimate for large files; exact row count for small files.
    """
    ext = file_path.suffix.lower()
    fn = file_path.name.upper()
    is_matched = "MATCHED" in fn
    is_break = "UNMATCHED" in fn or "EXCEPTION" in fn

    if ext == ".csv":
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                # Count non-empty lines
                cnt = sum(1 for line in f if line.strip()) - 1
                cnt = max(0, cnt)
                if is_matched:
                    return cnt, 0, 0, cnt
                elif is_break:
                    p1 = max(1, int(cnt * 0.35))
                    return cnt, cnt, p1, 0
                return cnt, 0, 0, cnt
        except Exception:
            pass

    if ext in (".xlsx", ".xls"):
        try:
            wb = openpyxl.load_workbook(file_path, read_only=True, data_only=True)
            ws = wb.worksheets[0]
            cnt = max(0, ws.max_row - 1) if ws.max_row else 0
            wb.close()
            if is_matched:
                return cnt, 0, 0, cnt
            elif is_break:
                p1 = max(1, int(cnt * 0.35))
                return cnt, cnt, p1, 0
            return cnt, 0, 0, cnt
        except Exception:
            pass

    # Default heuristic based on file size
    size_kb = file_path.stat().st_size / 1024
    est_rows = max(10, int(size_kb * 8))
    if is_matched:
        return est_rows, 0, 0, est_rows
    elif is_break:
        return est_rows, est_rows, max(1, int(est_rows * 0.3)), 0
    return est_rows, 0, 0, est_rows


def _style_excel_sheet(ws: Any, title: str, headers: List[str], rows: List[List[Any]]) -> None:
    header_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    alt_fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
    border = Border(
        left=Side(style="thin", color="E2E8F0"),
        right=Side(style="thin", color="E2E8F0"),
        top=Side(style="thin", color="E2E8F0"),
        bottom=Side(style="thin", color="E2E8F0"),
    )

    ws.title = title[:30]
    ws.append(headers)

    for col_idx in range(1, len(headers) + 1):
        cell = ws.cell(row=1, column=col_idx)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

    for r_idx, row in enumerate(rows, start=2):
        ws.append(row)
        for c_idx in range(1, len(row) + 1):
            cell = ws.cell(row=r_idx, column=c_idx)
            cell.border = border
            if r_idx % 2 == 1:
                cell.fill = alt_fill

    for col in ws.columns:
        max_len = max(len(str(cell.value or "")) for cell in col)
        col_letter = openpyxl.utils.get_column_letter(col[0].column)
        ws.column_dimensions[col_letter].width = min(max(max_len + 4, 12), 40)


def seed_default_workflow_files_if_needed() -> None:
    """
    Ensures that default workflow execution files exist across rails so the
    File Registry view immediately presents clean, downloadable outputs.
    """
    _ensure_dirs()

    # 1. UPI Matched and Unmatched
    upi_m = MATCHED_DIR / "Matched_Records_UPI_20261113_150000.xlsx"
    upi_u = UNMATCHED_DIR / "Unmatched_Records_UPI_20261113_150000.xlsx"
    upi_gl = MATCHED_DIR / "Balanced_Ledger_UPI_20261113_150000.xlsx"
    upi_cbs = UNMATCHED_DIR / "Finacle_CBS_Reversals_UPI_20261113_150000.xlsx"

    if not upi_m.exists():
        wb = openpyxl.Workbook()
        ws = wb.active
        headers = ["TXN_ID", "RRN", "UTR", "RAIL", "CYCLE_ID", "NPCI_AMOUNT", "CBS_AMOUNT", "GL_AMOUNT", "NPCI_STATUS", "CBS_STATUS", "SWITCH_STATUS", "GL_STATUS", "RECON_STATUS", "RESPONSE_CODE", "TIMESTAMPS"]
        rows = [
            ["TXN000000001", "901818109561", "UTR90181810956101", "UPI", "UPI-20261113-CY01", 840.04, 840.04, 840.04, "SUCCESS", "DEBITED", "AUTHORIZED", "POSTED", "MATCHED", "00", "2026-11-13 14:15:22"],
            ["TXN000000006", "901818109566", "UTR90181810956606", "UPI", "UPI-20261113-CY01", 1500.00, 1500.00, 1500.00, "SUCCESS", "DEBITED", "AUTHORIZED", "POSTED", "MATCHED", "00", "2026-11-13 14:18:05"],
            ["TXN000000007", "901818109567", "UTR90181810956707", "UPI", "UPI-20261113-CY01", 420.50, 420.50, 420.50, "SUCCESS", "DEBITED", "AUTHORIZED", "POSTED", "MATCHED", "00", "2026-11-13 14:20:11"],
            ["TXN000000008", "901818109568", "UTR90181810956808", "UPI", "UPI-20261113-CY01", 12500.00, 12500.00, 12500.00, "SUCCESS", "DEBITED", "AUTHORIZED", "POSTED", "MATCHED", "00", "2026-11-13 14:22:45"],
            ["TXN000000009", "901818109569", "UTR90181810956909", "UPI", "UPI-20261113-CY01", 75.00, 75.00, 75.00, "SUCCESS", "DEBITED", "AUTHORIZED", "POSTED", "MATCHED", "00", "2026-11-13 14:25:30"],
        ]
        # Duplicate rows to represent typical batch size
        for i in range(10, 105):
            rrn = f"90181810{i:04d}"
            amt = round(50.0 + (i * 37.15) % 4500, 2)
            rows.append([f"TXN{i:09d}", rrn, f"UTR{rrn}01", "UPI", "UPI-20261113-CY01", amt, amt, amt, "SUCCESS", "DEBITED", "AUTHORIZED", "POSTED", "MATCHED", "00", f"2026-11-13 14:{i%60:02d}:10"])
        _style_excel_sheet(ws, "UPI Matched STP", headers, rows)
        wb.save(upi_m)

    if not upi_u.exists():
        wb = openpyxl.Workbook()
        ws = wb.active
        headers = ["TXN_ID", "RRN", "UTR", "RAIL", "CYCLE_ID", "NPCI_AMOUNT", "CBS_AMOUNT", "GL_AMOUNT", "SCENARIO", "PRIORITY", "ROOT_CAUSE", "SLA_BREACH_RISK", "REVERSAL_STATUS"]
        rows = [
            ["TXN000000002", "901818109562", "UTR90181810956202", "UPI", "UPI-20261113-CY01", 2500.00, 2500.00, 0.00, "RC91_SWITCH_TIMEOUT", "P1", "Switch network timeout - auto-refund triggered", "Critical (T+1 SLA)", "AUTO_REFUND_APPROVED"],
            ["TXN000000003", "901818109563", "UTR90181810956303", "UPI", "UPI-20261113-CY01", 1450.00, 0.00, 0.00, "CBS_DEBIT_FAILED", "P2", "Finacle host unresponsive; no customer debit", "Low", "CLOSED_NO_ACTION"],
            ["TXN000000004", "901818109564", "UTR90181810956404", "UPI", "UPI-20261113-CY01", 500.00, 550.00, 500.00, "AMOUNT_MISMATCH", "P1", "INR 50.00 variance between NPCI settlement and CBS debit", "High", "HITL_QUEUED"],
            ["TXN000000005", "901818109565", "UTR90181810956505", "UPI", "UPI-20261113-CY01", 3200.00, 3200.00, 0.00, "LATE_POSTING_PENDING", "P2", "Pending settlement leg in late night batch", "Medium", "MONITORING"],
        ]
        _style_excel_sheet(ws, "UPI Unmatched Breaks", headers, rows)
        wb.save(upi_u)

    if not upi_gl.exists():
        wb = openpyxl.Workbook()
        ws = wb.active
        headers = ["VOUCHER_ID", "CYCLE_ID", "VALUE_DATE", "DR_ACCOUNT", "CR_ACCOUNT", "AMOUNT_INR", "ZERO_DELTA_FLAG", "APPROVAL_LEVEL", "STATUS", "POSTED_AT"]
        rows = [
            ["JV-UPI-STP-20261113-9A1F", "UPI-20261113-CY01", "2026-11-13", "GL-14020 (UPI Settlement Pool)", "GL-11010 (Finacle Clearing Mirror)", 148900.54, "YES (ZERO_DELTA)", "SYSTEM_STP", "POSTED_BALANCED", "2026-11-13 15:00:12"],
            ["JV-UPI-STP-20261113-B4C2", "UPI-20261113-CY02", "2026-11-13", "GL-14020 (UPI Settlement Pool)", "GL-11010 (Finacle Clearing Mirror)", 98250.00, "YES (ZERO_DELTA)", "SYSTEM_STP", "POSTED_BALANCED", "2026-11-13 15:30:20"],
        ]
        _style_excel_sheet(ws, "Zero-Delta GL Knock-Off", headers, rows)
        wb.save(upi_gl)

    if not upi_cbs.exists():
        wb = openpyxl.Workbook()
        ws = wb.active
        headers = ["INSTRUCTION_ID", "RRN", "ACCOUNT_NO", "AMOUNT_INR", "FINACLE_TRAN_ID", "REASON", "POSTED_STATUS", "TIMESTAMP"]
        rows = [
            ["INST-UPI-REV-001", "901818109562", "100982349945", 2500.00, "FT261113009182", "RC91 switch timeout - auto-refund to remitter", "FINACLE_POSTED", "2026-11-13 15:05:00"],
            ["INST-UPI-REV-002", "901818109564", "100982343388", 50.00, "FT261113009199", "Amount mismatch credit adjustment", "PENDING_CHECKER", "2026-11-13 15:08:12"],
        ]
        _style_excel_sheet(ws, "Finacle CBS Reversals", headers, rows)
        wb.save(upi_cbs)

    # 2. NEFT & RTGS sample reports
    neft_file = MATCHED_DIR / "RBI_NEFT_Settlement_Batch_20261113.xlsx"
    rtgs_file = MATCHED_DIR / "RBI_RTGS_Liquidity_Report_20261113.xlsx"

    if not neft_file.exists():
        wb = openpyxl.Workbook()
        ws = wb.active
        headers = ["BATCH_ID", "UTR", "VALUE_DATE", "FINACLE_CBS_STATUS", "SFMS_SWITCH_STATUS", "RBI_EKUBER_STATUS", "AMOUNT_INR", "RECON_STATUS", "SETTLEMENT_TIME"]
        rows = [
            ["NEFT-B14-20261113", "NEFT261113000101", "2026-11-13", "DEBITED", "DISPATCHED_ACK", "SETTLED_CONFIRMED", 450000.00, "MATCHED_STP", "2026-11-13 14:00:00"],
            ["NEFT-B14-20261113", "NEFT261113000102", "2026-11-13", "DEBITED", "DISPATCHED_ACK", "SETTLED_CONFIRMED", 1250000.00, "MATCHED_STP", "2026-11-13 14:00:00"],
            ["NEFT-B14-20261113", "NEFT261113000103", "2026-11-13", "RETURN_PENDING", "RETURN_DISPATCHED", "SETTLED_RETURN", 850000.00, "INWARD_RETURN_BREAK", "2026-11-13 14:15:00"],
        ]
        _style_excel_sheet(ws, "NEFT 3-Way Batch", headers, rows)
        wb.save(neft_file)

    if not rtgs_file.exists():
        wb = openpyxl.Workbook()
        ws = wb.active
        headers = ["UTR", "TRAN_TYPE", "TIME_STAMP", "AMOUNT_INR", "CBS_STATUS", "SFMS_PAC008_STATUS", "EKUBER_VOUCHER", "LIQUIDITY_FLOAT_INR", "DIAGNOSIS"]
        rows = [
            ["RBIR20261113000101", "OUTWARD_RTGS", "2026-11-13 14:10:00", 25000000.00, "DEBITED", "ACK_RECEIVED", "VCH-EK-998231", 1450000000.00, "3-Way Settled Cleanly"],
            ["RBIR20261113000104", "OUTWARD_RTGS", "2026-11-13 14:35:00", 14500000.00, "DEBITED", "TIMEOUT_NACK", "NOT_SETTLED", 1450000000.00, "SFMS Timeout Deemed Failure - Customer Reversal Required"],
        ]
        _style_excel_sheet(ws, "RTGS Liquidity Statement", headers, rows)
        wb.save(rtgs_file)


def scan_all_workflow_files() -> List[Dict[str, Any]]:
    """
    Scans physical directories and returns all workflow execution files.
    """
    _ensure_dirs()
    seed_default_workflow_files_if_needed()

    files: List[Dict[str, Any]] = []
    seen_paths = set()

    scan_targets = [
        (MATCHED_DIR, "UPI", "NPCI Demo UPI Reconn"),
        (UNMATCHED_DIR, "UPI", "NPCI Demo UPI Reconn"),
        (IMPS_OUTPUT_DIR, "IMPS", "NPCI Demo IMPS 4 Way Recon"),
        (AEPS_OUTPUT_DIR, "AEPS", "NPCI Demo AePS 4 Way Recon"),
        (NETC_OUTPUT_DIR, "NETC", "NPCI Demo NETC 4 Way Recon"),
        (STAGING_DIR, "UPI", "NPCI Staging Vault Feed"),
    ]

    for dir_path, default_rail, default_wf in scan_targets:
        if not dir_path.exists():
            continue
        for p in sorted(dir_path.iterdir(), key=lambda f: f.stat().st_mtime, reverse=True):
            if not p.is_file() or p.name.startswith(".") or p.name == ".gitkeep":
                continue
            if str(p.resolve()) in seen_paths:
                continue
            seen_paths.add(str(p.resolve()))

            st = p.stat()
            size_kb = round(st.st_size / 1024, 1)
            mtime_dt = datetime.fromtimestamp(st.st_mtime)

            rail = _detect_rail(p.name, default_rail)
            file_type = _detect_file_type(p.name)
            wf_name = _detect_workflow_name(p.name, rail)
            event_dt, date_dmy = _extract_date_from_filename(p.name, mtime_dt)

            records, exceptions, p1, stp = _inspect_file_metrics(p)
            stp_rate = round((stp / records * 100), 1) if records > 0 else 100.0

            file_id = f"{rail}-{hashlib.md5(p.name.encode('utf-8')).hexdigest()[:8].upper()}"

            files.append({
                "file_id": file_id,
                "filename": p.name,
                "path": str(p.resolve()),
                "workflow_name": wf_name,
                "rail": rail,
                "rail_counts": {rail: records},
                "file_type": file_type,
                "records": records,
                "exception_count": exceptions,
                "p1_count": p1,
                "stp_count": stp,
                "stp_rate": stp_rate,
                "size_kb": size_kb,
                "status": "COMPLETED",
                "received_at": event_dt.isoformat(),
                "date_dmy": date_dmy,
                "time_str": _fmt_time(event_dt),
                "download_url": f"/api/files/download/{file_id}",
                "mtime": st.st_mtime,
            })

    # Sort newest first
    files.sort(key=lambda x: x["mtime"], reverse=True)
    return files


def get_filtered_files(
    rail: Optional[str] = None,
    date_filter: Optional[str] = None,
    search: Optional[str] = None,
    file_type: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Applies rail, date (DD-MM-YYYY or YYYY-MM-DD), search, and file_type filters.
    """
    all_files = scan_all_workflow_files()

    # Normalise date filter if provided
    norm_date = None
    if date_filter:
        df = date_filter.strip()
        # If user passed YYYY-MM-DD (e.g. from <input type="date">)
        if re.match(r"^\d{4}-\d{2}-\d{2}$", df):
            parts = df.split("-")
            norm_date = f"{parts[2]}-{parts[1]}-{parts[0]}"  # convert to DD-MM-YYYY
        elif re.match(r"^\d{2}-\d{2}-\d{4}$", df):
            norm_date = df

    filtered = []
    for f in all_files:
        # 1. Rail filter
        if rail and rail.upper() not in ("ALL", ""):
            if f["rail"].upper() != rail.upper():
                continue

        # 2. Date filter (compares against DD-MM-YYYY)
        if norm_date:
            if f["date_dmy"] != norm_date:
                continue

        # 3. File type filter
        if file_type and file_type.upper() not in ("ALL", ""):
            if file_type.upper() not in f["file_type"].upper():
                continue

        # 4. Search filter
        if search and search.strip():
            q = search.strip().lower()
            if q not in f["filename"].lower() and q not in f["workflow_name"].lower() and q not in f["file_id"].lower():
                continue

        filtered.append(f)

    return filtered


def record_completed_workflow(
    workflow_name: str,
    rail: str,
    cycle_id: str,
    matched_count: int,
    break_count: int,
    p1_count: int = 0,
) -> Dict[str, Any]:
    """
    Called when an AutomationEdge Server or Process Studio workflow finishes.
    Creates or registers the output files with exact current timestamp.
    """
    _ensure_dirs()
    now = datetime.now()
    timestamp_str = now.strftime("%Y%m%d_%H%M%S")

    target_matched_dir = MATCHED_DIR
    target_unmatched_dir = UNMATCHED_DIR
    prefix_m = "Matched_Records"
    prefix_u = "Unmatched_Records"

    if rail == "IMPS":
        target_matched_dir = IMPS_OUTPUT_DIR
        target_unmatched_dir = IMPS_OUTPUT_DIR
        prefix_m = "Matched_Records_IMPS"
        prefix_u = "Unmatched_Records_IMPS"
    elif rail == "AEPS":
        target_matched_dir = AEPS_OUTPUT_DIR
        target_unmatched_dir = AEPS_OUTPUT_DIR
        prefix_m = "Matched_AePS_Records"
        prefix_u = "Unmatched_AePS_Records"
    elif rail == "NETC":
        target_matched_dir = NETC_OUTPUT_DIR
        target_unmatched_dir = NETC_OUTPUT_DIR
        prefix_m = "Matched_NETC_Records"
        prefix_u = "Unmatched_NETC_Records"

    # 1. Write Matched Records
    m_filename = f"{prefix_m}_{timestamp_str}.xlsx"
    m_path = target_matched_dir / m_filename
    wb_m = openpyxl.Workbook()
    ws_m = wb_m.active
    headers_m = ["TXN_ID", "RRN", "UTR", "RAIL", "CYCLE_ID", "AMOUNT", "NPCI_STATUS", "CBS_STATUS", "SWITCH_STATUS", "GL_STATUS", "RECON_STATUS", "PROCESSED_TIMESTAMP"]
    rows_m = [
        [f"TXN_{now.strftime('%H%M%S')}_{i:03d}", f"901818{i:06d}", f"UTR{now.strftime('%H%M%S')}{i:03d}", rail, cycle_id, round(100.0 + (i * 29.5) % 8000, 2), "SUCCESS", "DEBITED", "AUTHORIZED", "POSTED", "MATCHED", now.strftime("%Y-%m-%d %H:%M:%S")]
        for i in range(1, min(matched_count + 1, 51))
    ]
    _style_excel_sheet(ws_m, f"{rail} Matched STP", headers_m, rows_m)
    wb_m.save(m_path)

    # 2. Write Unmatched Records if any
    u_filename = None
    if break_count > 0:
        u_filename = f"{prefix_u}_{timestamp_str}.xlsx"
        u_path = target_unmatched_dir / u_filename
        wb_u = openpyxl.Workbook()
        ws_u = wb_u.active
        headers_u = ["TXN_ID", "RRN", "UTR", "RAIL", "CYCLE_ID", "AMOUNT", "SCENARIO", "PRIORITY", "ROOT_CAUSE", "SLA_BREACH_RISK", "REVERSAL_STATUS"]
        rows_u = [
            [f"TXN_BRK_{now.strftime('%H%M%S')}_{i:03d}", f"901818{i:06d}", f"UTR_BRK_{i:03d}", rail, cycle_id, round(250.0 + (i * 110.0) % 5000, 2), "SWITCH_TIMEOUT" if i % 2 == 1 else "AMOUNT_MISMATCH", "P1" if i <= p1_count else "P2", "Automated AI Root-Cause Diagnostic pending approval", "High (T+1 SLA)", "HITL_QUEUED"]
            for i in range(1, min(break_count + 1, 26))
        ]
        _style_excel_sheet(ws_u, f"{rail} Unmatched Breaks", headers_u, rows_u)
        wb_u.save(u_path)

    # 3. Write Balanced GL Ledger
    gl_filename = f"Balanced_Ledger_{rail}_{timestamp_str}.xlsx"
    gl_path = target_matched_dir / gl_filename
    wb_gl = openpyxl.Workbook()
    ws_gl = wb_gl.active
    headers_gl = ["VOUCHER_ID", "CYCLE_ID", "VALUE_DATE", "DR_ACCOUNT", "CR_ACCOUNT", "TOTAL_AMOUNT", "STATUS", "RECORDED_AT"]
    rows_gl = [
        [f"JV-{rail}-STP-{now.strftime('%Y%m%d-%H%M%S')}", cycle_id, now.strftime("%Y-%m-%d"), f"GL-14020 ({rail} Pool)", f"GL-11010 ({rail} Clearing)", round(matched_count * 850.50, 2), "ZERO_DELTA_BALANCED", now.isoformat()]
    ]
    _style_excel_sheet(ws_gl, f"{rail} Balanced Ledger", headers_gl, rows_gl)
    wb_gl.save(gl_path)

    return {
        "status": "SUCCESS",
        "rail": rail,
        "workflow_name": workflow_name,
        "matched_file": m_filename,
        "unmatched_file": u_filename,
        "gl_ledger_file": gl_filename,
        "timestamp": now.isoformat(),
        "date_dmy": _fmt_dmy(now),
    }


def find_file_for_download(file_id_or_name: str) -> Optional[Tuple[Path, str, str]]:
    """
    Finds the exact file on disk across all known directories.
    Returns (Path, download_filename, mime_type) or None.
    """
    clean_query = file_id_or_name.strip()

    search_dirs = [
        MATCHED_DIR,
        UNMATCHED_DIR,
        IMPS_OUTPUT_DIR,
        AEPS_OUTPUT_DIR,
        NETC_OUTPUT_DIR,
        STAGING_DIR,
        STAGE1_DIR,
        WATCH_DIR,
        REJECTED_DIR,
    ]

    # 1. Exact filename match
    for d in search_dirs:
        if not d.exists():
            continue
        target = d / clean_query
        if target.exists() and target.is_file():
            ext = target.suffix.lower()
            mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" if ext == ".xlsx" else ("text/csv" if ext == ".csv" else "application/octet-stream")
            return target, target.name, mime

    # 2. Match by file_id prefix or hash
    for d in search_dirs:
        if not d.exists():
            continue
        for f in d.iterdir():
            if not f.is_file() or f.name.startswith("."):
                continue
            # If query is in filename or hash matches
            if clean_query in f.name:
                ext = f.suffix.lower()
                mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" if ext == ".xlsx" else ("text/csv" if ext == ".csv" else "application/octet-stream")
                return f, f.name, mime
            # Check md5 hash prefix match
            f_hash = hashlib.md5(f.name.encode("utf-8")).hexdigest()[:8].upper()
            if clean_query.endswith(f_hash) or clean_query == f_hash:
                ext = f.suffix.lower()
                mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" if ext == ".xlsx" else ("text/csv" if ext == ".csv" else "application/octet-stream")
                return f, f.name, mime

    return None
