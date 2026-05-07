-- =============================================================================
-- Migration 002: Appointment & Queue Tables
-- =============================================================================

-- ─── appointments ─────────────────────────────────────────────────────────────
-- One row per scheduled appointment slot.
CREATE TABLE IF NOT EXISTS appointments (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id          UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  doctor_id            UUID NOT NULL REFERENCES doctors(id)   ON DELETE CASCADE,
  patient_id           UUID NOT NULL REFERENCES patients(id)  ON DELETE CASCADE,
  scheduled_date       DATE NOT NULL,
  scheduled_time       TIME NOT NULL,
  original_position    INTEGER NOT NULL,     -- 1-based. Immutable after creation.
  status               TEXT NOT NULL DEFAULT 'scheduled'
                         CHECK (status IN (
                           'scheduled', 'in_consultation', 'completed', 'no_show', 'cancelled'
                         )),
  consent_notified_at  TIMESTAMPTZ,          -- When the 30–45 min notification was sent
  arrived_at           TIMESTAMPTZ,          -- When patient physically checked in at reception
  created_at           TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appt_doctor_date ON appointments(doctor_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_appt_patient     ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appt_status      ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appt_date        ON appointments(scheduled_date);

-- ─── queue_entries ────────────────────────────────────────────────────────────
-- The live, dynamic queue. Rebuilt by the queue engine every 30–60 seconds.
-- Supabase Realtime is enabled on this table (see TASK-012).
CREATE TABLE IF NOT EXISTS queue_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id  UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  doctor_id       UUID NOT NULL REFERENCES doctors(id)      ON DELETE CASCADE,
  queue_date      DATE NOT NULL,
  position        INTEGER NOT NULL,       -- Current dynamic position (1 = next to be seen)
  is_locked       BOOLEAN DEFAULT FALSE,  -- If TRUE, queue engine skips this entry
  last_recalc_at  TIMESTAMPTZ,            -- When queue engine last touched this row
  updated_at      TIMESTAMPTZ DEFAULT now(),

  UNIQUE (doctor_id, queue_date, position)  -- No two patients at same position, same doctor, same day
);

CREATE INDEX IF NOT EXISTS idx_queue_doctor_date ON queue_entries(doctor_id, queue_date);
CREATE INDEX IF NOT EXISTS idx_queue_appointment ON queue_entries(appointment_id);
CREATE INDEX IF NOT EXISTS idx_queue_position    ON queue_entries(doctor_id, queue_date, position);

-- ─── patient_locations ────────────────────────────────────────────────────────
-- Short-lived GPS data. Retained only during the appointment window.
-- Auto-deletion enforced via pg_cron or scheduled function (privacy requirement).
CREATE TABLE IF NOT EXISTS patient_locations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id       UUID NOT NULL REFERENCES patients(id)     ON DELETE CASCADE,
  appointment_id   UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  lat              NUMERIC(10, 7) NOT NULL,
  lng              NUMERIC(10, 7) NOT NULL,
  eta_seconds      INTEGER,                -- Result of Maps API call
  accuracy_meters  NUMERIC(8, 2),          -- GPS accuracy from browser
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_locations_patient     ON patient_locations(patient_id);
CREATE INDEX IF NOT EXISTS idx_locations_appointment ON patient_locations(appointment_id);
CREATE INDEX IF NOT EXISTS idx_locations_created     ON patient_locations(created_at DESC);

-- ─── patient_consent_tokens ───────────────────────────────────────────────────
-- One-time tokens sent in the SMS/WhatsApp notification link.
CREATE TABLE IF NOT EXISTS patient_consent_tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id  UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  token           TEXT NOT NULL UNIQUE,   -- Signed JWT or random hex token
  accepted        BOOLEAN DEFAULT FALSE,
  accepted_at     TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ NOT NULL,   -- Appointment time + 30 min buffer
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consent_token       ON patient_consent_tokens(token);
CREATE INDEX IF NOT EXISTS idx_consent_appointment ON patient_consent_tokens(appointment_id);
