"""
Crop recommendation module.
Wraps the trained RandomForest model from ml_models/crop_model.pkl.
Falls back to rule-based lookup if the model file isn't present yet.
"""

from __future__ import annotations
from pathlib import Path

from models import SoilInput, CropRecommendationResponse

_CROP_PKL = Path(__file__).parent / "ml_models" / "crop_model.pkl"


def _rule_based_fallback(data: SoilInput) -> tuple[str, list[str], float]:
    """Simple heuristic crop picker used before a trained model exists."""
    if data.ph < 5.5:
        return "Tea", ["Coffee", "Blueberry"], 0.70
    if data.rainfall > 200 and data.temperature > 25:
        return "Rice", ["Jute", "Coconut"], 0.72
    if data.temperature > 30 and data.humidity < 50:
        return "Cotton", ["Groundnut", "Sunflower"], 0.70
    if data.nitrogen > 100:
        return "Maize", ["Wheat", "Barley"], 0.72
    return "Wheat", ["Millet", "Sorghum"], 0.68


def recommend_crop(data: SoilInput) -> CropRecommendationResponse:
    """
    Return the top crop recommendation for the given soil parameters.

    Prefers the trained pkl model; falls back to rules if not found.
    For the full unified output (including fertilizer & soil health),
    use ml_predictor.predict_recommendation() instead.
    """
    if _CROP_PKL.exists():
        # Use the unified ML predictor (avoids loading the model twice)
        from ml_predictor import predict_recommendation
        soil_dict = {
            "nitrogen":       data.nitrogen,
            "phosphorus":     data.phosphorus,
            "potassium":      data.potassium,
            "ph":             data.ph,
            "organic_carbon": data.organic_carbon,
        }
        result = predict_recommendation(soil_dict)
        return CropRecommendationResponse(
            recommended_crop=result["recommended_crop"],
            confidence=result["confidence"],
            alternatives=result["alternatives"],
        )

    # Fallback
    crop, alternatives, confidence = _rule_based_fallback(data)
    return CropRecommendationResponse(
        recommended_crop=crop,
        confidence=confidence,
        alternatives=alternatives,
    )
