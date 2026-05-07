-- =============================================================================
-- Migration 004: Row-Level Security (RLS) Policies
-- Enables RLS on all 9 tables and creates isolation policies.
-- =============================================================================

-- ─── Helper: get the hospital_id for the currently authenticated user ─────────
-- We look it up from the doctors table (for doctor role) or a future
-- hospital_staff table. For now we use a simple approach: hospital_id is stored
-- in the user's JWT app_metadata by the admin when creating accounts.

-- ─── hospitals ────────────────────────────────────────────────────────────────
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read only their own hospital row
CREATE POLICY "hospitals_select_own"
  ON hospitals FOR SELECT
  TO authenticated
  USING (id = (auth.jwt() -> 'app_metadata' ->> 'hospital_id')::uuid);

-- ─── doctors ──────────────────────────────────────────────────────────────────
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "doctors_select_own_hospital"
  ON doctors FOR SELECT
  TO authenticated
  USING (hospital_id = (auth.jwt() -> 'app_metadata' ->> 'hospital_id')::uuid);

-- ─── patients ─────────────────────────────────────────────────────────────────
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "patients_select_own_hospital"
  ON patients FOR SELECT
  TO authenticated
  USING (hospital_id = (auth.jwt() -> 'app_metadata' ->> 'hospital_id')::uuid);

CREATE POLICY "patients_insert_own_hospital"
  ON patients FOR INSERT
  TO authenticated
  WITH CHECK (hospital_id = (auth.jwt() -> 'app_metadata' ->> 'hospital_id')::uuid);

CREATE POLICY "patients_update_own_hospital"
  ON patients FOR UPDATE
  TO authenticated
  USING (hospital_id = (auth.jwt() -> 'app_metadata' ->> 'hospital_id')::uuid);

-- ─── appointments ─────────────────────────────────────────────────────────────
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appointments_select_own_hospital"
  ON appointments FOR SELECT
  TO authenticated
  USING (hospital_id = (auth.jwt() -> 'app_metadata' ->> 'hospital_id')::uuid);

CREATE POLICY "appointments_insert_own_hospital"
  ON appointments FOR INSERT
  TO authenticated
  WITH CHECK (hospital_id = (auth.jwt() -> 'app_metadata' ->> 'hospital_id')::uuid);

CREATE POLICY "appointments_update_own_hospital"
  ON appointments FOR UPDATE
  TO authenticated
  USING (hospital_id = (auth.jwt() -> 'app_metadata' ->> 'hospital_id')::uuid);

-- ─── queue_entries ────────────────────────────────────────────────────────────
ALTER TABLE queue_entries ENABLE ROW LEVEL SECURITY;

-- Authenticated hospital staff can read/write their doctor's queue entries
CREATE POLICY "queue_entries_select_own_hospital"
  ON queue_entries FOR SELECT
  TO authenticated
  USING (
    doctor_id IN (
      SELECT id FROM doctors
      WHERE hospital_id = (auth.jwt() -> 'app_metadata' ->> 'hospital_id')::uuid
    )
  );

CREATE POLICY "queue_entries_insert_own_hospital"
  ON queue_entries FOR INSERT
  TO authenticated
  WITH CHECK (
    doctor_id IN (
      SELECT id FROM doctors
      WHERE hospital_id = (auth.jwt() -> 'app_metadata' ->> 'hospital_id')::uuid
    )
  );

CREATE POLICY "queue_entries_update_own_hospital"
  ON queue_entries FOR UPDATE
  TO authenticated
  USING (
    doctor_id IN (
      SELECT id FROM doctors
      WHERE hospital_id = (auth.jwt() -> 'app_metadata' ->> 'hospital_id')::uuid
    )
  );

-- ─── patient_locations ────────────────────────────────────────────────────────
-- anon role can INSERT (patient shares location via consent token — no login)
-- authenticated staff can SELECT
ALTER TABLE patient_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "patient_locations_anon_insert"
  ON patient_locations FOR INSERT
  TO anon
  WITH CHECK (true);  -- Token validation is done at the API route level

CREATE POLICY "patient_locations_select_own_hospital"
  ON patient_locations FOR SELECT
  TO authenticated
  USING (
    patient_id IN (
      SELECT id FROM patients
      WHERE hospital_id = (auth.jwt() -> 'app_metadata' ->> 'hospital_id')::uuid
    )
  );

-- ─── patient_consent_tokens ───────────────────────────────────────────────────
-- anon role can INSERT and UPDATE accepted flag (patient accepting consent)
-- authenticated staff can SELECT
ALTER TABLE patient_consent_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consent_tokens_anon_insert"
  ON patient_consent_tokens FOR INSERT
  TO anon
  WITH CHECK (true);  -- Service role creates tokens; anon path is via API route

CREATE POLICY "consent_tokens_anon_update_accept"
  ON patient_consent_tokens FOR UPDATE
  TO anon
  USING (accepted = false AND expires_at > now());

CREATE POLICY "consent_tokens_select_own_hospital"
  ON patient_consent_tokens FOR SELECT
  TO authenticated
  USING (
    appointment_id IN (
      SELECT id FROM appointments
      WHERE hospital_id = (auth.jwt() -> 'app_metadata' ->> 'hospital_id')::uuid
    )
  );

-- ─── waitlist_entries ─────────────────────────────────────────────────────────
ALTER TABLE waitlist_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "waitlist_select_own_hospital"
  ON waitlist_entries FOR SELECT
  TO authenticated
  USING (hospital_id = (auth.jwt() -> 'app_metadata' ->> 'hospital_id')::uuid);

CREATE POLICY "waitlist_insert_own_hospital"
  ON waitlist_entries FOR INSERT
  TO authenticated
  WITH CHECK (hospital_id = (auth.jwt() -> 'app_metadata' ->> 'hospital_id')::uuid);

CREATE POLICY "waitlist_update_own_hospital"
  ON waitlist_entries FOR UPDATE
  TO authenticated
  USING (hospital_id = (auth.jwt() -> 'app_metadata' ->> 'hospital_id')::uuid);

-- ─── consultations ────────────────────────────────────────────────────────────
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consultations_select_own_hospital"
  ON consultations FOR SELECT
  TO authenticated
  USING (
    doctor_id IN (
      SELECT id FROM doctors
      WHERE hospital_id = (auth.jwt() -> 'app_metadata' ->> 'hospital_id')::uuid
    )
  );

CREATE POLICY "consultations_insert_own_hospital"
  ON consultations FOR INSERT
  TO authenticated
  WITH CHECK (
    doctor_id IN (
      SELECT id FROM doctors
      WHERE hospital_id = (auth.jwt() -> 'app_metadata' ->> 'hospital_id')::uuid
    )
  );

CREATE POLICY "consultations_update_own_hospital"
  ON consultations FOR UPDATE
  TO authenticated
  USING (
    doctor_id IN (
      SELECT id FROM doctors
      WHERE hospital_id = (auth.jwt() -> 'app_metadata' ->> 'hospital_id')::uuid
    )
  );

-- ─── admin_logs ───────────────────────────────────────────────────────────────
-- Append-only: authenticated users can INSERT; admin role can SELECT.
-- No UPDATE or DELETE policies — omitting them enforces append-only at DB level.
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_logs_insert_authenticated"
  ON admin_logs FOR INSERT
  TO authenticated
  WITH CHECK (hospital_id = (auth.jwt() -> 'app_metadata' ->> 'hospital_id')::uuid);

-- Only users with role = 'admin' in app_metadata can read logs
CREATE POLICY "admin_logs_select_admin_role"
  ON admin_logs FOR SELECT
  TO authenticated
  USING (
    hospital_id = (auth.jwt() -> 'app_metadata' ->> 'hospital_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
