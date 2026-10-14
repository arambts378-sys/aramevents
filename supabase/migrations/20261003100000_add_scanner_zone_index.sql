-- Migration: 20261003100000_add_scanner_zone_index.sql
-- Description: Add composite index on volunteer_scanner_zones(session_id, zone_id) to optimize scanner authorization RPC checks.

CREATE INDEX IF NOT EXISTS idx_scanner_zones_session_zone
ON public.volunteer_scanner_zones(session_id, zone_id);
