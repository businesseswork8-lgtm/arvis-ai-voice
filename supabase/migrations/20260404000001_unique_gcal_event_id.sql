-- Add unique index on google_calendar_event_id to allow upsert deduplication
-- This ensures GCal events are not duplicated when syncing
CREATE UNIQUE INDEX IF NOT EXISTS idx_items_gcal_event_id
  ON public.items (google_calendar_event_id)
  WHERE google_calendar_event_id IS NOT NULL;
