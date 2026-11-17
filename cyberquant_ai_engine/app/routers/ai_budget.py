from fastapi import APIRouter, HTTPException
from app.schemas.budget import BudgetAllocationRequest, BudgetAllocationResponse
from app.services.budget_service import budget_service

router = APIRouter(prefix="/ai", tags=["Cybersecurity Budget Optimization"])

@router.post("/budget", response_model=BudgetAllocationResponse)
def budget_allocation_endpoint(request: BudgetAllocationRequest):
    """
    Cybersecurity Budget Allocation & ROSI Calculator:
    - Custom tailored allocations across critical security investment categories.
    - Percentage breakdowns, recommended dollar/INR values, and expected risk reduction.
    - Quantitative Return on Security Investment (ROSI) analysis.
    - Explicit disclosure of calculation formulas, assumptions, and limitations.
    """
    try:
        return budget_service.allocate_budget(request)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate budget allocation: {str(e)}"
        )
