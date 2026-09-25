from fastapi import APIRouter

try:
    from services.analytics_service import analytics_service
except ImportError:
    from backend.services.analytics_service import analytics_service

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

@router.get("/fraud-vs-genuine")
def get_fraud_vs_genuine():
    """Fraud and genuine claim counts by incident severity."""
    return analytics_service.get_fraud_vs_genuine()

@router.get("/fraud-by-vehicle")
def get_fraud_by_vehicle():
    """Fraud rate percentage across vehicle categories (SUV, Sedan, Sport, Utility)."""
    return analytics_service.get_fraud_by_vehicle()

@router.get("/fraud-by-site")
def get_fraud_by_site():
    """Fraud rate percentage across accident site locations."""
    return analytics_service.get_fraud_by_site()

@router.get("/fraud-by-age")
def get_fraud_by_age():
    """Fraud rate percentage across driver age brackets."""
    return analytics_service.get_fraud_by_age()

@router.get("/risk-distribution")
def get_risk_distribution():
    """Distribution percentages of Low, Medium, and High risk claims."""
    return analytics_service.get_risk_distribution()

@router.get("/monthly-trend")
def get_monthly_trend():
    """Monthly claims volume and fraud counts over time."""
    return analytics_service.get_monthly_trend()
