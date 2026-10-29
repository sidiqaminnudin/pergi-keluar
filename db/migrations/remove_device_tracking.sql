-- Run once after backup. This removes the obsolete device/pairing tracking model.
BEGIN;
DROP TABLE IF EXISTS tracking_eta_cache, tracking_events, tracking_checkpoints, tracking_locations, tracking_sessions, tracking_pairing_codes, tracking_device_assignments, tracking_devices CASCADE;
DROP TABLE IF EXISTS tracking_migrations CASCADE;
COMMIT;

-- New TL browser tracking tables are created by db/schema.sql.