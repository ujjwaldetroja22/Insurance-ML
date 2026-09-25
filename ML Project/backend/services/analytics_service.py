import os
import pandas as pd
from typing import Dict, Any, List

try:
    from services.data_service import data_service
except ImportError:
    from backend.services.data_service import data_service

class AnalyticsService:
    def _get_df(self) -> pd.DataFrame:
        df = data_service.df
        if df is None:
            data_service.load_data()
            df = data_service.df
        return df

    def get_fraud_vs_genuine(self) -> Dict[str, Any]:
        df = self._get_df()
        severity_labels = ['Major Damage', 'Minor Damage', 'Total Loss', 'Trivial Damage']
        gen_counts = [0] * len(severity_labels)
        fraud_counts = [0] * len(severity_labels)

        for _, row in df.iterrows():
            sev = str(row.get('incident_severity', ''))
            is_fraud = str(row.get('fraud_reported', '')).upper() in ['Y', 'FRAUDULENT', '1']
            if sev in severity_labels:
                idx = severity_labels.index(sev)
                if is_fraud:
                    fraud_counts[idx] += 1
                else:
                    gen_counts[idx] += 1

        return {
            "success": True,
            "labels": severity_labels,
            "genuine_counts": gen_counts,
            "fraud_counts": fraud_counts
        }

    def get_fraud_by_vehicle(self) -> Dict[str, Any]:
        df = self._get_df()
        vehicle_cats = ['SUV', 'Sedan', 'Sport', 'Utility']
        totals = [0] * len(vehicle_cats)
        frauds = [0] * len(vehicle_cats)

        def map_cat(row):
            if "vehicle_category" in row and pd.notnull(row["vehicle_category"]):
                vc = str(row["vehicle_category"]).lower()
                if "suv" in vc: return 'SUV'
                if "sedan" in vc: return 'Sedan'
                if "sport" in vc or "coupe" in vc: return 'Sport'
                if "utility" in vc or "truck" in vc or "wagon" in vc: return 'Utility'
            
            model = str(row.get('auto_model', '')).lower()
            make = str(row.get('auto_make', '')).lower()
            if any(k in model for k in ['cherokee', 'pathfinder', 'tahoe', 'wrangler', 'x5', 'mdx']):
                return 'SUV'
            if any(k in model for k in ['f150', 'ram', 'silverado']) or 'jeep' in make:
                return 'Utility'
            if any(k in model for k in ['civic', 'corolla', 'impreza', 'mustang', '3 series', '92x']):
                return 'Sport'
            return 'Sedan'

        for _, row in df.iterrows():
            cat = map_cat(row)
            idx = vehicle_cats.index(cat)
            totals[idx] += 1
            if str(row.get('fraud_reported', '')).upper() in ['Y', 'FRAUDULENT', '1']:
                frauds[idx] += 1

        rates = [
            round((frauds[i] / totals[i] * 100), 1) if totals[i] > 0 else 0.0
            for i in range(len(vehicle_cats))
        ]

        return {
            "success": True,
            "labels": vehicle_cats,
            "rates": rates,
            "totals": totals,
            "fraud_counts": frauds
        }

    def get_fraud_by_site(self) -> Dict[str, Any]:
        df = self._get_df()
        site_labels = ['Highway', 'Intersection', 'Parking Lot', 'Residential Area']
        totals = [0] * len(site_labels)
        frauds = [0] * len(site_labels)

        def map_site(row):
            if "accident_site" in row and pd.notnull(row["accident_site"]):
                site = str(row["accident_site"]).lower()
                if "highway" in site: return 'Highway'
                if "intersection" in site or "local" in site: return 'Intersection'
                if "parking" in site: return 'Parking Lot'
                return 'Residential Area'

            itype = str(row.get('incident_type', '')).lower()
            if 'multi' in itype: return 'Intersection'
            if 'single' in itype: return 'Highway'
            if 'parked' in itype: return 'Parking Lot'
            return 'Residential Area'

        for _, row in df.iterrows():
            site = map_site(row)
            idx = site_labels.index(site)
            totals[idx] += 1
            if str(row.get('fraud_reported', '')).upper() in ['Y', 'FRAUDULENT', '1']:
                frauds[idx] += 1

        rates = [
            round((frauds[i] / totals[i] * 100), 1) if totals[i] > 0 else 0.0
            for i in range(len(site_labels))
        ]

        return {
            "success": True,
            "labels": site_labels,
            "rates": rates,
            "totals": totals,
            "fraud_counts": frauds
        }

    def get_fraud_by_age(self) -> Dict[str, Any]:
        df = self._get_df()
        age_ranges = ['18-25', '26-35', '36-45', '46-55', '56+']
        totals = [0] * len(age_ranges)
        frauds = [0] * len(age_ranges)

        for _, row in df.iterrows():
            age_val = row.get('age') or row.get('age_of_driver')
            try:
                age = float(age_val)
            except (ValueError, TypeError):
                continue

            if age <= 25: idx = 0
            elif age <= 35: idx = 1
            elif age <= 45: idx = 2
            elif age <= 55: idx = 3
            else: idx = 4

            totals[idx] += 1
            if str(row.get('fraud_reported', '')).upper() in ['Y', 'FRAUDULENT', '1']:
                frauds[idx] += 1

        rates = [
            round((frauds[i] / totals[i] * 100), 1) if totals[i] > 0 else 0.0
            for i in range(len(age_ranges))
        ]

        return {
            "success": True,
            "labels": age_ranges,
            "rates": rates,
            "totals": totals,
            "fraud_counts": frauds
        }

    def get_risk_distribution(self) -> Dict[str, Any]:
        df = self._get_df()
        low_count = 0
        med_count = 0
        high_count = 0

        for _, row in df.iterrows():
            is_fraud = str(row.get('fraud_reported', '')).upper() in ['Y', 'FRAUDULENT', '1']
            try:
                amt = float(row.get('total_claim_amount') or row.get('total_claim') or 0)
            except (ValueError, TypeError):
                amt = 0

            if is_fraud:
                high_count += 1
            elif amt > 70000:
                med_count += 1
            else:
                low_count += 1

        total = low_count + med_count + high_count or 1
        low_rate = round((low_count / total) * 100, 1)
        med_rate = round((med_count / total) * 100, 1)
        high_rate = round((high_count / total) * 100, 1)

        return {
            "success": True,
            "labels": ["Low Risk", "Medium Risk", "High Risk"],
            "rates": [low_rate, med_rate, high_rate],
            "counts": [low_count, med_count, high_count]
        }

    def get_monthly_trend(self) -> Dict[str, Any]:
        df = self._get_df()
        month_order = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        months_group = {m: {"total": 0, "fraud": 0} for m in month_order}

        date_col = "incident_date" if "incident_date" in df.columns else "claim_date"

        for _, row in df.iterrows():
            raw_date = str(row.get(date_col, ''))
            parts = raw_date.split('-')
            if len(parts) >= 2:
                try:
                    month_num = int(parts[1])
                    if 1 <= month_num <= 12:
                        m_name = month_order[month_num - 1]
                        months_group[m_name]["total"] += 1
                        if str(row.get('fraud_reported', '')).upper() in ['Y', 'FRAUDULENT', '1']:
                            months_group[m_name]["fraud"] += 1
                except ValueError:
                    pass

        active_months = [m for m in month_order if months_group[m]["total"] > 0]
        if not active_months:
            active_months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']

        total_data = [months_group[m]["total"] for m in active_months]
        fraud_data = [months_group[m]["fraud"] for m in active_months]

        return {
            "success": True,
            "months": active_months,
            "total_claims": total_data,
            "fraud_claims": fraud_data
        }

analytics_service = AnalyticsService()
