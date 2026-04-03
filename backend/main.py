"""
FastAPI entry point — Smart Farming System
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.auth_routes import router as auth_router
from routes.soil_routes import router as soil_router
from routes.report_routes import router as report_router

app = FastAPI(
    title="Smart Farming API",
    description="AI-powered crop & soil analysis backend for smart farming.",
    version="1.0.0",
)

# ---------------------------------------------------------------------------
# CORS — allow the frontend dev server and production origin
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(auth_router,   prefix="/api/auth",    tags=["Auth"])
app.include_router(soil_router,   prefix="/api/soil",    tags=["Soil & Crops"])
app.include_router(report_router, prefix="/api/reports", tags=["Reports"])


@app.get("/", tags=["Health"])
def health_check():
    return {"status": "ok", "message": "Smart Farming API is running 🌱"}
