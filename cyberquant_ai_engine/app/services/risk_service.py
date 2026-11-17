from typing import List, Dict, Any, Optional
from app.schemas.risk import (
    RiskAssessmentRequest,
    RiskAssessmentResponse,
    FactorScore,
    FinancialImpactComponent
)
from app.services.incident_service import incident_service

DATA_SENSITIVITY_WEIGHTS = {
    "public": 15.0,
    "internal": 35.0,
    "confidential": 65.0,
    "restricted": 85.0,
    "pii/phi/cardholder": 100.0,
    "pii/phi": 100.0
}

ORG_SIZE_MULTIPLIERS = {
    "small": 0.75,       # Lower absolute attack surface, but high vulnerability
    "medium": 1.0,       # Standard benchmark
    "large": 1.25,      # High attack surface and regulatory scrutiny
    "enterprise": 1.5   # Massive global attack surface
}

INDUSTRY_MULTIPLIERS = {
    "healthcare": 1.45,             # Critical life safety + high HIPAA penalties
    "financial services": 1.40,     # Strict regulatory fines + direct capital theft
    "critical infrastructure": 1.50,# National security & public safety
    "e-commerce": 1.15,             # Direct revenue loss per hour
    "technology": 1.10,             # IP theft & supply chain blast radius
    "education": 0.85,              # High volume, moderate regulatory exposure
    "government": 1.30              # Espionage & national infrastructure
}

KNOWN_CONTROLS_EFFECTIVENESS = {
    "mfa": 15.0,
    "multi-factor authentication": 15.0,
    "edr": 12.0,
    "endpoint detection and response": 12.0,
    "xdr": 14.0,
    "immutable backups": 16.0,
    "air-gapped backups": 16.0,
    "siem": 10.0,
    "soc": 12.0,
    "waf": 9.0,
    "web application firewall": 9.0,
    "security awareness training": 8.0,
    "patch management": 11.0,
    "network segmentation": 12.0,
    "zero trust": 15.0
}

class RiskService:
    def calculate_risk(self, req: RiskAssessmentRequest) -> RiskAssessmentResponse:
        # 1. Normalized Factor Scores (Scale 0 - 100)
        f_likelihood = (req.likelihood / 5.0) * 100.0
        f_fin_impact = (req.financial_impact_scale / 5.0) * 100.0
        f_ops_impact = (req.operational_impact / 5.0) * 100.0
        
        sens_key = req.data_sensitivity.strip().lower()
        f_data_sens = DATA_SENSITIVITY_WEIGHTS.get(sens_key, 60.0)

        size_key = req.organization_size.split()[0].strip().lower()
        size_mult = ORG_SIZE_MULTIPLIERS.get(size_key, 1.0)

        ind_key = req.industry.strip().lower()
        ind_mult = 1.0
        for k, v in INDUSTRY_MULTIPLIERS.items():
            if k in ind_key:
                ind_mult = v
                break

        # Base Inherent Risk Formula (Weighted sum scaled by industry & size)
        # Weights: Likelihood (25%), Financial Impact (25%), Operational (25%), Data Sensitivity (25%)
        base_inherent = (
            (f_likelihood * 0.25) +
            (f_fin_impact * 0.25) +
            (f_ops_impact * 0.25) +
            (f_data_sens * 0.25)
        )
        scaled_inherent = base_inherent * ((size_mult + ind_mult) / 2.0)

        # 2. Controls Mitigation Calculation
        total_mitigation = 0.0
        controls_lower = [c.strip().lower() for c in req.existing_security_controls]
        for ctrl in controls_lower:
            for known_ctrl, eff in KNOWN_CONTROLS_EFFECTIVENESS.items():
                if known_ctrl in ctrl:
                    total_mitigation += eff
                    break
        
        # Max mitigation capped at 65% (residual risk always exists)
        effective_mitigation_pct = min(65.0, total_mitigation)

        # 3. Residual Risk Score (0 - 100)
        residual_score = scaled_inherent * (1.0 - (effective_mitigation_pct / 100.0))
        final_risk_score = round(max(5.0, min(99.0, residual_score)), 1)

        # 4. Risk Classification
        if final_risk_score >= 80.0:
            level = "Critical"
        elif final_risk_score >= 60.0:
            level = "High"
        elif final_risk_score >= 30.0:
            level = "Medium"
        else:
            level = "Low"

        # 5. Factor Breakdown List
        factors = [
            FactorScore(
                factor_name="Attack Likelihood",
                weight=0.25,
                raw_value=f"{req.likelihood} / 5",
                normalized_score=f_likelihood,
                reasoning=f"Assesses historical exploit frequency and threat actor targeting intensity for {req.attack_type}."
            ),
            FactorScore(
                factor_name="Potential Financial Impact",
                weight=0.25,
                raw_value=f"{req.financial_impact_scale} / 5",
                normalized_score=f_fin_impact,
                reasoning="Evaluates projected direct balance sheet exposure and business disruption costs."
            ),
            FactorScore(
                factor_name="Operational Mission Disruption",
                weight=0.25,
                raw_value=f"{req.operational_impact} / 5",
                normalized_score=f_ops_impact,
                reasoning="Estimates downtime duration, supply chain halt, and critical customer SLA breaches."
            ),
            FactorScore(
                factor_name="Data Sensitivity Classification",
                weight=0.25,
                raw_value=req.data_sensitivity,
                normalized_score=f_data_sens,
                reasoning=f"Reflects regulatory and privacy breach penalties under GDPR, HIPAA, and DPDP Act for {req.data_sensitivity} records."
            ),
            FactorScore(
                factor_name="Industry Sector Exposure Multiplier",
                weight=0.15,
                raw_value=f"{req.industry} (x{ind_mult})",
                normalized_score=round(ind_mult * 50, 1),
                reasoning=f"Reflects threat actor interest and compliance penalty stringency in {req.industry}."
            ),
            FactorScore(
                factor_name="Existing Control Effectiveness",
                weight=-0.35,
                raw_value=f"{len(req.existing_security_controls)} Controls Active",
                normalized_score=effective_mitigation_pct,
                reasoning=f"Active defenses ({', '.join(req.existing_security_controls) or 'None'}) reduced inherent risk exposure by {effective_mitigation_pct}%."
            )
        ]

        # 6. Financial Impact Analysis (Distinguishing Historical from Projected)
        size_scale_factor = {"small": 0.3, "medium": 1.0, "large": 3.5, "enterprise": 10.0}.get(size_key, 1.0)
        
        financial_breakdown = [
            FinancialImpactComponent(
                category="Operational Downtime & Business Interruption",
                projected_min=round(25000.0 * size_scale_factor * req.operational_impact, 2),
                projected_max=round(95000.0 * size_scale_factor * req.operational_impact, 2),
                currency="USD",
                description="Halted transactions, idle workforce payroll, and contractual delivery penalty fees.",
                is_historical_loss=False,
                basis_of_estimate="Calculated from average hourly downtime costs per organization size tier."
            ),
            FinancialImpactComponent(
                category="Data Recovery & Forensic Incident Investigation",
                projected_min=round(15000.0 * size_scale_factor * (f_data_sens / 50.0), 2),
                projected_max=round(60000.0 * size_scale_factor * (f_data_sens / 50.0), 2),
                currency="USD",
                description="Third-party digital forensics retainers, malware eradication, and system re-imaging.",
                is_historical_loss=False,
                basis_of_estimate="Standard rates for accredited incident response firms ($350-$550/hr retainers)."
            ),
            FinancialImpactComponent(
                category="Legal Expenses & Breach Notification",
                projected_min=round(10000.0 * size_scale_factor * (f_data_sens / 50.0), 2),
                projected_max=round(45000.0 * size_scale_factor * (f_data_sens / 50.0), 2),
                currency="USD",
                description="External privacy counsel, customer notification letters, and credit monitoring services.",
                is_historical_loss=False,
                basis_of_estimate="Statutory notification requirements under privacy laws (average $2.50 per notified individual)."
            ),
            FinancialImpactComponent(
                category="Regulatory Penalties & Compliance Sanctions",
                projected_min=round(5000.0 * size_scale_factor * ind_mult, 2),
                projected_max=round(75000.0 * size_scale_factor * ind_mult, 2),
                currency="USD",
                description="Statutory fines from DPDP, GDPR, SEC, or HIPAA for inadequate security safeguards.",
                is_historical_loss=False,
                basis_of_estimate="Sector enforcement precedent benchmarks for demonstrated security negligence."
            ),
            FinancialImpactComponent(
                category="Reputational Damage & Customer Churn",
                projected_min=round(20000.0 * size_scale_factor, 2),
                projected_max=round(80000.0 * size_scale_factor, 2),
                currency="USD",
                description="Lost future contracts, customer defection, stock devaluation, and PR containment campaigns.",
                is_historical_loss=False,
                basis_of_estimate="IBM Cost of a Data Breach benchmark (averages 31% of total breach cost attributed to customer turnover)."
            )
        ]

        total_min = round(sum(c.projected_min for c in financial_breakdown), 2)
        total_max = round(sum(c.projected_max for c in financial_breakdown), 2)

        # Historical benchmark incident
        incidents = incident_service.get_incidents_by_attack(req.attack_type, limit=1)
        benchmark_note = None
        if incidents:
            top_inc = incidents[0]
            benchmark_note = f"Historical Benchmark: {top_inc['incident_name']} ({top_inc['year']}) resulted in reported losses of {top_inc['financial_losses']}."

        # Explicit Detection Confidence vs Organizational Risk
        detection_vs_risk_note = (
            "CRITICAL DISTINCTION: Detection confidence (sensor accuracy) measures how certain an intrusion "
            "detection system is that a malicious packet or behavioral signature matches an attack pattern (e.g., 94% confidence). "
            "In contrast, Organizational Risk measures the actual business, operational, and financial damage that "
            "success of this attack would inflict on the enterprise, accounting for target asset criticality, data sensitivity, "
            "and defensive control depth."
        )

        reasoning = (
            f"The calculated risk score of {final_risk_score}/100 places this threat at '{level}' severity. "
            f"Inherent exposure was driven by a likelihood rating of {req.likelihood}/5 and operational impact of {req.operational_impact}/5 "
            f"in the {req.industry} sector. Active defenses provided an estimated {effective_mitigation_pct}% risk reduction, "
            f"resulting in a projected residual financial loss range of ${total_min:,.2f} - ${total_max:,.2f}."
        )

        limitations = [
            "Projections reflect aggregate sector averages and are not a legal guarantee of loss ceilings.",
            "Actual incident remediation expenses depend heavily on dwell time prior to initial detection.",
            "Cyber insurance deductibles, policy exclusions, and ransom coverage riders are not factored into gross figures."
        ]

        return RiskAssessmentResponse(
            attack_type=req.attack_type,
            risk_score=final_risk_score,
            risk_level=level,
            reasoning_summary=reasoning,
            factor_breakdown=factors,
            control_mitigation_score=effective_mitigation_pct,
            detection_confidence_vs_risk=detection_vs_risk_note,
            financial_impact_breakdown=financial_breakdown,
            total_projected_loss_min=total_min,
            total_projected_loss_max=total_max,
            currency="USD",
            historical_benchmark_incident=benchmark_note,
            assumptions_and_limitations=limitations
        )

risk_service = RiskService()
