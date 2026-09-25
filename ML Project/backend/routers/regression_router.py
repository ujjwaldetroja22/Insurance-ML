from fastapi import APIRouter

try:
    from schemas.regression_schema import RegressionInput, RegressionOutput
    from services.regression_service import regression_service
except ImportError:
    from backend.schemas.regression_schema import RegressionInput, RegressionOutput
    from backend.services.regression_service import regression_service

router = APIRouter(prefix="/api/regression", tags=["Task 3 Regression"])

@router.post("/predict", response_model=RegressionOutput)
def predict_total_claim(payload: RegressionInput):
    """
    Task 3: Total claim amount prediction using Linear Regression.
    Accepts: age_of_driver, annual_income, vehicle_price, policy_deductible, annual_premium, form_defects.
    """
    return regression_service.predict(payload)
