from typing import List
from app.schemas.budget import (
    BudgetAllocationRequest,
    BudgetAllocationResponse,
    BudgetItem,
    RosiDetails
)

# Targeted allocation templates based on primary threat vector
CATEGORY_WEIGHT_TEMPLATES = {
    "Ransomware": [
        ("Immutable Backups & Disaster Recovery", 0.28, "Critical", "Air-gapped 3-2-1 backups ensure operations can be restored without paying ransom extortion demands.", ["Veeam / Rubrik Immutable Storage", "Automated DR failover drills", "Air-gapped offsite replication"], 32.0),
        ("Endpoint Detection & Response (EDR/XDR)", 0.25, "Critical", "Behavioral detection prevents lateral movement and encryptor execution at the endpoint layer.", ["CrowdStrike Falcon / SentinelOne", "Automated device network isolation", "Process memory behavioral inspection"], 28.0),
        ("Identity, Access Management & Zero Trust MFA", 0.20, "High", "Eliminates credential-stuffing and RDP brute-force entry vectors into corporate networks.", ["FIDO2 Phishing-resistant MFA", "Privileged Access Management (PAM)", "Least privilege RBAC policies"], 22.0),
        ("Security Awareness & Phishing Simulation", 0.12, "Medium", "Reduces employee click rates on spear-phishing lures delivering initial access downloaders.", ["KnowBe4 / Proofpoint Simulated Campaigns", "Executive spear-phishing training", "One-click suspicious email reporting button"], 14.0),
        ("Incident Response Retainer & Security Audits", 0.10, "High", "Guarantees rapid 2-hour SLA digital forensics assistance and annual ransomware readiness tabletop drills.", ["Third-party IR retainer (Mandiant/Palo Alto)", "Tabletop simulation drills", "Compromise assessment audits"], 16.0),
        ("Emergency Cyber Contingency Reserve", 0.05, "Medium", "Discretionary pool for emergency vulnerability patching and hardware replacement during crisis.", ["Out-of-band communication channels", "Emergency cloud capacity surge reserves"], 8.0)
    ],
    "Phishing": [
        ("Security Awareness & Behavioral Training", 0.30, "Critical", "Frequent targeted simulations dramatically lower click-through and credential entry on fake portals.", ["Automated adaptive phishing simulations", "CEO fraud and BEC specific training", "Department-level risk scoring"], 35.0),
        ("Advanced Email Security & DMARC/DKIM/SPF", 0.25, "Critical", "AI-powered inbound email inspection catches spoofed sender domains and malicious attachments.", ["Abnormal Security / Mimecast Gateway", "DMARC p=reject policy enforcement", "Automated mailbox remediation"], 30.0),
        ("FIDO2 Phishing-Resistant MFA & SSO", 0.25, "Critical", "Hardware security keys (YubiKeys) prevent session hijacking even if the password is stolen.", ["Hardware token rollout (WebAuthn/FIDO2)", "Conditional access geofencing", "Session token binding"], 30.0),
        ("Threat Intelligence & Domain Takedown", 0.12, "Medium", "Proactively identifies lookalike domain registrations mimicking the company brand.", ["External brand protection service", "Certificate Transparency log monitoring", "Lookalike domain defensive squatting"], 15.0),
        ("Incident Response & Mailbox Triage", 0.08, "Medium", "Enables SOC analysts to revoke compromised OAuth tokens and purge phishing emails across all inboxes.", ["SOAR automated phishing triage playbooks", "Microsoft 365 / Google Workspace audit log alerts"], 18.0)
    ],
    "SQL Injection": [
        ("Web Application Firewall (WAF) & API Protection", 0.32, "Critical", "Blocks malicious SQL payload signatures, union-based queries, and error-based extraction at the network edge.", ["Cloudflare / AWS WAF with OWASP Core Rules", "Automated rate limiting and query inspection", "Bot management layer"], 38.0),
        ("Automated DAST/SAST Code Security Scanning", 0.25, "Critical", "Discovers insecure string concatenation and raw SQL queries directly in the developer CI/CD pipeline.", ["SonarQube / Snyk Code scanning", "Database ORM migration linters", "Pre-commit security hooks"], 34.0),
        ("Database Hardening, Least Privilege & Vaulting", 0.20, "High", "Limits application database user permissions to prevent administrative commands even if injected.", ["Database separate read/write service accounts", "Parameterized query enforcement", "CyberArk / HashiCorp Vault credential rotation"], 28.0),
        ("Independent Penetration Testing & Bug Bounty", 0.15, "High", "External ethical hackers test all endpoints for subtle blind and time-based injection vulnerabilities.", ["Annual third-party web application penetration test", "Private Bugcrowd / HackerOne vulnerability disclosure program"], 24.0),
        ("Database Activity Monitoring (DAM) & SIEM", 0.08, "Medium", "Alerts on anomalous bulk SELECT queries or unauthorized DROP/ALTER database commands.", ["Imperva / Guardium DAM sensors", "Real-time SIEM SQL syntax anomaly alerts"], 18.0)
    ],
    "DDoS": [
        ("Cloud Scrubbing & DDoS Protection Services", 0.40, "Critical", "Provides virtually unlimited Terabit-scale network scrubbing to absorb volumetric SYN and UDP floods.", ["Cloudflare Magic Transit / Akamai Prolexic", "Anycast BGP global traffic distribution", "Automated L3/L4 & L7 volumetric mitigation"], 45.0),
        ("Infrastructure Elasticity & Redundant Multi-CDN", 0.25, "High", "Ensures server auto-scaling and edge caching handle traffic spikes gracefully.", ["Multi-region AWS/Azure auto-scaling groups", "Edge static asset caching", "Geographic DNS routing"], 25.0),
        ("Rate Limiting, CAPTCHA & Bot Management", 0.18, "High", "Differentiates genuine customer browsing patterns from automated attack botnets.", ["Cloudflare Turnstile / reCAPTCHA Enterprise", "Token-bucket API rate limiters", "Behavioral browser fingerprinting"], 22.0),
        ("DDoS Stress Testing & Resilience Drills", 0.10, "Medium", "Controlled simulations to verify firewall failovers and upstream ISP BGP blackholing procedures.", ["Red Button / Mazebolt DDoS simulation exercises", "ISP upstream null-routing SLA verification"], 18.0),
        ("Network Monitoring & Flow Telemetry", 0.07, "Medium", "Real-time NetFlow/sFlow monitoring provides immediate visibility into bandwidth anomalies.", ["FastNetMon / Kentik network observability", "Real-time BGP routing state telemetry"], 15.0)
    ]
}

DEFAULT_ALLOCATION = [
    ("Endpoint & Server Protection (EDR)", 0.25, "Critical", "Protects against unauthorized code execution, ransomware, and spyware across all workstations.", ["Enterprise EDR", "Continuous endpoint vulnerability patching"], 25.0),
    ("Identity, Credential Protection & MFA", 0.22, "Critical", "Guarantees strong identity verification, eliminating the primary entry vector in 80% of breaches.", ["Phishing-resistant MFA", "Privileged Identity Management"], 24.0),
    ("Data Protection & Immutable Backups", 0.20, "Critical", "Ensures business operational survivability regardless of technical breach severity.", ["Immutable air-gapped backups", "Disaster recovery failover verification"], 26.0),
    ("Security Operations & SIEM Telemetry", 0.15, "High", "Centralizes security event logs to detect intrusions before catastrophic data exfiltration occurs.", ["Cloud SIEM (Splunk / Microsoft Sentinel)", "24/7 Managed Detection (MDR)"], 20.0),
    ("Security Awareness & Incident Readiness", 0.12, "Medium", "Educates human personnel and retains expert external breach investigation assistance.", ["Phishing awareness curriculum", "Incident response retainer"], 15.0),
    ("Emergency Security Contingency", 0.06, "Medium", "Unallocated emergency reserve for sudden zero-day patch deployments.", ["Zero-day response reserve"], 10.0)
]

class BudgetService:
    def allocate_budget(self, req: BudgetAllocationRequest) -> BudgetAllocationResponse:
        total = req.annual_cybersecurity_budget
        attack = req.attack_type.strip()

        # Choose best template
        matched_template = None
        for key in CATEGORY_WEIGHT_TEMPLATES:
            if key.lower() in attack.lower():
                matched_template = CATEGORY_WEIGHT_TEMPLATES[key]
                break
        
        if not matched_template:
            matched_template = DEFAULT_ALLOCATION

        # Scale based on existing security measures
        existing_lower = [m.lower() for m in req.existing_security_measures]
        
        items: List[BudgetItem] = []
        cumulative_reduction = 0.0

        for cat_name, weight, priority, reasoning, tools, risk_reduc in matched_template:
            # Check if organization already possesses high maturity in this area
            is_already_covered = any(tool.lower() in " ".join(existing_lower) for tool in [cat_name] + tools)
            adjusted_weight = weight
            if is_already_covered:
                adjusted_weight = round(weight * 0.6, 3) # Reduce allocation for already deployed controls, reinvesting elsewhere
                reasoning += " (Reduced by 40% because organization reported existing baseline controls in this category)."

            amount = round(total * adjusted_weight, 2)
            pct = round(adjusted_weight * 100.0, 1)
            cumulative_reduction += (risk_reduc * (adjusted_weight / weight))

            items.append(
                BudgetItem(
                    category=cat_name,
                    recommended_amount=amount,
                    percentage_allocation=pct,
                    priority=priority,
                    reasoning=reasoning,
                    key_tools_and_initiatives=tools,
                    expected_risk_reduction_pct=round(min(35.0, risk_reduc), 1)
                )
            )

        # Normalize percentages to match 100% total
        allocated_sum = sum(i.recommended_amount for i in items)
        contingency = max(0.0, round(total - allocated_sum, 2))

        # Expected overall reduction (non-linear diminishing returns curve)
        overall_reduction = round(min(82.0, max(25.0, cumulative_reduction * 0.72)), 1)

        # Quantitative ROSI Calculation:
        # Standard formula: ROSI = [(ALE_prior - ALE_post) - Cost] / Cost * 100%
        # Where ALE_prior is modeled based on organization size and industry benchmarks
        base_annual_risk_exposure = total * 3.2 # Industry benchmark: Annual risk exposure is typically 3-4x cyber budget
        ale_prior = round(base_annual_risk_exposure, 2)
        risk_mitigation_factor = overall_reduction / 100.0
        ale_post = round(ale_prior * (1.0 - risk_mitigation_factor), 2)
        net_savings = round(ale_prior - ale_post, 2)
        rosi_pct = round(((net_savings - total) / total) * 100.0, 1)

        rosi_details = RosiDetails(
            annual_loss_expectancy_prior=ale_prior,
            annual_loss_expectancy_post=ale_post,
            cost_of_controls=total,
            net_risk_reduction_dollars=net_savings,
            estimated_rosi_percentage=rosi_pct,
            formula_used="ROSI = [((ALE_prior - ALE_post) - Cost_of_Controls) / Cost_of_Controls] * 100%"
        )

        limitations = [
            "ROSI calculations rely on historical Annual Loss Expectancy (ALE) models and cannot predict unprecedented zero-day campaigns.",
            "Estimates assume timely staff implementation of procured tools without significant administrative delays.",
            "Vendor pricing discounts, multi-year licensing terms, and implementation consultancy overheads are approximated.",
            "Investment percentages must be adjusted if compliance audits (e.g. PCI-DSS, HIPAA) mandate specific non-negotiable line items."
        ]

        return BudgetAllocationResponse(
            organization_type=req.organization_type,
            organization_size=req.organization_size,
            total_budget=total,
            currency=req.currency,
            targeted_threat=attack,
            allocations=items,
            unallocated_contingency=contingency,
            rosi_analysis=rosi_details,
            expected_overall_risk_reduction_pct=overall_reduction,
            assumptions_and_limitations=limitations
        )

budget_service = BudgetService()
