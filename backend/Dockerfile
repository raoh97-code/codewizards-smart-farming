# Use official Python slim image
FROM python:3.11-slim

# Install system dependencies (wkhtmltopdf + its libs)
RUN apt-get update && apt-get install -y --no-install-recommends \
    wkhtmltopdf \
    libxrender1 \
    libxext6 \
    libfontconfig1 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Install Python dependencies first (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend app
COPY . .

# Expose port
EXPOSE 10000

# Start with gunicorn on Render's expected port
CMD ["gunicorn", "app:app", "--bind", "0.0.0.0:10000", "--workers", "2"]
