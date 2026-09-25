from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Union

class ClaimClassificationInput(BaseModel):
    age_of_driver: Optional[Any] = Field(35.0, description="Age of driver")
    gender: Optional[str] = Field("MALE", description="Gender (MALE / FEMALE / OTHER)")
    marital_status: Optional[str] = Field("MARRIED", description="Marital status (MARRIED / SINGLE / 0 / 1)")
    annual_income: Optional[Any] = Field(50000.0, description="Annual income")
    high_education: Optional[Any] = Field("High School", description="Education level or indicator")
    safety_rating: Optional[Any] = Field(72.0, description="Safety score rating")
    address_change: Optional[Any] = Field("NO", description="Address change indicator")
    property_status: Optional[str] = Field("own", description="Property status (own / Rent)")
    zip_code: Optional[Any] = Field(50006, description="Driver ZIP code")
    
    vehicle_category: Optional[str] = Field("Medium", description="Vehicle category (Large / Medium / Sedan / SUV)")
    vehicle_price: Optional[Any] = Field(85000.0, description="Vehicle price")
    age_of_vehicle: Optional[Any] = Field(3.0, description="Age of vehicle in years")
    vehicle_color: Optional[str] = Field("white", description="Vehicle color")

    claim_day_of_week: Optional[str] = Field("Monday", description="Day of claim")
    accident_site: Optional[str] = Field("Local", description="Accident site (Highway / Local / Parking Lot)")
    past_num_of_claims: Optional[Any] = Field(2.0, description="Number of past claims")
    witness_present: Optional[Any] = Field("1", description="Witness present (0 / 1 / YES / NO)")
    liab_prct: Optional[Any] = Field(45.0, description="Liability percentage")
    channel: Optional[str] = Field("Online", description="Claim channel (Online / Phone)")
    police_report: Optional[Any] = Field("YES", description="Police report indicator (0 / 1 / YES / NO)")
    policy_deductible: Optional[Any] = Field(500.0, description="Policy deductible")
    annual_premium: Optional[Any] = Field(1415.0, description="Annual insurance premium")
    days_open: Optional[Any] = Field(10.0, description="Days claim was open")
    form_defects: Optional[Any] = Field(2.0, description="Form defects score")
    total_claim: Optional[Any] = Field(85000.0, description="Total claim amount")
    injury_claim: Optional[Any] = Field(12000.0, description="Injury claim amount")

    # Optional fields for compatibility with risk profiler form
    incident_severity: Optional[str] = Field(None, description="Incident severity from profiler")
    insured_hobbies: Optional[str] = Field(None, description="Hobby from profiler")
    collision_type: Optional[str] = Field(None, description="Collision type from profiler")
    witnesses: Optional[Any] = Field(None, description="Number of witnesses from profiler")
    bodily_injuries: Optional[Any] = Field(None, description="Bodily injuries from profiler")
    incident_hour_of_the_day: Optional[Any] = Field(None, description="Incident hour from profiler")
    number_of_vehicles_involved: Optional[Any] = Field(None, description="Vehicles involved from profiler")

class ClassificationOutput(BaseModel):
    success: bool
    prediction: str            # "Fraud" or "Not Fraud"
    fraud: bool                # True if fraudulent, False if genuine
    probability: float         # Model probability of fraud (0.0 to 1.0)
    risk_level: str            # "Low Risk", "Medium Risk", "High Risk"
    model_name: str            # Name of the model that generated prediction
    factors: Optional[List[Dict[str, Any]]] = None

class ModelInfo(BaseModel):
    name: str
    train_accuracy: float
    test_accuracy: float
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    cv_f1_mean: Optional[float] = None
    cv_f1_std: Optional[float] = None
    fit_status: Optional[str] = None

class ModelsListResponse(BaseModel):
    success: bool
    models: List[ModelInfo]
    best_model: str

class EvaluationOutput(BaseModel):
    success: bool
    best_model_name: str
    best_params: Dict[str, Any]
    best_cv_score: float
    before_tuning_f1: float
    tuned_metrics: Dict[str, float]
    models: List[ModelInfo]
    cv_summary: Dict[str, Any]
    confusion_matrix: List[List[int]]
    classification_report: Dict[str, Any]
