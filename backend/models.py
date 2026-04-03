"""
Pydantic models aligned exactly to the Supabase table schema.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


# ============================================================
# Auth
# ============================================================

class SignupRequest(BaseModel):
    name: str = Field(..., example="Rahul Sharma")
    email: EmailStr = Field(..., example="rahul@farm.com")
    password: str = Field(..., min_length=6, example="secret123")


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    created_at: datetime


# ============================================================
# soil_reports table
# ============================================================

class SoilReportIn(BaseModel):
    """Payload to create a new soil_reports row."""
    nitrogen:       float = Field(..., ge=0,    description="Nitrogen (kg/ha)")
    phosphorus:     float = Field(..., ge=0,    description="Phosphorus (kg/ha)")
    potassium:      float = Field(..., ge=0,    description="Potassium (kg/ha)")
    ph:             float = Field(..., ge=0, le=14, description="Soil pH")
    organic_carbon: float = Field(0.0, ge=0,   description="Organic carbon (%)")


class SoilReportOut(BaseModel):
    id:             str
    user_id:        str
    nitrogen:       float
    phosphorus:     float
    potassium:      float
    ph:             float
    organic_carbon: float
    timestamp:      datetime


# ============================================================
# recommendations table
# ============================================================

class RecommendationIn(BaseModel):
    """Payload to create a recommendations row (linked to a soil_report)."""
    report_id:            str
    crop_name:            str
    fertilizer_type:      str
    fertilizer_quantity:  str = Field(..., example="50 kg/ha")
    application_schedule: str = Field(..., example="50% sowing, 25% at 30d, 25% at 60d")
    soil_health_status:   str = Field(..., example="Good")


class RecommendationOut(BaseModel):
    id:                   str
    report_id:            str
    crop_name:            str
    fertilizer_type:      str
    fertilizer_quantity:  str
    application_schedule: str
    soil_health_status:   str
    created_at:           datetime


# ============================================================
# pdf_reports table
# ============================================================

class PdfReportOut(BaseModel):
    id:         str
    user_id:    str
    report_id:  str
    pdf_url:    str
    created_at: datetime


# ============================================================
# Combined history row (from user_history view)
# ============================================================

class UserHistoryRow(BaseModel):
    report_id:            str
    user_id:              str
    nitrogen:             float
    phosphorus:           float
    potassium:            float
    ph:                   float
    organic_carbon:       float
    soil_timestamp:       datetime
    recommendation_id:    Optional[str] = None
    crop_name:            Optional[str] = None
    fertilizer_type:      Optional[str] = None
    fertilizer_quantity:  Optional[str] = None
    application_schedule: Optional[str] = None
    soil_health_status:   Optional[str] = None
    pdf_url:              Optional[str] = None


# ============================================================
# Internal helpers (used by ML modules)
# ============================================================

class SoilInput(BaseModel):
    """Extended soil input used by the ML/analysis modules."""
    nitrogen:       float
    phosphorus:     float
    potassium:      float
    temperature:    float = 25.0
    humidity:       float = 60.0
    ph:             float
    rainfall:       float = 100.0
    organic_carbon: float = 0.0
