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

    patterns = {
        "N": r"(Nitrogen|N)\s*[:=\-]?\s*(\d+)",
        "P": r"(Phosphorus|P)\s*[:=\-]?\s*(\d+)",
        "K": r"(Potassium|K)\s*[:=\-]?\s*(\d+)",
        "ph": r"(pH)\s*[:=\-]?\s*(\d+\.?\d*)",
        "temperature": r"(Temperature|T)\s*[:=\-]?\s*(\d+)",
        "humidity": r"(Humidity|H)\s*[:=\-]?\s*(\d+)",
        "rainfall": r"(Rainfall|R)\s*[:=\-]?\s*(\d+)"
    }

    for key, pattern in patterns.items():
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            data[key] = float(match.group(2))
        else:
            data[key] = None  # better than 0

    return data