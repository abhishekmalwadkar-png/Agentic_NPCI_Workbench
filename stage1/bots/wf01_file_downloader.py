"""
AutomationEdge Stage 1 — WF-01: NPCI File Download Bot
Role: Scheduled / Event-triggered RPA bot that retrieves settlement files
      for active cycles and deposits them into the watch folder.
"""
import os
import shutil
import time
from datetime import datetime
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
WATCH_DIR = BASE_DIR / "watch_folder"
TEST_DATA_SOURCE = BASE_DIR.parent / "NPCI_UPI_Settlement_TestData_50K.csv"

def run_wf01(cycle: str = "C1", rail: str = "UPI"):
    print("=" * 65)
    print(f"🤖 [WF-01] NPCI File Download Bot — Running for {rail} {cycle}")
    print("=" * 65)
    
    WATCH_DIR.mkdir(exist_ok=True)
    today_str = datetime.now().strftime("%Y%m%d")
    target_filename = f"NPCI_{rail}_Settlement_{today_str}_{cycle}.csv"
    destination_path = WATCH_DIR / target_filename

    print(f"1. Authenticating to NPCI SFTP / Clearing Portal with AE Vault credentials...")
    time.sleep(1)
    print(f"   [SUCCESS] Connected to sftp://clearing.npci.org.in:22 (Session: UPI_CLEARING)")

    print(f"2. Locating settlement package for Cycle {cycle} (Cut-off date: {today_str})...")
    time.sleep(1)

    if not TEST_DATA_SOURCE.exists():
        print(f"❌ [ERROR] Source test data not found at {TEST_DATA_SOURCE}!")
        return False

    print(f"3. Downloading {target_filename} ({TEST_DATA_SOURCE.stat().st_size / (1024*1024):.1f} MB)...")
    shutil.copyfile(TEST_DATA_SOURCE, destination_path)
    time.sleep(1)

    print(f"4. Download verified! File placed in watch folder:")
    print(f"   📂 {destination_path}")
    print(f"5. [WF-01 COMPLETE] Handing off to WF-02 (SLA Monitor) and WF-03 (Validator).\n")
    return True

if __name__ == "__main__":
    run_wf01()
