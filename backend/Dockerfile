# Pin to Debian Bookworm (wkhtmltopdf was dropped from Trixie repos)
FROM python:3.11-slim-bookworm

# Install wkhtmltopdf from official prebuilt .deb (not distro repo)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libxrender1 \
    libxext6 \
    libfontconfig1 \
    libfreetype6 \
    wget \
    && wget -q https://github.com/wkhtmltopdf/packaging/releases/download/0.12.6.1-3/wkhtmltox_0.12.6.1-3.bookworm_amd64.deb \
    && apt-get install -y ./wkhtmltox_0.12.6.1-3.bookworm_amd64.deb \
    && rm wkhtmltox_0.12.6.1-3.bookworm_amd64.deb \
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
