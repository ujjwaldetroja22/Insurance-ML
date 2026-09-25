from pydantic import BaseModel, Field
from typing import Optional, List

class RegressionInput(BaseModel):
    age_of_driver: float = Field(35.0, description="Age of driver in years")
    annual_income: float = Field(500000.0, description="Annual income")
    vehicle_price: float = Field(800000.0, description="Vehicle market price")
    policy_deductible: float = Field(500.0, description="Policy deductible amount")
    annual_premium: float = Field(12000.0, description="Annual insurance premium")
    form_defects: float = Field(2.0, description="Number of form defects")

    model_config = {
        "json_schema_extra": {
            "example": {
                "age_of_driver": 35.0,
                "annual_income": 500000.0,
                "vehicle_price": 800000.0,
                "policy_deductible": 500.0,
                "annual_premium": 12000.0,
                "form_defects": 2.0
            }
        }
    }

class RegressionOutput(BaseModel):
    success: bool
    prediction: float
    model_type: str = "Linear Regression (Task 3)"
    features_used: List[str]
