import os
import joblib
import json
import numpy as np
from typing import Dict, Any, List
from backend.schemas.regression_schema import RegressionInput, RegressionOutput

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(BASE_DIR, "models")

class RegressionService:
    def __init__(self):
        self.model = None
        self.scaler = None
        self.metadata = None
        self.feature_names = [
            'age_of_driver',
            'annual_income',
            'vehicle_price',
            'policy deductible',
            'annual premium',
            'form defects'
        ]
        self.load_artifacts()

    def load_artifacts(self):
        model_path = os.path.join(MODELS_DIR, "regression_model.pkl")
        scaler_path = os.path.join(MODELS_DIR, "regression_scaler.pkl")
        meta_path = os.path.join(MODELS_DIR, "regression_metadata.json")

        if os.path.exists(model_path):
            self.model = joblib.load(model_path)
            print("Loaded Task 3 regression model.")
        if os.path.exists(scaler_path):
            self.scaler = joblib.load(scaler_path)
            print("Loaded Task 3 regression scaler.")
        if os.path.exists(meta_path):
            with open(meta_path, "r") as f:
                self.metadata = json.load(f)

    def predict(self, input_data: RegressionInput) -> RegressionOutput:
        if self.model is None:
            self.load_artifacts()
            if self.model is None:
                raise RuntimeError("Regression model is not loaded. Run train_models.py first.")

        # Order must strictly match Task 3 notebook:
        # ['age_of_driver', 'annual_income', 'vehicle_price', 'policy deductible', 'annual premium', 'form defects']
        features = np.array([[
            input_data.age_of_driver,
            input_data.annual_income,
            input_data.vehicle_price,
            input_data.policy_deductible,
            input_data.annual_premium,
            input_data.form_defects
        ]])

        prediction = float(self.model.predict(features)[0])
        # Claim amounts cannot be negative in practice
        clean_prediction = round(max(0.0, prediction), 2)

        return RegressionOutput(
            success=True,
            prediction=clean_prediction,
            model_type="Linear Regression (Task 3)",
            features_used=self.feature_names
        )

regression_service = RegressionService()
