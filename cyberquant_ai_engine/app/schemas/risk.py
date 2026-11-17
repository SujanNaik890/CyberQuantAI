from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field

class RiskAssessmentRequest(BaseModel):
    attack_type: str = Field(..., description="Target attack (e.g. Ransomware, SQL Injection)")
    likelihood: int = Field(default=3, ge=1, le=5, description="Likelihood score (1=Rare, 5=Almost Certain)")
    financial_impact_scale: int = Field(default=4, ge=1, le=5, description="Severity of financial exposure (1=Negligible, 5=Catastrophic)")
    operational_impact: int = Field(default=4, ge=1, le=5, description="Business downtime & mission disruption (1=None, 5=Total Shutdown)")
    data_sensitivity: str = Field(default="Confidential", description="Public, Internal, Confidential, Restricted, PII/PHI/Cardholder")
    organization_size: str = Field(default="Medium", description="Small (<100), Medium (100-1000), Large (1000-5000), Enterprise (>5000)")
    industry: str = Field(default="Financial Services", description="Healthcare, Financial Services, E-Commerce, Critical Infrastructure, Technology, Education, Government")
    existing_security_controls: List[str] = Field(default=[], description="List of controls: MFA, EDR, Immutable Backups, SIEM, Firewalls, WAF, Security Awareness")
    annual_revenue: Optional[float] = Field(default=None, description="Optional organization annual revenue for calibrated dollar modeling")

class FactorScore(BaseModel):
    factor_name: str
    weight: float
    raw_value: Any
    normalized_score: float
    reasoning: str

class FinancialImpactComponent(BaseModel):
    category: str
    projected_min: float
    projected_max: float
    currency: str = "USD"
    description: str
    is_historical_loss: bool = False
    basis_of_estimate: str

class RiskAssessmentResponse(BaseModel):
    attack_type: str
    risk_score: float = Field(..., ge=0, le=100, description="Calculated aggregate organizational risk (0-100)")
    risk_level: str = Field(..., description="'Low', 'Medium', 'High', or 'Critical'")
    reasoning_summary: str
    factor_breakdown: List[FactorScore]
    control_mitigation_score: float = Field(..., description="Percentage reduction achieved by existing security controls")
    detection_confidence_vs_risk: str = Field(..., description="Crucial distinction explaining why sensor confidence != enterprise risk")
    financial_impact_breakdown: List[FinancialImpactComponent]
    total_projected_loss_min: float
    total_projected_loss_max: float
    currency: str = "USD"
    historical_benchmark_incident: Optional[str] = None
    assumptions_and_limitations: List[str]
