from fastapi import APIRouter, HTTPException
from app.schemas.attack import (
    AttackRequest,
    AttackExplainResponse,
    PreventionRecommendation,
    HistoricalIncidentBrief
)
from app.services.incident_service import incident_service
from app.services.gemini_service import gemini_service

router = APIRouter(prefix="/ai", tags=["Attack Explanation"])

ATTACK_DETAILS = {
    "Ransomware": {
        "summary": "Ransomware is malicious software that encrypts an organization's critical digital assets and demands a ransom payment in exchange for a decryption key, frequently coupled with the threat of leaking stolen confidential data on the dark web.",
        "how_it_works": [
            "Initial access obtained via spear-phishing attachments, compromised VPN credentials, or exposed RDP ports.",
            "Reconnaissance and privilege escalation to Domain Administrator using tools like Mimikatz or BloodHound.",
            "Lateral movement across network subnets while disabling local endpoint defenses and volume shadow copies.",
            "Exfiltration of sensitive confidential data to cloud storage under threat actor control.",
            "High-speed cryptographic locking of file shares, virtualization hosts, and databases using asymmetric encryption (AES + RSA).",
            "Drop of ransom note detailing Tor payment portal instructions and countdown timers."
        ],
        "vulnerabilities_exploited": [
            "Lack of Multi-Factor Authentication (MFA) on remote access portals (VPN, RDP).",
            "Unpatched internet-facing software vulnerabilities (e.g., Citrix CVE-2023-3519, FortiOS CVE-2024-1709, EternalBlue CVE-2017-0144).",
            "Shared local administrative passwords enabling Pass-the-Hash lateral movement.",
            "Lack of network segmentation between user workstations and core database servers."
        ],
        "affected_systems_and_data": [
            "Enterprise Storage Area Networks (SAN / NAS) and file repositories.",
            "Core relational databases (SQL, Oracle, PostgreSQL).",
            "Virtual machine hypervisors (VMware ESXi hosts).",
            "Enterprise Resource Planning (ERP) and financial payroll systems."
        ],
        "organizational_consequences": [
            "Catastrophic operational downtime lasting days to weeks.",
            "Extortion payments ranging from hundreds of thousands to tens of millions of dollars.",
            "Reputational damage and loss of customer confidence.",
            "Regulatory non-compliance penalties under GDPR, HIPAA, and DPDP laws.",
            "Legal litigation from impacted consumers and business partners."
        ],
        "danger_level": "Critical",
        "why_dangerous": "Ransomware directly threatens business continuity by weaponizing irreversible cryptography against operational infrastructure, capable of halting physical manufacturing, hospitals, or pipeline logistics within minutes.",
        "prevention": [
            PreventionRecommendation(category="Preventive", recommendation="Enforce phishing-resistant MFA across all external logins without exception.", priority="Critical", feasibility="Immediate"),
            PreventionRecommendation(category="Recovery", recommendation="Maintain immutable, air-gapped 3-2-1 backups tested via monthly disaster recovery drills.", priority="Critical", feasibility="Immediate"),
            PreventionRecommendation(category="Detection", recommendation="Deploy behavioral EDR with automated host isolation on mass file modification.", priority="High", feasibility="Short-term"),
            PreventionRecommendation(category="Training", recommendation="Conduct regular phishing awareness simulations focused on initial access lures.", priority="Medium", feasibility="Short-term")
        ]
    },
    "Phishing": {
        "summary": "Phishing is a deceptive social engineering attack where adversaries impersonate trusted entities (executives, cloud providers, banking partners) to manipulate individuals into disclosing credentials, authorizing wire transfers, or executing malware.",
        "how_it_works": [
            "Threat actors perform OSINT research to identify target organizational roles and communication styles.",
            "Spoofed emails or lookalike domain messages are dispatched with urgent call-to-action themes.",
            "Target clicks on a weaponized link leading to a reverse-proxy adversary-in-the-middle (AitM) phishing site.",
            "User enters credentials; the attacker proxies the request to the genuine site and intercepts the resulting session token.",
            "Compromised session token allows attacker to bypass 2FA and access enterprise email and document portals."
        ],
        "vulnerabilities_exploited": [
            "Human psychological cognitive biases (urgency, authority, fear of loss).",
            "Lack of DMARC, DKIM, and SPF domain authentication controls.",
            "Reliance on phishable second factors such as SMS codes or push notifications vulnerable to push fatigue.",
            "Absence of outbound anomalous bank transfer dual-authorization controls."
        ],
        "affected_systems_and_data": [
            "Corporate cloud email accounts (Microsoft 365, Google Workspace).",
            "Single Sign-On (SSO) identity provider sessions.",
            "Corporate bank accounts and vendor invoice payment processes.",
            "Internal employee directories and proprietary communications."
        ],
        "organizational_consequences": [
            "Direct fraudulent wire transfer theft (Business Email Compromise).",
            "Secondary supply chain compromises launched using the victim's verified email account.",
            "Unauthorized access to customer PII and sensitive intellectual property.",
            "Executive leadership liability and board reprimands."
        ],
        "danger_level": "High",
        "why_dangerous": "Phishing bypasses perimeter firewalls by targeting the human element, serving as the primary initial access vector in over a third of all global security breaches.",
        "prevention": [
            PreventionRecommendation(category="Preventive", recommendation="Enforce FIDO2 / WebAuthn hardware security keys for all staff.", priority="Critical", feasibility="Short-term"),
            PreventionRecommendation(category="Preventive", recommendation="Implement DMARC policy with 'p=reject' across all corporate domains.", priority="High", feasibility="Immediate"),
            PreventionRecommendation(category="Training", recommendation="Run realistic monthly spear-phishing training with immediate point-of-failure coaching.", priority="High", feasibility="Immediate"),
            PreventionRecommendation(category="Tools", recommendation="Deploy AI-powered natural language inbound email security filtering.", priority="Medium", feasibility="Short-term")
        ]
    },
    "DDoS": {
        "summary": "Distributed Denial of Service (DDoS) is a malicious attempt to disrupt the normal traffic of a targeted server, service, or network by overwhelming the target or its surrounding infrastructure with a flood of Internet traffic.",
        "how_it_works": [
            "Attackers infect thousands of internet-connected IoT devices, routers, or servers with botnet malware (e.g. Mirai).",
            "The botnet Command & Control (C2) server issues a simultaneous coordinated attack command.",
            "Bots flood target IP addresses with volumetric UDP reflection packets, TCP SYN handshakes, or HTTP GET/POST queries.",
            "Network bandwidth links, stateful firewalls, or application web server worker threads become completely exhausted.",
            "Legitimate customer packets are dropped, rendering digital services unavailable."
        ],
        "vulnerabilities_exploited": [
            "Open UDP reflection protocols on third-party servers (NTP, DNS, Memcached, SNMP).",
            "Unauthenticated factory-default passwords on consumer IoT hardware.",
            "Single points of failure in DNS name resolution or edge hosting infrastructure.",
            "Lack of adaptive traffic rate-limiting at application API gateways."
        ],
        "affected_systems_and_data": [
            "Public-facing web portals, mobile application APIs, and checkout flows.",
            "Authoritative DNS servers (e.g., Dyn DNS outage).",
            "Perimeter border routers, load balancers, and firewall connection tables."
        ],
        "organizational_consequences": [
            "Direct revenue loss during shopping seasons or trading sessions.",
            "Customer churn and migration to competitors due to service unavailability.",
            "Distraction tactic used by attackers to mask simultaneous data exfiltration.",
            "Overtime operational engineering costs spent battling outages."
        ],
        "danger_level": "High",
        "why_dangerous": "Even small botnets can generate gigabits of synthetic traffic capable of completely severing an organization's digital storefront from the global internet.",
        "prevention": [
            PreventionRecommendation(category="Tools", recommendation="Route external ingress traffic through Tier-1 Anycast cloud scrubbing networks (Cloudflare, Akamai, AWS Shield).", priority="Critical", feasibility="Immediate"),
            PreventionRecommendation(category="Preventive", recommendation="Deploy multi-provider secondary DNS architecture to eliminate single-point DNS failure.", priority="High", feasibility="Short-term"),
            PreventionRecommendation(category="Tools", recommendation="Configure token-bucket rate limiting and Web Application Firewall (WAF) bot heuristics.", priority="High", feasibility="Immediate"),
            PreventionRecommendation(category="Response", recommendation="Pre-arrange automated ISP BGP Flowspec blackholing playbooks.", priority="Medium", feasibility="Short-term")
        ]
    },
    "SQL Injection": {
        "summary": "SQL Injection (SQLi) is a code injection technique where malicious SQL statements are inserted into entry fields (search bars, URL parameters, login forms) for execution by the backend database.",
        "how_it_works": [
            "Attacker inputs malicious SQL characters (e.g. ' OR 1=1 --) into an unvalidated web form or query parameter.",
            "The backend application concatenates this input directly into a dynamic SQL query string.",
            "The database server parses the attacker's syntax as executable commands rather than literal data.",
            "The query bypasses password verification, dumps entire database tables, or writes OS backdoor shells."
        ],
        "vulnerabilities_exploited": [
            "Direct string concatenation when constructing SQL queries (CWE-89).",
            "Over-privileged database service accounts (e.g. running web applications as 'sa' or 'root').",
            "Excessive database error reporting revealing internal table structures to users.",
            "Absence of input validation and output encoding."
        ],
        "affected_systems_and_data": [
            "Relational databases (MySQL, MSSQL, PostgreSQL, Oracle).",
            "Customer credit card numbers, password hashes, and personal profiles.",
            "Underlying database operating system servers."
        ],
        "organizational_consequences": [
            "Catastrophic mass breach of confidential customer and financial records.",
            "Payment card brand fines and revocation of card processing rights.",
            "Severe regulatory penalties under GDPR and PCI-DSS.",
            "Permanent loss of corporate intellectual property."
        ],
        "danger_level": "Critical",
        "why_dangerous": "A single vulnerable input field can expose the entire backend database containing millions of customer records without requiring any system access credentials.",
        "prevention": [
            PreventionRecommendation(category="Preventive", recommendation="Mandate Parameterized Queries (Prepared Statements) or secure ORMs across all codebase endpoints.", priority="Critical", feasibility="Immediate"),
            PreventionRecommendation(category="Preventive", recommendation="Enforce Principle of Least Privilege: revoke administrative and schema modification rights from web DB accounts.", priority="Critical", feasibility="Immediate"),
            PreventionRecommendation(category="Detection", recommendation="Integrate automated Static Application Security Testing (SAST) in CI/CD pipeline.", priority="High", feasibility="Short-term"),
            PreventionRecommendation(category="Tools", recommendation="Deploy Web Application Firewall (WAF) with OWASP ModSecurity Core Rule Sets.", priority="High", feasibility="Immediate")
        ]
    }
}

DEFAULT_EXPLANATION = {
    "summary": "A cybersecurity threat targeting confidentiality, integrity, or availability of institutional digital infrastructure through unauthorized software execution, vulnerability exploitation, or deceptive communication.",
    "how_it_works": [
        "Vulnerability reconnaissance and perimeter probe identification.",
        "Exploitation of weak configuration, missing patch, or user credential.",
        "Execution of unauthorized commands or payload deployment.",
        "Extraction of sensitive information or denial of service."
    ],
    "vulnerabilities_exploited": [
        "Unpatched software vulnerabilities (CVEs).",
        "Weak or re-used administrative credentials.",
        "Inadequate network isolation and missing telemetry logs."
    ],
    "affected_systems_and_data": [
        "Corporate endpoints, servers, and cloud workloads.",
        "Confidential customer records and financial repositories."
    ],
    "organizational_consequences": [
        "Business downtime, regulatory fines, and operational remediation expenses."
    ],
    "danger_level": "High",
    "why_dangerous": "Threat actors can rapidly escalate privileges, persist in enterprise networks undetected, and cause catastrophic operational and financial damage.",
    "prevention": [
        PreventionRecommendation(category="Preventive", recommendation="Enforce Multi-Factor Authentication and Zero Trust least-privilege access.", priority="Critical", feasibility="Immediate"),
        PreventionRecommendation(category="Detection", recommendation="Centralize endpoint telemetry in a 24/7 monitored SIEM platform.", priority="High", feasibility="Short-term"),
        PreventionRecommendation(category="Recovery", recommendation="Establish tested offline backup procedures and incident response playbooks.", priority="High", feasibility="Immediate")
    ]
}

@router.post("/explain", response_model=AttackExplainResponse)
def explain_attack_endpoint(request: AttackRequest):
    """
    8-Section Attack Explanation and Analysis Endpoint:
    Generates structured, authoritative report adhering strictly to:
    1. TYPE OF ATTACK
    2. VULNERABILITY EXPLOITED
    3. HISTORICAL INCIDENTS
    4. RISK FACTOR
    5. DETECTION MEASURES
    6. POSSIBLE IMPACT
    7. PREVENTION AND MITIGATION
    8. IMMEDIATE ACTION SUMMARY
    """
    attack_name = request.get_attack_name()
    canonical = incident_service.normalize_attack_type(attack_name)
    details = ATTACK_DETAILS.get(canonical, DEFAULT_EXPLANATION)

    # Generate full 8-section analysis text
    analysis_res = gemini_service.analyze_attack(
        attack_type=canonical,
        detection_details=request.get_detection_details(),
        simple_language=request.simple_language
    )

    # Fetch verified historical incidents
    raw_incidents = incident_service.get_incidents_by_attack(canonical, limit=3)
    verified_briefs = []
    for inc in raw_incidents:
        verified_briefs.append(
            HistoricalIncidentBrief(
                incident_name=inc["incident_name"],
                organization=inc["organization"],
                country=inc["country"],
                year=inc["year"],
                consequences=inc["consequences"],
                financial_losses=inc["financial_losses"],
                is_verified_financial=inc.get("is_verified_financial", False),
                sources=inc.get("sources", [])
            )
        )

    return AttackExplainResponse(
        attack_name=attack_name,
        canonical_type=canonical,
        structured_analysis=analysis_res["analysis_markdown"],
        summary=details["summary"],
        how_it_works=details["how_it_works"],
        vulnerabilities_exploited=details["vulnerabilities_exploited"],
        affected_systems_and_data=details["affected_systems_and_data"],
        organizational_consequences=details["organizational_consequences"],
        danger_level=details["danger_level"],
        why_dangerous=details["why_dangerous"],
        prevention_highlights=details["prevention"],
        verified_historical_incidents=verified_briefs,
        suggested_followups=analysis_res.get("suggested_followups", [])
    )
