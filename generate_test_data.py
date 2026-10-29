import csv
import random
import uuid
import hashlib
from datetime import datetime, timedelta

random.seed(42)

# ── Config ───────────────────────────────────────────────────────────────────
TOTAL_RECORDS   = 50_000
OUTPUT_FILE     = "d:/NPCI-Workbench/NPCI_UPI_Settlement_TestData_50K.csv"

# ── Failure scenario distribution (% of records) ─────────────────────────────
FAILURE_RATES = {
    "SUCCESS"               : 0.945,   # 94.5% success (healthy rail)
    "TIMEOUT"               : 0.020,   # 2.0%  – beneficiary CBS timed out (T+15s)
    "AMOUNT_MISMATCH"       : 0.010,   # 1.0%  – NPCI amount ≠ CBS amount
    "DUPLICATE"             : 0.005,   # 0.5%  – same RRN processed twice
    "REVERSAL_MISSING"      : 0.008,   # 0.8%  – CBS debited, reversal never triggered
    "DEEMED_FAIL"           : 0.005,   # 0.5%  – NPCI marked final fail, CBS debited
    "BENEFICIARY_NOT_FOUND" : 0.004,   # 0.4%  – account closed / invalid IFSC
    "INSUFFICIENT_FUNDS"    : 0.003,   # 0.3%  – mandate failure (NACH style)
}

# ── Reference data pools ──────────────────────────────────────────────────────
RAILS = {
    "UPI"  : 0.48, "IMPS": 0.15, "NACH": 0.13,
    "AePS" : 0.04, "RuPay": 0.03, "CTS": 0.03,
    "BBPS" : 0.01, "NETC": 0.03,
}

BANKS = [
    ("HDFC Bank",    "HDFC0001234"),
    ("SBI",          "SBIN0005943"),
    ("ICICI Bank",   "ICIC0002143"),
    ("Axis Bank",    "UTIB0003456"),
    ("Kotak Bank",   "KKBK0007890"),
    ("Punjab NB",    "PUNB0123400"),
    ("Bank of Baroda","BARB0SAMPLE"),
    ("Canara Bank",  "CNRB0014567"),
    ("Yes Bank",     "YESB0000100"),
    ("IndusInd Bank","INDB0000023"),
]

RESPONSE_CODES = {
    "SUCCESS"               : ("00", "Transaction Successful"),
    "TIMEOUT"               : ("91", "Issuer or Switch Inoperative / Timeout"),
    "AMOUNT_MISMATCH"       : ("13", "Invalid Amount"),
    "DUPLICATE"             : ("94", "Duplicate Transmission Detected"),
    "REVERSAL_MISSING"      : ("ZZ", "Debit Success – Reversal Not Triggered"),
    "DEEMED_FAIL"           : ("97", "System Malfunction – Deemed Fail"),
    "BENEFICIARY_NOT_FOUND" : ("14", "No Such Account / Invalid IFSC"),
    "INSUFFICIENT_FUNDS"    : ("51", "Insufficient Funds"),
}

EXCEPTION_PRIORITIES = {
    "SUCCESS"               : "",
    "TIMEOUT"               : "P1",
    "AMOUNT_MISMATCH"       : "P1",
    "DUPLICATE"             : "P1",
    "REVERSAL_MISSING"      : "P1",
    "DEEMED_FAIL"           : "P1",
    "BENEFICIARY_NOT_FOUND" : "P2",
    "INSUFFICIENT_FUNDS"    : "P2",
}

CBS_STATUS_MAP = {
    "SUCCESS"               : "DEBITED",
    "TIMEOUT"               : "DEBITED",       # ← key failure: CBS debited but NPCI failed
    "AMOUNT_MISMATCH"       : "DEBITED",
    "DUPLICATE"             : "DEBITED_TWICE", # ← duplicate
    "REVERSAL_MISSING"      : "DEBITED",       # ← reversal not triggered
    "DEEMED_FAIL"           : "DEBITED",       # ← CBS debited, NPCI deemed fail
    "BENEFICIARY_NOT_FOUND" : "NOT_DEBITED",
    "INSUFFICIENT_FUNDS"    : "NOT_DEBITED",
}

NPCI_STATUS_MAP = {
    "SUCCESS"               : "SUCCESS",
    "TIMEOUT"               : "TIMEOUT",
    "AMOUNT_MISMATCH"       : "SUCCESS",       # ← NPCI thinks it passed, amount wrong
    "DUPLICATE"             : "DUPLICATE",
    "REVERSAL_MISSING"      : "FAIL",
    "DEEMED_FAIL"           : "DEEMED_FAIL",
    "BENEFICIARY_NOT_FOUND" : "FAIL",
    "INSUFFICIENT_FUNDS"    : "FAIL",
}

RECON_STATUS_MAP = {
    "SUCCESS"               : "MATCHED",
    "TIMEOUT"               : "BREAK",
    "AMOUNT_MISMATCH"       : "BREAK",
    "DUPLICATE"             : "BREAK",
    "REVERSAL_MISSING"      : "BREAK",
    "DEEMED_FAIL"           : "BREAK",
    "BENEFICIARY_NOT_FOUND" : "MATCHED",      # fail on both sides – matched
    "INSUFFICIENT_FUNDS"    : "MATCHED",
}

INVESTIGATION_REQUIRED = {
    "SUCCESS"               : "No",
    "TIMEOUT"               : "Yes",
    "AMOUNT_MISMATCH"       : "Yes",
    "DUPLICATE"             : "Yes",
    "REVERSAL_MISSING"      : "Yes",
    "DEEMED_FAIL"           : "Yes",
    "BENEFICIARY_NOT_FOUND" : "No",
    "INSUFFICIENT_FUNDS"    : "No",
}

HITL_REQUIRED = {
    "SUCCESS"               : "No",
    "TIMEOUT"               : "Yes (>10k)",
    "AMOUNT_MISMATCH"       : "Yes",
    "DUPLICATE"             : "Yes",
    "REVERSAL_MISSING"      : "Yes",
    "DEEMED_FAIL"           : "Yes",
    "BENEFICIARY_NOT_FOUND" : "No",
    "INSUFFICIENT_FUNDS"    : "No",
}

# ── Helpers ───────────────────────────────────────────────────────────────────
def random_rail():
    r = random.random()
    cumulative = 0
    for rail, prob in RAILS.items():
        cumulative += prob
        if r < cumulative:
            return rail
    return "UPI"

def random_scenario():
    r = random.random()
    cumulative = 0
    for scenario, prob in FAILURE_RATES.items():
        cumulative += prob
        if r < cumulative:
            return scenario
    return "SUCCESS"

def gen_rrn():
    return str(random.randint(100000000000, 999999999999))

def gen_utr():
    return "UTR" + str(random.randint(10000000000000, 99999999999999))

def gen_vpa():
    names = ["amit","priya","rahul","sunita","vijay","kavita","rohit","anita","deepak","pooja",
             "arjun","meera","ravi","sana","arun","nisha","suresh","geeta","manoj","lakshmi"]
    handles = ["okaxis","oksbi","okhdfcbank","okicici","ybl","axl","ibl","paytm","gpay","phonepe"]
    return f"{random.choice(names)}{random.randint(1,999)}@{random.choice(handles)}"

def gen_amount(scenario):
    if scenario == "INSUFFICIENT_FUNDS":
        return round(random.uniform(5000, 500000), 2)
    base = random.choices(
        [round(random.uniform(10, 999), 2),
         round(random.uniform(1000, 9999), 2),
         round(random.uniform(10000, 99999), 2),
         round(random.uniform(100000, 500000), 2)],
        weights=[0.45, 0.35, 0.15, 0.05]
    )[0]
    return base

def gen_timestamp(base_date):
    seconds = random.randint(0, 86399)
    return base_date + timedelta(seconds=seconds)

def gen_settlement_date(txn_dt, scenario):
    if scenario in ("TIMEOUT","REVERSAL_MISSING","DEEMED_FAIL","DUPLICATE"):
        return ""   # settlement pending/not done
    return (txn_dt + timedelta(days=1)).strftime("%Y-%m-%d")

# ── Build scenario bucket list (fast weighted pick) ──────────────────────────
scenarios = []
for scenario, rate in FAILURE_RATES.items():
    count = int(TOTAL_RECORDS * rate)
    scenarios.extend([scenario] * count)
# fill up to exactly TOTAL_RECORDS with SUCCESS
while len(scenarios) < TOTAL_RECORDS:
    scenarios.append("SUCCESS")
random.shuffle(scenarios)

# ── CSV Columns ───────────────────────────────────────────────────────────────
HEADERS = [
    "TXN_ID", "RRN", "UTR", "RAIL", "CYCLE_ID",
    "TXN_DATE", "TXN_DATETIME", "SETTLEMENT_DATE",
    "SENDER_VPA", "BENEFICIARY_VPA",
    "SENDER_BANK", "SENDER_IFSC",
    "BENEFICIARY_BANK", "BENEFICIARY_IFSC",
    "NPCI_AMOUNT", "CBS_AMOUNT", "GL_AMOUNT",
    "NPCI_STATUS", "CBS_STATUS", "SWITCH_STATUS",
    "RESPONSE_CODE", "RESPONSE_DESCRIPTION",
    "RECON_STATUS", "SCENARIO_TYPE",
    "INVESTIGATION_REQUIRED", "HITL_REQUIRED",
    "EXCEPTION_PRIORITY", "SLA_BREACH_RISK",
    "REVERSAL_STATUS", "REVERSAL_DATE",
    "PENALTY_CLOCK_STARTED", "NOTES"
]

# ── Generate records ──────────────────────────────────────────────────────────
base_date = datetime(2025, 4, 28)
records_written = 0

print(f"Generating {TOTAL_RECORDS:,} records...")

with open(OUTPUT_FILE, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=HEADERS)
    writer.writeheader()

    for i, scenario in enumerate(scenarios):
        rail = random_rail()
        txn_dt = gen_timestamp(base_date)
        sender_bank = random.choice(BANKS)
        bene_bank   = random.choice(BANKS)
        amount      = gen_amount(scenario)

        # Amount mismatch: CBS records a different amount
        npci_amount = amount
        cbs_amount  = amount
        if scenario == "AMOUNT_MISMATCH":
            delta = round(random.uniform(1, amount * 0.1), 2)
            cbs_amount = round(amount - delta, 2)

        gl_amount = cbs_amount if CBS_STATUS_MAP[scenario] in ("DEBITED","DEBITED_TWICE") else 0.00

        resp_code, resp_desc = RESPONSE_CODES[scenario]

        # reversal only for timeout/deemed_fail/reversal_missing
        reversal_status = ""
        reversal_date   = ""
        penalty_clock   = "No"
        if scenario in ("TIMEOUT", "DEEMED_FAIL"):
            reversal_status = "PENDING"
            penalty_clock   = "Yes"
        elif scenario == "REVERSAL_MISSING":
            reversal_status = "NOT_TRIGGERED"
            penalty_clock   = "Yes"
        elif scenario == "SUCCESS":
            reversal_status = "N/A"

        # SLA breach risk flag
        sla_breach = "High" if scenario in ("REVERSAL_MISSING","DEEMED_FAIL","TIMEOUT","AMOUNT_MISMATCH") else \
                     "Medium" if scenario in ("DUPLICATE",) else "Low"

        # notes
        notes_map = {
            "SUCCESS"               : "",
            "TIMEOUT"               : "Beneficiary CBS did not respond within 15s; customer debited; reversal pending",
            "AMOUNT_MISMATCH"       : f"NPCI amount={npci_amount}, CBS posted={cbs_amount}; delta={round(npci_amount-cbs_amount,2)}",
            "DUPLICATE"             : "Duplicate RRN detected; same transaction processed twice by switch",
            "REVERSAL_MISSING"      : "Transaction failed; CBS debit not reversed within T+1 window; RBI penalty risk",
            "DEEMED_FAIL"           : "NPCI deemed transaction failed after settlement; CBS debit completed; reconciliation break",
            "BENEFICIARY_NOT_FOUND" : "Beneficiary IFSC/account closed or inactive; transaction rejected at beneficiary bank",
            "INSUFFICIENT_FUNDS"    : "Remitter account balance insufficient at time of debit attempt",
        }

        cycle_id = f"{rail}-{txn_dt.strftime('%Y%m%d')}-CY{random.randint(1,48):02d}"
        rrn = gen_rrn()
        utr = gen_utr() if rail in ("UPI","IMPS") else ""

        row = {
            "TXN_ID"                : f"TXN{i+1:09d}",
            "RRN"                   : rrn,
            "UTR"                   : utr,
            "RAIL"                  : rail,
            "CYCLE_ID"              : cycle_id,
            "TXN_DATE"              : txn_dt.strftime("%Y-%m-%d"),
            "TXN_DATETIME"          : txn_dt.strftime("%Y-%m-%d %H:%M:%S"),
            "SETTLEMENT_DATE"       : gen_settlement_date(txn_dt, scenario),
            "SENDER_VPA"            : gen_vpa(),
            "BENEFICIARY_VPA"       : gen_vpa(),
            "SENDER_BANK"           : sender_bank[0],
            "SENDER_IFSC"           : sender_bank[1],
            "BENEFICIARY_BANK"      : bene_bank[0],
            "BENEFICIARY_IFSC"      : bene_bank[1],
            "NPCI_AMOUNT"           : npci_amount,
            "CBS_AMOUNT"            : cbs_amount,
            "GL_AMOUNT"             : gl_amount,
            "NPCI_STATUS"           : NPCI_STATUS_MAP[scenario],
            "CBS_STATUS"            : CBS_STATUS_MAP[scenario],
            "SWITCH_STATUS"         : "AUTHORIZED" if scenario == "SUCCESS" else "FAILED",
            "RESPONSE_CODE"         : resp_code,
            "RESPONSE_DESCRIPTION"  : resp_desc,
            "RECON_STATUS"          : RECON_STATUS_MAP[scenario],
            "SCENARIO_TYPE"         : scenario,
            "INVESTIGATION_REQUIRED": INVESTIGATION_REQUIRED[scenario],
            "HITL_REQUIRED"         : HITL_REQUIRED[scenario],
            "EXCEPTION_PRIORITY"    : EXCEPTION_PRIORITIES[scenario],
            "SLA_BREACH_RISK"       : sla_breach,
            "REVERSAL_STATUS"       : reversal_status,
            "REVERSAL_DATE"         : reversal_date,
            "PENALTY_CLOCK_STARTED" : penalty_clock,
            "NOTES"                 : notes_map[scenario],
        }
        writer.writerow(row)

        if (i + 1) % 10000 == 0:
            print(f"  Written {i+1:,} / {TOTAL_RECORDS:,} records...")

print(f"\nDone! File saved: {OUTPUT_FILE}")

# ── Print summary ─────────────────────────────────────────────────────────────
from collections import Counter
scenario_counts = Counter(scenarios)
print("\n=== SCENARIO DISTRIBUTION ===")
for sc, cnt in sorted(scenario_counts.items(), key=lambda x: -x[1]):
    pct = cnt / TOTAL_RECORDS * 100
    print(f"  {sc:<25s}: {cnt:>6,}  ({pct:.1f}%)")

print(f"\n  TOTAL RECORDS       : {TOTAL_RECORDS:,}")
print(f"  EXCEPTION RECORDS   : {sum(v for k,v in scenario_counts.items() if k != 'SUCCESS'):,}")
print(f"  P1 CRITICAL RECORDS : {sum(v for k,v in scenario_counts.items() if EXCEPTION_PRIORITIES.get(k) == 'P1'):,}")
print(f"  P2 RECORDS          : {sum(v for k,v in scenario_counts.items() if EXCEPTION_PRIORITIES.get(k) == 'P2'):,}")
