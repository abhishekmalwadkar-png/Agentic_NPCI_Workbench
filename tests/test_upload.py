import os
import sys
import json
import mimetypes
from pathlib import Path
import urllib.request
import urllib.error

API_URL = "http://localhost:8000/api/upload"
TEST_FILE = Path(__file__).parent / "NPCI_UPI_Settlement_TestData_50K.csv"

def upload_file_multipart(url: str, filepath: Path):
    if not filepath.exists():
        print(f"❌ Error: Test file not found at {filepath}")
        return

    boundary = "----NPCIWorkbenchBoundary" + os.urandom(8).hex()
    crlf = b"\r\n"
    filename = filepath.name

    print(f"📦 Uploading {filename} ({filepath.stat().st_size / (1024*1024):.1f} MB) to Stage 1 Pipeline...")

    with open(filepath, "rb") as f:
        file_bytes = f.read()

    body = bytearray()
    body.extend(f"--{boundary}\r\n".encode())
    body.extend(f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'.encode())
    body.extend(b"Content-Type: text/csv\r\n\r\n")
    body.extend(file_bytes)
    body.extend(crlf)
    body.extend(f"--{boundary}--\r\n".encode())

    req = urllib.request.Request(url, data=bytes(body), method="POST")
    req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")

    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read().decode())
            print("\n✅ Ingestion & Validation Result:")
            print(f"   Status:       {data.get('status')}")
            print(f"   SHA-256:      {data.get('sha256')}")
            print(f"   Total Rows:   {data.get('total_records', 0):,}")
            print(f"   Passed Rows:  {data.get('passed_records', 0):,}")
            print(f"   Failed Rows:  {data.get('failed_records', 0):,}")
            print(f"   Destination:  {data.get('destination_vault')}")
            print("\n📊 Scenario Breakdown:")
            for sc, count in data.get("scenario_breakdown", {}).items():
                print(f"   - {sc}: {count:,}")
    except urllib.error.URLError as e:
        print(f"\n❌ Connection Error: {e.reason}")
        print("👉 Make sure the backend is running at http://localhost:8000 first (run 'run_stage1.bat' or 'python -m uvicorn main:app')")

if __name__ == "__main__":
    upload_file_multipart(API_URL, TEST_FILE)
