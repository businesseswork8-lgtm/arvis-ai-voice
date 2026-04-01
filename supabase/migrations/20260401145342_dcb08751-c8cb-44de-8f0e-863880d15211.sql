CREATE TABLE public.google_calendar_connections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_key uuid NOT NULL,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_expires_at timestamp with time zone NOT NULL,
  google_email text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(sync_key)
);

ALTER TABLE public.google_calendar_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read gcal connections" ON public.google_calendar_connections FOR SELECT TO anon USING (true);
CREATE POLICY "Anyone can insert gcal connections" ON public.google_calendar_connections FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anyone can update gcal connections" ON public.google_calendar_connections FOR UPDATE TO anon USING (true);
CREATE POLICY "Anyone can delete gcal connections" ON public.google_calendar_connections FOR DELETE TO anon USING (true);

-- Add google_calendar_event_id to items table for sync tracking
ALTER TABLE public.items ADD COLUMN google_calendar_event_id text DEFAULT NULL;

CREATE TRIGGER update_gcal_connections_updated_at
  BEFORE UPDATE ON public.google_calendar_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();