"""
NPCI Unified Operations Workbench - Inbound Feed Simulator Engine
Always writes strictly to the 4 agreed Unified 4-way reconciliation feed files:
1. NPCI_Unified_Settlement_Master.csv (500,000 rows across UPI, IMPS, AEPS, NETC)
2. Switch_Base24_Unified_Logs.csv (500,000 rows)
3. Finacle_CBS_Unified_Dump.csv (500,000 rows)
4. GL_Suspense_Unified_Pool.csv (500,000 rows)
"""

import csv
import random
import shutil
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, List, Optional

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
INPUT_FILES_DIR = WORKSPACE_ROOT / "Input files"
STAGE1_DIR = WORKSPACE_ROOT / "stage1"

TOTAL_UNIFIED_RECORDS = 500_000

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


def generate_and_drop_feed(
    rail: str = "ALL",
    record_count: int = TOTAL_UNIFIED_RECORDS,
    break_rate_pct: float = 3.5,
    batch_prefix: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generates correlated 4-way reconciliation records and writes strictly 500,000 records
    consisting of all payment rails (UPI 60%, IMPS 25%, AEPS 10%, NETC 5%) across the 4 Unified files.
    """
    t0 = time.time()
    ts_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    batch_id = batch_prefix or f"SIM_500K_{ts_str}"

    INPUT_FILES_DIR.mkdir(parents=True, exist_ok=True)
    STAGE1_DIR.mkdir(parents=True, exist_ok=True)

    # Strictly the 4 agreed Unified files
    fn_npci = "NPCI_Unified_Settlement_Master.csv"
    fn_sw = "Switch_Base24_Unified_Logs.csv"
    fn_cbs = "Finacle_CBS_Unified_Dump.csv"
    fn_gl = "GL_Suspense_Unified_Pool.csv"

    p_npci = INPUT_FILES_DIR / fn_npci
    p_sw = INPUT_FILES_DIR / fn_sw
    p_cbs = INPUT_FILES_DIR / fn_cbs
    p_gl = INPUT_FILES_DIR / fn_gl

    f_npci = open(p_npci, "w", newline="", encoding="utf-8")
    f_sw = open(p_sw, "w", newline="", encoding="utf-8")
    f_cbs = open(p_cbs, "w", newline="", encoding="utf-8")
    f_gl = open(p_gl, "w", newline="", encoding="utf-8")

    w_npci = csv.writer(f_npci, lineterminator="\n")
    w_sw = csv.writer(f_sw, lineterminator="\n")
    w_cbs = csv.writer(f_cbs, lineterminator="\n")
    w_gl = csv.writer(f_gl, lineterminator="\n")

    # Unified Headers
    w_npci.writerow([
        "RAIL", "RRN", "TXN_ID", "UTR", "REMITTER_BANK", "BENEFICIARY_BANK",
        "CYCLE_ID", "TXN_DATETIME", "NPCI_AMOUNT", "NPCI_STATUS",
        "AADHAAR_REF", "TERMINAL_ID", "BC_ID", "EPC", "MAPPER_STATUS", "ACQUIRER_ID"
    ])
    w_sw.writerow(["RAIL", "RRN", "SWITCH_STATUS", "SWITCH_RESP_CODE", "NETWORK_LATENCY_MS"])
    w_cbs.writerow(["RAIL", "RRN", "CBS_AMOUNT", "CBS_STATUS", "REMITTER_ACC", "BENEFICIARY_ACC"])
    w_gl.writerow(["RAIL", "RRN", "GL_AMOUNT", "GL_STATUS", "NET_CYCLE_ID", "RBI_VOUCHER_NO"])

    # Target 500,000 multi-rail distribution:
    # UPI: 300,000 (60%)
    # IMPS: 125,000 (25%)
    # AEPS: 50,000 (10%)
    # NETC: 25,000 (5%)
    total_target = max(500_000, record_count)
    n_upi = int(total_target * 0.60)
    n_imps = int(total_target * 0.25)
    n_aeps = int(total_target * 0.10)
    n_netc = total_target - n_upi - n_imps - n_aeps

    rails_pool = ["UPI"] * n_upi + ["IMPS"] * n_imps + ["AEPS"] * n_aeps + ["NETC"] * n_netc
    random.seed(int(time.time()))
    random.shuffle(rails_pool)

    base_time = datetime.now() - timedelta(hours=12)
    cycle_date_str = base_time.strftime("%Y%m%d")
    rrn_base = int(time.time() * 1000) % 900000000000 + 100000000000

    break_step = max(2, int(100.0 / max(0.5, break_rate_pct)))
    breaks_generated = 0

    CHUNK = 50_000
    b_npci, b_sw, b_cbs, b_gl = [], [], [], []

    for i in range(total_target):
        rrn = str(rrn_base + i)
        curr_rail = rails_pool[i]
        sec_offset = (i * 43200) // total_target
        txn_dt = base_time + timedelta(seconds=sec_offset)
        dt_str = txn_dt.strftime("%Y-%m-%d %H:%M:%S")
        cycle_id = f"{curr_rail}-{cycle_date_str}-CY{(i % 4) + 1:02d}"
        voucher_no = f"VCH-{curr_rail[:3]}-{i + 1:07d}"

        rem_bank, _ = BANKS[i % len(BANKS)]
        ben_bank, _ = BANKS[(i + 3) % len(BANKS)]
        rem_acc = f"10098{i % 899999 + 100000}"
        ben_acc = f"20045{i % 899999 + 100000}"
        latency = (i % 85) + 35

        if curr_rail == "NETC":
            base_amt = round(random.choice([60.0, 100.0, 120.0, 180.0, 240.0, 450.0]), 2)
        elif curr_rail == "AEPS":
            base_amt = round(random.choice([100.0, 500.0, 1000.0, 2000.0, 3000.0, 5000.0]), 2)
        else:
            base_amt = round(random.uniform(50.0, 15000.0), 2)

        is_break = (i % break_step == 0)

        if not is_break:
            npci_amt_str = f"{base_amt:.2f}"
            cbs_amt_str = f"{base_amt:.2f}"
            gl_amt_str = f"{base_amt:.2f}"
            npci_st = "SUCCESS" if curr_rail != "NETC" else "ACCEPTED"
            sw_st, sw_code = "AUTHORIZED", "00"
            cbs_st = "DEBITED"
            gl_st = "POSTED" if curr_rail != "NETC" else "SETTLED"
        else:
            breaks_generated += 1
            sc = (i // break_step) % 4
            if sc == 0:
                # Timeout / Beneficiary failure
                npci_amt_str = f"{base_amt:.2f}"
                cbs_amt_str = f"{base_amt:.2f}"
                gl_amt_str = "0.00"
                npci_st = "FAILURE"
                sw_st, sw_code = "DECLINED", "91"
                cbs_st = "DEBITED"
                gl_st = "UNBALANCED"
            elif sc == 1:
                # Amount mismatch
                diff = round(random.choice([10.0, 50.0, 100.0]), 2)
                npci_amt_str = f"{base_amt:.2f}"
                cbs_amt_str = f"{base_amt - diff:.2f}"
                gl_amt_str = f"{base_amt:.2f}"
                npci_st = "SUCCESS"
                sw_st, sw_code = "AUTHORIZED", "00"
                cbs_st = "DEBITED"
                gl_st = "UNBALANCED"
            elif sc == 2:
                # CBS failed to debit
                npci_amt_str = f"{base_amt:.2f}"
                cbs_amt_str = "0.00"
                gl_amt_str = "0.00"
                npci_st = "SUCCESS"
                sw_st, sw_code = "AUTHORIZED", "00"
                cbs_st = "FAILED"
                gl_st = "UNBALANCED"
            else:
                # Deemed fail
                npci_amt_str = f"{base_amt:.2f}"
                cbs_amt_str = f"{base_amt:.2f}"
                gl_amt_str = "0.00"
                npci_st = "DEEMED_FAIL"
                sw_st, sw_code = "AUTHORIZED", "00"
                cbs_st = "PENDING"
                gl_st = "PENDING"

        # Rail-specific fields
        if curr_rail == "UPI":
            txn_id = f"TXN{i + 1:09d}"
            utr = f"UTR{rrn}"
            aadhaar, term_id, bc_id, epc, mapper_st, acq_id = "", "", "", "", "", ""
        elif curr_rail == "IMPS":
            txn_id = f"IMPS{i + 1:09d}"
            utr = f"UTR{rrn}"
            aadhaar, term_id, bc_id, epc, mapper_st, acq_id = "", "", "", "", "", ""
        elif curr_rail == "AEPS":
            txn_id = f"AEPS{cycle_date_str}{i + 1:06d}"
            utr = ""
            aadhaar = f"XXXXXXXX{i % 8999 + 1000}"
            term_id = f"MATM{i % 2000 + 1000}"
            bc_id = f"BC{i % 500 + 100}"
            epc, mapper_st, acq_id = "", "", ""
        else:  # NETC
            txn_id = f"NETC{cycle_date_str}{i + 1:06d}"
            utr = ""
            aadhaar, term_id, bc_id = "", "", ""
            epc = f"E2801160{i % 899999999 + 100000000:016X}"
            mapper_st = "ACCEPTED" if sw_code == "00" else "REJECTED"
            acq_id = ACQUIRERS[i % len(ACQUIRERS)]

        b_npci.append([
            curr_rail, rrn, txn_id, utr, rem_bank, ben_bank,
            cycle_id, dt_str, npci_amt_str, npci_st,
            aadhaar, term_id, bc_id, epc, mapper_st, acq_id
        ])
        b_sw.append([curr_rail, rrn, sw_st, sw_code, latency])
        b_cbs.append([curr_rail, rrn, cbs_amt_str, cbs_st, rem_acc, ben_acc])
        b_gl.append([curr_rail, rrn, gl_amt_str, gl_st, cycle_id, voucher_no])

        if len(b_npci) >= CHUNK:
            w_npci.writerows(b_npci)
            w_sw.writerows(b_sw)
            w_cbs.writerows(b_cbs)
            w_gl.writerows(b_gl)
            b_npci.clear()
            b_sw.clear()
            b_cbs.clear()
            b_gl.clear()

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

    # Mirror strictly the 4 files to stage1
    for fn in [fn_npci, fn_sw, fn_cbs, fn_gl]:
        try:
            shutil.copy2(INPUT_FILES_DIR / fn, STAGE1_DIR / fn)
        except Exception:
            pass

    return {
        "status": "SUCCESS",
        "batch_id": batch_id,
        "record_count": total_target,
        "total_records": total_target,
        "breaks_count": breaks_generated,
        "clean_matches": total_target - breaks_generated,
        "elapsed_seconds": round(elapsed, 2),
        "target_directory": str(INPUT_FILES_DIR.resolve()),
        "files_dropped": [fn_npci, fn_sw, fn_cbs, fn_gl],
        "rails": ["UPI", "IMPS", "AEPS", "NETC"],
        "rail_breakdown": {
            "UPI": n_upi,
            "IMPS": n_imps,
            "AEPS": n_aeps,
            "NETC": n_netc
        },
        "message": f"Successfully dumped strictly {total_target:,} records across UPI (300k), IMPS (125k), AEPS (50k), and NETC (25k) into the 4 agreed Unified settlement files in {round(elapsed, 2)}s."
    }


def generate_and_drop_rbi_feed(
    rail: str = "NEFT",
    record_count: int = 15000,
    break_rate_pct: float = 3.6,
    batch_prefix: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generates correlated 3-way RBI clearing feed files and drops them into 'Input files'.
    For NEFT:
      1. RBI_SFMS_NEFT_Batch30_Clearing.csv (SFMS ISO 20022 pacs.008 outward/inward advice)
      2. Finacle_CBS_NEFT_Dump.csv (Core Banking ledger entries & debit/credit vouchers)
      3. RBI_eKuber_NEFT_Statement.csv (RBI e-Kuber Multilateral Deferred Net Settlement Advice)
    For RTGS:
      1. RBI_eKuber_RTGS_Gross_Settlement.csv (Continuous Real-Time Gross Settlement Statement)
      2. SFMS_ISO20022_RTGS_Logs.csv (pacs.008/pacs.009 high-value gross transaction records)
      3. Finacle_CBS_RTGS_Dump.csv (Core Banking Treasury & Customer debit/credit legs)
    """
    t0 = time.time()
    rail_up = (rail or "NEFT").upper()
    ts_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    cycle_date_str = datetime.now().strftime("%Y%m%d")
    batch_id = batch_prefix or f"RBI_{rail_up}_{ts_str}"

    INPUT_FILES_DIR.mkdir(parents=True, exist_ok=True)
    STAGE1_DIR.mkdir(parents=True, exist_ok=True)

    target_count = max(500, record_count)
    breaks_target = int(target_count * (break_rate_pct / 100.0))

    now = datetime.now()

    if rail_up == "NEFT":
        fn_1 = "RBI_SFMS_NEFT_Batch30_Clearing.csv"
        fn_2 = "Finacle_CBS_NEFT_Dump.csv"
        fn_3 = "RBI_eKuber_NEFT_Statement.csv"

        p_1 = INPUT_FILES_DIR / fn_1
        p_2 = INPUT_FILES_DIR / fn_2
        p_3 = INPUT_FILES_DIR / fn_3

        with open(p_1, "w", newline="", encoding="utf-8") as f1, \
             open(p_2, "w", newline="", encoding="utf-8") as f2, \
             open(p_3, "w", newline="", encoding="utf-8") as f3:

            w1 = csv.writer(f1, lineterminator="\n")
            w2 = csv.writer(f2, lineterminator="\n")
            w3 = csv.writer(f3, lineterminator="\n")

            w1.writerow(["RAIL", "UTR", "MSG_ID", "BATCH_CYCLE", "AMOUNT", "REMITTER_BANK", "BENEFICIARY_BANK", "REMITTER_ACC", "BENEFICIARY_ACC", "SFMS_STATUS", "TXN_DATETIME"])
            w2.writerow(["RAIL", "UTR", "CBS_TXN_ID", "CBS_GL_LEG", "DEBIT_ACC", "CREDIT_ACC", "AMOUNT", "CBS_STATUS", "TXN_DATETIME"])
            w3.writerow(["RAIL", "UTR", "VOUCHER_NO", "BATCH_CYCLE", "SETTLED_AMOUNT", "NET_POSITION", "RBI_STATUS", "TXN_DATETIME"])

            b1, b2, b3 = [], [], []
            for i in range(target_count):
                utr = f"NEFT{cycle_date_str}{i + 1:07d}"
                msg_id = f"pacs.008.{cycle_date_str}.N{i + 1:07d}"
                cbs_txn = f"TXN_CBS_NEFT_{cycle_date_str}_{i + 1:07d}"
                voucher = f"RBI-NET-DNS-B30-{i + 1:06d}"
                is_break = (i < breaks_target)

                amt = round(random.uniform(500.0, 500000.0), 2)
                dt_str = (now - timedelta(minutes=random.randint(5, 120))).strftime("%Y-%m-%d %H:%M:%S")
                rem_bank = BANKS[i % len(BANKS)][0]
                ben_bank = BANKS[(i + 3) % len(BANKS)][0]
                rem_acc = f"10098{i % 900000 + 100000}"
                ben_acc = f"20091{i % 900000 + 100000}"

                if not is_break:
                    b1.append(["NEFT", utr, msg_id, "B30", f"{amt:.2f}", rem_bank, ben_bank, rem_acc, ben_acc, "ACK_DISPATCHED", dt_str])
                    b2.append(["NEFT", utr, cbs_txn, "GL-9901 NEFT Net Settlement", rem_acc, ben_acc, f"{amt:.2f}", "DEBITED", dt_str])
                    b3.append(["NEFT", utr, voucher, "CYCLE_30", f"{amt:.2f}", "RECEIVABLE", "SETTLED", dt_str])
                else:
                    # Break scenario: timeout or customer account inactive / pacs.004 return
                    b1.append(["NEFT", utr, msg_id, "B30", f"{amt:.2f}", rem_bank, ben_bank, rem_acc, ben_acc, "RETURN_PENDING_AC04", dt_str])
                    b2.append(["NEFT", utr, cbs_txn, "GL-9901 NEFT Return Suspense", rem_acc, ben_acc, f"{amt:.2f}", "DEBITED_UNCREDITED", dt_str])
                    b3.append(["NEFT", utr, voucher, "CYCLE_30", f"{amt:.2f}", "NET_EXCLUDED", "PENDING_INVESTIGATION", dt_str])

                if len(b1) >= 2000:
                    w1.writerows(b1)
                    w2.writerows(b2)
                    w3.writerows(b3)
                    b1.clear(); b2.clear(); b3.clear()

            if b1:
                w1.writerows(b1)
                w2.writerows(b2)
                w3.writerows(b3)

    else:  # RTGS
        fn_1 = "RBI_eKuber_RTGS_Gross_Settlement.csv"
        fn_2 = "SFMS_ISO20022_RTGS_Logs.csv"
        fn_3 = "Finacle_CBS_RTGS_Dump.csv"

        p_1 = INPUT_FILES_DIR / fn_1
        p_2 = INPUT_FILES_DIR / fn_2
        p_3 = INPUT_FILES_DIR / fn_3

        with open(p_1, "w", newline="", encoding="utf-8") as f1, \
             open(p_2, "w", newline="", encoding="utf-8") as f2, \
             open(p_3, "w", newline="", encoding="utf-8") as f3:

            w1 = csv.writer(f1, lineterminator="\n")
            w2 = csv.writer(f2, lineterminator="\n")
            w3 = csv.writer(f3, lineterminator="\n")

            w1.writerow(["RAIL", "UTR", "VOUCHER_NO", "GROSS_AMOUNT", "SENDER_BIC", "RECEIVER_BIC", "RBI_STATUS", "SETTLEMENT_DATETIME"])
            w2.writerow(["RAIL", "UTR", "MSG_ID", "MSG_TYPE", "AMOUNT", "SENDER_IFSC", "RECEIVER_IFSC", "SFMS_STATUS", "TXN_DATETIME"])
            w3.writerow(["RAIL", "UTR", "CBS_TXN_ID", "GL_ACC", "DEBIT_ACC", "CREDIT_ACC", "AMOUNT", "CBS_STATUS", "TXN_DATETIME"])

            b1, b2, b3 = [], [], []
            for i in range(target_count):
                utr = f"RBIR{cycle_date_str}{i + 1:06d}"
                voucher = f"RBI-GROSS-{cycle_date_str}-{i + 1:06d}"
                msg_id = f"pacs.008.{cycle_date_str}.R{i + 1:06d}"
                cbs_txn = f"TXN_CBS_RTGS_{cycle_date_str}_{i + 1:06d}"
                is_break = (i < breaks_target)

                # RTGS is strictly high-value >= ₹2,00,000
                amt = round(random.uniform(200000.0, 50000000.0), 2)
                dt_str = (now - timedelta(minutes=random.randint(1, 90))).strftime("%Y-%m-%d %H:%M:%S")
                rem_bank = BANKS[i % len(BANKS)]
                ben_bank = BANKS[(i + 2) % len(BANKS)]
                rem_acc = f"10098{i % 900000 + 100000}"
                ben_acc = f"20091{i % 900000 + 100000}"

                if not is_break:
                    b1.append(["RTGS", utr, voucher, f"{amt:.2f}", rem_bank[0], ben_bank[0], "SETTLED_GROSS", dt_str])
                    b2.append(["RTGS", utr, msg_id, "pacs.008.001.08", f"{amt:.2f}", rem_bank[1], ben_bank[1], "ACK_DISPATCHED", dt_str])
                    b3.append(["RTGS", utr, cbs_txn, "GL-11010 RBI CA Settlement", rem_acc, ben_acc, f"{amt:.2f}", "DEBITED", dt_str])
                else:
                    # Break: switch timeout or unconfirmed debit
                    b1.append(["RTGS", utr, voucher, f"{amt:.2f}", rem_bank[0], ben_bank[0], "NOT_SETTLED_NO_RECORD", dt_str])
                    b2.append(["RTGS", utr, msg_id, "pacs.008.001.08", f"{amt:.2f}", rem_bank[1], ben_bank[1], "DISPATCH_TIMEOUT_NACK", dt_str])
                    b3.append(["RTGS", utr, cbs_txn, "GL-14022 RTGS Suspense", rem_acc, ben_acc, f"{amt:.2f}", "DEBITED", dt_str])

                if len(b1) >= 2000:
                    w1.writerows(b1)
                    w2.writerows(b2)
                    w3.writerows(b3)
                    b1.clear(); b2.clear(); b3.clear()

            if b1:
                w1.writerows(b1)
                w2.writerows(b2)
                w3.writerows(b3)

    elapsed = time.time() - t0

    # Mirror the files to stage1
    for fn in [fn_1, fn_2, fn_3]:
        try:
            shutil.copy2(INPUT_FILES_DIR / fn, STAGE1_DIR / fn)
        except Exception:
            pass

    return {
        "status": "SUCCESS",
        "batch_id": batch_id,
        "rail": rail_up,
        "record_count": target_count,
        "total_records": target_count,
        "breaks_count": breaks_target,
        "clean_matches": target_count - breaks_target,
        "elapsed_seconds": round(elapsed, 2),
        "target_directory": str(INPUT_FILES_DIR.resolve()),
        "files_dropped": [fn_1, fn_2, fn_3],
        "message": f"Successfully dropped {target_count:,} correlated 3-way {rail_up} clearing records across {fn_1}, {fn_2}, and {fn_3} into 'Input files' in {round(elapsed, 2)}s."
    }


if __name__ == "__main__":
    res = generate_and_drop_feed(record_count=500_000)
    print(f"Generated {res['record_count']:,} multi-rail records in {res['elapsed_seconds']}s.")
    print(f"Files: {res['files_dropped']}")
    print(f"Breakdown: {res['rail_breakdown']}")
