# Vehicle Insurance Fraud Intelligence - FastAPI Backend

Production-ready FastAPI backend serving trained machine learning models for Task 3 (Regression) and Task 5 (Classification), insurance claims database queries, dashboard KPI summaries, and chart analytics.

## Features
- **Task 3 Regression Endpoint**: Predicts total insurance claim amount using Linear Regression and feature scaling (`POST /api/regression/predict`).
- **Task 5 Classification Endpoint**: Predicts claim fraud status, real probability, and risk tiers using tuned Gradient Boosting / Random Forest (`POST /api/classification/predict`).
- **Model Evaluation API**: Exposes true metrics, 5-fold cross-validation scores, confusion matrix, and classification report (`GET /api/classification/models` and `GET /api/classification/evaluation`).
- **Claims Query API**: Server-side pagination, multi-field search, filtering (status, severity, state), and sorting (`GET /api/claims`).
- **Dashboard & Analytics APIs**: Serves real calculated KPIs and chart datasets without mock values.
- **FastAPI OpenAPI / Swagger**: Interactive API docs at `/docs` and `/redoc`.

---

## Local Setup

### 1. Create and Activate Virtual Environment
```bash
cd backend
python -m venv venv

# Windows (Command Prompt / PowerShell)
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Train Models (Run Once)
```bash
python train_models.py
```
This script trains all models, performs 5-fold cross-validation, executes GridSearchCV tuning, and saves the models into `models/`.

### 4. Run the Backend Server
```bash
uvicorn backend.main:app --reload --port 8000
```
Open [http://localhost:8000/docs](http://localhost:8000/docs) in your browser to inspect interactive Swagger documentation.

---

## Deployment to Render

This backend is designed for zero-config deployment to **Render** as a Python Web Service.

### Render Configuration Settings
| Setting | Value |
|---|---|
| **Environment** | Python 3 |
| **Root Directory** | `backend` (or leave empty if repository root is backend) |
| **Build Command** | `pip install -r requirements.txt && python train_models.py` |
| **Start Command** | `uvicorn main:app --host 0.0.0.0 --port $PORT` |

### Environment Variables on Render
Add the following in the Render Dashboard under **Environment Variables**:
- `PORT`: Automatically set by Render (defaults to 10000 or custom port).
- `CORS_ORIGINS`: Your Vercel frontend URL, e.g.:
  `https://your-app-name.vercel.app`

### Health Check Endpoint
- Health Check Path: `/api/health`
