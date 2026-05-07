-- =============================================================================
-- Migration 001: Core Tables — hospitals, doctors, patients
-- =============================================================================

-- ─── hospitals ────────────────────────────────────────────────────────────────
-- Supports future multi-tenant use. One row per hospital installation.
CREATE TABLE IF NOT EXISTS hospitals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  address     TEXT,
  lat         NUMERIC(10, 7) NOT NULL,   -- Hospital GPS latitude
  lng         NUMERIC(10, 7) NOT NULL,   -- Hospital GPS longitude
  timezone    TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Indexes: Primary key only (low-cardinality table).

-- ─── doctors ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS doctors (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id              UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  name                     TEXT NOT NULL,
  specialty                TEXT,
  avg_consultation_minutes NUMERIC(5, 2) DEFAULT 10.00, -- Rolling average, updated after each session
  user_id                  UUID REFERENCES auth.users(id), -- Supabase Auth UID for doctor login
  is_active                BOOLEAN DEFAULT TRUE,
  created_at               TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doctors_hospital ON doctors(hospital_id);
CREATE INDEX IF NOT EXISTS idx_doctors_user     ON doctors(user_id);

-- ─── patients ─────────────────────────────────────────────────────────────────
-- Minimal PII. No medical history stored.
CREATE TABLE IF NOT EXISTS patients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id     UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  phone           TEXT NOT NULL,              -- E.164 format: +919876543210
  eta_status      TEXT NOT NULL DEFAULT 'uncertain'
                    CHECK (eta_status IN ('uncertain', 'known', 'arrived', 'no_show')),
  eta_seconds     INTEGER,                    -- Seconds until arrival (null if uncertain)
  eta_updated_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patients_hospital   ON patients(hospital_id);
CREATE INDEX IF NOT EXISTS idx_patients_phone      ON patients(phone);
CREATE INDEX IF NOT EXISTS idx_patients_eta_status ON patients(eta_status);
