from utils.pdf_parser import extract_text_from_pdf, extract_soil_data
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import pickle
import numpy as np

from utils.fertilizer import fertilizer_advice
from utils.soil import soil_health

app = Flask(__name__)
CORS(app)

# Load model & scaler
model = pickle.load(open("model/model.pkl", "rb"))
scaler = pickle.load(open("model/scaler.pkl", "rb"))

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

    # Extract text
    text = extract_text_from_pdf(file)

    # Extract soil values
    data = extract_soil_data(text)

    if None in data.values():
        return "Error: Some values missing in PDF"

    # Prepare input
    features = [[
        data["N"], data["P"], data["K"],
        data["temperature"], data["humidity"],
        data["ph"], data["rainfall"]
    ]]

    scaled = scaler.transform(features)
    crop = model.predict(scaled)[0]

    return jsonify({
        "data": data,
        "crop": crop,
        "fertilizer": fertilizer_advice(data["N"], data["P"], data["K"]),
        "soil": soil_health(data["ph"]),
        "suggestions": "Ensure proper irrigation and nutrient balance"
    })

@app.route("/predict", methods=["POST"])
def predict():
    # print("Request method:", request.method)

    data = request.json

    features = [[
        float(data["N"]), float(data["P"]), float(data["K"]),
        float(data["temperature"]), float(data["humidity"]),
        float(data["ph"]), float(data["rainfall"])
    ]]

    scaled = scaler.transform(features)
    crop = model.predict(scaled)[0]

    fertilizer = fertilizer_advice(float(data["N"]), float(data["P"]), float(data["K"]))
    soil = soil_health(float(data["ph"]))

    return jsonify({
        "crop": crop,
        "fertilizer": fertilizer,
        "soil": soil,
        "suggestions": "Use organic compost and maintain proper irrigation."
    })

if __name__ == "__main__":
    app.run(debug=True)