import os
import sys
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from dotenv import load_dotenv

# Ensure both current directory (backend/) and parent directory are on sys.path
CURRENT_DIR = Path(__file__).resolve().parent
PARENT_DIR = CURRENT_DIR.parent
for p in [str(CURRENT_DIR), str(PARENT_DIR)]:
    if p not in sys.path:
        sys.path.insert(0, p)

# Load environment variables from .env if present
load_dotenv()

try:
    from services.data_service import data_service
    from services.regression_service import regression_service
    from services.classification_service import classification_service
    from routers.data_router import router as data_router
    from routers.dashboard_router import router as dashboard_router
    from routers.analytics_router import router as analytics_router
    from routers.regression_router import router as regression_router
    from routers.classification_router import router as classification_router
except ImportError:
    from backend.services.data_service import data_service
    from backend.services.regression_service import regression_service
    from backend.services.classification_service import classification_service
    from backend.routers.data_router import router as data_router
    from backend.routers.dashboard_router import router as dashboard_router
    from backend.routers.analytics_router import router as analytics_router
    from backend.routers.regression_router import router as regression_router
    from backend.routers.classification_router import router as classification_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Preload models and datasets into memory once on startup
    print("Initializing application resources and preloading ML models...")
    try:
        data_service.load_data()
        regression_service.load_artifacts()
        classification_service.load_artifacts()
        print("All resources loaded successfully!")
    except Exception as e:
        print(f"Warning during startup preloading: {e}")
    yield
    print("Shutting down application resources.")


app = FastAPI(
    title="Vehicle Insurance Fraud Intelligence API",
    description="Full-stack FastAPI backend serving Task 3 Regression, Task 5 Classification, claims querying, dashboard KPIs, and analytics.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Configure CORS
# In production on Render/Vercel, set CORS_ORIGINS via environment variables
raw_origins = os.getenv("CORS_ORIGINS", "")
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

if raw_origins.strip():
    for origin in raw_origins.split(","):
        cleaned = origin.strip()
        if cleaned and cleaned not in allowed_origins:
            allowed_origins.append(cleaned)

# If wildcard is set or for flexible deployments:
allow_all = "*" in allowed_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if allow_all else allowed_origins,
    allow_credentials=True if not allow_all else False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")


@app.get("/api/health", tags=["Health"])
def health_check():
    """System health check endpoint for monitoring and Render health checks."""
    return {
        "status": "ok",
        "service": "Vehicle Insurance Fraud Intelligence API",
        "version": "1.0.0"
    }


# Mount all feature routers
app.include_router(data_router)
app.include_router(dashboard_router)
app.include_router(analytics_router)
app.include_router(regression_router)
app.include_router(classification_router)


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
