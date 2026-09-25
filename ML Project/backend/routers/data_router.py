from fastapi import APIRouter, Query, HTTPException
from typing import Optional

try:
    from services.data_service import data_service
    from schemas.claims_schema import ClaimsListResponse
except ImportError:
    from backend.services.data_service import data_service
    from backend.schemas.claims_schema import ClaimsListResponse

router = APIRouter(prefix="/api/claims", tags=["Claims"])

@router.get("", response_model=ClaimsListResponse)
def get_claims(
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(10, ge=1, le=100, description="Records per page"),
    search: Optional[str] = Query(None, description="Global search query for policy #, city, or auto make"),
    fraud_status: Optional[str] = Query("ALL", description="Filter by fraud status (ALL, Fraudulent, Genuine, Under Review)"),
    severity: Optional[str] = Query("ALL", description="Filter by incident severity"),
    state: Optional[str] = Query("ALL", description="Filter by policy state (OH, IN, IL)"),
    sort_by: Optional[str] = Query("policy_number", description="Column to sort by"),
    sort_dir: Optional[str] = Query("asc", description="Sort direction (asc or desc)")
):
    """
    Paginated, searchable, and filterable insurance claims dataset endpoint.
    Used by the Claims Explorer and Recent Claims tables.
    """
    result = data_service.get_claims(
        page=page,
        page_size=page_size,
        search=search,
        fraud_status=fraud_status,
        severity=severity,
        state=state,
        sort_by=sort_by,
        sort_dir=sort_dir
    )
    return result

@router.get("/{policy_number}")
def get_claim_details(policy_number: int):
    """
    Retrieve full details for a single policy/claim. Used by the Claims Detail Drawer.
    """
    record = data_service.get_claim_by_policy(policy_number)
    if not record:
        raise HTTPException(status_code=404, detail=f"Claim with policy number {policy_number} not found.")
    return {"success": True, "claim": record}
