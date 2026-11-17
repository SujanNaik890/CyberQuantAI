import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException
from app.schemas.detection import DetectionResultInput, DetectionAnalysisResponse, ImmediateAction
from app.schemas.risk import RiskAssessmentRequest
from app.services.risk_service import risk_service
from app.services.incident_service import incident_service
from app.services.gemini_service import gemini_service

router = APIRouter(prefix="/ai", tags=["Detection Module Integration"])

PLAYBOOKS = {
    "Ransomware": [
        ImmediateAction(step=1, action="Isolate affected host from network (sever Ethernet, disable Wi-Fi/VLAN)", timeline="Immediate (0-5 min)", owner="SOC Tier-1 / Firewall Admin"),
        ImmediateAction(step=2, action="Suspend compromised user AD credentials & revoke active Kerberos/OAuth tokens", timeline="Within 15 min", owner="IAM / SysAdmin"),
        ImmediateAction(step=3, action="Verify offline integrity of immutable air-gapped backups before any reboot", timeline="Within 30 min", owner="Backup & Storage Lead"),
        ImmediateAction(step=4, action="Initiate volatile RAM capture & disk triage for digital forensic artifacts", timeline="Within 1 hour", owner="DFIR Team")
    ],
    "SQL Injection": [
        ImmediateAction(step=1, action="Temporarily enable strict WAF blocking rule on the targeted URI endpoint", timeline="Immediate (0-5 min)", owner="WAF / SecOps"),
        ImmediateAction(step=2, action="Inspect database audit logs to determine if unauthorized data exfiltration occurred", timeline="Within 30 min", owner="DBA / Security Analyst"),
        ImmediateAction(step=3, action="Rotate database credentials used by the vulnerable web application service", timeline="Within 45 min", owner="DevOps / DBA"),
        ImmediateAction(step=4, action="Deploy hotfix converting the vulnerable query to parameterized prepared statement", timeline="Within 2 hours", owner="Application Engineering")
    ],
    "DDoS": [
        ImmediateAction(step=1, action="Activate Anycast cloud scrubbing diversion policy (Cloudflare / Akamai / AWS Shield)", timeline="Immediate (0-5 min)", owner="Network Operations / NOC"),
        ImmediateAction(step=2, action="Enable aggressive challenge mode (JS challenge / CAPTCHA) at application edge", timeline="Within 10 min", owner="Edge Engineering"),
        ImmediateAction(step=3, action="Request upstream ISP BGP Flowspec rate-limiting on identified amplification ports (UDP 123/389/11211)", timeline="Within 20 min", owner="ISP Liaison / NOC"),
        ImmediateAction(step=4, action="Scale cloud backend compute replicas behind origin shield to prevent resource starvation", timeline="Within 30 min", owner="Cloud Ops")
    ],
    "Phishing": [
        ImmediateAction(step=1, action="Purge the malicious email across all enterprise mailboxes via Exchange/Google API", timeline="Immediate (0-10 min)", owner="Messaging / SOC Analyst"),
        ImmediateAction(step=2, action="Force password reset and terminate active SSO sessions for users who clicked the link", timeline="Within 15 min", owner="IAM Admin"),
        ImmediateAction(step=3, action="Block the phishing domain and associated IP across corporate perimeter proxies and DNS resolvers", timeline="Within 20 min", owner="SecOps"),
        ImmediateAction(step=4, action="Send security awareness broadcast alerting employees of the active campaign", timeline="Within 45 min", owner="CISO / Awareness Lead")
    ]
}

DEFAULT_PLAYBOOK = [
    ImmediateAction(step=1, action="Quarantine target asset and collect triage forensic memory dump", timeline="Immediate (0-15 min)", owner="Incident Responder"),
    ImmediateAction(step=2, action="Review firewall and SIEM connection logs for outbound beaconing or lateral movement", timeline="Within 30 min", owner="SOC Analyst"),
    ImmediateAction(step=3, action="Engage third-party Incident Response retainer team for root cause analysis", timeline="Within 1 hour", owner="Security Leadership")
]

@router.post("/detection-result", response_model=DetectionAnalysisResponse)
def receive_detection_result(input_data: DetectionResultInput):
    """
    Teammate Integration Hook:
    - Receives live detection outputs from your teammate's Network or Host detection module.
    - Generates instant risk categorization, containment playbooks, and historical grounding.
    - Emits structured event payload for the unified dashboard.
    """
    detection_id = f"DET-{uuid.uuid4().hex[:8].upper()}"
    attack = incident_service.normalize_attack_type(input_data.attack_type)

    # Calculate organizational risk based on attack type and sensor confidence
    # Mapping sensor severity to initial likelihood & financial scale
    sev_map = {"low": 2, "medium": 3, "high": 4, "critical": 5}
    sev_num = sev_map.get(input_data.severity.lower(), 4)

    risk_req = RiskAssessmentRequest(
        attack_type=attack,
        likelihood=sev_num,
        financial_impact_scale=sev_num,
        operational_impact=sev_num,
        data_sensitivity="Confidential",
        organization_size="Medium",
        industry="Financial Services",
        existing_security_controls=["MFA", "Firewall"]
    )
    risk_res = risk_service.calculate_risk(risk_req)

    # Select containment playbook
    playbook = PLAYBOOKS.get(attack, DEFAULT_PLAYBOOK)

    # Historical incident reference
    historical_matches = incident_service.get_incidents_by_attack(attack, limit=1)
    hist_ref = historical_matches[0] if historical_matches else None

    # Projected downtime
    downtime_map = {
        "Ransomware": "48 - 120 Hours (Full Enterprise Decryption & Verification)",
        "DDoS": "2 - 8 Hours (Until Traffic Scrubbing Diversion Stabilizes)",
        "SQL Injection": "12 - 24 Hours (Forensic Inspection & Data Leak Auditing)",
        "Phishing": "4 - 12 Hours (Credential Revocation & Mailbox Purging)"
    }
    downtime = downtime_map.get(attack, "8 - 24 Hours (Investigation & Containment)")

    # Generate 8-section AI explanation and analysis report tailored to this detection alert
    ai_report = gemini_service.analyze_attack(
        attack_type=attack,
        detection_details={
            "attack_type": attack,
            "severity": input_data.severity,
            "confidence": input_data.confidence,
            "source": input_data.source,
            "target_asset": input_data.target_asset,
            "raw_payload_snippet": input_data.raw_payload_snippet
        }
    )
    structured_analysis_text = ai_report.get("analysis_markdown", "")

    briefing = (
        f"ALERT INGESTION NOTICE: Teammate module '{input_data.source}' detected an active {attack} threat "
        f"with {input_data.confidence}% sensor confidence and '{input_data.severity}' severity rating. "
        f"Our decision support engine evaluated organizational exposure at Risk Score {risk_res.risk_score}/100 "
        f"({risk_res.risk_level}). Immediate containment actions have been compiled below."
    )

    next_steps = [
        "Execute containment playbook steps immediately in order of priority.",
        "Cross-verify sensor indicators against endpoint telemetry to rule out false positives.",
        "Launch interactive AI chatbot session on dashboard to explore remediation commands.",
        "Review budget optimizer for long-term defensive control hardening against this vector."
    ]

    return DetectionAnalysisResponse(
        detection_id=detection_id,
        received_attack_type=attack,
        sensor_confidence=input_data.confidence,
        sensor_severity=input_data.severity,
        detection_source=input_data.source,
        organizational_risk_score=risk_res.risk_score,
        risk_level=risk_res.risk_level,
        briefing=briefing,
        structured_analysis=structured_analysis_text,
        immediate_containment_playbook=playbook,
        technical_explanation_summary=f"Automated analysis indicates that {attack} compromises target availability and confidentiality if unmitigated.",
        historical_reference=hist_ref,
        projected_downtime_hours_estimate=downtime,
        next_steps_for_analyst=next_steps
    )
