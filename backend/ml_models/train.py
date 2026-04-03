"""
ML Training Script — Smart Farming System
==========================================
Generates a synthetic agronomic dataset, trains Random Forest models for
crop and fertilizer recommendation, then saves the models as .pkl files.

Usage:
    cd backend
    python ml_models/train.py

Outputs:
    ml_models/crop_model.pkl
    ml_models/fertilizer_model.pkl
    ml_models/label_encoders.pkl
"""

import os
import pickle
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, accuracy_score

warnings.filterwarnings("ignore")

# ── Output directory ────────────────────────────────────────────────────────
MODEL_DIR = Path(__file__).parent
MODEL_DIR.mkdir(parents=True, exist_ok=True)

np.random.seed(42)

# ============================================================================
# 1. AGRONOMIC KNOWLEDGE BASE
#    Each entry defines the ideal N, P, K, pH, and Organic Carbon ranges
#    for a crop along with its recommended fertilizer profile.
# ============================================================================

CROP_PROFILES = {
    # crop_name: (N_mean, N_std, P_mean, P_std, K_mean, K_std,
    #              pH_mean, pH_std, OC_mean, OC_std,
    #              fertilizer, fert_qty, schedule, samples)
    "Rice":      (80,  15,  40,  8,  40,  8,  6.0, 0.4, 1.5, 0.5, "Urea + DAP",           "60 kg/ha N, 30 kg/ha P", "Basal 50% + Top-dress 50% at tillering",       280),
    "Wheat":     (100, 15,  50,  10, 50,  8,  6.5, 0.4, 1.2, 0.4, "NPK 20-20-20",         "80 kg/ha N, 40 kg/ha P, 40 kg/ha K",            "50% basal + 50% at crown root initiation",     280),
    "Maize":     (120, 15,  55,  10, 45,  8,  6.2, 0.4, 1.3, 0.4, "Urea + MOP",           "100 kg/ha N, 40 kg/ha K",                        "Split 3× at sowing, 30d, 60d",                250),
    "Cotton":    (95,  12,  45,  8,  45,  8,  6.5, 0.4, 0.9, 0.3, "NPK 15-15-15",         "75 kg/ha N, 35 kg/ha P, 35 kg/ha K",            "Basal + 2 top dressings at 30d & 60d",         240),
    "Sugarcane": (150, 20,  55,  10, 115, 15, 6.5, 0.4, 1.6, 0.5, "Urea + SSP + MOP",     "150 kg/ha N, 50 kg/ha P, 100 kg/ha K",          "3 splits: planting, 3m, 6m",                   230),
    "Potato":    (110, 15,  75,  12, 100, 15, 5.8, 0.4, 1.8, 0.5, "DAP + MOP + Boron",    "80 kg/ha N, 60 kg/ha P, 80 kg/ha K",            "Basal full dose, top-dress N at hilling",       220),
    "Tomato":    (100, 12,  70,  10, 80,  10, 6.2, 0.4, 1.7, 0.4, "NPK 12-32-16",         "80 kg/ha N, 60 kg/ha P, 60 kg/ha K",            "Fertiggate weekly from transplant to fruiting", 220),
    "Soybean":   (20,  8,   55,  8,  40,  8,  6.5, 0.4, 1.4, 0.4, "DAP + Rhizobium",      "20 kg/ha N (starter), 50 kg/ha P",              "Full basal dose at sowing",                    210),
    "Groundnut": (25,  8,   55,  8,  30,  6,  6.0, 0.4, 0.8, 0.3, "SSP + Gypsum",         "25 kg/ha N, 50 kg/ha P",                        "Basal + Gypsum at pegging stage",               200),
    "Chickpea":  (20,  6,   45,  8,  30,  6,  6.5, 0.4, 0.7, 0.3, "DAP + MOP",            "20 kg/ha N, 40 kg/ha P, 25 kg/ha K",            "Full basal dose; avoid excess N",               200),
}

# Soil health status rules (based on OC and NPK average)
def _soil_health_status(row: pd.Series) -> str:
    avg_npk = (row["N"] + row["P"] + row["K"]) / 3
    oc      = row["OC"]
    if oc >= 1.5 and avg_npk >= 60:
        return "Excellent"
    elif oc >= 1.0 and avg_npk >= 40:
        return "Good"
    elif oc >= 0.5 and avg_npk >= 20:
        return "Moderate"
    else:
        return "Poor"


# ============================================================================
# 2. GENERATE SYNTHETIC DATASET
# ============================================================================

def generate_dataset() -> pd.DataFrame:
    rows = []
    for crop, profile in CROP_PROFILES.items():
        (n_m, n_s, p_m, p_s, k_m, k_s,
         ph_m, ph_s, oc_m, oc_s,
         fert, qty, schedule, n_samples) = profile

        n_arr  = np.random.normal(n_m,  n_s,  n_samples).clip(0, 250)
        p_arr  = np.random.normal(p_m,  p_s,  n_samples).clip(0, 150)
        k_arr  = np.random.normal(k_m,  k_s,  n_samples).clip(0, 200)
        ph_arr = np.random.normal(ph_m, ph_s, n_samples).clip(4.5, 9.0)
        oc_arr = np.random.normal(oc_m, oc_s, n_samples).clip(0.1, 5.0)

        for i in range(n_samples):
            rows.append({
                "N":             round(n_arr[i],  2),
                "P":             round(p_arr[i],  2),
                "K":             round(k_arr[i],  2),
                "pH":            round(ph_arr[i], 2),
                "OC":            round(oc_arr[i], 2),
                "crop":          crop,
                "fertilizer":    fert,
                "fert_quantity": qty,
                "schedule":      schedule,
            })

    df = pd.DataFrame(rows)
    df["soil_health"] = df.apply(_soil_health_status, axis=1)
    df = df.sample(frac=1, random_state=42).reset_index(drop=True)
    print(f"[Dataset] Generated {len(df)} samples across {df['crop'].nunique()} crops.")
    return df


# ============================================================================
# 3. TRAIN CROP RECOMMENDATION MODEL
# ============================================================================

FEATURES = ["N", "P", "K", "pH", "OC"]

def train_crop_model(df: pd.DataFrame):
    X = df[FEATURES]
    y = df["crop"]

    le_crop = LabelEncoder()
    y_enc   = le_crop.fit_transform(y)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y_enc, test_size=0.2, random_state=42, stratify=y_enc
    )

    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=12,
        min_samples_leaf=3,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    acc    = accuracy_score(y_test, y_pred)
    print(f"\n[Crop Model] Test Accuracy : {acc * 100:.2f}%")
    print(classification_report(y_test, y_pred, target_names=le_crop.classes_))

    cv_scores = cross_val_score(model, X, y_enc, cv=5, scoring="accuracy")
    print(f"[Crop Model] 5-Fold CV     : {cv_scores.mean() * 100:.2f}% ± {cv_scores.std() * 100:.2f}%")

    # Feature importance
    importances = pd.Series(model.feature_importances_, index=FEATURES).sort_values(ascending=False)
    print(f"\n[Crop Model] Feature Importances:\n{importances.to_string()}")

    return model, le_crop


# ============================================================================
# 4. TRAIN FERTILIZER MODEL
#    Target: fertilizer type label (10 distinct fertilizer strings)
# ============================================================================

def train_fertilizer_model(df: pd.DataFrame):
    X = df[FEATURES]
    y = df["fertilizer"]

    le_fert = LabelEncoder()
    y_enc   = le_fert.fit_transform(y)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y_enc, test_size=0.2, random_state=42, stratify=y_enc
    )

    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=12,
        min_samples_leaf=3,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    acc    = accuracy_score(y_test, y_pred)
    print(f"\n[Fertilizer Model] Test Accuracy : {acc * 100:.2f}%")
    print(classification_report(y_test, y_pred, target_names=le_fert.classes_))

    return model, le_fert


# ============================================================================
# 5. SAVE MODELS
# ============================================================================

def save_models(
    crop_model,
    le_crop,
    fert_model,
    le_fert,
    df: pd.DataFrame,
):
    # Build a lookup: crop → (fert_quantity, schedule)
    crop_meta = (
        df.groupby("crop")[["fert_quantity", "schedule"]]
        .first()
        .to_dict(orient="index")
    )

    with open(MODEL_DIR / "crop_model.pkl", "wb") as f:
        pickle.dump({"model": crop_model, "label_encoder": le_crop}, f)

    with open(MODEL_DIR / "fertilizer_model.pkl", "wb") as f:
        pickle.dump({"model": fert_model, "label_encoder": le_fert}, f)

    with open(MODEL_DIR / "crop_meta.pkl", "wb") as f:
        pickle.dump(crop_meta, f)

    print("\n[Save] Models saved to:")
    print(f"       {MODEL_DIR / 'crop_model.pkl'}")
    print(f"       {MODEL_DIR / 'fertilizer_model.pkl'}")
    print(f"       {MODEL_DIR / 'crop_meta.pkl'}")


# ============================================================================
# MAIN
# ============================================================================

if __name__ == "__main__":
    print("=" * 60)
    print("  Smart Farming — ML Model Training")
    print("=" * 60)

    df = generate_dataset()

    print("\n--- Training Crop Recommendation Model ---")
    crop_model, le_crop = train_crop_model(df)

    print("\n--- Training Fertilizer Recommendation Model ---")
    fert_model, le_fert = train_fertilizer_model(df)

    save_models(crop_model, le_crop, fert_model, le_fert, df)

    print("\n✅  Training complete. Run the FastAPI server and test /api/soil/analyze")
