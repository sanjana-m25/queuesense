CREATE TABLE available_slots (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id      UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  doctor_id        UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  slot_date        DATE NOT NULL,
  slot_time        TIME NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 15,
  is_booked        BOOLEAN NOT NULL DEFAULT FALSE,
  appointment_id   UUID REFERENCES appointments(id),
  created_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE (doctor_id, slot_date, slot_time)
);
CREATE INDEX idx_slots_doctor_date ON available_slots(doctor_id, slot_date);
CREATE INDEX idx_slots_available ON available_slots(doctor_id, slot_date, is_booked);

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS booked_via TEXT NOT NULL DEFAULT 'admin'
  CHECK (booked_via IN ('admin','patient'));

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS is_self_registered BOOLEAN DEFAULT FALSE;

ALTER TABLE available_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_slots" ON available_slots
  FOR SELECT USING (true);
CREATE POLICY "service_manage_slots" ON available_slots
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE admin_logs
  DROP CONSTRAINT IF EXISTS admin_logs_action_check;
ALTER TABLE admin_logs
  ADD CONSTRAINT admin_logs_action_check CHECK (action IN (
    'OVERRIDE_POSITION','LOCK_POSITION','UNLOCK_POSITION',
    'MARK_NO_SHOW','MARK_ARRIVED','WAITLIST_OFFER','WAITLIST_ACCEPT',
    'WAITLIST_DECLINE','RECALC_INTERVAL_CHANGE','MANUAL_RECALC','PATIENT_BOOKING'
  ));
