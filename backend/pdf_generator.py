"""
PDF report generator using ReportLab.
Produces a nicely formatted A4 report for a farming analysis session.
"""

import io
from datetime import datetime

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)


# Colour palette
_GREEN  = colors.HexColor("#2E7D32")
_LGREEN = colors.HexColor("#C8E6C9")
_GREY   = colors.HexColor("#F5F5F5")


def _header_style() -> ParagraphStyle:
    styles = getSampleStyleSheet()
    return ParagraphStyle(
        "SmHeader",
        parent=styles["Heading1"],
        textColor=_GREEN,
        fontSize=20,
        spaceAfter=6,
    )


def _sub_style() -> ParagraphStyle:
    styles = getSampleStyleSheet()
    return ParagraphStyle(
        "SmSub",
        parent=styles["Heading2"],
        textColor=_GREEN,
        fontSize=13,
        spaceAfter=4,
    )


def _body_style() -> ParagraphStyle:
    styles = getSampleStyleSheet()
    return ParagraphStyle(
        "SmBody",
        parent=styles["Normal"],
        fontSize=10,
        leading=14,
    )


def generate_pdf_report(report_data: dict) -> bytes:
    """
    Build a PDF report from *report_data* and return the raw bytes.

    Expected keys in report_data:
        user_name, generated_at (ISO str), soil_data (dict),
        crop_recommendation (str), fertilizer (str), dosage (str),
        soil_health_score (float), recommendations (list[str]), notes (str)
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )

    h1 = _header_style()
    h2 = _sub_style()
    body = _body_style()
    story = []

    # ---- Title block -------------------------------------------------------
    story.append(Paragraph("🌱 Smart Farming Analysis Report", h1))
    story.append(HRFlowable(width="100%", thickness=1, color=_GREEN))
    story.append(Spacer(1, 0.3 * cm))

    generated_at = report_data.get("generated_at", datetime.utcnow().isoformat())
    story.append(Paragraph(f"<b>Farmer:</b> {report_data.get('user_name', 'N/A')}", body))
    story.append(Paragraph(f"<b>Generated At:</b> {generated_at}", body))
    story.append(Spacer(1, 0.5 * cm))

    # ---- Soil Data Table ---------------------------------------------------
    story.append(Paragraph("Soil Input Data", h2))
    soil = report_data.get("soil_data", {})
    soil_rows = [
        ["Parameter", "Value"],
        ["Nitrogen (N)",    f"{soil.get('nitrogen', '-')} kg/ha"],
        ["Phosphorus (P)",  f"{soil.get('phosphorus', '-')} kg/ha"],
        ["Potassium (K)",   f"{soil.get('potassium', '-')} kg/ha"],
        ["Temperature",     f"{soil.get('temperature', '-')} °C"],
        ["Humidity",        f"{soil.get('humidity', '-')} %"],
        ["pH",              f"{soil.get('ph', '-')}"],
        ["Rainfall",        f"{soil.get('rainfall', '-')} mm"],
    ]
    t = Table(soil_rows, colWidths=[8 * cm, 8 * cm])
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0), _GREEN),
        ("TEXTCOLOR",     (0, 0), (-1, 0), colors.white),
        ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [_GREY, colors.white]),
        ("GRID",          (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ("FONTSIZE",      (0, 0), (-1, -1), 9),
        ("TOPPADDING",    (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(t)
    story.append(Spacer(1, 0.5 * cm))

    # ---- Recommendations ---------------------------------------------------
    story.append(Paragraph("Analysis Results", h2))
    results = [
        ["Category",            "Result"],
        ["Recommended Crop",    report_data.get("crop_recommendation", "-")],
        ["Fertilizer",          report_data.get("fertilizer", "-")],
        ["Dosage",              report_data.get("dosage", "-")],
        ["Soil Health Score",   f"{report_data.get('soil_health_score', '-')} / 100"],
    ]
    t2 = Table(results, colWidths=[8 * cm, 8 * cm])
    t2.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0), _GREEN),
        ("TEXTCOLOR",     (0, 0), (-1, 0), colors.white),
        ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [_LGREEN, colors.white]),
        ("GRID",          (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ("FONTSIZE",      (0, 0), (-1, -1), 9),
        ("TOPPADDING",    (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(t2)
    story.append(Spacer(1, 0.4 * cm))

    # ---- Actionable recommendations list -----------------------------------
    recs: list[str] = report_data.get("recommendations", [])
    if recs:
        story.append(Paragraph("Actionable Recommendations", h2))
        for rec in recs:
            story.append(Paragraph(f"• {rec}", body))
        story.append(Spacer(1, 0.3 * cm))

    # ---- Notes -------------------------------------------------------------
    notes = report_data.get("notes", "")
    if notes:
        story.append(Paragraph("Additional Notes", h2))
        story.append(Paragraph(notes, body))
        story.append(Spacer(1, 0.3 * cm))

    # ---- Footer ------------------------------------------------------------
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.grey))
    story.append(Paragraph(
        "<i>Generated by Smart Farming System · CodeWizards · Craftathon GU</i>",
        ParagraphStyle("footer", parent=_body_style(), textColor=colors.grey, fontSize=8),
    ))

    doc.build(story)
    return buffer.getvalue()
