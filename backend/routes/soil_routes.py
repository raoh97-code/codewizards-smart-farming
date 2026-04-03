"""
Soil routes — Insert Soil Data & Insert Recommendation Result.
Aligned to `soil_reports` and `recommendations` tables.
Also exposes crop/fertilizer/health analysis endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from auth import get_current_user
from database import supabase
from models import SoilReportIn, SoilReportOut, RecommendationIn, RecommendationOut, SoilInput
from ml_predictor import predict_recommendation
from soil_analysis import analyse_soil
from crop_model import recommend_crop
from fertilizer_model import recommend_fertilizer
from ocr_reader import extract_text_from_image

router = APIRouter()


# ------------------------------------------------------------------ #
#  POST /api/soil/reports — Insert soil data into soil_reports table  #
# ------------------------------------------------------------------ #
@router.post(
    "/reports",
    response_model=SoilReportOut,
    status_code=status.HTTP_201_CREATED,
    summary="Insert soil sensor data",
)
def insert_soil_report(
    body: SoilReportIn,
    current_user: dict = Depends(get_current_user),
):
    """
    Insert a new row into **soil_reports**.

    | Column         | Source        |
    |----------------|---------------|
    | user_id        | JWT token     |
    | nitrogen       | request body  |
    | phosphorus     | request body  |
    | potassium      | request body  |
    | ph             | request body  |
    | organic_carbon | request body  |
    | timestamp      | DB default    |
    """
    user_id = current_user["sub"]

    result = (
        supabase.table("soil_reports")
        .insert({
            "user_id":        user_id,
            "nitrogen":       body.nitrogen,
            "phosphorus":     body.phosphorus,
            "potassium":      body.potassium,
            "ph":             body.ph,
            "organic_carbon": body.organic_carbon,
        })
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save soil report.")

    row = result.data[0]
    return SoilReportOut(**row)


# ------------------------------------------------------------------ #
#  POST /api/soil/recommendations — Insert recommendation result      #
# ------------------------------------------------------------------ #
@router.post(
    "/recommendations",
    response_model=RecommendationOut,
    status_code=status.HTTP_201_CREATED,
    summary="Insert a crop/fertilizer recommendation",
)
def insert_recommendation(
    body: RecommendationIn,
    current_user: dict = Depends(get_current_user),
):
    """
    Insert a new row into **recommendations** linked to an existing soil report.

    The `report_id` must belong to the authenticated user — this is verified
    by checking the `soil_reports` table before inserting.
    """
    # Ownership check: make sure this report belongs to the caller
    check = (
        supabase.table("soil_reports")
        .select("id")
        .eq("id", body.report_id)
        .eq("user_id", current_user["sub"])
        .execute()
    )
    if not check.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Soil report not found or does not belong to you.",
        )

    result = (
        supabase.table("recommendations")
        .insert({
            "report_id":            body.report_id,
            "crop_name":            body.crop_name,
            "fertilizer_type":      body.fertilizer_type,
            "fertilizer_quantity":  body.fertilizer_quantity,
            "application_schedule": body.application_schedule,
            "soil_health_status":   body.soil_health_status,
        })
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save recommendation.")

    row = result.data[0]
    return RecommendationOut(**row)


# ------------------------------------------------------------------ #
#  POST /api/soil/analyze — All-in-one: insert + auto-recommend       #
# ------------------------------------------------------------------ #
@router.post(
    "/analyze",
    status_code=status.HTTP_201_CREATED,
    summary="Insert soil data and auto-generate recommendation (one call)",
)
def analyze_and_insert(
    body: SoilReportIn,
    current_user: dict = Depends(get_current_user),
):
    """
    Convenience endpoint:
    1. Inserts into **soil_reports**
    2. Runs ML/rule-based crop + fertilizer + health analysis
    3. Inserts into **recommendations**
    4. Returns the full result
    """
    user_id = current_user["sub"]

    # 1. Save soil report
    sr_result = (
        supabase.table("soil_reports")
        .insert({
            "user_id":        user_id,
            "nitrogen":       body.nitrogen,
            "phosphorus":     body.phosphorus,
            "potassium":      body.potassium,
            "ph":             body.ph,
            "organic_carbon": body.organic_carbon,
        })
        .execute()
    )
    if not sr_result.data:
        raise HTTPException(status_code=500, detail="Failed to save soil report.")

    report_id = sr_result.data[0]["id"]

    # 2. Single ML pass → all 5 outputs
    ml = predict_recommendation({
        "nitrogen":       body.nitrogen,
        "phosphorus":     body.phosphorus,
        "potassium":      body.potassium,
        "ph":             body.ph,
        "organic_carbon": body.organic_carbon,
    })

    # 3. Save recommendation — all columns aligned to the DB table
    rec_result = (
        supabase.table("recommendations")
        .insert({
            "report_id":            report_id,
            "crop_name":            ml["recommended_crop"],
            "fertilizer_type":      ml["fertilizer_type"],
            "fertilizer_quantity":  ml["fertilizer_quantity"],
            "application_schedule": ml["application_schedule"],
            "soil_health_status":   ml["soil_health_status"],
        })
        .execute()
    )
    recommendation = rec_result.data[0] if rec_result.data else {}

    return {
        "report_id":            report_id,
        "soil_report":          sr_result.data[0],
        "recommended_crop":     ml["recommended_crop"],
        "confidence":           ml["confidence"],
        "alternatives":         ml["alternatives"],
        "fertilizer_type":      ml["fertilizer_type"],
        "fertilizer_quantity":  ml["fertilizer_quantity"],
        "application_schedule": ml["application_schedule"],
        "soil_health_status":   ml["soil_health_status"],
        "recommendation_id":    recommendation.get("id"),
    }


# ------------------------------------------------------------------ #
#  POST /api/soil/ocr-extract                                         #
# ------------------------------------------------------------------ #
@router.post("/ocr-extract", summary="Extract soil data text from an image")
async def ocr_extract(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """Upload a photo of a soil test report and extract its text via Tesseract."""
    image_bytes = await file.read()
    text = extract_text_from_image(image_bytes)
    return {"filename": file.filename, "extracted_text": text}
