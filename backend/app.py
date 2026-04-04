from utils.pdf_parser import extract_text_from_pdf, extract_soil_data
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import pickle
import numpy as np

from utils.fertilizer import get_fertilizer_plan
from utils.soil import soil_health

app = Flask(__name__)
CORS(app)

# Load model & scaler
model = pickle.load(open("model/model.pkl", "rb"))
scaler = pickle.load(open("model/scaler.pkl", "rb"))

# ================================
# CONFIGURATION
# ================================

WEIGHT_ML = 0.7
WEIGHT_SOIL = 0.15
WEIGHT_NUTRIENTS = 0.15

SOIL_PREFERENCES = {
    "alluvial": ["rice", "maize", "jute", "cotton", "lentil", "blackgram", "pigeonpeas"],
    "black": ["cotton", "pigeonpeas", "chickpea", "mungbean", "blackgram"],
    "red": ["groundnut", "maize", "pigeonpeas", "mungbean", "chickpea"],
    "clay": ["rice", "banana", "papaya", "coconut"],
    "laterite": ["coffee", "coconut", "banana"],
    "desert": ["mothbeans", "chickpea"],
    "loamy": ["apple", "orange", "grapes", "watermelon", "muskmelon", "papaya", "pomegranate"]
}

MICRONUTRIENT_REQS = {
    "rice":       {"Ca": (10, 25), "Mg": (5, 15), "S": (10, 20), "Fe": (5, 15), "Mn": (2, 10), "Zn": (0.5, 3), "Cu": (0.2, 1)},
    "maize":      {"Ca": (15, 30), "Mg": (10, 25), "S": (10, 20), "Fe": (4, 12), "Mn": (3, 10), "Zn": (1, 5), "Cu": (0.2, 1)},
    "jute":       {"Ca": (20, 40), "Mg": (10, 20), "S": (15, 25), "Fe": (5, 10), "Mn": (3, 8), "Zn": (1, 3), "Cu": (0.3, 1)},
    "cotton":     {"Ca": (20, 40), "Mg": (15, 30), "S": (15, 25), "Fe": (5, 12), "Mn": (4, 10), "Zn": (1, 5), "Cu": (0.5, 2)},
    "lentil":     {"Ca": (15, 30), "Mg": (10, 20), "S": (10, 20), "Fe": (5, 10), "Mn": (2, 8), "Zn": (1, 3), "Cu": (0.2, 1)},
    "blackgram":  {"Ca": (15, 30), "Mg": (10, 20), "S": (10, 20), "Fe": (4, 10), "Mn": (2, 8), "Zn": (1, 3), "Cu": (0.2, 1)},
    "pigeonpeas": {"Ca": (20, 35), "Mg": (10, 25), "S": (12, 22), "Fe": (5, 12), "Mn": (3, 10), "Zn": (1, 4), "Cu": (0.3, 1.5)},
    "chickpea":   {"Ca": (20, 35), "Mg": (10, 25), "S": (10, 20), "Fe": (5, 10), "Mn": (2, 8), "Zn": (1, 4), "Cu": (0.3, 1)},
    "mungbean":   {"Ca": (15, 30), "Mg": (10, 20), "S": (10, 20), "Fe": (4, 10), "Mn": (2, 8), "Zn": (1, 3), "Cu": (0.2, 1)},
    "groundnut":  {"Ca": (25, 50), "Mg": (15, 30), "S": (15, 30), "Fe": (5, 12), "Mn": (3, 10), "Zn": (1, 4), "Cu": (0.5, 2)},
    "banana":     {"Ca": (30, 60), "Mg": (20, 40), "S": (20, 30), "Fe": (6, 15), "Mn": (5, 15), "Zn": (2, 6), "Cu": (0.5, 2)},
    "papaya":     {"Ca": (25, 50), "Mg": (15, 35), "S": (15, 25), "Fe": (5, 12), "Mn": (3, 10), "Zn": (1, 5), "Cu": (0.3, 1.5)},
    "coconut":    {"Ca": (30, 60), "Mg": (20, 40), "S": (20, 30), "Fe": (6, 15), "Mn": (5, 15), "Zn": (2, 6), "Cu": (0.5, 2)},
    "coffee":     {"Ca": (25, 50), "Mg": (15, 35), "S": (15, 25), "Fe": (5, 15), "Mn": (4, 12), "Zn": (1, 5), "Cu": (0.5, 2)},
    "mothbeans":  {"Ca": (10, 25), "Mg": (8, 20),  "S": (8, 15),  "Fe": (4, 8),  "Mn": (2, 6),  "Zn": (0.5, 2), "Cu": (0.2, 0.8)},
    "apple":      {"Ca": (30, 60), "Mg": (20, 40), "S": (15, 25), "Fe": (6, 15), "Mn": (5, 15), "Zn": (2, 6), "Cu": (0.5, 2)},
    "orange":     {"Ca": (30, 60), "Mg": (20, 40), "S": (15, 25), "Fe": (6, 15), "Mn": (5, 15), "Zn": (2, 6), "Cu": (0.5, 2)},
    "grapes":     {"Ca": (25, 50), "Mg": (15, 35), "S": (15, 25), "Fe": (5, 12), "Mn": (4, 12), "Zn": (1, 5), "Cu": (0.5, 2)},
    "watermelon": {"Ca": (20, 40), "Mg": (15, 30), "S": (12, 20), "Fe": (5, 10), "Mn": (3, 10), "Zn": (1, 4), "Cu": (0.3, 1.5)},
    "muskmelon":  {"Ca": (20, 40), "Mg": (15, 30), "S": (12, 20), "Fe": (5, 10), "Mn": (3, 10), "Zn": (1, 4), "Cu": (0.3, 1.5)},
    "pomegranate":{"Ca": (25, 50), "Mg": (15, 35), "S": (15, 25), "Fe": (5, 12), "Mn": (4, 12), "Zn": (1, 5), "Cu": (0.5, 2)},
    "coffee":     {"Ca": (25, 50), "Mg": (15, 35), "S": (15, 25), "Fe": (5, 15), "Mn": (4, 12), "Zn": (1, 5), "Cu": (0.5, 2)}
}

# ================================
# SCORING FUNCTIONS
# ================================

def soil_score(crop, soil_type):
    if not soil_type:
        return 0

    preferred = SOIL_PREFERENCES.get(soil_type.lower(), [])
    all_crops = sum(SOIL_PREFERENCES.values(), [])

    if crop in preferred:
        return 1.0
    elif crop in all_crops:
        return 0.5
    return 0.0


def nutrient_score(crop, optional_nutrients):
    reqs = MICRONUTRIENT_REQS.get(crop, {})
    score = 0
    total = 0

    for nutrient, (min_val, max_val) in reqs.items():
        if nutrient in optional_nutrients and optional_nutrients[nutrient]:
            try:
                val = float(optional_nutrients[nutrient])
                total += 1

                if min_val <= val <= max_val:
                    score += 1
                else:
                    diff = min(abs(val - min_val), abs(val - max_val))
                    score += max(0, 1 - diff / max_val)

            except:
                pass

    return score / total if total > 0 else 0


def get_scored_top3_crops(scaled_features, soil_type, optional_nutrients):
    proba = model.predict_proba(scaled_features)[0]
    classes = model.classes_

    results = []

    for i, crop in enumerate(classes):
        ml_score = float(proba[i])

        s_score = soil_score(crop, soil_type)
        n_score = nutrient_score(crop, optional_nutrients)

        final_score = (
            (ml_score * WEIGHT_ML) +
            (s_score * WEIGHT_SOIL) +
            (n_score * WEIGHT_NUTRIENTS)
        )

        results.append({
            "crop": crop,
            "score": round(final_score * 100, 2)
        })

    return sorted(results, key=lambda x: x["score"], reverse=True)[:3]


@app.route('/')
def home():
    return render_template('index.html')

@app.route('/login')
def login():
    return render_template('login.html')

@app.route('/signup')
def signup():
    return render_template('signup.html')

@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')

@app.route("/upload", methods=["GET", "POST"])
def upload():

    if request.method == "GET":
        return """
        <h2>Upload Soil Report PDF</h2>
        <form method="post" enctype="multipart/form-data">
            <input type="file" name="file">
            <input type="submit">
        </form>
        """

    file = request.files["file"]
    soil_type = request.form.get("soil_type")

    optional_nutrients = {
        "Mg": request.form.get("Mg"),
        "Ca": request.form.get("Ca"),
        "S": request.form.get("S"),
        "Fe": request.form.get("Fe"),
        "Mn": request.form.get("Mn"),
        "Zn": request.form.get("Zn"),
        "Cu": request.form.get("Cu")
    }

    # Extract text
    text = extract_text_from_pdf(file)

    # Extract soil values
    data = extract_soil_data(text)

    if None in data.values():
        # return "Error: Some values missing in PDF"
        return jsonify({"error": "Missing values in PDF"}), 400

    # Prepare input
    features = [[
        data["N"], data["P"], data["K"],
        data["temperature"], data["humidity"],
        data["ph"], data["rainfall"]
    ]]

    scaled = scaler.transform(features)

    # crop = model.predict(scaled)[0]

    top3 = get_scored_top3_crops(scaled, soil_type, optional_nutrients)

    return jsonify({
        "input": data,
        "crops": top3,

        # "crop" : crop,

        "fertilizer_plans": {
            entry["crop"]: get_fertilizer_plan(
                entry["crop"],
                {"N": data["N"], "P": data["P"], "K": data["K"]},
                optional_nutrients
            )
            for entry in top3
        },
        "soil": soil_health(data["ph"]),
        "suggestions": "Ensure proper irrigation and nutrient balance"
    })

@app.route("/predict", methods=["POST"])
def predict():
    # print("Request method:", request.method)

    data = request.json

    try:
        features = [[
            float(data["N"]), float(data["P"]), float(data["K"]),
            float(data["temperature"]), float(data["humidity"]),
            float(data["ph"]), float(data["rainfall"])
        ]]
        soil_type = data["soil_type"]

    except KeyError as e:
        return jsonify({"error": f"Missing field: {str(e)}"}), 400

    optional_nutrients = {
        "Mg": data.get("Mg"),
        "Ca": data.get("Ca"),
        "S": data.get("S"),
        "Fe": data.get("Fe"),
        "Mn": data.get("Mn"),
        "Zn": data.get("Zn"),
        "Cu": data.get("Cu")
    }
    scaled = scaler.transform(features)
    # crop = model.predict(scaled)[0]

    top3 = get_scored_top3_crops(scaled, soil_type, optional_nutrients)
    soil = soil_health(float(data["ph"]))
    soil_data = {"N": float(data["N"]), "P": float(data["P"]), "K": float(data["K"])}

    return jsonify({
        "input": data,
        "crops": top3,
        "fertilizer_plans": {
            entry["crop"]: get_fertilizer_plan(entry["crop"], soil_data, optional_nutrients)
            for entry in top3
        },
        "soil": soil,
        "suggestions": "Use organic compost and maintain proper irrigation."
    })

if __name__ == "__main__":
    app.run(debug=True)