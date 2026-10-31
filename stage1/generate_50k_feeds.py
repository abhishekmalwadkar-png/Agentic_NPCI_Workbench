"""
NPCI Unified Operations Workbench - 50K Record Generator
Generates exactly 50,000 correlated records across all 4 UPI reconciliation feeds:
1. NPCI_UPI_Settlement_Master.csv (50,000 rows)
2. Switch_Base24_Logs.csv (50,000 rows)
3. Finacle_CBS_Dump.csv (50,000 rows)
4. GL_Suspense_Pool.csv (50,000 rows)

Preserves the original 5 demo rows at index 1-5 for repeatable UI/HITL demonstrations,
and correlates ~95.2% straight-through matched records and realistic breaks.
"""

import csv
import shutil
from pathlib import Path

STAGE1_DIR = Path(__file__).resolve().parent
SOURCE_PATH = STAGE1_DIR.parent / "NPCI_UPI_Settlement_TestData_50K.csv"
TARGET_TOTAL = 50000

base_npci = [
    {"RRN": "901818109561", "TXN_ID": "TXN000000001", "UTR": "UTR90181810956101", "RAIL": "UPI", "CYCLE_ID": "UPI-20261029-CY01", "TXN_DATETIME": "2026-10-29 09:15:22", "NPCI_AMOUNT": "840.04", "NPCI_STATUS": "SUCCESS"},
    {"RRN": "901818109562", "TXN_ID": "TXN000000002", "UTR": "UTR90181810956202", "RAIL": "UPI", "CYCLE_ID": "UPI-20261029-CY01", "TXN_DATETIME": "2026-10-29 09:18:45", "NPCI_AMOUNT": "2500.00", "NPCI_STATUS": "FAILURE"},
    {"RRN": "901818109563", "TXN_ID": "TXN000000003", "UTR": "UTR90181810956303", "RAIL": "UPI", "CYCLE_ID": "UPI-20261029-CY01", "TXN_DATETIME": "2026-10-29 09:22:10", "NPCI_AMOUNT": "1450.00", "NPCI_STATUS": "SUCCESS"},
    {"RRN": "901818109564", "TXN_ID": "TXN000000004", "UTR": "UTR90181810956404", "RAIL": "UPI", "CYCLE_ID": "UPI-20261029-CY01", "TXN_DATETIME": "2026-10-29 09:26:00", "NPCI_AMOUNT": "500.00", "NPCI_STATUS": "SUCCESS"},
    {"RRN": "901818109565", "TXN_ID": "TXN000000005", "UTR": "UTR90181810956505", "RAIL": "UPI", "CYCLE_ID": "UPI-20261029-CY01", "TXN_DATETIME": "2026-10-29 09:29:15", "NPCI_AMOUNT": "3200.00", "NPCI_STATUS": "SUCCESS"}
]

base_switch = [
    {"RRN": "901818109561", "SWITCH_STATUS": "AUTHORIZED", "SWITCH_RESP_CODE": "00"},
    {"RRN": "901818109562", "SWITCH_STATUS": "DECLINED", "SWITCH_RESP_CODE": "91"},
    {"RRN": "901818109563", "SWITCH_STATUS": "AUTHORIZED", "SWITCH_RESP_CODE": "00"},
    {"RRN": "901818109564", "SWITCH_STATUS": "AUTHORIZED", "SWITCH_RESP_CODE": "00"},
    {"RRN": "901818109565", "SWITCH_STATUS": "AUTHORIZED", "SWITCH_RESP_CODE": "00"}
]

base_cbs = [
    {"RRN": "901818109561", "CBS_AMOUNT": "840.04", "CBS_STATUS": "DEBITED", "ACCOUNT_NO": "100982348123"},
    {"RRN": "901818109562", "CBS_AMOUNT": "2500.00", "CBS_STATUS": "DEBITED", "ACCOUNT_NO": "100982349945"},
    {"RRN": "901818109563", "CBS_AMOUNT": "0.00", "CBS_STATUS": "FAILED", "ACCOUNT_NO": "100982341209"},
    {"RRN": "901818109564", "CBS_AMOUNT": "550.00", "CBS_STATUS": "DEBITED", "ACCOUNT_NO": "100982343388"},
    {"RRN": "901818109565", "CBS_AMOUNT": "3200.00", "CBS_STATUS": "PENDING", "ACCOUNT_NO": "100982347712"}
]

base_gl = [
    {"RRN": "901818109561", "GL_AMOUNT": "840.04", "GL_STATUS": "POSTED"},
    {"RRN": "901818109562", "GL_AMOUNT": "2500.00", "GL_STATUS": "UNBALANCED"},
    {"RRN": "901818109563", "GL_AMOUNT": "0.00", "GL_STATUS": "UNBALANCED"},
    {"RRN": "901818109564", "GL_AMOUNT": "500.00", "GL_STATUS": "UNBALANCED"},
    {"RRN": "901818109565", "GL_AMOUNT": "0.00", "GL_STATUS": "PENDING"}
]


def generate(target_break_count: int = 25):
    all_npci = list(base_npci)
    all_switch = list(base_switch)
    all_cbs = list(base_cbs)
    all_gl = list(base_gl)

    existing_rrns = {b["RRN"] for b in base_npci}
    # Base list already has 4 breaks (rows 2, 3, 4, 5)
    allowed_additional_breaks = max(0, target_break_count - 4)
    additional_breaks_added = 0

    with open(SOURCE_PATH, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for r in reader:
            if len(all_npci) >= TARGET_TOTAL:
                break
            rrn = r["RRN"]
            if rrn in existing_rrns:
                continue
            existing_rrns.add(rrn)

            raw_recon_st = (r.get("RECON_STATUS") or "").strip().upper()
            is_break_candidate = (raw_recon_st != "MATCHED")

            # Only allow up to target_break_count total breaks, make all others STP matched
            if is_break_candidate and additional_breaks_added < allowed_additional_breaks:
                is_matched = False
                additional_breaks_added += 1
            else:
                is_matched = True

            npci_amt = r.get("NPCI_AMOUNT") or "1000.00"
            try:
                amt_val = float(npci_amt)
            except Exception:
                amt_val = 1000.00

            if is_matched:
                cbs_amt = f"{amt_val:.2f}"
                gl_amt = f"{amt_val:.2f}"
                npci_status = "SUCCESS"
                switch_status = "AUTHORIZED"
                resp_code = "00"
                cbs_status = "DEBITED"
                gl_status = "POSTED"
            else:
                cbs_amt = r.get("CBS_AMOUNT") or f"{amt_val:.2f}"
                gl_amt = r.get("GL_AMOUNT") or f"{amt_val:.2f}"
                npci_status = r.get("NPCI_STATUS") or "FAILURE"
                if npci_status in ["FAIL", "DEEMED_FAIL"]:
                    npci_status = "FAILURE"
                switch_status = r.get("SWITCH_STATUS") or "DECLINED"
                if switch_status in ["FAILED", "FAILURE"]:
                    switch_status = "DECLINED"
                resp_code = r.get("RESPONSE_CODE") or "91"
                if not resp_code.isdigit():
                    resp_code = "96"
                cbs_status = r.get("CBS_STATUS") or "DEBITED"
                if cbs_status == "NOT_DEBITED":
                    cbs_status = "FAILED"
                    cbs_amt = "0.00"
                gl_status = "PENDING" if cbs_status == "PENDING" else "UNBALANCED"

            utr = r.get("UTR") or f"UTR{rrn}01"
            cycle_id = r.get("CYCLE_ID") or "UPI-20261029-CY01"
            if not cycle_id.startswith("UPI"):
                cycle_id = f"UPI-20261029-{cycle_id[-4:]}"

            all_npci.append({
                "RRN": rrn,
                "TXN_ID": r.get("TXN_ID") or f"TXN{len(all_npci)+1:09d}",
                "UTR": utr,
                "RAIL": "UPI",
                "CYCLE_ID": cycle_id,
                "TXN_DATETIME": r.get("TXN_DATETIME") or "2026-10-29 10:00:00",
                "NPCI_AMOUNT": f"{amt_val:.2f}",
                "NPCI_STATUS": npci_status
            })

            all_switch.append({
                "RRN": rrn,
                "SWITCH_STATUS": switch_status,
                "SWITCH_RESP_CODE": resp_code
            })

            acct_no = f"100982{abs(hash(rrn)) % 900000 + 100000}"
            all_cbs.append({
                "RRN": rrn,
                "CBS_AMOUNT": cbs_amt,
                "CBS_STATUS": cbs_status,
                "ACCOUNT_NO": acct_no
            })

            all_gl.append({
                "RRN": rrn,
                "GL_AMOUNT": gl_amt,
                "GL_STATUS": gl_status
            })

    print(f"Generated {len(all_npci)} total records: {4 + additional_breaks_added} breaks, {len(all_npci) - (4 + additional_breaks_added)} matched STP.")

    def write_csv(path: Path, fieldnames, data):
        with open(path, "w", newline="", encoding="utf-8") as out:
            writer = csv.DictWriter(out, fieldnames=fieldnames, lineterminator="\n")
            writer.writeheader()
            writer.writerows(data)

    write_csv(STAGE1_DIR / "NPCI_UPI_Settlement_Master.csv", ["RRN", "TXN_ID", "UTR", "RAIL", "CYCLE_ID", "TXN_DATETIME", "NPCI_AMOUNT", "NPCI_STATUS"], all_npci)
    write_csv(STAGE1_DIR / "Switch_Base24_Logs.csv", ["RRN", "SWITCH_STATUS", "SWITCH_RESP_CODE"], all_switch)
    write_csv(STAGE1_DIR / "Finacle_CBS_Dump.csv", ["RRN", "CBS_AMOUNT", "CBS_STATUS", "ACCOUNT_NO"], all_cbs)
    write_csv(STAGE1_DIR / "GL_Suspense_Pool.csv", ["RRN", "GL_AMOUNT", "GL_STATUS"], all_gl)

    staging_vault = STAGE1_DIR / "staging_vault"
    staging_vault.mkdir(parents=True, exist_ok=True)
    for name in ["NPCI_UPI_Settlement_Master.csv", "Switch_Base24_Logs.csv", "Finacle_CBS_Dump.csv", "GL_Suspense_Pool.csv"]:
        shutil.copy2(STAGE1_DIR / name, staging_vault / name)


if __name__ == "__main__":
    generate()
