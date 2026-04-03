"""
Soil Health Analysis Module — Smart Farming System
====================================================
Evaluates soil parameters and returns:
  - Soil Health Status   : "Good" | "Moderate" | "Poor"
  - Nutrient Deficiencies: list of detected deficiency strings
  - Corrective Actions   : list of specific remediation steps
"""

from __future__ import annotations
from dataclasses import dataclass, field


# ── Threshold constants ───────────────────────────────────────────────────────

# Nitrogen (kg/ha)
N_LOW      = 20    # below this → deficient
N_HIGH     = 120   # above this → excessive

# Phosphorus (kg/ha)
P_LOW      = 10    # below this → deficient
P_HIGH     = 100   # above this → excessive

# Potassium (kg/ha)
K_LOW      = 10    # below this → deficient
K_HIGH     = 150   # above this → excessive

# Soil pH
PH_ACIDIC  = 6.0   # below → apply lime
PH_ALKALINE = 7.5  # above → apply gypsum
PH_OPTIMAL_LOW  = 6.0
PH_OPTIMAL_HIGH = 7.5

# Organic Carbon (%)
OC_LOW    = 0.5    # below → very low
OC_MEDIUM = 1.0    # below → moderate; above → sufficient


# ── Result dataclass ──────────────────────────────────────────────────────────

@dataclass
class SoilHealthResult:
    soil_health_status:   str
    nutrient_deficiencies: list[str] = field(default_factory=list)
    corrective_actions:    list[str] = field(default_factory=list)
    soil_health_score:     float = 100.0      # 0–100 internal score
    ph_status:             str = "Optimal"
    oc_status:             str = "Sufficient"


# ── Core analysis function ────────────────────────────────────────────────────

def analyse_soil(
    nitrogen:       float,
    phosphorus:     float,
    potassium:      float,
    ph:             float,
    organic_carbon: float,
) -> SoilHealthResult:
    """
    Analyse soil parameters and return a structured health report.

    Parameters
    ----------
    nitrogen       : float — soil nitrogen (kg/ha)
    phosphorus     : float — soil phosphorus (kg/ha)
    potassium      : float — soil potassium (kg/ha)
    ph             : float — soil pH (0–14)
    organic_carbon : float — organic carbon (%)

    Returns
    -------
    SoilHealthResult dataclass with status, deficiencies, and corrective actions.
    """
    score:        float       = 100.0
    deficiencies: list[str]   = []
    actions:      list[str]   = []

    # ── 1. Nitrogen ───────────────────────────────────────────────────────────
    if nitrogen < N_LOW:
        deficiencies.append(f"Low Nitrogen (N = {nitrogen:.1f} kg/ha; minimum: {N_LOW} kg/ha)")
        actions.append("Apply Nitrogen fertilizer — Urea (46-0-0) or Ammonium Nitrate (34-0-0) at 30–60 kg/ha.")
        score -= 20
    elif nitrogen > N_HIGH:
        deficiencies.append(f"Excess Nitrogen (N = {nitrogen:.1f} kg/ha)")
        actions.append("Reduce N-input for the next season. Excess nitrogen causes leaching and can harm crops.")
        score -= 8

    # ── 2. Phosphorus ─────────────────────────────────────────────────────────
    if phosphorus < P_LOW:
        deficiencies.append(f"Low Phosphorus (P = {phosphorus:.1f} kg/ha; minimum: {P_LOW} kg/ha)")
        actions.append("Apply Phosphorus fertilizer — DAP (18-46-0) or Single Super Phosphate (SSP) at 20–40 kg/ha.")
        score -= 15
    elif phosphorus > P_HIGH:
        deficiencies.append(f"Excess Phosphorus (P = {phosphorus:.1f} kg/ha)")
        actions.append("Excess phosphorus can lock out zinc and iron. Avoid further P application this season.")
        score -= 5

    # ── 3. Potassium ──────────────────────────────────────────────────────────
    if potassium < K_LOW:
        deficiencies.append(f"Low Potassium (K = {potassium:.1f} kg/ha; minimum: {K_LOW} kg/ha)")
        actions.append("Apply Potassium fertilizer — MOP / Muriate of Potash (0-0-60) at 20–40 kg/ha.")
        score -= 15
    elif potassium > K_HIGH:
        deficiencies.append(f"Excess Potassium (K = {potassium:.1f} kg/ha)")
        actions.append("High K may interfere with Magnesium uptake. Skip K applications for one season.")
        score -= 5

    # ── 4. pH ─────────────────────────────────────────────────────────────────
    if ph < PH_ACIDIC:
        ph_status = "Acidic"
        deficiencies.append(f"Acidic Soil (pH = {ph:.2f}; optimal: {PH_OPTIMAL_LOW}–{PH_OPTIMAL_HIGH})")
        actions.append(
            f"Apply Agricultural Lime (CaCO₃) at 2–4 tonnes/ha to raise pH towards 6.5. "
            f"Re-test soil pH after 6–8 weeks."
        )
        score -= 20
    elif ph > PH_ALKALINE:
        ph_status = "Alkaline"
        deficiencies.append(f"Alkaline Soil (pH = {ph:.2f}; optimal: {PH_OPTIMAL_LOW}–{PH_OPTIMAL_HIGH})")
        actions.append(
            f"Apply Agricultural Gypsum (CaSO₄) at 1–2 tonnes/ha to lower pH towards 7.0. "
            f"Alternatively use sulfur-based soil conditioners."
        )
        score -= 20
    else:
        ph_status = "Optimal"

    # ── 5. Organic Carbon ─────────────────────────────────────────────────────
    if organic_carbon < OC_LOW:
        oc_status = "Very Low"
        deficiencies.append(f"Very Low Organic Carbon (OC = {organic_carbon:.2f}%; minimum recommended: {OC_MEDIUM}%)")
        actions.append(
            "Incorporate well-rotted Compost or Farm Yard Manure (FYM) at 5–10 tonnes/ha. "
            "Practice crop residue retention and green manuring to build OC over time."
        )
        score -= 20
    elif organic_carbon < OC_MEDIUM:
        oc_status = "Low"
        deficiencies.append(f"Low Organic Carbon (OC = {organic_carbon:.2f}%; recommended: ≥ {OC_MEDIUM}%)")
        actions.append(
            "Add Organic matter — apply compost at 3–5 tonnes/ha and practice minimum tillage "
            "to conserve existing carbon."
        )
        score -= 10
    else:
        oc_status = "Sufficient"

    # ── 6. Overall score → status ─────────────────────────────────────────────
    score = max(0.0, min(100.0, score))

    if score >= 75:
        status = "Good"
    elif score >= 45:
        status = "Moderate"
    else:
        status = "Poor"

    if not deficiencies:
        actions.append("Soil conditions are healthy. Maintain current management practices.")

    return SoilHealthResult(
        soil_health_status=status,
        nutrient_deficiencies=deficiencies,
        corrective_actions=actions,
        soil_health_score=round(score, 1),
        ph_status=ph_status if ph < PH_ACIDIC or ph > PH_ALKALINE else "Optimal",
        oc_status=oc_status,
    )


# ── Convenience wrapper for existing callers ──────────────────────────────────
# Older code passes a SoilInput object (models.py). This keeps compatibility.

def analyse_soil_from_model(soil_input) -> SoilHealthResult:
    """
    Wrapper that accepts a SoilInput Pydantic model instance.
    Calls analyse_soil() with individual float arguments.
    """
    return analyse_soil(
        nitrogen=soil_input.nitrogen,
        phosphorus=soil_input.phosphorus,
        potassium=soil_input.potassium,
        ph=soil_input.ph,
        organic_carbon=getattr(soil_input, "organic_carbon", 0.0),
    )


# ── CLI quick-test ────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import json

    samples = [
        {"nitrogen": 8, "phosphorus": 5, "potassium": 7,  "ph": 5.2, "organic_carbon": 0.3},  # Poor
        {"nitrogen": 60, "phosphorus": 30, "potassium": 35, "ph": 6.8, "organic_carbon": 0.9},  # Moderate
        {"nitrogen": 90, "phosphorus": 55, "potassium": 60, "ph": 6.5, "organic_carbon": 1.8},  # Good
    ]

    for i, s in enumerate(samples, 1):
        result = analyse_soil(**s)
        print(f"\n── Sample {i} ──────────────────────────")
        print(f"  Status   : {result.soil_health_status}  (score: {result.soil_health_score})")
        print(f"  pH       : {result.ph_status}")
        print(f"  OC       : {result.oc_status}")
        print(f"  Deficiencies ({len(result.nutrient_deficiencies)}):")
        for d in result.nutrient_deficiencies:
            print(f"    • {d}")
        print(f"  Corrective Actions ({len(result.corrective_actions)}):")
        for a in result.corrective_actions:
            print(f"    → {a}")
