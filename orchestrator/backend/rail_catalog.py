"""
NPCI Payment Rail Solution Catalog & Subscription Marketplace Engine
Modular Rail-Specific Automation Suites (UPI, IMPS, NACH, AePS, RuPay, CTS, BBPS, NETC)
"""
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional

RAIL_CATALOGS = {
    "UPI": {
        "rail_code": "UPI",
        "name": "Unified Payments Interface (UPI 2.0)",
        "tagline": "Real-time 24x7 Mobile P2P/P2M Clearing & Auto-Reversals",
        "icon": "⚡",
        "color": "#0284c7",
        "category": "Instant & Mobile",
        "subscription_status": "SUBSCRIBED",  # SUBSCRIBED | TRIAL_AVAILABLE | LOCKED
        "subscription_tier": "Enterprise Multi-Cycle",
        "sla_standard": "T+1 Calendar Day (RBI DPSS Circular No.629)",
        "clearing_window": "6 Daily Settlement Cycles (00:00 - 24:00 IST)",
        "daily_volume_rating": "50,000 - 100,000,000 txns/day",
        "systems_integrated": ["NPCI Central Switch", "Base24 Switch", "Finacle 10.x CBS", "GL Clearing Pool 9901"],
        "automated_tasks": [
            {"code": "WF-01", "name": "SFTP Cycle Stream Ingestion", "desc": "Ingests raw settlement files across 6 daily NPCI cut-off windows."},
            {"code": "WF-03", "name": "SHA-256 Duplicate & Schema Gate", "desc": "Validates 32-column specification & cryptographic hash duplicates."},
            {"code": "WF-04", "name": "4-Way Multi-Leg Reconciliation", "desc": "Matches NPCI raw vs Switch vs Finacle CBS vs GL Suspense with 94.5%+ STP."},
            {"code": "WF-07", "name": "AI RC-U66 & Timeout Diagnostic", "desc": "Correlates ISO-8583 logs, 15-second timeouts, and calculates RBI TAT countdown."},
            {"code": "WF-10", "name": "Autonomous Finacle Reversal Bot", "desc": "Dispatches instant STP customer credits for timeouts below ₹50,000."},
            {"code": "WF-11", "name": "UDIR Online Dispute Cockpit", "desc": "Dual-authorization queue for high-value breaks and customer chargebacks."},
            {"code": "WF-12", "name": "SHA-256 Audit Seal Generator", "desc": "Tamper-proof compliance packaging for RBI DPSS inspection."}
        ],
        "pricing_model": "₹ 0.002 per matched transaction or ₹ 45,000 / month flat",
        "last_trial_run": "2026-10-28T12:00:00"
    },
    "IMPS": {
        "rail_code": "IMPS",
        "name": "Immediate Payment Service (IMPS)",
        "tagline": "Instant 24x7 Interbank Account-to-Account Settlement",
        "icon": "💸",
        "color": "#6366f1",
        "category": "Instant & Mobile",
        "subscription_status": "SUBSCRIBED",
        "subscription_tier": "Instant Interbank Standard",
        "sla_standard": "T+1 Calendar Day (Immediate Settlement Obligation)",
        "clearing_window": "Continuous Real-Time 24x7 Clearing",
        "daily_volume_rating": "10,000 - 25,000,000 txns/day",
        "systems_integrated": ["NPCI IMPS Switch", "Core Banking Host", "CBS Suspense 9902", "RBI RTGS Leg"],
        "automated_tasks": [
            {"code": "WF-01", "name": "Real-Time Message Stream Ingestion", "desc": "Validates continuous 24x7 interbank clearing feeds."},
            {"code": "WF-04", "name": "Late-Credit & Balance Matcher", "desc": "Reconciles remitter vs beneficiary bank settlement entries."},
            {"code": "WF-07", "name": "Response Code 91 / Timeout Resolver", "desc": "Diagnoses beneficiary CBS system drops within 30s window."},
            {"code": "WF-10", "name": "Immediate Auto-Return Bot", "desc": "Auto-credits remitter account if beneficiary debit fails."},
            {"code": "WF-12", "name": "Daily IMPS Settlement Audit Trail", "desc": "Consolidates RBI RTGS settlement certificates."}
        ],
        "pricing_model": "₹ 0.003 per matched transaction or ₹ 35,000 / month flat",
        "last_trial_run": None
    },
    "NACH": {
        "rail_code": "NACH",
        "name": "National Automated Clearing House (NACH)",
        "tagline": "High-Volume Bulk Direct Debit, Mandates, Salary & Dividend Clearing",
        "icon": "🔄",
        "color": "#059669",
        "category": "Bulk & Mandates",
        "subscription_status": "TRIAL_AVAILABLE",
        "subscription_tier": "Bulk Mandate Enterprise",
        "sla_standard": "T+1 Session Cycle (Session 1 & Session 2)",
        "clearing_window": "Batch Clearing Sessions (09:00 & 14:00 IST)",
        "daily_volume_rating": "500,000 - 50,000,000 txns/session",
        "systems_integrated": ["NPCI ACH Host", "APBS Clearing File", "CBS Bulk Debit Engine", "Sundry Clearing 9903"],
        "automated_tasks": [
            {"code": "WF-01", "name": "ACH / APBS Batch Presentation Ingestion", "desc": "Validates bulk presentation files containing up to 10M records."},
            {"code": "WF-03", "name": "E-Mandate Reference Check", "desc": "Cryptographically verifies UMRN (Unique Mandate Reference Number)."},
            {"code": "WF-04", "name": "Bulk Return Reason Code Processor", "desc": "Classifies return codes M01 (Insufficient Funds), M03 (Closed), M10 (Stop)."},
            {"code": "WF-10", "name": "ACH Return Memo Generation Bot", "desc": "Autonomously drafts and dispatches return files back to NPCI before session cut-off."},
            {"code": "WF-13", "name": "Mandate Compliance Scorecard", "desc": "Generates sponsor bank compliance filings."}
        ],
        "pricing_model": "₹ 0.0015 per mandate or ₹ 55,000 / month flat",
        "last_trial_run": None
    },
    "AEPS": {
        "rail_code": "AEPS",
        "name": "Aadhaar Enabled Payment System (AePS)",
        "tagline": "Biometric Micro-ATM Clearing & BC Agent Settlement",
        "icon": "👆",
        "color": "#d97706",
        "category": "Cards & Biometrics",
        "subscription_status": "TRIAL_AVAILABLE",
        "subscription_tier": "Financial Inclusion Pack",
        "sla_standard": "T+1 Calendar Day (Micro-ATM Settlement)",
        "clearing_window": "Daily Batch Settlement Window",
        "daily_volume_rating": "25,000 - 5,000,000 txns/day",
        "systems_integrated": ["UIDAI Biometric Gateway", "NPCI AePS Switch", "CBS BC Float Account", "GL Suspense 9904"],
        "automated_tasks": [
            {"code": "WF-01", "name": "Micro-ATM Journal File Intake", "desc": "Ingests terminal cash-withdrawal and balance-inquiry logs."},
            {"code": "WF-04", "name": "On-us / Off-us 4-Way Matcher", "desc": "Cross-reconciles BC Agent device logs with UIDAI biometric confirmations."},
            {"code": "WF-07", "name": "Terminal Timeout Breakdown Resolver", "desc": "Diagnoses cash-dispense timeout failures at remote banking points."},
            {"code": "WF-10", "name": "BC Float Account Rebalancer Bot", "desc": "Auto-credits business correspondent float accounts."},
            {"code": "WF-12", "name": "Micro-ATM Audit Pack", "desc": "Tamper-proof compliance log for RBI financial inclusion audits."}
        ],
        "pricing_model": "₹ 0.0025 per txn or ₹ 30,000 / month flat",
        "last_trial_run": None
    },
    "RUPAY": {
        "rail_code": "RUPAY",
        "name": "RuPay Multi-Channel Card Scheme",
        "tagline": "Domestic Debit/Credit/Prepaid Card Interchange & Chargeback Settlement",
        "icon": "💳",
        "color": "#ea580c",
        "category": "Cards & Biometrics",
        "subscription_status": "TRIAL_AVAILABLE",
        "subscription_tier": "Card Interchange Multi-Channel",
        "sla_standard": "T+1 Settlement Window (Dual-Message Scheme)",
        "clearing_window": "4 Daily Clearing Sessions (E-Com, ATM, POS)",
        "daily_volume_rating": "100,000 - 30,000,000 txns/day",
        "systems_integrated": ["RuPay Central Switch", "POS/ATM Gateway", "Card Management System (CMS)", "GL Interchange 9905"],
        "automated_tasks": [
            {"code": "WF-01", "name": "Raw Settlement Feed Parser", "desc": "Ingests IPM / ISO-8583 settlement logs across ATM and POS channels."},
            {"code": "WF-04", "name": "Interchange Fee & Surcharge Calculator", "desc": "Validates exact basis point interchange splits between acquirer and issuer."},
            {"code": "WF-07", "name": "Late Presentment & Dispute Classifier", "desc": "Analyzes chargeback reason codes (CB-01, CB-04) and pre-arbitration claims."},
            {"code": "WF-10", "name": "Card Reversal & Credit Adjustment Bot", "desc": "Dispatches Finacle card account credits for deemed failed swipes."},
            {"code": "WF-13", "name": "RuPay Scheme MIS & Audit Filing", "desc": "Generates merchant acquirer settlement certificates."}
        ],
        "pricing_model": "₹ 0.002 per swipe or ₹ 60,000 / month flat",
        "last_trial_run": None
    },
    "CTS": {
        "rail_code": "CTS",
        "name": "Cheque Truncation System (CTS-2010)",
        "tagline": "Image-Based Electronic Physical Cheque Clearing & Return Memos",
        "icon": "📝",
        "color": "#475569",
        "category": "Bulk & Cheque",
        "subscription_status": "TRIAL_AVAILABLE",
        "subscription_tier": "Cheque Clearing House Suite",
        "sla_standard": "T+1 Clearing Cycle (Grid-Based Clearing: Western, Northern, Southern)",
        "clearing_window": "2 Daily Clearing Grid Windows (Presentment & Return)",
        "daily_volume_rating": "10,000 - 2,000,000 cheques/day",
        "systems_integrated": ["CTS Clearing House Grid", "Document Scanner Vault", "Finacle Cheque Clearing Module", "Clearing Pool 9906"],
        "automated_tasks": [
            {"code": "WF-01", "name": "Cheque Image Pack & MICR Ingestion", "desc": "Validates grayscale/UV cheque image packs and MICR band checksums."},
            {"code": "WF-04", "name": "Outward vs Inward Clearing Reconciler", "desc": "Matches presenting bank figures with clearing house net obligations."},
            {"code": "WF-07", "name": "Cheque Return Reason Code Classifier", "desc": "Categorizes returns (Code 88 Funds Insufficient, Code 89 Signature Differs)."},
            {"code": "WF-10", "name": "Auto-Return Memo Dispatcher Bot", "desc": "Generates statutory legal return memos under Section 138 of NI Act."},
            {"code": "WF-12", "name": "CTS Grid Settlement Certificate", "desc": "SHA-256 sealed digital audit register for physical instruments."}
        ],
        "pricing_model": "₹ 0.005 per cheque or ₹ 40,000 / month flat",
        "last_trial_run": None
    },
    "BBPS": {
        "rail_code": "BBPS",
        "name": "Bharat Bill Payment System (BBPS)",
        "tagline": "Interoperable Utility, Telecom, Gas & Municipal Bill Settlement",
        "icon": "🧾",
        "color": "#0284c7",
        "category": "Utility & Transit",
        "subscription_status": "TRIAL_AVAILABLE",
        "subscription_tier": "Biller Operating Unit (BOU) Pack",
        "sla_standard": "T+1 Calendar Day (Biller Settlement Window)",
        "clearing_window": "Daily Batch Clearing Window (00:00 - 23:59 IST)",
        "daily_volume_rating": "50,000 - 15,000,000 bills/day",
        "systems_integrated": ["NPCI Bharat BillPay Central Unit (BBPCU)", "Agent Institution Feed", "Biller Gateway", "GL BBPS 9907"],
        "automated_tasks": [
            {"code": "WF-01", "name": "Biller Settlement File Stream Intake", "desc": "Ingests daily bill collections across electricity, water, FASTag, telecom."},
            {"code": "WF-04", "name": "BOU vs COU Multi-Party Matcher", "desc": "Cross-matches customer payment receipts with biller clearing vouchers."},
            {"code": "WF-07", "name": "Biller Failure & Double-Debit Analyzer", "desc": "Identifies bills debited at customer app but uncredited at utility biller."},
            {"code": "WF-10", "name": "Instant Consumer Refund Bot", "desc": "Auto-refunds failed bill debits back to source customer accounts."},
            {"code": "WF-12", "name": "BBPS Inter-Biller Commission Audit", "desc": "Calculates and reconciles agent convenience fee splits."}
        ],
        "pricing_model": "₹ 0.002 per bill payment or ₹ 35,000 / month flat",
        "last_trial_run": None
    },
    "NETC": {
        "rail_code": "NETC",
        "name": "National Electronic Toll Collection (NETC FASTag)",
        "tagline": "RFID Highway Toll Plaza Clearing & Concessionaire Reconciliation",
        "icon": "🚗",
        "color": "#16a34a",
        "category": "Utility & Transit",
        "subscription_status": "TRIAL_AVAILABLE",
        "subscription_tier": "FASTag Acquirer & Issuer Suite",
        "sla_standard": "T+1 Batch Window (Plaza Settlement Mandate)",
        "clearing_window": "Hourly & Daily Toll Plaza Batch Settlement",
        "daily_volume_rating": "100,000 - 20,000,000 toll tags/day",
        "systems_integrated": ["IHMCL / NPCI NETC Switch", "Plaza Toll Reader Log", "FASTag Wallet CBS Host", "GL NETC Suspense 9908"],
        "automated_tasks": [
            {"code": "WF-01", "name": "Plaza XML / CSV Stream Ingestion", "desc": "Ingests hourly toll booth tag reader events across national highways."},
            {"code": "WF-04", "name": "Acquirer vs Issuer Net Toll Matcher", "desc": "Cross-reconciles plaza concessionaire claims vs vehicle tag wallet debits."},
            {"code": "WF-07", "name": "Reader Glitch & Double-Toll Classifier", "desc": "Detects vehicle double-deductions caused by multi-lane antenna reads."},
            {"code": "WF-10", "name": "Toll Adjustment & Chargeback Bot", "desc": "Auto-credits FASTag wallet balance for erroneous toll plaza deductions."},
            {"code": "WF-12", "name": "NHAI / Concessionaire Audit Pack", "desc": "Immutable settlement report for highway concessionaires."}
        ],
        "pricing_model": "₹ 0.002 per toll read or ₹ 40,000 / month flat",
        "last_trial_run": None
    }
}


def get_all_rail_catalogs() -> List[Dict[str, Any]]:
    """Returns all 8 rail solution catalogs with current subscription status."""
    return list(RAIL_CATALOGS.values())


def get_rail_catalog(rail_code: str) -> Optional[Dict[str, Any]]:
    """Returns details for a specific rail catalog."""
    return RAIL_CATALOGS.get(rail_code.upper())


def toggle_rail_subscription(rail_code: str, status: str = "SUBSCRIBED") -> Dict[str, Any]:
    """Toggles or updates subscription access for a specific rail catalog."""
    rc = rail_code.upper()
    if rc in RAIL_CATALOGS:
        RAIL_CATALOGS[rc]["subscription_status"] = status
        return {
            "status": "SUCCESS",
            "rail_code": rc,
            "new_subscription_status": status,
            "message": f"Rail solution catalog '{rc}' access updated to {status}"
        }
    return {"status": "ERROR", "message": f"Unknown rail code {rail_code}"}


def execute_rail_trial(rail_code: str) -> Dict[str, Any]:
    """
    Executes a simulated automated trial run for a specific rail catalog.
    Demonstrates instant end-to-end multi-agent automation (ingest, match, diagnose, recover, seal).
    """
    rc = rail_code.upper()
    cat = RAIL_CATALOGS.get(rc)
    if not cat:
        return {"status": "ERROR", "message": f"Rail {rail_code} not found"}

    now_iso = datetime.now().isoformat()
    cat["last_trial_run"] = now_iso

    # Simulated realistic figures per rail
    trial_stats = {
        "UPI":   {"sample_txns": 50000, "stp_rate": "94.5%", "matched": 47250, "breaks": 2750, "auto_recovered_inr": 7811200.0, "time_ms": 780},
        "IMPS":  {"sample_txns": 25000, "stp_rate": "96.2%", "matched": 24050, "breaks": 950,  "auto_recovered_inr": 3450000.0, "time_ms": 420},
        "NACH":  {"sample_txns": 80000, "stp_rate": "91.8%", "matched": 73440, "breaks": 6560, "auto_recovered_inr": 18240000.0, "time_ms": 1120},
        "AEPS":  {"sample_txns": 15000, "stp_rate": "95.1%", "matched": 14265, "breaks": 735,  "auto_recovered_inr": 1890000.0, "time_ms": 310},
        "RUPAY": {"sample_txns": 35000, "stp_rate": "93.4%", "matched": 32690, "breaks": 2310, "auto_recovered_inr": 5120000.0, "time_ms": 610},
        "CTS":   {"sample_txns": 8000,  "stp_rate": "97.5%", "matched": 7800,  "breaks": 200,  "auto_recovered_inr": 4500000.0, "time_ms": 250},
        "BBPS":  {"sample_txns": 20000, "stp_rate": "98.1%", "matched": 19620, "breaks": 380,  "auto_recovered_inr": 820000.0, "time_ms": 340},
        "NETC":  {"sample_txns": 40000, "stp_rate": "96.8%", "matched": 38720, "breaks": 1280, "auto_recovered_inr": 1140000.0, "time_ms": 530},
    }.get(rc, {"sample_txns": 10000, "stp_rate": "95.0%", "matched": 9500, "breaks": 500, "auto_recovered_inr": 1000000.0, "time_ms": 300})

    trial_seal = f"SEAL_TRIAL_{rc}_{uuid.uuid4().hex[:12].upper()}"

    return {
        "status": "SUCCESS",
        "rail_code": rc,
        "rail_name": cat["name"],
        "trial_timestamp": now_iso,
        "execution_duration_ms": trial_stats["time_ms"],
        "results": {
            "records_ingested": trial_stats["sample_txns"],
            "matched_stp_count": trial_stats["matched"],
            "stp_match_rate": trial_stats["stp_rate"],
            "exceptions_detected": trial_stats["breaks"],
            "exceptions_auto_resolved": int(trial_stats["breaks"] * 0.65),
            "total_financial_recovered_inr": trial_stats["auto_recovered_inr"],
            "rbi_tat_compliance": "100.0% Compliant",
            "cryptographic_trial_seal": trial_seal
        },
        "message": f"Successfully executed automated trial simulation for {cat['name']}! {trial_stats['sample_txns']:,} records matched in {trial_stats['time_ms']}ms."
    }


def get_rail_product_operations(rail_code: str, active_volume: Optional[int] = None, active_rate: Optional[float] = None) -> Dict[str, Any]:
    """
    Returns full operational telemetry, live transaction streams, 4-way reconciliation,
    exceptions, settlement, and disputes for a specific NPCI Payment Rail.
    Matches the 'NPCI Product Operations' Workbench layout.
    """
    rc = rail_code.upper()
    cat = RAIL_CATALOGS.get(rc, RAIL_CATALOGS["UPI"])

    # If system is reset or rail has 0 volume, return clean zero state
    if active_volume is not None and active_volume == 0:
        return {
            "status": "SUCCESS",
            "rail_code": rc,
            "rail_meta": cat,
            "kpi_summary": {
                "total_transactions": 0,
                "success_rate": 0.0,
                "reversals_count": 0,
                "pending_exceptions": 0,
                "sla_breaches": 0,
                "sla_standard": cat["sla_standard"],
                "clearing_window": cat["clearing_window"]
            },
            "recent_transactions": [],
            "exception_trend": {
                "timeline": [],
                "total_breaks": [],
                "resolved_breaks": [],
                "breakdown": []
            },
            "reconciliation_summary": {
                "npci_master_amount": 0.0,
                "switch_authorized_amount": 0.0,
                "cbs_debit_amount": 0.0,
                "gl_suspense_variance": 0.0,
                "stp_match_rate": "0.0%",
                "legs_matched": "Awaiting Intake"
            },
            "settlement_summary": {
                "clearing_cycle": cat["clearing_window"],
                "net_settlement_obligation_inr": 0.00,
                "rbi_rtgs_batch_id": "NONE",
                "gl_clearing_account": f"Finacle Suspense {cat['systems_integrated'][-1]}",
                "settlement_status": "AWAITING_INGESTION"
            },
            "disputes_summary": {
                "open_chargebacks": 0,
                "resolved_chargebacks": 0,
                "auto_adjudicated_pct": "0.0%",
                "dispute_sla_standard": "T+1 Calendar Day",
                "financial_liability_inr": 0.00
            }
        }

    # Baseline product metrics matching enterprise banking volume
    rail_kpis = {
        "UPI":   {"txns": active_volume if active_volume else 412538, "success_rate": active_rate if active_rate else 99.5, "reversals": 1203, "pending": 412, "breaches": 4,  "prefix": "UPI/23456", "types": ["P2M", "P2P", "P2M", "P2P"]},
        "IMPS":  {"txns": active_volume if active_volume else 126904, "success_rate": active_rate if active_rate else 99.2, "reversals": 542,  "pending": 184, "breaches": 1,  "prefix": "IMPS/9120", "types": ["P2A", "P2P", "P2A", "P2U"]},
        "NACH":  {"txns": active_volume if active_volume else 108772, "success_rate": active_rate if active_rate else 99.1, "reversals": 890,  "pending": 310, "breaches": 3,  "prefix": "ACH/44012", "types": ["ACH-DR", "ACH-CR", "ACH-DR", "UMRN"]},
        "AEPS":  {"txns": active_volume if active_volume else 34628,  "success_rate": active_rate if active_rate else 98.8, "reversals": 164,  "pending": 92,  "breaches": 2,  "prefix": "AEPS/5102", "types": ["W-ATM", "BAL-INQ", "W-ATM", "MINI"]},
        "RUPAY": {"txns": active_volume if active_volume else 28416,  "success_rate": active_rate if active_rate else 99.4, "reversals": 112,  "pending": 48,  "breaches": 0,  "prefix": "RUPAY/801", "types": ["E-COM", "POS", "ATM", "POS"]},
        "CTS":   {"txns": active_volume if active_volume else 21389,  "success_rate": active_rate if active_rate else 98.9, "reversals": 45,   "pending": 31,  "breaches": 1,  "prefix": "CTS/72100", "types": ["CHEQUE", "MICR-CR", "CHEQUE", "SPEED"]},
        "BBPS":  {"txns": active_volume if active_volume else 8421,   "success_rate": active_rate if active_rate else 99.6, "reversals": 18,   "pending": 12,  "breaches": 0,  "prefix": "BBPS/3310", "types": ["ELEC", "WATER", "GAS", "DTH"]},
        "NETC":  {"txns": active_volume if active_volume else 2603,   "success_rate": active_rate if active_rate else 99.8, "reversals": 9,    "pending": 6,   "breaches": 0,  "prefix": "FAST/9901", "types": ["PLAZA-A", "PLAZA-B", "FASTAG", "TAG-DR"]},
    }.get(rc, {"txns": 50000, "success_rate": 99.0, "reversals": 200, "pending": 50, "breaches": 1, "prefix": f"{rc}/100", "types": ["P2P", "P2M"]})

    # Simulated realistic live transaction table (Screen #2)
    sample_amounts = [2500, 1200, 5800, 3200, 750, 18500, 4200, 1500, 89000, 640]
    sample_times = ["10:21 AM", "10:20 AM", "10:19 AM", "10:18 AM", "10:17 AM", "10:16 AM", "10:14 AM", "10:12 AM", "10:10 AM", "10:08 AM"]
    banks = [("HDFC Bank", "SBI"), ("ICICI Bank", "Axis Bank"), ("Kotak Bank", "SBI"), ("PNB", "Canara Bank")]

    recent_txns = []
    for i in range(10):
        is_break = i in [2, 7]  # items 2 and 7 are exceptions/breaks
        amt = sample_amounts[i % len(sample_amounts)]
        ttype = rail_kpis["types"][i % len(rail_kpis["types"])]
        s_bank, b_bank = banks[i % len(banks)]

        recent_txns.append({
            "time": sample_times[i],
            "txn_id": f"{rail_kpis['prefix']}{i+10:02d}",
            "type": ttype,
            "amount": amt,
            "status": "Failed" if is_break else "Success",
            "recon_status": "Pending" if is_break else "Matched",
            "rrn": f"52891048{i+10:04d}",
            "sender_bank": s_bank,
            "beneficiary_bank": b_bank,
            "action": "Investigate" if is_break else "View",
            "scenario": "CBS_TIMEOUT" if i == 2 else "AMOUNT_MISMATCH" if i == 7 else "SUCCESS"
        })

    return {
        "status": "SUCCESS",
        "rail_code": rc,
        "rail_meta": cat,
        "kpi_summary": {
            "total_transactions": rail_kpis["txns"],
            "success_rate": rail_kpis["success_rate"],
            "reversals_count": rail_kpis["reversals"],
            "pending_exceptions": rail_kpis["pending"],
            "sla_breaches": rail_kpis["breaches"],
            "sla_standard": cat["sla_standard"],
            "clearing_window": cat["clearing_window"]
        },
        "recent_transactions": recent_txns,
        "exception_trend": {
            "timeline": ["23 Apr", "24 Apr", "25 Apr", "26 Apr", "27 Apr", "28 Apr"],
            "total_breaks": [1240, 1180, 1310, 1250, 1190, 1203],
            "resolved_breaks": [1210, 1160, 1280, 1230, 1175, 1188],
            "breakdown": [
                {"category": "CBS Timeout", "percentage": 28, "color": "#ef4444"},
                {"category": "Amount Mismatch", "percentage": 22, "color": "#f97316"},
                {"category": "Reversal Pending", "percentage": 16, "color": "#a855f7"},
                {"category": "Customer Dispute", "percentage": 12, "color": "#eab308"},
                {"category": "Technical Failure", "percentage": 12, "color": "#3b82f6"},
                {"category": "Network Latency", "percentage": 10, "color": "#64748b"}
            ]
        },
        "reconciliation_summary": {
            "npci_master_amount": rail_kpis["txns"] * 1850.50,
            "switch_authorized_amount": (rail_kpis["txns"] * 1850.50) - 24500.0,
            "cbs_debit_amount": (rail_kpis["txns"] * 1850.50) + 18200.0,
            "gl_suspense_variance": -42700.0,
            "stp_match_rate": f"{rail_kpis['success_rate']}%",
            "legs_matched": "4 of 4 Verified"
        },
        "settlement_summary": {
            "clearing_cycle": "Current Cycle (08:00 - 12:00 IST)",
            "net_settlement_obligation_inr": 184500000.00,
            "rbi_rtgs_batch_id": f"RTGS_{rc}_20261028_B2",
            "gl_clearing_account": f"Finacle Suspense {cat['systems_integrated'][-1]}",
            "settlement_status": "SETTLED_RTGS_CONFIRMED"
        },
        "disputes_summary": {
            "open_chargebacks": 24,
            "auto_represented_count": 21,
            "pending_dual_auth": 3,
            "pre_arbitration_window": "T+15 Days"
        }
    }


