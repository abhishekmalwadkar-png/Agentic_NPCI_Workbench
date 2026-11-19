"""
NPCI Unified Operations Workbench - High-Speed 500,000 Unified Multi-Rail Generator
Generates exactly 500,000 correlated records across all 4 Unified 4-way reconciliation feeds:
1. NPCI_Unified_Settlement_Master.csv (500,000 rows)
2. Switch_Base24_Unified_Logs.csv (500,000 rows)
3. Finacle_CBS_Unified_Dump.csv (500,000 rows)
4. GL_Suspense_Unified_Pool.csv (500,000 rows)
"""

import csv
import random
import time
from datetime import datetime, timedelta
from pathlib import Path

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
INPUT_FILES_DIR = WORKSPACE_ROOT / "Input files"
STAGE1_DIR = WORKSPACE_ROOT / "stage1"

TOTAL_RECORDS = 500_000

BANKS = [
    ("HDFC", "HDFC0001234"),
    ("SBIN", "SBIN0005943"),
    ("ICIC", "ICIC0002143"),
    ("UTIB", "UTIB0003456"),
    ("KKBK", "KKBK0007890"),
    ("PUNB", "PUNB0123400"),
    ("BARB", "BARB0SAMPLE"),
    ("CNRB", "CNRB0014567"),
]

ACQUIRERS = ["ACQ-HDFC", "ACQ-ICICI", "ACQ-AXIS", "ACQ-SBI", "ACQ-KOTAK"]


def generate_unified_500k():
    t0 = time.time()
    random.seed(42)

    INPUT_FILES_DIR.mkdir(parents=True, exist_ok=True)
    STAGE1_DIR.mkdir(parents=True, exist_ok=True)

    target_npci = INPUT_FILES_DIR / "NPCI_Unified_Settlement_Master.csv"
    target_sw = INPUT_FILES_DIR / "Switch_Base24_Unified_Logs.csv"
    target_cbs = INPUT_FILES_DIR / "Finacle_CBS_Unified_Dump.csv"
    target_gl = INPUT_FILES_DIR / "GL_Suspense_Unified_Pool.csv"

    f_npci = open(target_npci, "w", newline="", encoding="utf-8")
    f_sw = open(target_sw, "w", newline="", encoding="utf-8")
    f_cbs = open(target_cbs, "w", newline="", encoding="utf-8")
    f_gl = open(target_gl, "w", newline="", encoding="utf-8")

    w_npci = csv.writer(f_npci, lineterminator="\n")
    w_sw = csv.writer(f_sw, lineterminator="\n")
    w_cbs = csv.writer(f_cbs, lineterminator="\n")
    w_gl = csv.writer(f_gl, lineterminator="\n")

    # Headers
    w_npci.writerow([
        "RAIL", "RRN", "TXN_ID", "UTR", "REMITTER_BANK", "BENEFICIARY_BANK",
        "CYCLE_ID", "TXN_DATETIME", "NPCI_AMOUNT", "NPCI_STATUS",
        "AADHAAR_REF", "TERMINAL_ID", "BC_ID", "EPC", "MAPPER_STATUS", "ACQUIRER_ID"
    ])
    w_sw.writerow(["RAIL", "RRN", "SWITCH_STATUS", "SWITCH_RESP_CODE", "NETWORK_LATENCY_MS"])
    w_cbs.writerow(["RAIL", "RRN", "CBS_AMOUNT", "CBS_STATUS", "REMITTER_ACC", "BENEFICIARY_ACC"])
    w_gl.writerow(["RAIL", "RRN", "GL_AMOUNT", "GL_STATUS", "NET_CYCLE_ID", "RBI_VOUCHER_NO"])

    # Distribution: UPI (60% = 300k), IMPS (25% = 125k), AEPS (10% = 50k), NETC (5% = 25k)
    rails = ["UPI"] * 300_000 + ["IMPS"] * 125_000 + ["AEPS"] * 50_000 + ["NETC"] * 25_000
    random.shuffle(rails)

    base_time = datetime(2026, 11, 16, 6, 0, 0)
    cycle_date_str = "20261116"

    # Streaming chunks
    CHUNK = 25_000
    b_npci, b_sw, b_cbs, b_gl = [], [], [], []

    rrn_start = 902800000000

    print(f"Generating exactly {TOTAL_RECORDS:,} multi-rail unified records...")

    for i in range(TOTAL_RECORDS):
        rrn = str(rrn_start + i)
        rail = rails[i]
        sec_offset = (i * 86400) // TOTAL_RECORDS
        txn_dt = base_time + timedelta(seconds=sec_offset)
        dt_str = txn_dt.strftime("%Y-%m-%d %H:%M:%S")

        cycle_id = f"{rail}-{cycle_date_str}-CY{(i % 4) + 1:02d}"
        voucher_no = f"VCH-{rail[:3]}-{i + 1:07d}"

        rem_bank, _ = BANKS[i % len(BANKS)]
        ben_bank, _ = BANKS[(i + 3) % len(BANKS)]

        rem_acc = f"10098{i % 899999 + 100000}"
        ben_acc = f"20045{i % 899999 + 100000}"
        latency = (i % 85) + 35

        # Amounts
        if rail == "NETC":
            base_amt = round(random.choice([60.0, 100.0, 120.0, 180.0, 240.0, 450.0]), 2)
        elif rail == "AEPS":
            base_amt = round(random.choice([100.0, 500.0, 1000.0, 2000.0, 3000.0, 5000.0]), 2)
        else:
            base_amt = round(random.uniform(50.0, 15000.0), 2)

        # 96.5% STP Matched, ~3.5% Breaks (Timeouts, Amount Mismatch, Deemed Fail)
        is_break = (i % 30 == 0)

        if not is_break:
            # Clean Match
            npci_amt_str = f"{base_amt:.2f}"
            cbs_amt_str = f"{base_amt:.2f}"
            gl_amt_str = f"{base_amt:.2f}"
            npci_st = "SUCCESS" if rail != "NETC" else "ACCEPTED"
            sw_st, sw_code = "AUTHORIZED", "00"
            cbs_st = "DEBITED"
            gl_st = "POSTED" if rail != "NETC" else "SETTLED"
        else:
            # Deterministic break scenarios
            scenario_mod = (i // 30) % 4
            if scenario_mod == 0:
                # Timeout / Beneficiary failure
                npci_amt_str = f"{base_amt:.2f}"
                cbs_amt_str = f"{base_amt:.2f}"
                gl_amt_str = "0.00"
                npci_st = "FAILURE"
                sw_st, sw_code = "DECLINED", "91"
                cbs_st = "DEBITED"
                gl_st = "UNBALANCED"
            elif scenario_mod == 1:
                # Amount Mismatch
                diff = round(random.choice([10.0, 50.0, 100.0, 250.0]), 2)
                npci_amt_str = f"{base_amt:.2f}"
                cbs_amt_str = f"{base_amt - diff:.2f}"
                gl_amt_str = f"{base_amt:.2f}"
                npci_st = "SUCCESS"
                sw_st, sw_code = "AUTHORIZED", "00"
                cbs_st = "DEBITED"
                gl_st = "UNBALANCED"
            elif scenario_mod == 2:
                # CBS Failed to Debit
                npci_amt_str = f"{base_amt:.2f}"
                cbs_amt_str = "0.00"
                gl_amt_str = "0.00"
                npci_st = "SUCCESS"
                sw_st, sw_code = "AUTHORIZED", "00"
                cbs_st = "FAILED"
                gl_st = "UNBALANCED"
            else:
                # Deemed Fail / Incomplete
                npci_amt_str = f"{base_amt:.2f}"
                cbs_amt_str = f"{base_amt:.2f}"
                gl_amt_str = "0.00"
                npci_st = "DEEMED_FAIL"
                sw_st, sw_code = "AUTHORIZED", "00"
                cbs_st = "PENDING"
                gl_st = "PENDING"

        # Specialized Rail Attributes
        if rail == "UPI":
            txn_id = f"TXN{i + 1:09d}"
            utr = f"UTR{rrn}"
            aadhaar = ""
            term_id = ""
            bc_id = ""
            epc = ""
            mapper_st = ""
            acq_id = ""
        elif rail == "IMPS":
            txn_id = f"IMPS{i + 1:09d}"
            utr = f"UTR{rrn}"
            aadhaar = ""
            term_id = ""
            bc_id = ""
            epc = ""
            mapper_st = ""
            acq_id = ""
        elif rail == "AEPS":
            txn_id = f"AEPS{cycle_date_str}{i + 1:06d}"
            utr = ""
            aadhaar = f"XXXXXXXX{i % 8999 + 1000}"
            term_id = f"MATM{i % 2000 + 1000}"
            bc_id = f"BC{i % 500 + 100}"
            epc = ""
            mapper_st = ""
            acq_id = ""
        else:  # NETC
            txn_id = f"NETC{cycle_date_str}{i + 1:06d}"
            utr = ""
            aadhaar = ""
            term_id = ""
            bc_id = ""
            epc = f"E2801160{i % 899999999 + 100000000:016X}"
            mapper_st = "ACCEPTED" if sw_code == "00" else "REJECTED"
            acq_id = ACQUIRERS[i % len(ACQUIRERS)]

        # Row payloads
        b_npci.append([
            rail, rrn, txn_id, utr, rem_bank, ben_bank,
            cycle_id, dt_str, npci_amt_str, npci_st,
            aadhaar, term_id, bc_id, epc, mapper_st, acq_id
        ])
        b_sw.append([rail, rrn, sw_st, sw_code, latency])
        b_cbs.append([rail, rrn, cbs_amt_str, cbs_st, rem_acc, ben_acc])
        b_gl.append([rail, rrn, gl_amt_str, gl_st, cycle_id, voucher_no])

        if len(b_npci) >= CHUNK:
            w_npci.writerows(b_npci)
            w_sw.writerows(b_sw)
            w_cbs.writerows(b_cbs)
            w_gl.writerows(b_gl)
            b_npci.clear()
            b_sw.clear()
            b_cbs.clear()
            b_gl.clear()
            print(f"  Processed {i + 1:,} / {TOTAL_RECORDS:,} records...")

    # Write remaining
    if b_npci:
        w_npci.writerows(b_npci)
        w_sw.writerows(b_sw)
        w_cbs.writerows(b_cbs)
        w_gl.writerows(b_gl)

    f_npci.close()
    f_sw.close()
    f_cbs.close()
    f_gl.close()

    elapsed = time.time() - t0
    print(f"Generated 500,000 unified multi-rail records in {elapsed:.2f} seconds!")

    # Mirror to stage1
    import shutil
    print("Mirroring to stage1 directory...")
    for fn in [
        "NPCI_Unified_Settlement_Master.csv",
        "Switch_Base24_Unified_Logs.csv",
        "Finacle_CBS_Unified_Dump.csv",
        "GL_Suspense_Unified_Pool.csv"
    ]:
        shutil.copy2(INPUT_FILES_DIR / fn, STAGE1_DIR / fn)

    print("500,000 record generation & mirroring complete!")


if __name__ == "__main__":
    generate_unified_500k()
