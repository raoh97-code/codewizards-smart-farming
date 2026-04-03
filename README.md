# 🌱 CodeWizards Smart Farming System

> **Craftathon · GU** — AI-powered crop & soil analysis platform.

---

## Project Structure

```
backend/
├── main.py                  # FastAPI entry point
├── database.py              # Supabase client
├── models.py                # Pydantic schemas (aligned to DB tables)
├── auth.py                  # JWT + bcrypt helpers
├── soil_analysis.py         # Soil health scorer
├── crop_model.py            # Crop recommendation (ML/rule-based)
├── fertilizer_model.py      # Fertilizer recommendation
├── pdf_generator.py         # ReportLab PDF builder
├── ocr_reader.py            # Tesseract OCR helper
├── supabase_schema.sql      # ← Run this in Supabase SQL Editor first
├── requirements.txt
├── .env.example
└── routes/
    ├── auth_routes.py       # Signup, Login
    ├── soil_routes.py       # Soil insert, Recommendation insert, Analyze
    └── report_routes.py     # History, Soil list, PDF download
```

---

## Quick Start

```bash
# 1. Create & activate virtual environment
cd backend
python -m venv venv && venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
copy .env.example .env         # fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SECRET_KEY

# 4. Run Supabase schema
#    → Open supabase_schema.sql in Supabase SQL Editor and execute

# 5. Start the server
uvicorn main:app --reload --port 8000
```

Swagger UI → **http://localhost:8000/docs**

---

## Supabase Tables

| Table | Key Columns |
|-------|-------------|
| `users` | id (uuid PK), name, email, password_hash, created_at |
| `soil_reports` | id, user_id → users, nitrogen, phosphorus, potassium, ph, organic_carbon, timestamp |
| `recommendations` | id, report_id → soil_reports, crop_name, fertilizer_type, fertilizer_quantity, application_schedule, soil_health_status |
| `pdf_reports` | id, user_id → users, report_id → soil_reports, pdf_url |

A `user_history` view joins all four tables. Run `supabase_schema.sql` to create everything.

---

## API Endpoints

### 🔐 Auth (`/api/auth`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/signup` | ❌ | Insert user → `users` table |
| POST | `/login` | ❌ | Verify password → return JWT |

### 🌱 Soil & Crops (`/api/soil`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/reports` | ✅ | Insert soil data → `soil_reports` |
| POST | `/recommendations` | ✅ | Insert recommendation → `recommendations` |
| POST | `/analyze` | ✅ | Insert soil + auto-recommend (one call) |
| POST | `/ocr-extract` | ✅ | Image → text via Tesseract |

### 📋 Reports (`/api/reports`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/history` | ✅ | Fetch user history (user_history view) |
| GET | `/soil` | ✅ | All soil_reports for current user |
| GET | `/recommendations/{report_id}` | ✅ | Recommendation for a report |
| GET | `/pdf/{report_id}` | ✅ | Download report as PDF |
| GET | `/pdfs` | ✅ | List all pdf_reports |

---

## Tech Stack

- **FastAPI** + **Uvicorn** — REST API
- **Supabase** — PostgreSQL cloud database
- **Scikit-learn** — ML crop recommendation
- **ReportLab** — PDF generation
- **Tesseract OCR** — Image-to-text
- **PassLib + python-jose** — Bcrypt + JWT auth
