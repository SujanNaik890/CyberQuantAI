from typing import List, Optional
from pydantic import BaseModel, Field

class BudgetAllocationRequest(BaseModel):
    organization_type: str = Field(..., description="E.g., Healthcare Hospital, Fintech, SaaS Startup, Retail Chain, University")
    organization_size: str = Field(..., description="'Small (<100)', 'Medium (100-1000)', 'Large (1000-5000)', 'Enterprise (>5000)'")
    annual_cybersecurity_budget: float = Field(..., gt=0, description="Total annual cybersecurity expenditure")
    currency: str = Field(default="USD", description="'USD' or 'INR'")
    existing_security_measures: List[str] = Field(default=[], description="Existing deployed tools & controls")
    attack_type: str = Field(default="Ransomware", description="Primary threat vector to optimize against")

class BudgetItem(BaseModel):
    category: str = Field(..., description="E.g., Endpoint & Server Security, Identity & MFA, Backups & DR, Awareness Training, SIEM & SOC")
    recommended_amount: float
    percentage_allocation: float
    priority: str = Field(..., description="'High', 'Medium', or 'Critical'")
    reasoning: str
    key_tools_and_initiatives: List[str]
    expected_risk_reduction_pct: float

class RosiDetails(BaseModel):
    annual_loss_expectancy_prior: float
    annual_loss_expectancy_post: float
    cost_of_controls: float
    net_risk_reduction_dollars: float
    estimated_rosi_percentage: float
    formula_used: str

class BudgetAllocationResponse(BaseModel):
    organization_type: str
    organization_size: str
    total_budget: float
    currency: str
    targeted_threat: str
    allocations: List[BudgetItem]
    unallocated_contingency: float
    rosi_analysis: Optional[RosiDetails]
    expected_overall_risk_reduction_pct: float
    assumptions_and_limitations: List[str]
