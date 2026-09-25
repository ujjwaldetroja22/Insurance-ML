import os
import joblib
import json
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional
from backend.schemas.classification_schema import (
    ClaimClassificationInput, ClassificationOutput, ModelInfo,
    ModelsListResponse, EvaluationOutput
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(BASE_DIR, "models")

class ClassificationService:
    def __init__(self):
        self.model = None
        self.preprocessor = None
        self.all_models = None
        self.evaluation_results = None
        self.load_artifacts()

    def load_artifacts(self):
        model_path = os.path.join(MODELS_DIR, "classification_model.pkl")
        prep_path = os.path.join(MODELS_DIR, "classification_preprocessor.pkl")
        all_models_path = os.path.join(MODELS_DIR, "all_classification_models.pkl")
        eval_path = os.path.join(MODELS_DIR, "evaluation_results.json")

        if os.path.exists(model_path):
            self.model = joblib.load(model_path)
            print("Loaded Task 5 tuned classification model.")
        if os.path.exists(prep_path):
            self.preprocessor = joblib.load(prep_path)
            print("Loaded Task 5 classification preprocessor.")
        if os.path.exists(all_models_path):
            self.all_models = joblib.load(all_models_path)
        if os.path.exists(eval_path):
            with open(eval_path, "r") as f:
                self.evaluation_results = json.load(f)
            print("Loaded Task 5 evaluation metrics.")

    def _encode_input(self, inp: ClaimClassificationInput) -> np.ndarray:
        if not self.preprocessor:
            self.load_artifacts()
            if not self.preprocessor:
                raise RuntimeError("Preprocessor not loaded. Run train_models.py first.")

        feature_cols = self.preprocessor["feature_columns"]
        defaults = self.preprocessor.get("defaults", {})

        row_dict = {col: defaults.get(col, 0.0) for col in feature_cols}

        def safe_float(v, default=0.0):
            try:
                return float(v)
            except (ValueError, TypeError):
                return default

        # Numeric mapping
        if inp.age_of_driver is not None:
            row_dict['age_of_driver'] = safe_float(inp.age_of_driver, 35.0)
        if inp.safety_rating is not None:
            row_dict['safety_rating'] = safe_float(inp.safety_rating, 72.0)
        if inp.annual_income is not None:
            row_dict['annual_income'] = safe_float(inp.annual_income, 50000.0)
        if inp.zip_code is not None:
            row_dict['zip_code'] = safe_float(inp.zip_code, 50006.0)
        if inp.past_num_of_claims is not None:
            row_dict['past_num_of_claims'] = safe_float(inp.past_num_of_claims, 2.0)
        if inp.liab_prct is not None:
            row_dict['liab_prct'] = safe_float(inp.liab_prct, 45.0)
        if inp.age_of_vehicle is not None:
            row_dict['age_of_vehicle'] = safe_float(inp.age_of_vehicle, 3.0)
        if inp.vehicle_price is not None:
            row_dict['vehicle_price'] = safe_float(inp.vehicle_price, 85000.0)
        if inp.total_claim is not None:
            row_dict['total_claim'] = safe_float(inp.total_claim, 85000.0)
        if inp.injury_claim is not None:
            row_dict['injury_claim'] = safe_float(inp.injury_claim, 12000.0)
        if inp.policy_deductible is not None:
            row_dict['policy_deductible'] = safe_float(inp.policy_deductible, 500.0)
        if inp.annual_premium is not None:
            row_dict['annual_premium'] = safe_float(inp.annual_premium, 1415.0)
        if inp.days_open is not None:
            row_dict['days_open'] = safe_float(inp.days_open, 10.0)
        if inp.form_defects is not None:
            row_dict['form_defects'] = safe_float(inp.form_defects, 2.0)

        # High education
        if isinstance(inp.high_education, (int, float)):
            row_dict['high_education'] = float(inp.high_education)
        elif isinstance(inp.high_education, str):
            row_dict['high_education'] = 1.0 if inp.high_education.lower() not in ['none', 'no', 'high school'] else 0.0

        # Address change
        if isinstance(inp.address_change, (int, float)):
            row_dict['address_change'] = float(inp.address_change)
        elif isinstance(inp.address_change, str):
            row_dict['address_change'] = 1.0 if 'yes' in inp.address_change.lower() else 0.0

        # Police report
        if isinstance(inp.police_report, (int, float)):
            row_dict['police_report'] = float(inp.police_report)
        elif isinstance(inp.police_report, str):
            row_dict['police_report'] = 1.0 if 'yes' in inp.police_report.lower() else 0.0

        # Categorical one-hot mapping
        # Gender
        if inp.gender:
            row_dict['gender_M'] = 1.0 if inp.gender.upper().startswith('M') else 0.0

        # Marital Status
        if inp.marital_status:
            m = str(inp.marital_status).upper()
            row_dict['marital_status_0'] = 1.0 if (m in ['0', 'MARRIED']) else 0.0
            row_dict['marital_status_1'] = 1.0 if (m in ['1', 'SINGLE']) else 0.0

        # Property Status
        if inp.property_status:
            row_dict['property_status_Rent'] = 1.0 if 'rent' in str(inp.property_status).lower() else 0.0

        # Day of week
        if inp.claim_day_of_week:
            dow = str(inp.claim_day_of_week).capitalize()
            for day in ['Friday', 'Monday', 'Saturday', 'Sunday', 'Thursday', 'Tuesday', 'Wednesday']:
                key = f'claim_day_of_week_{day}'
                if key in row_dict:
                    row_dict[key] = 1.0 if dow in day else 0.0

        # Accident site
        if inp.accident_site:
            site = str(inp.accident_site).lower()
            if 'accident_site_Local' in row_dict:
                row_dict['accident_site_Local'] = 1.0 if any(k in site for k in ['local', 'intersection', 'residential']) else 0.0
            if 'accident_site_Parking Lot' in row_dict:
                row_dict['accident_site_Parking Lot'] = 1.0 if 'parking' in site else 0.0

        # Witness present
        if inp.witness_present is not None:
            w = str(inp.witness_present).upper()
            if 'witness_present_0' in row_dict:
                row_dict['witness_present_0'] = 1.0 if w in ['0', 'NO', 'FALSE'] else 0.0
            if 'witness_present_1' in row_dict:
                row_dict['witness_present_1'] = 1.0 if w in ['1', 'YES', 'TRUE', '2', '3'] else 0.0

        # Channel
        if inp.channel:
            ch = str(inp.channel).lower()
            if 'channel_Online' in row_dict:
                row_dict['channel_Online'] = 1.0 if 'online' in ch or 'app' in ch else 0.0
            if 'channel_Phone' in row_dict:
                row_dict['channel_Phone'] = 1.0 if 'phone' in ch or 'call' in ch else 0.0

        # Vehicle category
        if inp.vehicle_category:
            cat = str(inp.vehicle_category).lower()
            if 'vehicle_category_Large' in row_dict:
                row_dict['vehicle_category_Large'] = 1.0 if any(k in cat for k in ['large', 'suv', 'truck']) else 0.0
            if 'vehicle_category_Medium' in row_dict:
                row_dict['vehicle_category_Medium'] = 1.0 if any(k in cat for k in ['medium', 'sedan']) else 0.0

        # Vehicle color
        if inp.vehicle_color:
            c = str(inp.vehicle_color).lower()
            for clr in ['blue', 'gray', 'other', 'red', 'silver', 'white']:
                key = f'vehicle_color_{clr}'
                if key in row_dict:
                    row_dict[key] = 1.0 if clr in c else 0.0

        # Return aligned DataFrame with exact feature columns
        df_row = pd.DataFrame([row_dict])[feature_cols]
        return df_row

    def predict(self, input_data: ClaimClassificationInput) -> ClassificationOutput:
        if self.model is None:
            self.load_artifacts()
            if self.model is None:
                raise RuntimeError("Classification model is not loaded. Run train_models.py first.")

        # If input has profiler specific fields (e.g., from Tab 4 risk profiler), sync them into core fields
        if input_data.incident_severity:
            sev = input_data.incident_severity.lower()
            if 'major' in sev:
                input_data.liab_prct = max(input_data.liab_prct or 0, 75.0)
                input_data.accident_site = "Local"
            elif 'trivial' in sev:
                input_data.liab_prct = min(input_data.liab_prct or 0, 15.0)

        if input_data.witnesses is not None:
            input_data.witness_present = "1" if input_data.witnesses > 0 else "0"

        X_encoded = self._encode_input(input_data)

        # True model prediction
        pred_class = int(self.model.predict(X_encoded)[0])
        
        # Real probability from predict_proba if available
        if hasattr(self.model, "predict_proba"):
            probs = self.model.predict_proba(X_encoded)[0]
            probability = float(probs[1])
        else:
            # Decision function to sigmoid if model has no predict_proba
            if hasattr(self.model, "decision_function"):
                df_val = self.model.decision_function(X_encoded)[0]
                probability = float(1.0 / (1.0 + np.exp(-df_val)))
            else:
                probability = 1.0 if pred_class == 1 else 0.0

        is_fraud = (pred_class == 1) or (probability >= 0.50)
        prediction_str = "Fraud" if is_fraud else "Not Fraud"

        if probability >= 0.60:
            risk_level = "High Risk"
        elif probability >= 0.30:
            risk_level = "Medium Risk"
        else:
            risk_level = "Low Risk"

        # Factors list for UI explanation
        factors = []
        if (input_data.liab_prct or 0) > 50:
            factors.append({"name": "High Liability Ratio (>50%)", "value": f"+{int(input_data.liab_prct)}%", "state": "pos"})
        if (input_data.total_claim or 0) > 60000:
            factors.append({"name": "Substantial Total Claim Amount", "value": "Flagged", "state": "pos"})
        if input_data.witness_present in ['0', 'NO']:
            factors.append({"name": "Zero Corroborating Witnesses", "value": "Elevated Risk", "state": "pos"})
        if (input_data.past_num_of_claims or 0) > 2:
            factors.append({"name": "Multiple Prior Insurance Claims", "value": "High Anomaly", "state": "pos"})
        if (input_data.safety_rating or 0) > 80:
            factors.append({"name": "Favorable Driver Safety Rating", "value": "Trustworthy", "state": "neg"})
        if (input_data.age_of_driver or 0) > 45:
            factors.append({"name": "Established Driver Profile", "value": "Lower Risk", "state": "neg"})

        model_name = self.evaluation_results.get("best_model_name", "Gradient Boosting") if self.evaluation_results else "Gradient Boosting"

        return ClassificationOutput(
            success=True,
            prediction=prediction_str,
            fraud=is_fraud,
            probability=round(probability, 4),
            risk_level=risk_level,
            model_name=f"{model_name} (Tuned Task 5)",
            factors=factors
        )

    def get_models(self) -> ModelsListResponse:
        if self.evaluation_results is None:
            self.load_artifacts()
            if self.evaluation_results is None:
                raise RuntimeError("Evaluation results not found. Run train_models.py first.")

        model_items = []
        for m in self.evaluation_results.get("models", []):
            model_items.append(ModelInfo(
                name=m["name"],
                train_accuracy=m["train_accuracy"],
                test_accuracy=m["test_accuracy"],
                accuracy=m["accuracy"],
                precision=m["precision"],
                recall=m["recall"],
                f1_score=m["f1_score"],
                cv_f1_mean=m.get("cv_f1_mean"),
                cv_f1_std=m.get("cv_f1_std"),
                fit_status=m.get("fit_status")
            ))

        return ModelsListResponse(
            success=True,
            models=model_items,
            best_model=self.evaluation_results.get("best_model_name", "Gradient Boosting")
        )

    def get_evaluation(self) -> EvaluationOutput:
        if self.evaluation_results is None:
            self.load_artifacts()
            if self.evaluation_results is None:
                raise RuntimeError("Evaluation results not found. Run train_models.py first.")

        model_items = [ModelInfo(**m) for m in self.evaluation_results.get("models", [])]

        return EvaluationOutput(
            success=True,
            best_model_name=self.evaluation_results["best_model_name"],
            best_params=self.evaluation_results["best_params"],
            best_cv_score=self.evaluation_results["best_cv_score"],
            before_tuning_f1=self.evaluation_results["before_tuning_f1"],
            tuned_metrics=self.evaluation_results["tuned_metrics"],
            models=model_items,
            cv_summary=self.evaluation_results["cv_summary"],
            confusion_matrix=self.evaluation_results["confusion_matrix"],
            classification_report=self.evaluation_results["classification_report"]
        )

classification_service = ClassificationService()
