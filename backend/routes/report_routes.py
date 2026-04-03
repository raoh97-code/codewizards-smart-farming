"""
Report routes — Fetch user history + PDF operations.
Aligned to `soil_reports`, `recommendations`, and `pdf_reports` tables.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response

from auth import get_current_user
from database import supabase
from models import UserHistoryRow, PdfReportOut
from pdf_generator import generate_pdf_report

router = APIRouter()


# ------------------------------------------------------------------ #
#  GET /api/reports/history — Fetch all records for the current user  #
# ------------------------------------------------------------------ #
@router.get(
    "/history",
    response_model=list[UserHistoryRow],
    summary="Fetch user's full soil + recommendation history",
)
def get_user_history(current_user: dict = Depends(get_current_user)):
    """
    Return every soil report with its linked recommendation and PDF URL
    for the authenticated user, newest first.

    Queries the **user_history** view (join of soil_reports + recommendations
    + pdf_reports) filtered by user_id from the JWT.
    """
    user_id = current_user["sub"]

    result = (
        supabase.table("user_history")
        .select("*")
        .eq("user_id", user_id)
        .order("soil_timestamp", desc=True)
        .execute()
    )

    return [UserHistoryRow(**row) for row in result.data]


# ------------------------------------------------------------------ #
#  GET /api/reports/soil — All soil_reports for current user          #
# ------------------------------------------------------------------ #
@router.get(
    "/soil",
    summary="Get all soil reports for the current user",
)
def get_soil_reports(current_user: dict = Depends(get_current_user)):
    """Return all rows from **soil_reports** belonging to this user."""
    result = (
        supabase.table("soil_reports")
        .select("*")
        .eq("user_id", current_user["sub"])
        .order("timestamp", desc=True)
        .execute()
    )
    return result.data


# ------------------------------------------------------------------ #
#  GET /api/reports/recommendations/{report_id}                       #
# ------------------------------------------------------------------ #
@router.get(
    "/recommendations/{report_id}",
    summary="Get recommendation for a specific soil report",
)
def get_recommendation(
    report_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Fetch the row from **recommendations** linked to the given report_id."""
    # Ownership check via soil_reports
    sr = (
        supabase.table("soil_reports")
        .select("id")
        .eq("id", report_id)
        .eq("user_id", current_user["sub"])
        .execute()
    )
    if not sr.data:
        raise HTTPException(status_code=404, detail="Report not found or access denied.")

    result = (
        supabase.table("recommendations")
        .select("*")
        .eq("report_id", report_id)
        .execute()
    )
    return result.data


# ------------------------------------------------------------------ #
#  GET /api/reports/pdf/{report_id} — Stream PDF for a saved report   #
# ------------------------------------------------------------------ #
@router.get(
    "/pdf/{report_id}",
    summary="Download a soil report as a PDF",
)
def download_pdf(
    report_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Fetch soil_report + recommendation from Supabase and stream back
    a ReportLab-generated PDF.
    """
    user_id = current_user["sub"]

    # Fetch soil report (also validates ownership)
    sr = (
        supabase.table("soil_reports")
        .select("*")
        .eq("id", report_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not sr.data:
        raise HTTPException(status_code=404, detail="Report not found or access denied.")
    soil = sr.data

    # Fetch recommendation (may not exist yet)
    rec_res = (
        supabase.table("recommendations")
        .select("*")
        .eq("report_id", report_id)
        .execute()
    )
    rec = rec_res.data[0] if rec_res.data else {}

    # Fetch user name
    user_res = (
        supabase.table("users")
        .select("name")
        .eq("id", user_id)
        .single()
        .execute()
    )
    user_name = user_res.data["name"] if user_res.data else "Farmer"

    report_payload = {
        "user_name":          user_name,
        "generated_at":       datetime.now(timezone.utc).isoformat(),
        "soil_data": {
            "nitrogen":       soil["nitrogen"],
            "phosphorus":     soil["phosphorus"],
            "potassium":      soil["potassium"],
            "ph":             soil["ph"],
            "organic_carbon": soil.get("organic_carbon", 0),
        },
        "crop_recommendation":  rec.get("crop_name", "N/A"),
        "fertilizer":           rec.get("fertilizer_type", "N/A"),
        "dosage":               rec.get("fertilizer_quantity", ""),
        "soil_health_score":    0,
        "recommendations":      [rec.get("application_schedule", "")] if rec else [],
        "notes":                rec.get("soil_health_status", ""),
    }

    pdf_bytes = generate_pdf_report(report_payload)

    # Optionally save PDF URL to pdf_reports table (if you use Supabase Storage)
    # supabase.table("pdf_reports").insert({...}).execute()

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="report_{report_id[:8]}.pdf"'
        },
    )


# ------------------------------------------------------------------ #
#  GET /api/reports/pdfs — List saved pdf_reports for the user        #
# ------------------------------------------------------------------ #
@router.get(
    "/pdfs",
    response_model=list[PdfReportOut],
    summary="List all saved PDF report records",
)
def list_pdf_reports(current_user: dict = Depends(get_current_user)):
    """Return rows from **pdf_reports** for the current user."""
    result = (
        supabase.table("pdf_reports")
        .select("*")
        .eq("user_id", current_user["sub"])
        .order("created_at", desc=True)
        .execute()
    )
    return [PdfReportOut(**row) for row in result.data]
