# Vehicle Insurance Fraud Intelligence Platform
**Full-Stack Machine Learning Deployment (FastAPI + React/Vite)**

An end-to-end Machine Learning intelligence platform combining exploratory data analysis, data preprocessing, regression modeling, hyperparameter-tuned ensemble classification, and a modern React/Vite analytics dashboard served by a high-performance FastAPI backend.

---

## 1. Project Overview & Tasks Breakdown

This project bridges data science, machine learning, and modern full-stack web engineering across 5 comprehensive tasks:

### Task 1: Exploratory Data Analysis (`Task 1.ipynb`)
- **Dataset**: `insurance_fraud_data.csv` (12,002 records, 29 attributes).
- **Core Operations**: Inspected dataset dimensions (`shape`), attribute datatypes (`dtypes`), summary statistics (`describe`), unique categorical values, missing value distribution, and feature cross-tabulations for driver demographics and claim characteristics.

### Task 2: Data Preprocessing & Visualization (`Task 2.ipynb`)
- **Missing Value Imputation**: Mode imputation for missing target values in `fraud reported`.
- **Deduplication**: Duplicate detection and removal.
- **Date Formatting**: Conversion of string claim dates to standard datetime.
- **Outlier Treatment**: Interquartile Range (IQR) detection and filtering on `annual_income`.
- **Visual Analytics**: Distribution histograms, boxplots of form defects, bar and pie charts of fraud ratios, and demographic count plots.
- **Cleaned Data Generation**: Produces `cleaned_data.csv` with one-hot encoded categorical variables (42 numeric feature predictors).

### Task 3: Regression for Claim Amount (`Task 3.ipynb`)
- **Target**: `total_claim` (continuous numerical prediction).
- **Predictors**: `age_of_driver`, `annual_income`, `vehicle_price`, `policy deductible`, `annual premium`, `form defects`.
- **Implementation**:
  - Scikit-Learn `LinearRegression` with 80/20 train/test split.
  - `StandardScaler` feature normalization.
  - Custom **Gradient Descent from scratch** with loss history logging, dynamic weight adjustments, and direct mathematical verification against Scikit-Learn coefficients.

### Task 4: Intelligence Dashboard Frontend (`Task 4 Frontend/`)
- **Framework**: Single Page Application built with HTML5, CSS3, JavaScript (ES Modules), Chart.js, and Lucide icons, bundled using Vite.
- **Views**:
  - **Overview Dashboard**: Real-time KPI summary cards, monthly claim volume trends, doughnut distribution, and recent claims table.
  - **Claims Explorer**: Server-side paginated claims table with global search, fraud status filtering, severity filtering, state filtering, column sorting, and full detail slide-over drawer.
  - **Analytics Tab**: Deep-dive visualizations for severity breakdowns, vehicle category fraud rates, accident site patterns, driver age cohorts, and risk tiers.
  - **Fraud Risk Profiler**: Interactive real-time risk assessment gauge evaluating accident particulars.
  - **ML Model Lab**: Comprehensive 26-parameter claim analysis form connected directly to FastAPI inference for both Task 5 classification and Task 3 regression.

### Task 5: Ensemble Classification & Hyperparameter Tuning (`Task5_Classification.ipynb`)
- **Target**: `fraud_reported_Y` (binary fraud classification).
- **Models Evaluated**:
  1. Logistic Regression (StandardScaler Pipeline)
  2. Decision Tree Classifier
  3. Random Forest Classifier
  4. AdaBoost Classifier
  5. Gradient Boosting Classifier
- **Validation**: 5-Fold Stratified Cross-Validation (`StratifiedKFold`) scored on F1.
- **Tuning**: `GridSearchCV` hyperparameter optimization on the best cross-validated model (`Gradient Boosting` / `Random Forest`).
- **Evaluation**: Accuracy, Precision, Recall, F1 score, Confusion Matrix, and full Classification Report.

---

## 2. System Architecture

```
                       ┌─────────────────────────────────────┐
                       │           React / Vite SPA          │
                       │           (Task 4 Frontend)         │
                       └──────────────────┬──────────────────┘
                                          │
                        HTTP REST / JSON  │  VITE_API_URL
                                          ▼
                       ┌─────────────────────────────────────┐
                       │          FastAPI Web API            │
                       │             (backend/)              │
                       └──────────────────┬──────────────────┘
                                          │
            ┌─────────────────────────────┼─────────────────────────────┐
            │                             │                             │
            ▼                             ▼                             ▼
┌───────────────────────┐   ┌───────────────────────────┐   ┌───────────────────────┐
│     Data Service      │   │   Task 3 Regression ML    │   │ Task 5 Classification │
│  insurance_claims.csv │   │  LinearRegression + Scaler│   │ Tuned GradientBoost   │
└───────────────────────┘   └───────────────────────────┘   └───────────────────────┘
```

---

## 3. Repository Directory Structure

```
ML Project/
│
├── Task 1.ipynb                          # Task 1: Exploratory Data Analysis
├── Task 2.ipynb                          # Task 2: Preprocessing & Visualizations
├── Task 3.ipynb                          # Task 3: Linear Regression & Gradient Descent
├── Task5_Classification.ipynb            # Task 5: Ensemble Classification & GridSearchCV
│
├── insurance_fraud_data.csv              # Raw 12,002 claims dataset
├── cleaned_data.csv                      # One-hot encoded dataset (42 features)
├── Classification_Task3_Data.csv         # Auxiliary classification sample
│
├── backend/                              # Production FastAPI Backend
│   ├── main.py                           # App entry point, CORS, routers, lifespan
│   ├── train_models.py                   # Standalone training script (run once)
│   ├── requirements.txt                  # Minimal Python dependencies
│   ├── .env.example                      # Environment variables template
│   ├── .env                              # Local backend environment config
│   ├── README.md                         # Backend Render deployment guide
│   │
│   ├── data/                             # Backend datasets
│   │   ├── insurance_claims.csv          # Claims table dataset (1,000 records)
│   │   ├── insurance_fraud_data.csv      # Raw dataset (12,002 records)
│   │   └── cleaned_data.csv              # One-hot dataset for classification
│   │
│   ├── models/                           # Trained serialized models & evaluation
│   │   ├── regression_model.pkl          # Task 3 Linear Regression model
│   │   ├── regression_scaler.pkl         # Task 3 StandardScaler
│   │   ├── regression_metadata.json      # Task 3 metrics, coefficients, GD weights
│   │   ├── classification_model.pkl      # Task 5 Tuned Gradient Boosting model
│   │   ├── classification_preprocessor.pkl # Feature columns alignment schema
│   │   ├── all_classification_models.pkl # All 5 baseline fitted models
│   │   └── evaluation_results.json       # Real evaluation, CV scores & confusion matrix
│   │
│   ├── schemas/                          # Pydantic data schemas
│   │   ├── claims_schema.py              # Claims list & dashboard summary
│   │   ├── regression_schema.py          # Task 3 prediction input/output
│   │   └── classification_schema.py      # Task 5 prediction, models & evaluation
│   │
│   ├── services/                         # Business logic & ML inference
│   │   ├── data_service.py               # Pagination, search, filtering & sorting
│   │   ├── dashboard_service.py          # Real calculated KPIs
│   │   ├── analytics_service.py          # Chart distribution aggregations
│   │   ├── regression_service.py         # Task 3 model prediction engine
│   │   └── classification_service.py     # Task 5 model prediction & metrics
│   │
│   └── routers/                          # API route definitions
│       ├── data_router.py                # /api/claims
│       ├── dashboard_router.py           # /api/dashboard/summary
│       ├── analytics_router.py           # /api/analytics/*
│       ├── regression_router.py          # /api/regression/predict
│       └── classification_router.py      # /api/classification/*
│
├── Task 4 Frontend/                      # Vite Frontend
│   ├── index.html                        # Main SPA markup & dashboard views
│   ├── app.js                            # Frontend application logic
│   ├── api.js                            # Centralized API client module
│   ├── styles.css                        # Glassmorphism & dark/light theme CSS
│   ├── package.json                      # npm dependencies & build scripts
│   ├── vercel.json                       # Vercel SPA routing rewrite config
│   ├── .env.example                      # Frontend environment template
│   ├── .env                              # Local frontend environment config
│   └── data/
│       ├── insurance_claims.csv          # Claims dataset reference
│       └── insurance_claims_json.js      # Offline fallback dataset
│
└── README.md                             # Complete project documentation
```

---

## 4. API Endpoints Reference

The FastAPI backend automatically serves interactive Swagger documentation at [http://localhost:8000/docs](http://localhost:8000/docs).

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health status check |
| `GET` | `/api/dashboard/summary` | Real KPI statistics (total claims, fraud count, rates, avg claim) |
| `GET` | `/api/claims` | Paginated claims query with search, filter, and sort |
| `GET` | `/api/claims/{policy_number}` | Detailed record for a single claim policy |
| `GET` | `/api/analytics/fraud-vs-genuine` | Claim distribution across incident severity levels |
| `GET` | `/api/analytics/fraud-by-vehicle` | Fraud rates by vehicle category (SUV, Sedan, Sport, Utility) |
| `GET` | `/api/analytics/fraud-by-site` | Fraud rates by accident site / location |
| `GET` | `/api/analytics/fraud-by-age` | Fraud rates grouped by driver age cohorts |
| `GET` | `/api/analytics/risk-distribution` | Low, Medium, and High risk percentage breakdown |
| `GET` | `/api/analytics/monthly-trend` | Monthly total claim volume and fraud trends |
| `POST` | `/api/regression/predict` | Task 3 Linear Regression total claim prediction |
| `POST` | `/api/classification/predict` | Task 5 Tuned ML fraud prediction, probability & factors |
| `GET` | `/api/classification/models` | Performance metrics for all 5 baseline ML models |
| `GET` | `/api/classification/evaluation` | Full cross-validation, GridSearchCV, and confusion matrix |

---

## 5. Local Setup & Execution Guide

### Prerequisites
- Python 3.10+ installed
- Node.js 18+ and npm installed

---

### Step 1: Start the Backend (FastAPI)

1. Open a terminal and navigate to the `backend/` folder:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```bash
   # Windows (PowerShell)
   python -m venv venv
   venv\Scripts\activate

   # macOS / Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install required packages:
   ```bash
   pip install -r requirements.txt
   ```

4. Train the ML models (pre-generates model artifacts so the API loads instantly):
   ```bash
   python train_models.py
   ```

5. Run the FastAPI development server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
   *Your backend is now running at:* `http://localhost:8000`  
   *Interactive API Docs:* `http://localhost:8000/docs`

---

### Step 2: Start the Frontend (React / Vite)

1. Open a second terminal and navigate to the frontend folder:
   ```bash
   cd "Task 4 Frontend"
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Verify `.env` file contains the local backend URL:
   ```env
   VITE_API_URL=http://localhost:8000
   ```

4. Run the Vite development server:
   ```bash
   npm run dev
   ```

5. Open your browser at [http://localhost:5173](http://localhost:5173).
   - Click **"Continue with Demo Account"** to sign in.
   - You will see the top header badge display **"FastAPI Online"**, indicating the frontend is communicating with the live backend!

---

## 6. How Frontend Communicates with Backend

1. **Centralized Configuration (`api.js`)**:
   The frontend uses Vite's environment variable:
   ```javascript
   export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
   ```
   *No localhost URLs are hardcoded inside UI components.*
2. **Dashboard Overview**: Fetches real statistics from `/api/dashboard/summary` and `/api/analytics/monthly-trend`.
3. **Claims Explorer**: Dynamically requests `/api/claims?page=X&page_size=10&...` whenever search terms, status filters, or sorting headers change.
4. **Fraud Detection Lab**:
   Submitting the comprehensive ML form dispatches parallel asynchronous calls to:
   - `POST /api/classification/predict` (Task 5 Classification model)
   - `POST /api/regression/predict` (Task 3 Regression model)
   The results are rendered into the interactive assessment modal.

---

## 7. Production Deployment (Render + Vercel)

Follow this deployment sequence as specified in the deployment guide:

```
[FastAPI Backend] ──────> Deploy to Render first ──────> Obtain Render URL
                                                               │
                                                               ▼
[React/Vite Frontend] ──> Set VITE_API_URL on Vercel ──> Deploy to Vercel
```

---

### Part A: Deploy FastAPI Backend to Render

1. Push your repository to **GitHub**.
2. Log in to [Render Dashboard](https://dashboard.render.com/) and click **New +** > **Web Service**.
3. Connect your GitHub repository.
4. Configure the Web Service settings:
   - **Name**: `insurance-fraud-backend` (or your choice)
   - **Region**: Closest to your users (e.g., Singapore, Frankfurt, Oregon)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**:
     ```bash
     pip install -r requirements.txt && python train_models.py
     ```
   - **Start Command**:
     ```bash
     uvicorn main:app --host 0.0.0.0 --port $PORT
     ```
5. **Environment Variables**:
   Under the **Environment** tab on Render, add:
   - `PORT`: (automatically supplied by Render)
   - `CORS_ORIGINS`: Temporary wildcard `*` (or your initial frontend URL). You will update this with your exact Vercel URL once deployed.
6. Click **Deploy Web Service**.
7. Once deployed, copy your live backend URL (e.g. `https://insurance-fraud-backend.onrender.com`).
8. Verify it by visiting `https://insurance-fraud-backend.onrender.com/api/health` in your browser.

---

### Part B: Deploy React Frontend to Vercel

1. Log in to [Vercel](https://vercel.com/) and click **Add New...** > **Project**.
2. Import your GitHub repository.
3. In the project setup screen:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click *Edit* and select `Task 4 Frontend`.
   - **Build Command**: `npm run build` (detected automatically)
   - **Output Directory**: `dist` (detected automatically)
4. **Environment Variables**:
   Expand the **Environment Variables** section and add:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://insurance-fraud-backend.onrender.com` *(Replace with your real Render URL)*
5. Click **Deploy**.
6. When deployment finishes, copy your live Vercel domain (e.g. `https://insurance-fraud-frontend.vercel.app`).

---

### Part C: Update CORS on Render

1. Return to your Render Web Service dashboard.
2. Go to **Environment** > **Environment Variables**.
3. Update `CORS_ORIGINS` to point to your exact Vercel production domain:
   ```
   CORS_ORIGINS=https://insurance-fraud-frontend.vercel.app
   ```
4. Save changes. Render will automatically redeploy the backend with production CORS restrictions.

---

## 8. Verification & Testing Checklist

- [x] Backend startup (`uvicorn backend.main:app --port 8000`)
- [x] `/api/health` returns status `ok`
- [x] `/docs` interactive Swagger UI loads
- [x] `/api/dashboard/summary` returns calculated genuine/fraud metrics
- [x] `/api/claims` supports pagination, search, status, and state filters
- [x] `/api/analytics/*` endpoints return real distribution arrays
- [x] `/api/regression/predict` returns Linear Regression claim estimates
- [x] `/api/classification/predict` returns real probability & risk badge
- [x] `/api/classification/models` lists all 5 models with real metrics
- [x] `/api/classification/evaluation` returns CV F1 scores & confusion matrix
- [x] Frontend connects to backend dynamically via `VITE_API_URL`
- [x] Frontend `npm run build` bundles without errors
- [x] UI design, dark/light theme, and layout remain completely preserved
