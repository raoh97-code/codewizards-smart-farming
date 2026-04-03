"""
OCR reader — extracts text from uploaded images using Tesseract.
Useful for reading printed soil test reports or lab certificates.
"""

import io
from pathlib import Path

from PIL import Image
import pytesseract

# If Tesseract is not on the system PATH, set the executable path here:
# pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"


def extract_text_from_image(image_bytes: bytes, lang: str = "eng") -> str:
    """
    Run Tesseract OCR on raw image bytes and return extracted text.

    :param image_bytes: Raw bytes of the uploaded image (PNG/JPG/BMP/TIFF).
    :param lang:        Tesseract language code (default: 'eng').
    :returns:           Extracted text string.
    """
    image = Image.open(io.BytesIO(image_bytes))

    # Pre-process: convert to greyscale for better OCR accuracy
    image = image.convert("L")

    text: str = pytesseract.image_to_string(image, lang=lang)
    return text.strip()


def extract_text_from_path(image_path: str | Path, lang: str = "eng") -> str:
    """Convenience wrapper that reads from a file path instead of bytes."""
    path = Path(image_path)
    if not path.exists():
        raise FileNotFoundError(f"Image not found: {image_path}")
    return extract_text_from_image(path.read_bytes(), lang=lang)
