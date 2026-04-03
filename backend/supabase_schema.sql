-- ============================================================
-- Smart Farming System — Supabase PostgreSQL Schema
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";


-- ------------------------------------------------------------
-- 1. USERS
-- ------------------------------------------------------------
create table if not exists users (
    id              uuid        primary key default gen_random_uuid(),
    name            text        not null,
    email           text        unique not null,
    password_hash   text        not null,
    created_at      timestamptz not null default now()
);

-- Index on email for fast login lookups
create index if not exists idx_users_email on users (email);

-- Row-Level Security (enable after testing)
-- alter table users enable row level security;
-- create policy "Users can read own row" on users for select using (auth.uid() = id);


-- ------------------------------------------------------------
-- 2. SOIL_REPORTS
-- ------------------------------------------------------------
create table if not exists soil_reports (
    id              uuid        primary key default gen_random_uuid(),
    user_id         uuid        not null references users (id) on delete cascade,
    nitrogen        float       not null,
    phosphorus      float       not null,
    potassium       float       not null,
    ph              float       not null check (ph >= 0 and ph <= 14),
    organic_carbon  float       not null default 0.0,
    timestamp       timestamptz not null default now()
);

create index if not exists idx_soil_reports_user_id on soil_reports (user_id);
create index if not exists idx_soil_reports_timestamp on soil_reports (timestamp desc);

-- alter table soil_reports enable row level security;
-- create policy "Owner access" on soil_reports for all using (user_id = auth.uid());


-- ------------------------------------------------------------
-- 3. RECOMMENDATIONS
-- ------------------------------------------------------------
create table if not exists recommendations (
    id                   uuid    primary key default gen_random_uuid(),
    report_id            uuid    not null references soil_reports (id) on delete cascade,
    crop_name            text    not null,
    fertilizer_type      text    not null,
    fertilizer_quantity  text    not null,   -- e.g. "50 kg/ha"
    application_schedule text    not null,   -- e.g. "50% sowing, 25% 30d, 25% 60d"
    soil_health_status   text    not null,   -- "Good" | "Moderate" | "Poor"
    created_at           timestamptz not null default now()
);

create index if not exists idx_recommendations_report_id on recommendations (report_id);

-- alter table recommendations enable row level security;


-- ------------------------------------------------------------
-- 4. PDF_REPORTS
-- ------------------------------------------------------------
create table if not exists pdf_reports (
    id          uuid        primary key default gen_random_uuid(),
    user_id     uuid        not null references users (id) on delete cascade,
    report_id   uuid        not null references soil_reports (id) on delete cascade,
    pdf_url     text        not null,   -- Supabase Storage public URL
    created_at  timestamptz not null default now()
);

create index if not exists idx_pdf_reports_user_id on pdf_reports (user_id);

-- alter table pdf_reports enable row level security;


-- ============================================================
-- Helpful view: full history per user
-- ============================================================
create or replace view user_history as
select
    sr.id               as report_id,
    sr.user_id,
    sr.nitrogen,
    sr.phosphorus,
    sr.potassium,
    sr.ph,
    sr.organic_carbon,
    sr.timestamp        as soil_timestamp,
    r.id                as recommendation_id,
    r.crop_name,
    r.fertilizer_type,
    r.fertilizer_quantity,
    r.application_schedule,
    r.soil_health_status,
    p.pdf_url
from soil_reports sr
left join recommendations r on r.report_id = sr.id
left join pdf_reports     p on p.report_id = sr.id;
