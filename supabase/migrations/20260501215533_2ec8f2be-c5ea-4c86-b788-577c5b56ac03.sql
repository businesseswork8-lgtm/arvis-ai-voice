
ALTER TABLE public.items ALTER COLUMN sync_key DROP NOT NULL;
ALTER TABLE public.google_calendar_connections ALTER COLUMN sync_key DROP NOT NULL;
