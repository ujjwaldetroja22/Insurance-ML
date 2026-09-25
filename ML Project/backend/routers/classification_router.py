from fastapi import APIRouter

try:
    from schemas.classification_schema import (
        ClaimClassificationInput, ClassificationOutput,
        ModelsListResponse, EvaluationOutput
    )
    from services.classification_service import classification_service
except ImportError:
    from backend.schemas.classification_schema import (
        ClaimClassificationInput, ClassificationOutput,
        ModelsListResponse, EvaluationOutput
    )
    from backend.services.classification_service import classification_service

router = APIRouter(prefix="/api/classification", tags=["Task 5 Classification"])

@router.post("/predict", response_model=ClassificationOutput)
def predict_fraud(payload: ClaimClassificationInput):
    """
    Task 5: Predict fraud risk and probability for an insurance claim using the trained & tuned model.
    """
    return classification_service.predict(payload)

@router.get("/models", response_model=ModelsListResponse)
def get_classification_models():
    """
    Task 5: Retrieve information and evaluation metrics for all 5 baseline models:
    Logistic Regression, Decision Tree, Random Forest, AdaBoost, Gradient Boosting.
    """
    return classification_service.get_models()

@router.get("/evaluation", response_model=EvaluationOutput)
def get_classification_evaluation():
    """
    Task 5: Retrieve cross-validation F1 scores, GridSearchCV parameters,
    tuned model metrics, confusion matrix, and classification report.
    """
    return classification_service.get_evaluation()
