import os
import json
import pandas as pd
from typing import Dict, Any

try:
    from services.data_service import data_service
except ImportError:
    from backend.services.data_service import data_service

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EVAL_PATH = os.path.join(BASE_DIR, "models", "evaluation_results.json")

class DashboardService:
    def get_summary(self) -> Dict[str, Any]:
        df = data_service.df
        if df is None:
            data_service.load_data()
            df = data_service.df

        total_claims = len(df)
        if total_claims == 0:
            return {
                "success": True,
                "total_claims": 0,
                "fraudulent_claims": 0,
                "genuine_claims": 0,
                "under_review_claims": 0,
                "fraud_rate": 0.0,
                "genuine_rate": 0.0,
                "average_claim": 0.0,
                "total_claim_payout": 0.0,
                "model_accuracy": 0.0,
                "dataset_name": "insurance_claims.csv"
            }

        is_fraud = df["fraud_reported"].astype(str).str.upper().isin(["Y", "FRAUDULENT", "1"])
        fraud_count = int(is_fraud.sum())
        genuine_count = total_claims - fraud_count
        under_review_count = 0

        fraud_rate = round((fraud_count / total_claims) * 100, 1)
        genuine_rate = round((genuine_count / total_claims) * 100, 1)

        claim_amounts = pd.to_numeric(df["total_claim_amount"], errors="coerce").dropna()
        avg_claim = round(float(claim_amounts.mean()), 2) if not claim_amounts.empty else 0.0
        total_payout = round(float(claim_amounts.sum()), 2) if not claim_amounts.empty else 0.0

        model_acc = 77.7
        if os.path.exists(EVAL_PATH):
            try:
                with open(EVAL_PATH, "r") as f:
                    eval_data = json.load(f)
                    model_acc = round(eval_data.get("tuned_metrics", {}).get("accuracy", 0.777) * 100, 1)
            except Exception as e:
                print(f"Notice: using default accuracy. Error: {e}")

        return {
            "success": True,
            "total_claims": total_claims,
            "fraudulent_claims": fraud_count,
            "genuine_claims": genuine_count,
            "under_review_claims": under_review_count,
            "fraud_rate": fraud_rate,
            "genuine_rate": genuine_rate,
            "average_claim": avg_claim,
            "total_claim_payout": total_payout,
            "model_accuracy": model_acc,
            "dataset_name": "insurance_claims.csv"
        }

dashboard_service = DashboardService()
