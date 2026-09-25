from fastapi import APIRouter

try:
    from services.dashboard_service import dashboard_service
    from schemas.claims_schema import DashboardSummaryResponse
except ImportError:
    from backend.services.dashboard_service import dashboard_service
    from backend.schemas.claims_schema import DashboardSummaryResponse

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary():
    """
    Retrieve real KPI metrics calculated from the claims dataset.
    Populates Total Claims, Fraud Detected, Genuine Claims, Fraud Rate, Average Claim.
    """
    return dashboard_service.get_summary()
