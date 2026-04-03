"""
Fertilizer recommendation module.
Wraps the trained RandomForest model from ml_models/fertilizer_model.pkl.
Falls back to NPK-gap rule engine if model file isn't present.
"""

from __future__ import annotations
from pathlib import Path

from models import SoilInput, FertilizerRecommendationResponse

_FERT_PKL = Path(__file__).parent / "ml_models" / "fertilizer_model.pkl"

# Ideal NPK targets per crop (kg/ha)
_CROP_NPK_TARGETS: dict[str, tuple[float, float, float]] = {
    "Rice":      (80,  40,  40),
    "Wheat":     (100, 50,  50),
    "Maize":     (120, 55,  45),
    "Cotton":    (95,  45,  45),
    "Sugarcane": (150, 55,  115),
    "Potato":    (110, 75,  100),
    "Tomato":    (100, 70,  80),
    "Soybean":   (20,  55,  40),
    "Groundnut": (25,  55,  30),
    "Chickpea":  (20,  45,  30),
    "default":   (80,  40,  40),
}


def _rule_based(data: SoilInput, crop: str) -> FertilizerRecommendationResponse:
    """Compute fertilizer advice from NPK gaps vs crop target."""
    n_t, p_t, k_t = _CROP_NPK_TARGETS.get(crop, _CROP_NPK_TARGETS["default"])

    n_def = max(0, n_t - data.nitrogen)
    p_def = max(0, p_t - data.phosphorus)
    k_def = max(0, k_t - data.potassium)

    deficient = ("N" if n_def > 10 else "") + \
                ("P" if p_def > 5  else "") + \
                ("K" if k_def > 5  else "")

    _fmap = {
        "":    ("No additional fertiliser required", "Nil"),
        "N":   ("Urea (46-0-0)",         f"{n_def:.0f} kg/ha N"),
        "P":   ("DAP (18-46-0)",          f"{p_def:.0f} kg/ha P"),
        "K":   ("MOP (0-0-60)",           f"{k_def:.0f} kg/ha K"),
        "NP":  ("NPK 20-20-0",            f"{n_def:.0f} kg/ha N, {p_def:.0f} kg/ha P"),
        "NK":  ("NPK 20-0-20",            f"{n_def:.0f} kg/ha N, {k_def:.0f} kg/ha K"),
        "PK":  ("NPK 0-20-20",            f"{p_def:.0f} kg/ha P, {k_def:.0f} kg/ha K"),
        "NPK": ("NPK 17-17-17 (Balanced)", f"{n_def:.0f} kg/ha N, {p_def:.0f} kg/ha P, {k_def:.0f} kg/ha K"),
    }

    fert, dosage = _fmap.get(deficient, _fmap["NPK"])
    schedule = "50% at sowing + 25% at 30 days + 25% at 60 days"
    notes = f"Optimised for {crop or 'general crops'}."

    if data.ph < 6.0:
        notes += " Apply lime before fertilising (acidic soil)."
    elif data.ph > 8.0:
        notes += " Use acidifying compound to lower pH before application."

    return FertilizerRecommendationResponse(
        fertilizer=fert,
        dosage=dosage,
        notes=notes,
    )


def recommend_fertilizer(
    data: SoilInput,
    crop: str = "",
) -> FertilizerRecommendationResponse:
    """
    Return the recommended fertilizer for the given soil and crop.

    Uses ml_predictor when the pkl is available, falls back to NPK-gap rules.
    Note: if calling from soil_routes.analyze the unified predictor is used
    directly, so this function is mainly for standalone fertilizer queries.
    """
    if _FERT_PKL.exists():
        from ml_predictor import predict_recommendation
        soil_dict = {
            "nitrogen":       data.nitrogen,
            "phosphorus":     data.phosphorus,
            "potassium":      data.potassium,
            "ph":             data.ph,
            "organic_carbon": data.organic_carbon,
        }
        result = predict_recommendation(soil_dict)
        return FertilizerRecommendationResponse(
            fertilizer=result["fertilizer_type"],
            dosage=result["fertilizer_quantity"],
            notes=f"Schedule: {result['application_schedule']}",
        )

    return _rule_based(data, crop)
