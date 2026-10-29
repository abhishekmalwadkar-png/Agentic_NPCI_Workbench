"""
Verification Script for NPCI Payment Rail Solution Catalog & Subscription Marketplace
"""
import urllib.request
import urllib.parse
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')
BASE_URL = "http://localhost:8000"

def test_rail_catalog():
    print("=" * 80)
    print("NPCI PAYMENT RAIL SOLUTION CATALOG & SUBSCRIPTION MARKETPLACE VERIFICATION")
    print("=" * 80)

    # 1. Fetch All 8 Rail Catalogs
    print("\n1. Testing GET /api/rail-catalog/all ...")
    req = urllib.request.Request(f"{BASE_URL}/api/rail-catalog/all")
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        catalogs = data.get("catalogs", [])
        print(f"   ✓ Retrieved {len(catalogs)} Rail Solution Suites:")
        for c in catalogs:
            sub = "✓ Subscribed" if c['subscription_status'] == 'SUBSCRIBED' else "⏱️ Trial Available"
            print(f"     • {c['icon']} {c['rail_code']:6} | {c['name']:40} | {c['sla_standard'][:25]} | {sub}")

        assert len(catalogs) == 8, f"Expected 8 rails, got {len(catalogs)}"

    # 2. Detail for UPI
    print("\n2. Testing GET /api/rail-catalog/UPI ...")
    req = urllib.request.Request(f"{BASE_URL}/api/rail-catalog/UPI")
    with urllib.request.urlopen(req) as resp:
        upi = json.loads(resp.read().decode())
        print(f"   ✓ Name:     {upi['name']}")
        print(f"   ✓ Tier:     {upi['subscription_tier']}")
        print(f"   ✓ Tasks:    {len(upi['automated_tasks'])} Automated Workflows Included")
        for t in upi['automated_tasks'][:3]:
            print(f"     - [{t['code']}] {t['name']}: {t['desc']}")

        assert len(upi['automated_tasks']) >= 5, "UPI should have at least 5 automated tasks"

    # 3. Try Now Simulation for UPI
    print("\n3. Testing POST /api/rail-catalog/try-now?rail_code=UPI ...")
    req = urllib.request.Request(f"{BASE_URL}/api/rail-catalog/try-now?rail_code=UPI", method="POST")
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        print(f"   ✓ Execution Status:   {res['status']}")
        print(f"   ✓ Duration:           {res['execution_duration_ms']}ms")
        print(f"   ✓ Records Ingested:   {res['results']['records_ingested']:,}")
        print(f"   ✓ 4-Way Match Rate:   {res['results']['stp_match_rate']} ({res['results']['matched_stp_count']:,} STP)")
        print(f"   ✓ Recovered Amount:   INR {res['results']['total_financial_recovered_inr']:,.2f}")
        print(f"   ✓ Cryptographic Seal: {res['results']['cryptographic_trial_seal']}")

        assert res['status'] == "SUCCESS", "Trial execution failed"

    # 4. Try Now Simulation for NACH
    print("\n4. Testing POST /api/rail-catalog/try-now?rail_code=NACH ...")
    req = urllib.request.Request(f"{BASE_URL}/api/rail-catalog/try-now?rail_code=NACH", method="POST")
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        print(f"   ✓ Rail:              {res['rail_name']}")
        print(f"   ✓ Records Matched:   {res['results']['matched_stp_count']:,} of {res['results']['records_ingested']:,} ACH Direct Debits")
        print(f"   ✓ Exceptions Auto:   {res['results']['exceptions_auto_resolved']:,} Mandate Returns Handled")

        assert res['status'] == "SUCCESS", "NACH trial failed"

    # 5. Subscribe / Purchase Access Toggle
    print("\n5. Testing POST /api/rail-catalog/subscribe?rail_code=NACH&status=SUBSCRIBED ...")
    req = urllib.request.Request(f"{BASE_URL}/api/rail-catalog/subscribe?rail_code=NACH&status=SUBSCRIBED", method="POST")
    with urllib.request.urlopen(req) as resp:
        sub_res = json.loads(resp.read().decode())
        print(f"   ✓ Result: {sub_res['status']} | {sub_res['message']}")

        assert sub_res['new_subscription_status'] == "SUBSCRIBED"

    print("\n" + "=" * 80)
    print("ALL 5 RAIL SOLUTION CATALOG & 'TRY NOW' CHECKS PASSED WITH 100% SUCCESS!")
    print("=" * 80)

if __name__ == '__main__':
    test_rail_catalog()

