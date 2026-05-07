-- =============================================================================
-- Migration 003: Supporting Tables
-- waitlist_entries, consultations, admin_logs
-- =============================================================================

-- ─── waitlist_entries ─────────────────────────────────────────────────────────
-- Patients wanting an earlier slot.
CREATE TABLE IF NOT EXISTS waitlist_entries (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id    UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  doctor_id      UUID NOT NULL REFERENCES doctors(id)   ON DELETE CASCADE,
  patient_id     UUID NOT NULL REFERENCES patients(id)  ON DELETE CASCADE,
  waitlist_date  DATE NOT NULL,
  urgency_level  TEXT NOT NULL DEFAULT 'low'
                   CHECK (urgency_level IN ('low', 'medium', 'high')),
  eta_seconds    INTEGER,                -- Populated if patient has shared location
  status         TEXT NOT NULL DEFAULT 'waiting'
                   CHECK (status IN ('waiting', 'offered', 'accepted', 'declined', 'expired')),
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_waitlist_doctor_date ON waitlist_entries(doctor_id, waitlist_date);
CREATE INDEX IF NOT EXISTS idx_waitlist_status      ON waitlist_entries(status);

-- ─── consultations ────────────────────────────────────────────────────────────
-- Tracks actual consultation start/end for rolling average calculation.
CREATE TABLE IF NOT EXISTS consultations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id   UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  doctor_id        UUID NOT NULL REFERENCES doctors(id)      ON DELETE CASCADE,
  started_at       TIMESTAMPTZ NOT NULL,
  ended_at         TIMESTAMPTZ,
  duration_minutes NUMERIC(5, 2)     -- Computed: (ended_at - started_at) in minutes
);

CREATE INDEX IF NOT EXISTS idx_consult_doctor      ON consultations(doctor_id);
CREATE INDEX IF NOT EXISTS idx_consult_appointment ON consultations(appointment_id);

-- ─── admin_logs ───────────────────────────────────────────────────────────────
-- Audit trail. Append-only — no UPDATE or DELETE allowed (enforced via RLS).
CREATE TABLE IF NOT EXISTS admin_logs (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id             UUID NOT NULL REFERENCES hospitals(id),
  admin_user_id           UUID NOT NULL REFERENCES auth.users(id),
  action                  TEXT NOT NULL
                            CHECK (action IN (
                              'OVERRIDE_POSITION',
                              'LOCK_POSITION',
                              'UNLOCK_POSITION',
                              'MARK_NO_SHOW',
                              'MARK_ARRIVED',
                              'WAITLIST_OFFER',
                              'WAITLIST_ACCEPT',
                              'WAITLIST_DECLINE',
                              'RECALC_INTERVAL_CHANGE',
                              'MANUAL_RECALC'
                            )),
  target_appointment_id   UUID REFERENCES appointments(id),
  metadata                JSONB,     -- e.g., { "old_position": 3, "new_position": 1 }
  created_at              TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_logs_hospital_date ON admin_logs(hospital_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_admin         ON admin_logs(admin_user_id);
