"""
NPCI Unified Operations Workbench - High-Speed 500,000 Unified Multi-Rail Record Generator
Strictly generates only the 4 agreed Unified files:
1. NPCI_Unified_Settlement_Master.csv (500,000 rows across UPI, IMPS, AEPS, NETC)
2. Switch_Base24_Unified_Logs.csv (500,000 rows)
3. Finacle_CBS_Unified_Dump.csv (500,000 rows)
4. GL_Suspense_Unified_Pool.csv (500,000 rows)
"""

import sys
from pathlib import Path
from tools.generate_500k_unified_feeds import generate_500k_unified_dataset

if __name__ == "__main__":
    generate_500k_unified_dataset(500_000)
