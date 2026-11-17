import urllib.request
import json
import sys

attacks = ["Ransomware", "Phishing", "DDoS", "SQL Injection"]
sections = [
    "1. TYPE OF ATTACK",
    "2. VULNERABILITY EXPLOITED",
    "3. HISTORICAL INCIDENTS",
    "4. RISK FACTOR",
    "5. DETECTION MEASURES",
    "6. POSSIBLE IMPACT",
    "7. PREVENTION AND MITIGATION",
    "8. IMMEDIATE ACTION SUMMARY"
]

print("=== 1. TESTING /ai/explain FOR 4 ATTACKS ===")
for atk in attacks:
    req = urllib.request.Request(
        "http://127.0.0.1:8000/ai/explain",
        data=json.dumps({"attack_type": atk}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        report = data.get("structured_analysis") or ""
        missing = [s for s in sections if s not in report]
        status = "PASS" if not missing else f"FAIL (Missing: {missing})"
        print(f"  [{atk}] -> {status} (Length: {len(report)} chars)")

print("\n=== 2. TESTING /ai/chat FOR 4 ATTACKS ===")
for atk in attacks:
    req = urllib.request.Request(
        "http://127.0.0.1:8000/ai/chat",
        data=json.dumps({"message": f"Explain {atk}", "session_id": "test-session"}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        reply = data.get("reply") or ""
        missing = [s for s in sections if s not in reply]
        status = "PASS" if not missing else f"FAIL (Missing: {missing})"
        print(f"  [Chat: Explain {atk}] -> {status} (Length: {len(reply)} chars)")

print("\n=== 3. TESTING /ai/detection-result (TEAMMATE MODULE INTEGRATION) ===")
det_payload = {
    "attack_type": "Ransomware",
    "severity": "Critical",
    "confidence": 94,
    "source": "Network Detection Module",
    "target_asset": "10.0.4.22 (Payroll-DB)"
}
req = urllib.request.Request(
    "http://127.0.0.1:8000/ai/detection-result",
    data=json.dumps(det_payload).encode("utf-8"),
    headers={"Content-Type": "application/json"}
)
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode("utf-8"))
    report = data.get("structured_analysis") or ""
    missing = [s for s in sections if s not in report]
    status = "PASS" if not missing else f"FAIL (Missing: {missing})"
    print(f"  Detection Ingestion: ID={data.get('detection_id')} Risk={data.get('risk_level')} ({data.get('organizational_risk_score')}/100) -> {status}")
    print(f"  Contains Sensor Alert Context: {'Sensor Confidence:' in report}")
    print(f"  Contains Teammate Playbook Steps: {len(data.get('immediate_containment_playbook', []))} steps")

print("\n=== ALL VERIFICATION TESTS COMPLETE ===")
