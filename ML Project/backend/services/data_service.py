import os
import pandas as pd
from typing import Optional, Dict, Any, List

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CLAIMS_PATH = os.path.join(BASE_DIR, "data", "insurance_claims.csv")

class DataService:
    def __init__(self):
        self.df: Optional[pd.DataFrame] = None
        self.load_data()

    def load_data(self):
        if not os.path.exists(CLAIMS_PATH):
            raise FileNotFoundError(f"Claims data file not found at {CLAIMS_PATH}")
        df = pd.read_csv(CLAIMS_PATH)
        
        # Clean / standardize columns if needed
        if "fraud_reported" in df.columns:
            # Normalize display status
            df["fraud_status_display"] = df["fraud_reported"].map(
                lambda x: "Fraudulent" if str(x).upper() in ["Y", "FRAUDULENT", "1"] else "Genuine"
            )
        else:
            df["fraud_status_display"] = "Genuine"

        self.df = df
        print(f"DataService loaded {len(self.df)} claims from {CLAIMS_PATH}")

    def get_claims(
        self,
        page: int = 1,
        page_size: int = 10,
        search: Optional[str] = None,
        fraud_status: Optional[str] = "ALL",
        severity: Optional[str] = "ALL",
        state: Optional[str] = "ALL",
        sort_by: Optional[str] = "policy_number",
        sort_dir: Optional[str] = "asc"
    ) -> Dict[str, Any]:
        if self.df is None:
            self.load_data()

        filtered_df = self.df.copy()

        # 1. Global Multi-Field Search
        if search and search.strip():
            term = str(search).strip().lower()
            mask = (
                filtered_df["policy_number"].astype(str).str.lower().str.contains(term, na=False) |
                filtered_df["incident_city"].astype(str).str.lower().str.contains(term, na=False) |
                filtered_df["auto_make"].astype(str).str.lower().str.contains(term, na=False) |
                filtered_df["auto_model"].astype(str).str.lower().str.contains(term, na=False) |
                filtered_df["incident_type"].astype(str).str.lower().str.contains(term, na=False)
            )
            filtered_df = filtered_df[mask]

        # 2. Fraud Status Filter
        if fraud_status and fraud_status != "ALL":
            if fraud_status in ["Fraudulent", "Y"]:
                filtered_df = filtered_df[filtered_df["fraud_reported"].astype(str).str.upper().isin(["Y", "FRAUDULENT"])]
            elif fraud_status in ["Genuine", "N"]:
                filtered_df = filtered_df[filtered_df["fraud_reported"].astype(str).str.upper().isin(["N", "GENUINE"])]
            elif fraud_status == "Under Review":
                # Simulated subset or empty if dataset is strictly binary
                filtered_df = filtered_df[filtered_df["fraud_reported"].astype(str).str.upper() == "UNDER REVIEW"]

        # 3. Incident Severity Filter
        if severity and severity != "ALL":
            filtered_df = filtered_df[filtered_df["incident_severity"].astype(str).str.lower() == severity.lower()]

        # 4. Policy State Filter
        if state and state != "ALL":
            filtered_df = filtered_df[filtered_df["policy_state"].astype(str).str.upper() == state.upper()]

        # 5. Sorting
        valid_cols = list(filtered_df.columns)
        if sort_by and sort_by in valid_cols:
            ascending = (sort_dir.lower() != "desc")
            filtered_df = filtered_df.sort_values(by=sort_by, ascending=ascending)

        total_records = len(filtered_df)
        total_pages = max(1, (total_records + page_size - 1) // page_size) if total_records > 0 else 1
        page = max(1, min(page, total_pages))

        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        paged_df = filtered_df.iloc[start_idx:end_idx]

        # Replace NaN with None for clean JSON serialization
        records = paged_df.where(pd.notnull(paged_df), None).to_dict(orient="records")

        return {
            "success": True,
            "total": total_records,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "claims": records
        }

    def get_claim_by_policy(self, policy_number: int) -> Optional[Dict[str, Any]]:
        if self.df is None:
            self.load_data()
        match = self.df[self.df["policy_number"] == policy_number]
        if match.empty:
            return None
        record = match.iloc[0].where(pd.notnull(match.iloc[0]), None).to_dict()
        return record

data_service = DataService()
