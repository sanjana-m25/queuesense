-- =============================================================================
-- Migration 006: Patient Booking Fields
-- Adds age to patients and symptoms to appointments
-- =============================================================================

ALTER TABLE patients ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS symptoms TEXT;

-- Update RLS if necessary (assuming existing policies cover new columns)
-- By default, new columns follow existing table policies.
