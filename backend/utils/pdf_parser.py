import PyPDF2
import re

# -----------------------------
# Extract text from PDF
# -----------------------------
def extract_text_from_pdf(file):
    reader = PyPDF2.PdfReader(file)
    text = ""

    for page in reader.pages:
        text += page.extract_text()

    return text


# -----------------------------
# Extract soil values (SMART)
# -----------------------------
def extract_soil_data(text):    
    data = {}

    soil_patterns = [
        r"(soil\s*type|soil-type)\s*[:=\-]?\s*([A-Za-z ]+)",
        r"\bsoil\s*[:=\-]\s*([A-Za-z ]+)"
    ]

    soil_type = None

    for pattern in soil_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            soil_type = match.group(1).strip()
            break

    # Normalize soil type (important)
    if soil_type:
        soil_type = soil_type.lower()
        if "alluvial" in soil_type:
            soil_type = "alluvial"
        elif "black" in soil_type:
            soil_type = "black"
        elif "red" in soil_type:
            soil_type = "red"
        elif "clay" in soil_type:
            soil_type = "clay"
        elif "laterite" in soil_type:
            soil_type = "laterite"
        elif "desert" in soil_type:
            soil_type = "desert"
        elif "loamy" in soil_type:
            soil_type = "loamy"
        else:
            soil_type = None

    data["soil_type"] = soil_type

    patterns = {
        "N": r"(Nitrogen|N)\s*[:=\-]?\s*(\d+)",
        "P": r"(Phosphorus|P)\s*[:=\-]?\s*(\d+)",
        "K": r"(Potassium|K)\s*[:=\-]?\s*(\d+)",
        "ph": r"(pH)\s*[:=\-]?\s*(\d+\.?\d*)",
        "temperature": r"(Temperature|T)\s*[:=\-]?\s*(\d+)",
        "humidity": r"(Humidity|H)\s*[:=\-]?\s*(\d+)",
        "rainfall": r"(Rainfall|R)\s*[:=\-]?\s*(\d+)",
        "Mg": r"(Magnesium|Mg)\s*[:=\-]?\s*(\d+)",
        "Ca": r"(Calcium|Ca)\s*[:=\-]?\s*(\d+)",
        "S": r"(Sulfur|S)\s*[:=\-]?\s*(\d+)",
        "Fe": r"(Iron|Fe)\s*[:=\-]?\s*(\d+)",
        "Mn": r"(Manganese|Mn)\s*[:=\-]?\s*(\d+)",
        "Zn": r"(Zinc|Zn)\s*[:=\-]?\s*(\d+)",
        "Cu": r"(Copper|Cu)\s*[:=\-]?\s*(\d+)"
    }

    for key, pattern in patterns.items():
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            data[key] = float(match.group(2))
        else:
            data[key] = None  # better than 0

    return data