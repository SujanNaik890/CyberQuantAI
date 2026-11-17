import urllib.request
import json

attacks = ["Ransomware", "Phishing", "DDoS", "SQL Injection"]
checks = [
    ("Section 1 - TYPE OF ATTACK", "## 1. TYPE OF ATTACK"),
    ("Section 2 - VULNERABILITY EXPLOITED", "## 2. VULNERABILITY EXPLOITED"),
    ("Section 2 - Causality Note (Confirmed vs Possible)", "Causality"),
    ("Section 3 - HISTORICAL INCIDENTS", "## 3. HISTORICAL INCIDENTS"),
    ("Section 4 - RISK FACTOR", "## 4. RISK FACTOR"),
    ("Section 4 - Risk Classification (Critical/High)", "Risk Classification"),
    ("Section 4 - Detection Confidence vs Risk Distinction", "Detection Confidence vs. Risk Distinction"),
    ("Section 4 - Preliminary Assessment Note", "Preliminary Assessment Note"),
    ("Section 5 - DETECTION MEASURES", "## 5. DETECTION MEASURES"),
    ("Section 5 - IOCs & Logs", "Indicators of Compromise"),
    ("Section 6 - POSSIBLE IMPACT", "## 6. POSSIBLE IMPACT"),
    ("Section 6 - Potential vs Confirmed Distinction", "Distinguish"),
    ("Section 7 - PREVENTION AND MITIGATION", "## 7. PREVENTION AND MITIGATION"),
    ("Section 7 - Part A Prevention", "### A. Prevention"),
    ("Section 7 - Part B Immediate Response", "### B. Immediate Response"),
    ("Section 8 - IMMEDIATE ACTION SUMMARY", "## 8. IMMEDIATE ACTION SUMMARY")
]

for atk in attacks:
    req = urllib.request.Request(
        "http://127.0.0.1:8000/ai/explain",
        data=json.dumps({"attack_type": atk}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        report = data["structured_analysis"]
        print(f"=== AUDIT REPORT FOR: {atk} ===")
        all_passed = True
        for name, phrase in checks:
            present = phrase.lower() in report.lower()
            if not present:
                all_passed = False
                print(f"  [FAIL] {name} - missing phrase '{phrase}'")
            else:
                print(f"  [PASS] {name}")
        if all_passed:
            print(f"  ==> {atk}: 100% COMPLIANT WITH ALL REQUIREMENTS\n")
