from fastapi import APIRouter, HTTPException
from app.schemas.risk import RiskAssessmentRequest, RiskAssessmentResponse
from app.services.risk_service import risk_service

router = APIRouter(prefix="/ai", tags=["Risk & Financial Analysis"])

@router.post("/analyze", response_model=RiskAssessmentResponse)
def analyze_risk_endpoint(request: RiskAssessmentRequest):
    """
    Transparent Organizational Risk Assessment & Financial Impact Engine:
    - Computes 0-100 risk score and Low/Medium/High/Critical classification.
    - Factors: Likelihood, Financial Impact, Operational Impact, Data Sensitivity,
      Org Size, Industry Exposure, and Control Mitigations.
    - Provides explicit distinction between detection sensor confidence and enterprise risk.
    - Calculates projected losses across downtime, recovery, legal, regulatory, and reputation.
    """
    try:
        return risk_service.calculate_risk(request)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to calculate risk assessment: {str(e)}"
        )
