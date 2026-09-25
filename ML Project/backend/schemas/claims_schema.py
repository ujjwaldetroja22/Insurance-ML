from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class ClaimRecord(BaseModel):
    policy_number: int
    age: int
    policy_state: str
    incident_type: str
    incident_severity: str
    total_claim_amount: float
    fraud_reported: str
    auto_make: Optional[str] = None
    auto_model: Optional[str] = None
    auto_year: Optional[int] = None
    incident_date: Optional[str] = None
    incident_city: Optional[str] = None
    incident_location: Optional[str] = None
    collision_type: Optional[str] = None
    authorities_contacted: Optional[str] = None
    bodily_injuries: Optional[int] = None
    witnesses: Optional[int] = None
    police_report_available: Optional[str] = None
    injury_claim: Optional[float] = None
    property_claim: Optional[float] = None
    vehicle_claim: Optional[float] = None
    insured_sex: Optional[str] = None
    insured_education_level: Optional[str] = None
    insured_hobbies: Optional[str] = None
    policy_annual_premium: Optional[float] = None
    policy_deductable: Optional[float] = None

class ClaimsListResponse(BaseModel):
    success: bool
    total: int
    page: int
    page_size: int
    total_pages: int
    claims: List[Dict[str, Any]]

class DashboardSummaryResponse(BaseModel):
    success: bool
    total_claims: int
    fraudulent_claims: int
    genuine_claims: int
    under_review_claims: int
    fraud_rate: float
    genuine_rate: float
    average_claim: float
    total_claim_payout: float
    model_accuracy: float
    dataset_name: str
