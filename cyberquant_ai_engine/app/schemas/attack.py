from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class AttackRequest(BaseModel):
    attack_name: Optional[str] = Field(default=None, description="Name or type of attack (e.g., 'Ransomware', 'Phishing')")
    attack_type: Optional[str] = Field(default=None, description="Alternative alias for attack_name")
    severity: Optional[str] = Field(default=None, description="Optional sensor severity ('Low', 'Medium', 'High', 'Critical')")
    confidence: Optional[float] = Field(default=None, description="Optional sensor detection confidence percentage")
    source: Optional[str] = Field(default=None, description="Optional detection sensor name")
    target_asset: Optional[str] = Field(default=None, description="Optional target IP or host")
    raw_payload_snippet: Optional[str] = Field(default=None, description="Optional raw signature or packet sample")
    simple_language: bool = Field(default=False, description="Whether to simplify explanations for non-technical users")
    industry: Optional[str] = Field(default=None, description="Specific industry context if applicable")

    def get_attack_name(self) -> str:
        name = self.attack_name or self.attack_type or "General Cyber Threat"
        return name.strip()

    def get_detection_details(self) -> Optional[Dict[str, Any]]:
        if any([self.severity, self.confidence, self.source, self.target_asset, self.raw_payload_snippet]):
            return {
                "attack_type": self.get_attack_name(),
                "severity": self.severity,
                "confidence": self.confidence,
                "source": self.source,
                "target_asset": self.target_asset,
                "raw_payload_snippet": self.raw_payload_snippet
            }
        return None

class PreventionRecommendation(BaseModel):
    category: str = Field(..., description="E.g., 'Preventive', 'Detection', 'Tools', 'Training', 'Response', 'Recovery'")
    recommendation: str = Field(..., description="Actionable defense step")
    priority: str = Field(..., description="'High', 'Medium', or 'Critical'")
    feasibility: str = Field(..., description="'Immediate', 'Short-term', 'Medium-term'")

class HistoricalIncidentBrief(BaseModel):
    incident_name: str
    organization: str
    country: str
    year: int
    consequences: str
    financial_losses: str
    is_verified_financial: bool
    sources: List[str]

class AttackExplainResponse(BaseModel):
    attack_name: str
    canonical_type: str
    structured_analysis: str = Field(..., description="Complete 8-section Attack Explanation and Analysis report")
    summary: str
    how_it_works: List[str]
    vulnerabilities_exploited: List[str]
    affected_systems_and_data: List[str]
    organizational_consequences: List[str]
    danger_level: str = Field(..., description="'Low', 'Medium', 'High', 'Critical'")
    why_dangerous: str
    prevention_highlights: List[PreventionRecommendation]
    verified_historical_incidents: List[HistoricalIncidentBrief]
    suggested_followups: List[str]
