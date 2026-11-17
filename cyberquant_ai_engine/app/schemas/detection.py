from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class DetectionResultInput(BaseModel):
    attack_type: str = Field(..., description="Detected attack classification (e.g., 'Ransomware', 'SQL Injection')")
    severity: str = Field(..., description="'Low', 'Medium', 'High', 'Critical'")
    confidence: float = Field(..., ge=0, le=100, description="Sensor/ML model detection confidence percentage (0-100%)")
    source: str = Field(default="Network Detection Module", description="Name or identifier of the detecting teammate module")
    target_asset: Optional[str] = Field(default=None, description="IP, hostname, or database endpoint detected under attack")
    timestamp: Optional[str] = Field(default=None, description="ISO timestamp of detection")
    raw_payload_snippet: Optional[str] = Field(default=None, description="Optional raw signature or packet sample")

class ImmediateAction(BaseModel):
    step: int
    action: str
    timeline: str
    owner: str

class DetectionAnalysisResponse(BaseModel):
    detection_id: str
    received_attack_type: str
    sensor_confidence: float
    sensor_severity: str
    detection_source: str
    organizational_risk_score: float
    risk_level: str
    briefing: str
    structured_analysis: Optional[str] = Field(default=None, description="Complete 8-section AI explanation and analysis report")
    immediate_containment_playbook: List[ImmediateAction]
    technical_explanation_summary: str
    historical_reference: Optional[Dict[str, Any]]
    projected_downtime_hours_estimate: str
    next_steps_for_analyst: List[str]
