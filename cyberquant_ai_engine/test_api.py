import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent
sys.path.insert(0, str(ROOT_DIR))
sys.path.insert(0, str(BASE_DIR))

from app.routers.ai_chat import chat_endpoint, ChatRequest
from app.routers.ai_explain import explain_attack_endpoint, AttackRequest
from app.routers.ai_analyze import analyze_risk_endpoint, RiskAssessmentRequest
from app.routers.ai_budget import budget_allocation_endpoint, BudgetAllocationRequest
from app.routers.detection import receive_detection_result, DetectionResultInput
from app.main import home, health

print("==========================================================")
print("  CyberQuant AI (Firewall Force) — System Test Suite      ")
print("==========================================================")

print("\n[1/7] Testing Root Health & Meta Endpoints...")
h_res = home()
print(f"   ✓ Home: {h_res['message']} (Docs: {h_res['docs_url']})")
hlth = health()
print(f"   ✓ Health: {hlth['status']} | Environment: {hlth['environment']}")

print("\n[2/7] Testing Conversational AI Chatbot (`POST /ai/chat`)...")
chat_res = chat_endpoint(ChatRequest(
    message="What is Ransomware in simple terms?",
    simple_language=True
))
print(f"   ✓ Generated reply ({len(chat_res.reply)} chars)")
print(f"   ✓ Suggested follow-ups: {chat_res.suggested_followups[:2]}")

print("\n[3/7] Testing Attack Deep-Dive (`POST /ai/explain`)...")
explain_res = explain_attack_endpoint(AttackRequest(attack_name="Ransomware"))
print(f"   ✓ Attack: {explain_res.canonical_type} | Danger Level: {explain_res.danger_level}")
print(f"   ✓ Verified Incidents Attached: {len(explain_res.verified_historical_incidents)}")
print(f"     -> Example: {explain_res.verified_historical_incidents[0].incident_name} ({explain_res.verified_historical_incidents[0].year})")

print("\n[4/7] Testing 7-Factor Risk & Financial Impact Engine (`POST /ai/analyze`)...")
risk_res = analyze_risk_endpoint(RiskAssessmentRequest(
    attack_type="Ransomware",
    likelihood=4,
    financial_impact_scale=5,
    operational_impact=5,
    data_sensitivity="Confidential",
    organization_size="Medium",
    industry="Financial Services",
    existing_security_controls=["MFA", "EDR"]
))
print(f"   ✓ Risk Score: {risk_res.risk_score} / 100 ({risk_res.risk_level})")
print(f"   ✓ Controls Mitigation: -{risk_res.control_mitigation_score}%")
print(f"   ✓ Projected Loss Range: ${risk_res.total_projected_loss_min:,.0f} - ${risk_res.total_projected_loss_max:,.0f}")

print("\n[5/7] Testing Cybersecurity Budget & ROSI Optimizer (`POST /ai/budget`)...")
budget_res = budget_allocation_endpoint(BudgetAllocationRequest(
    organization_type="Fintech Enterprise",
    organization_size="Medium (100-1000)",
    annual_cybersecurity_budget=250000,
    currency="USD",
    existing_security_measures=["Firewall", "Antivirus"],
    attack_type="Ransomware"
))
print(f"   ✓ Allocated across {len(budget_res.allocations)} critical security categories")
print(f"   ✓ Expected Overall Risk Reduction: {budget_res.expected_overall_risk_reduction_pct}%")
print(f"   ✓ Estimated Return on Security Investment (ROSI): +{budget_res.rosi_analysis.estimated_rosi_percentage}%")

print("\n[6/7] Testing Teammate Attack Detection Integration (`POST /ai/detection-result`)...")
det_res = receive_detection_result(DetectionResultInput(
    attack_type="Ransomware",
    severity="Critical",
    confidence=94.0,
    source="Network Detection Module"
))
print(f"   ✓ Ingestion Event ID: {det_res.detection_id}")
print(f"   ✓ Organizational Risk: {det_res.organizational_risk_score} ({det_res.risk_level})")
print(f"   ✓ Containment Playbook Steps: {len(det_res.immediate_containment_playbook)}")
print(f"     -> Step 1 ({det_res.immediate_containment_playbook[0].timeline}): {det_res.immediate_containment_playbook[0].action}")

print("\n[7/7] Testing Standalone React SOC Dashboard...")
dashboard_path = ROOT_DIR / "frontend" / "static_dashboard.html"
assert dashboard_path.exists(), "Frontend static_dashboard.html not found!"
print(f"   ✓ Verified Dashboard HTML Asset: {dashboard_path.name} ({dashboard_path.stat().st_size:,} bytes)")

print("\n==========================================================")
print("  ✓ ALL 7 SYSTEM CAPABILITIES VERIFIED & READY!   ")
print("==========================================================")
