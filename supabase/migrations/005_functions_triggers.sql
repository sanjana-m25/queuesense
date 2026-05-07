-- =============================================================================
-- Migration 005: Database Functions & Triggers
-- Rolling average consultation time calculation
-- =============================================================================

-- ─── Function: update_doctor_avg_consultation ─────────────────────────────────
-- Recomputes the rolling average consultation duration for a specific doctor,
-- using only consultations from the last 30 days where ended_at is set.
CREATE OR REPLACE FUNCTION update_doctor_avg_consultation(p_doctor_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE doctors
  SET avg_consultation_minutes = (
    SELECT AVG(duration_minutes)
    FROM consultations
    WHERE doctor_id   = p_doctor_id
      AND ended_at    IS NOT NULL
      AND created_at  > NOW() - INTERVAL '30 days'  -- Last 30 days only
  )
  WHERE id = p_doctor_id;
END;
$$;

-- ─── Trigger function wrapper (triggers cannot call functions with args directly)
CREATE OR REPLACE FUNCTION trg_fn_update_avg_consultation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Compute duration_minutes for the row being updated
  IF NEW.ended_at IS NOT NULL AND OLD.ended_at IS NULL THEN
    NEW.duration_minutes := EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at)) / 60.0;
    PERFORM update_doctor_avg_consultation(NEW.doctor_id);
  END IF;
  RETURN NEW;
END;
$$;

-- ─── Trigger: fires AFTER UPDATE of ended_at on consultations ─────────────────
-- Only fires when ended_at transitions from NULL → a value (consultation ends).
DROP TRIGGER IF EXISTS trg_update_avg_consultation ON consultations;

CREATE TRIGGER trg_update_avg_consultation
  BEFORE UPDATE OF ended_at ON consultations
  FOR EACH ROW
  WHEN (NEW.ended_at IS NOT NULL AND OLD.ended_at IS NULL)
  EXECUTE FUNCTION trg_fn_update_avg_consultation();

-- ─── Auto-delete patient_locations older than 24 hours ───────────────────────
-- Privacy requirement: raw GPS data must not be stored permanently.
-- This function is called by pg_cron (enable the pg_cron extension in Supabase
-- Dashboard → Database → Extensions, then schedule via cron.schedule()).
--
-- Supabase cron setup (run once after enabling pg_cron extension):
--   SELECT cron.schedule(
--     'purge-old-locations',
--     '0 * * * *',   -- every hour
--     $$DELETE FROM patient_locations WHERE created_at < NOW() - INTERVAL '24 hours'$$
--   );
CREATE OR REPLACE FUNCTION purge_stale_patient_locations()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM patient_locations
  WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$;
