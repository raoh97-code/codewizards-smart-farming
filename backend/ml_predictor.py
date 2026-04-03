"""
Unified ML predictor — Smart Farming System
===========================================
Exposes a single function:

    predict_recommendation(soil_data: dict) -> dict

Input keys:  nitrogen, phosphorus, potassium, ph, organic_carbon
Output keys: recommended_crop, fertilizer_type, fertilizer_quantity,
             application_schedule, soil_health_status, confidence,
             alternatives
"""

from __future__ import annotations

import pickle
from pathlib import Path
from typing import Any

import pandas as pd
from soil_analysis import analyse_soil as _analyse_soil

# ── Model paths ─────────────────────────────────────────────────────────────
_BASE = Path(__file__).parent / "ml_models"
_CROP_PKL  = _BASE / "crop_model.pkl"
_FERT_PKL  = _BASE / "fertilizer_model.pkl"
_META_PKL  = _BASE / "crop_meta.pkl"

# ── Lazy-loaded singletons ───────────────────────────────────────────────────
_crop_bundle:  dict | None = None
_fert_bundle:  dict | None = None
_crop_meta:    dict | None = None


def _load_models() -> None:
    global _crop_bundle, _fert_bundle, _crop_meta
    if _crop_bundle is None:
        if not _CROP_PKL.exists():
            raise FileNotFoundError(
                f"Model not found: {_CROP_PKL}\n"
                "Run  'python ml_models/train.py'  first to generate it."
            )
        with open(_CROP_PKL, "rb") as f:
            _crop_bundle = pickle.load(f)
        with open(_FERT_PKL, "rb") as f:
            _fert_bundle = pickle.load(f)
        with open(_META_PKL, "rb") as f:
            _crop_meta = pickle.load(f)



# ── Main prediction function ─────────────────────────────────────────────────

def predict_recommendation(soil_data: dict[str, Any]) -> dict[str, Any]:
    """
    Predict crop and fertilizer recommendation from soil parameters.

    Parameters
    ----------
    soil_data : dict
        Required keys: nitrogen, phosphorus, potassium, ph, organic_carbon
        (aliases N, P, K, pH, OC are also accepted)

    Returns
    -------
    dict with keys:
        recommended_crop      : str   — top crop name
        confidence            : float — model confidence (0–1)
        alternatives          : list  — next 3 best crops
        fertilizer_type       : str   — recommended fertilizer
        fertilizer_quantity   : str   — dosage string (e.g. "60 kg/ha N")
        application_schedule  : str   — split-dose schedule
        soil_health_status    : str   — Excellent / Good / Moderate / Poor
    """
    _load_models()

    # ── Normalise key names ──────────────────────────────────────────────────
    def _get(d: dict, *keys, default=0.0) -> float:
        for k in keys:
            if k in d:
                return float(d[k])
        return default

    n  = _get(soil_data, "nitrogen",       "N")
    p  = _get(soil_data, "phosphorus",     "P")
    k  = _get(soil_data, "potassium",      "K")
    ph = _get(soil_data, "ph",             "pH")
    oc = _get(soil_data, "organic_carbon", "OC")

    X = pd.DataFrame([{"N": n, "P": p, "K": k, "pH": ph, "OC": oc}])

    # ── Crop prediction ──────────────────────────────────────────────────────
    crop_model = _crop_bundle["model"]              # type: ignore[index]
    le_crop    = _crop_bundle["label_encoder"]      # type: ignore[index]

    proba      = crop_model.predict_proba(X)[0]
    top_idx    = proba.argsort()[::-1]
    top_crop   = le_crop.inverse_transform([top_idx[0]])[0]
    confidence = float(proba[top_idx[0]])
    alternatives = le_crop.inverse_transform(top_idx[1:4]).tolist()

    # ── Fertilizer prediction ────────────────────────────────────────────────
    fert_model = _fert_bundle["model"]              # type: ignore[index]
    le_fert    = _fert_bundle["label_encoder"]      # type: ignore[index]
    fert_label = le_fert.inverse_transform(fert_model.predict(X))[0]

    # ── Quantity & schedule from crop metadata ───────────────────────────────
    meta     = _crop_meta.get(top_crop, {})         # type: ignore[index]
    quantity = meta.get("fert_quantity", "Follow manufacturer instructions")
    schedule = meta.get("schedule",      "Apply in splits at sowing, 30d, and 60d")

    # ── Soil health (delegated to soil_analysis module) ─────────────────────
    health = _analyse_soil(n, p, k, ph, oc)
    soil_health = health.soil_health_status

    return {
        "recommended_crop":     top_crop,
        "confidence":           round(confidence, 4),
        "alternatives":         alternatives,
        "fertilizer_type":      fert_label,
        "fertilizer_quantity":  quantity,
        "application_schedule": schedule,
        "soil_health_status":   soil_health,
    }
